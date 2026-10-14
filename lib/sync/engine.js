import { commitVehiclePrepStatus, commitVehiclePrepChecklist } from "../vehiclePrepMutation";
import NetInfo from "@react-native-community/netinfo";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import {
  arrayUnion,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Platform } from "react-native";

import { auth, db, storage } from "../../firebaseConfig";
import { getSyncIdentity } from "./identity";
import { syncConfig } from "./config";
import { sendWorkshopSubmission } from "../workshopSubmissionApi";
import { isTransientNetworkError } from "./errors";
import {
  getBridgeCheckpoint,
  getOutboxCount,
  listOutboxMutations,
  acknowledgeOutboxFlush,
  setBridgeCheckpoint,
  setLastSyncAt,
} from "./outbox";

let syncInFlight = false;

const pathToRef = (docPath) => {
  const parts = String(docPath || "")
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts.length % 2 !== 0) {
    throw new Error(`Invalid Firestore docPath "${docPath}"`);
  }
  return doc(db, ...parts);
};

const withTimeout = async (url, init = {}, timeoutMs = syncConfig.syncTimeoutMs) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
};

async function applyFirestoreMutation(mutation) {
  assertMutationIdentity(mutation);
  if (mutation.operation === "prepStatus") return commitVehiclePrepStatus(mutation.data);
  if (mutation.operation === "prepChecklist") return commitVehiclePrepChecklist(mutation.data);
  const ref = pathToRef(mutation.docPath);
  const op = String(mutation.operation || "set").toLowerCase();
  const data = await decodeFirestoreQueueData(mutation.data || {});
  assertMutationIdentity(mutation);

  if (op === "set") {
    await setDoc(ref, data, mutation.options || { merge: true });
    return data;
  }
  if (op === "update") {
    await updateDoc(ref, data);
    return data;
  }
  if (op === "delete") {
    await deleteDoc(ref);
    return data;
  }

  throw new Error(`Unsupported outbox operation "${op}"`);
}

