import { mergePrepOutboxFlush } from "../vehiclePrepStatus";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";
import { getSyncIdentity } from "./identity";

const OUTBOX_KEY = "@bickers.sync.outbox.v1";
const BRIDGE_CHECKPOINT_KEY = "@bickers.sync.bridgeCheckpoint.v1";
const LAST_SYNC_AT_KEY = "@bickers.sync.lastSyncAt.v1";
const outboxListeners = new Set();
let outboxWrites = Promise.resolve();
function writeOutbox(action) {
  const next = outboxWrites.then(action, action);
  outboxWrites = next.catch(() => {});
  return next;
}
async function persistOutbox(rows) {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(rows));
  notifyOutboxListeners();
}

const notifyOutboxListeners = () => {
  outboxListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A status listener must never interrupt persistence.
    }
  });
};

export function subscribeOutbox(listener) {
  if (typeof listener !== "function") return () => {};
  outboxListeners.add(listener);
  return () => outboxListeners.delete(listener);
}

const safeParse = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const serialise = (value) => JSON.parse(JSON.stringify(value));

const mutationId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export async function listOutboxMutations() {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export async function replaceOutboxMutations(next) {
  const normalised = Array.isArray(next) ? next : [];
  await writeOutbox(() => persistOutbox(normalised));
}

export async function enqueueOutboxMutation(mutation, identity = getSyncIdentity(auth.currentUser?.uid)) {
  const snapshot = serialise(mutation || {});
  const originalIdentity = identity ? serialise(identity) : null;
  return writeOutbox(async () => {
  const outbox = await listOutboxMutations();

  outbox.push({
    id: mutationId(),
    identity: originalIdentity,
    target: snapshot.target || "firestore",
    operation: snapshot.operation || "set",
    docPath: String(snapshot.docPath || "").trim(),
    data: snapshot.data ?? {},
    options: snapshot.options ?? {},
    entityType: snapshot.entityType || null,
    entityId: snapshot.entityId || null,
    meta: snapshot.meta ?? {},
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
  });

  await persistOutbox(outbox);
  return outbox[outbox.length - 1];
  });
}

export function acknowledgeOutboxFlush(processedIds, retained) {
  return writeOutbox(async () => persistOutbox(mergePrepOutboxFlush(await listOutboxMutations(), processedIds, retained)));
}

export function supersedePrepConflicts(operation, operationType = "prepStatus") {
  return writeOutbox(async () => persistOutbox((await listOutboxMutations()).filter((row) =>
    !(row.operation === operationType && row.lastErrorCode === "prep/conflict"
      && ["companyId", "bookingId", "vehicleId", "actorUid"].every((key) => row.data?.[key] === operation[key])))));
}

export async function getOutboxCount() {
  const outbox = await listOutboxMutations();
  return outbox.length;
}

export async function clearOutbox() {
  await AsyncStorage.removeItem(OUTBOX_KEY);
  notifyOutboxListeners();
}

export async function getBridgeCheckpoint() {
  return AsyncStorage.getItem(BRIDGE_CHECKPOINT_KEY);
}

export async function setBridgeCheckpoint(value) {
  if (!value) {
    await AsyncStorage.removeItem(BRIDGE_CHECKPOINT_KEY);
    return;
  }
  await AsyncStorage.setItem(BRIDGE_CHECKPOINT_KEY, String(value));
}

export async function getLastSyncAt() {
  return AsyncStorage.getItem(LAST_SYNC_AT_KEY);
}

export async function setLastSyncAt(value) {
  if (!value) {
    await AsyncStorage.removeItem(LAST_SYNC_AT_KEY);
    return;
  }
  await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(value));
}