async function decodeFirestoreQueueData(value) {
  if (Array.isArray(value)) {
    return Promise.all(value.map(decodeFirestoreQueueData));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  if (value.__firestoreOp === "serverTimestamp") {
    return serverTimestamp();
  }
  if (value.__storageDownloadURL) {
    return getDownloadURL(storageRef(storage, value.__storageDownloadURL));
  }
  if (value._methodName === "serverTimestamp") {
    return serverTimestamp();
  }
  if (value.__firestoreOp === "arrayUnion") {
    const values = Array.isArray(value.values)
      ? await Promise.all(value.values.map(decodeFirestoreQueueData))
      : [];
    return arrayUnion(...values);
  }
  if (value._methodName === "arrayUnion") {
    const values = Array.isArray(value._elements)
      ? await Promise.all(value._elements.map(decodeFirestoreQueueData))
      : [];
    return arrayUnion(...values);
  }

  return Object.fromEntries(await Promise.all(
    Object.entries(value).map(async ([key, nextValue]) => [key, await decodeFirestoreQueueData(nextValue)])
  ));
}

async function applyStorageMutation(mutation) {
  const { uri, storagePath, contentType } = mutation.data || {};
  if (!uri || !storagePath) throw new Error("Invalid queued workshop photo");
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Queued workshop photo unavailable");
  const blob = await response.blob();
  assertMutationIdentity(mutation);
  await uploadBytes(storageRef(storage, storagePath), blob, { contentType: contentType || "image/jpeg" });
}

function assertMutationIdentity(mutation) {
  const current = getSyncIdentity(auth.currentUser?.uid);
  if (!current?.uid || !current?.companyId || mutation?.identity?.uid !== current.uid
    || mutation?.identity?.companyId !== current.companyId) {
    throw Object.assign(new Error("Queued work is retained for its original employee and company."), { code: "sync/identity" });
  }
}

function normaliseRemoteChange(change) {
  if (!change || typeof change !== "object") return null;

  const type = String(change.type || "").toLowerCase().trim();
  if (type.startsWith("firestore.")) {
    return {
      target: "firestore",
      operation: type.replace("firestore.", ""),
      docPath: change.docPath || change.path || "",
      data: change.data || {},
      options: change.options || {},
    };
  }

  if (String(change.target || "").toLowerCase() === "firestore") {
    return {
      target: "firestore",
      operation: change.operation || "set",
      docPath: change.docPath || change.path || "",
      data: change.data || {},
      options: change.options || {},
    };
  }

  return null;
}

export async function flushFirestoreOutbox() {
  const current = await listOutboxMutations();
  const next = [];
  const applied = [];
  let stoppedForNetwork = false;

  for (const item of current) {
    const identity = getSyncIdentity(auth.currentUser?.uid);
    if (!identity?.uid || !identity?.companyId
      || item?.identity?.uid !== identity.uid
      || item?.identity?.companyId !== identity.companyId) {
      next.push({ ...item, lastErrorCode: "sync/identity",
        lastError: item?.identity?.uid
          ? "Queued work is retained for its original employee and company."
          : "Historical queued work is retained pending ownership verification." });
      continue;
    }
    if (item?.target !== "firestore" && item?.target !== "storage" && item?.target !== "workshop") {
      next.push(item);
      continue;
    }

    if (["prepStatus", "prepChecklist"].includes(item.operation) && ["prep/conflict", "prep/identity", "prep/disabled", "prep/account"].includes(item.lastErrorCode)) {
      next.push(item);
      continue;
    }
    try {
      const resolvedData = item.target === "workshop" ? await sendWorkshopSubmission(item.data) : item.target === "storage" ? await applyStorageMutation(item) : await applyFirestoreMutation(item);
      applied.push(item.target === "firestore" ? { ...item, data: resolvedData } : item);
    } catch (error) {
      next.push({
        ...item,
        attempts: Number(item?.attempts || 0) + 1,
        lastError: String(error?.message || error),
        ...(["prepStatus", "prepChecklist"].includes(item.operation) ? { lastErrorCode: error?.code || "unknown" } : {}),
      });

      if (isTransientNetworkError(error) || item.target === "storage" || item.entityType === "workshopVehicleCheck") {
        stoppedForNetwork = true;
        next.push(...current.slice(current.indexOf(item) + 1));
        break;
      }
    }
  }

  await acknowledgeOutboxFlush(current.map((item) => item.id), next);

  return {
    applied,
    appliedCount: applied.length,
    stoppedForNetwork,
  };
}

async function pushAppliedMutationsToBridge(mutations, token) {
  if (!syncConfig.syncBridgeEnabled || !syncConfig.syncApiBaseUrl || mutations.length === 0) {
    return { pushed: 0, skipped: true };
  }

  const url = `${syncConfig.syncApiBaseUrl}/sync/mutations`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const payload = {
    device: {
      platform: Platform.OS,
      appEnv: syncConfig.env,
    },
    mutations: mutations.map((m) => ({
      id: m.id,
      entityType: m.entityType || null,
      entityId: m.entityId || null,
      operation: m.operation,
      docPath: m.docPath,
      data: m.data,
      meta: m.meta || {},
      createdAt: m.createdAt,
    })),
  };

  const res = await withTimeout(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Bridge push failed (${res.status})`);
  }

  return { pushed: mutations.length, skipped: false };
}

async function pullBridgeChanges(token) {
  const originalIdentity = getSyncIdentity(auth.currentUser?.uid);
  if (!syncConfig.syncBridgeEnabled || !syncConfig.syncApiBaseUrl) {
    return { pulled: 0, applied: 0, skipped: true };
  }

  const checkpoint = (await getBridgeCheckpoint()) || "";
  const query = checkpoint ? `?since=${encodeURIComponent(checkpoint)}` : "";
  const url = `${syncConfig.syncApiBaseUrl}/sync/changes${query}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await withTimeout(url, { headers });
  if (res.status === 204) {
    return { pulled: 0, applied: 0, skipped: false };
  }
  if (!res.ok) {
    throw new Error(`Bridge pull failed (${res.status})`);
  }

  const body = await res.json();
  const changes = Array.isArray(body?.changes) ? body.changes : [];

  let applied = 0;
  for (const raw of changes) {
    const change = normaliseRemoteChange(raw);
    if (!change || change.target !== "firestore") continue;
    await applyFirestoreMutation({ ...change, identity: originalIdentity });
    applied += 1;
  }

  if (body?.checkpoint) {
    await setBridgeCheckpoint(String(body.checkpoint));
  }

  return { pulled: changes.length, applied, skipped: false };
}

export async function runSyncCycle({ getAuthToken, onRemoteChangesApplied } = {}) {
  if (!syncConfig.syncEnabled) {
    return { ok: false, reason: "disabled" };
  }
  if (syncInFlight) {
    return { ok: false, reason: "in_flight" };
  }

  const net = await NetInfo.fetch();
  const online = !!net?.isConnected && net?.isInternetReachable !== false;
  if (!online) {
    return { ok: false, reason: "offline" };
  }

  syncInFlight = true;
  try {
    const flush = await flushFirestoreOutbox();
    const token = getAuthToken ? await getAuthToken() : null;

    try {
      await pushAppliedMutationsToBridge(flush.applied.filter((item) => item.target === "firestore"), token);
    } catch (e) {
      console.warn("[sync] bridge push skipped:", e?.message || e);
    }

    let pulled = { pulled: 0, applied: 0, skipped: true };
    try {
      pulled = await pullBridgeChanges(token);
    } catch (e) {
      if (!isTransientNetworkError(e)) {
        console.warn("[sync] bridge pull error:", e?.message || e);
      }
    }

    if (pulled.applied > 0 && typeof onRemoteChangesApplied === "function") {
      onRemoteChangesApplied(pulled.applied);
    }

    const lastSyncedAt = new Date().toISOString();
    await setLastSyncAt(lastSyncedAt);
    const outboxCount = await getOutboxCount();

    return {
      ok: true,
      reason: null,
      flushed: flush.appliedCount,
      pulled: pulled.pulled,
      remoteApplied: pulled.applied,
      outboxCount,
      lastSyncedAt,
    };
  } finally {
    syncInFlight = false;
  }
}
