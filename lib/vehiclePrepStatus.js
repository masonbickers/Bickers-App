// Shared prep contract. Keep equivalent copies in the mobile and diary repositories.
const text = (value) => String(value ?? "").trim();
export const vehiclePrepId = (bookingId, vehicleId) =>
  `job_${encodeURIComponent(text(bookingId))}__vehicle_${encodeURIComponent(text(vehicleId))}`;

export function matchVehiclePrepRecord(records, { companyId, bookingId, vehicleId }) {
  if (![companyId, bookingId, vehicleId].every(text)) return { kind: "missing", record: null };
  const expectedId = vehiclePrepId(bookingId, vehicleId);
  const matches = (records || []).filter((row) => row && text(row.companyId) === text(companyId)
    && text(row.bookingId) === text(bookingId) && text(row.vehicleId) === text(vehicleId)
    && !row.equipmentId && row.assetType !== "equipment");
  if (matches.some((row) => text(row.id).startsWith("job_") && text(row.id) !== expectedId)) {
    return { kind: "ambiguous", record: null };
  }
  const canonical = matches.filter((row) => text(row.id) === expectedId);
  if (canonical.length === 1) return { kind: "match", record: canonical[0] };
  if (matches.length === 1) return { kind: "match", record: matches[0] };
  return { kind: matches.length ? "ambiguous" : "missing", record: null };
}

export function createPrepResource(companyId = "") {
  return { companyId, shared: { state: "loading", records: [] }, legacy: { state: "loading", records: {} } };
}

// Subscription lifetime is scoped to one account/company, including delayed callbacks.
export function subscribePrepResource({ companyId, subscribe, onChange, retryMs = 15000 }) {
  let active = true;
  let resource = createPrepResource(companyId);
  const unsubscribes = {};
  const timers = {};
  const publish = () => { if (active) onChange(resource); };
  const listen = (source) => {
    if (!active) return;
    unsubscribes[source]?.();
    unsubscribes[source] = subscribe(source, (snapshot) => {
      if (!active) return;
      const records = source === "shared"
        ? (snapshot.records || []).filter((row) => text(row.companyId) === text(companyId))
        : snapshot.companyId === companyId ? snapshot.records || {} : {};
      const state = snapshot.hasPendingWrites ? "pending" : snapshot.fromCache ? "cached" : "ready";
      resource = { ...resource, [source]: { state, records } };
      publish();
    }, (error) => {
      if (!active) return;
      resource = { ...resource, [source]: { ...resource[source], state: "error", error } };
      publish();
      clearTimeout(timers[source]);
      timers[source] = setTimeout(() => listen(source), retryMs);
    });
  };
  publish();
  for (const source of ["shared", "legacy"]) listen(source);
  return () => {
    active = false;
    for (const source of ["shared", "legacy"]) { clearTimeout(timers[source]); unsubscribes[source]?.(); }
  };
}

const prepError = (code, message) => Object.assign(new Error(message), { code });
const statusFields = ["completed", "completedAt", "completedByUid", "completedByEmployeeId", "completedByName", "completedByCode"];
export function prepWritesAllowed({ enabled, isDev, projectId, emulatorConnected } = {}) {
  return enabled === "true" && isDev === true && String(projectId || "").startsWith("demo-") && emulatorConnected === true;
}

export function buildPrepStatusTransition(existing, operation, timestamp) {
  const { companyId, bookingId, vehicleId, desiredCompleted, expectedRevision, mutationId, actorUid, attribution } = operation || {};
  if (![companyId, bookingId, vehicleId, actorUid].every((value) => text(value) && !text(value).includes("/"))
    || typeof desiredCompleted !== "boolean" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0
    || !/^[a-zA-Z0-9_-]{1,128}$/.test(text(mutationId))) throw prepError("prep/invalid", "Preparation identity or transition is invalid.");
  if (existing && ["companyId", "bookingId", "vehicleId"].some((key) => text(existing[key]) !== text(operation[key]))) {
    throw prepError("prep/identity", "Preparation identity changed. Refresh before saving.");
  }
  if (existing?.statusMutationId === mutationId) return { duplicate: true };
  if (Object.prototype.hasOwnProperty.call(operation, "expectedRecordVersion") && prepRecordVersion(existing) !== operation.expectedRecordVersion) throw prepError("prep/conflict", "Preparation changed on another device. Reload saved preparation before saving again.");
  const revision = existing?.statusRevision ?? 0;
  if (!Number.isSafeInteger(revision) || revision !== expectedRevision) throw prepError("prep/conflict", "Preparation changed on another device. Refresh and review before saving again.");
  if (desiredCompleted && (!text(attribution?.employeeId) || !text(attribution?.name) || attribution?.uid !== actorUid)) {
    throw prepError("prep/attribution", "Select a current employee before marking preparation complete.");
  }
  const patch = {
    completed: desiredCompleted,
    completedAt: desiredCompleted ? timestamp : null,
    completedByUid: desiredCompleted ? actorUid : null,
    completedByEmployeeId: desiredCompleted ? attribution.employeeId : null,
    completedByName: desiredCompleted ? attribution.name : null,
    completedByCode: desiredCompleted ? attribution.code || null : null,
    statusRevision: revision + 1,
    statusMutationId: mutationId,
    updatedAt: timestamp,
  };
  if (desiredCompleted && existing?.completed === true) {
    for (const field of statusFields.filter((field) => field !== "completed")) patch[field] = existing[field] ?? null;
  }
  const previous = Object.fromEntries(statusFields.map((field) => [field, existing?.[field] ?? null]));
  const event = { companyId, bookingId, vehicleId, actorUid, mutationId, expectedRevision, statusRevision: revision + 1, desiredCompleted, changedAt: timestamp, previous };
  return { patch, event, duplicate: false };
}

// Inject only the Firestore SDK boundary; this same transaction runs on first save and replay.
export async function executePrepStatusTransition(db, operation, { doc, runTransaction, serverTimestamp }) {
  const recordId = vehiclePrepId(operation.bookingId, operation.vehicleId);
  const parent = doc(db, "vehiclePrepRecords", recordId);
  const eventRef = doc(db, "vehiclePrepRecords", recordId, "statusEvents", operation.mutationId);
  return runTransaction(db, async (transaction) => {
    const current = await transaction.get(parent);
    const history = await transaction.get(eventRef);
    const existing = current.exists() ? current.data() : null;
    if (history.exists()) {
      const saved = history.data();
      if (["companyId", "bookingId", "vehicleId", "actorUid", "desiredCompleted", "expectedRevision"].some((key) => saved[key] !== operation[key])) throw prepError("prep/identity", "Preparation operation identity was reused.");
      return { duplicate: true };
    }
    const result = buildPrepStatusTransition(existing, operation, serverTimestamp());
    if (result.duplicate) return result;
    const checklist = operation.checklistPatch || {};
    if (Object.keys(checklist).some((key) => !["checks", "equipmentChecks", "notes", "vehicleName", "registration", "prepDate"].includes(key))) throw prepError("prep/invalid", "Preparation checklist patch contains status fields.");
    transaction.set(parent, {
      ...(!existing ? { companyId: operation.companyId, bookingId: operation.bookingId, vehicleId: operation.vehicleId, createdAt: serverTimestamp() } : {}),
      ...checklist,
      ...result.patch,
    }, { merge: true });
    transaction.set(eventRef, result.event);
    return { ...result, recordId };
  });
}

export function mergePrepOutboxFlush(latest, processedIds, retained) {
  const processed = new Set(processedIds);
  const replacements = new Map(retained.map((row) => [row.id, row]));
  return latest.flatMap((row) => !processed.has(row.id) ? [row] : replacements.has(row.id) ? [replacements.get(row.id)] : []);
}

export function prepRecordVersion(record) {
  const value = record?.updatedAt;
  if (value == null) return null;
  if (typeof value.toMillis === "function") return String(value.toMillis());
  if (value instanceof Date) return String(value.getTime());
  if (value.seconds !== undefined || value._seconds !== undefined) return String(Number(value.seconds ?? value._seconds) * 1000 + Number(value.nanoseconds ?? value._nanoseconds ?? 0) / 1000000);
  return String(value);
}
export function validatePrepReplayContext(operation, { enabled, actorUid }) {
  if (!enabled) throw prepError("prep/disabled", "Shared prep writes require the explicitly enabled local emulator.");
  if (!actorUid || actorUid !== operation.actorUid) throw prepError("prep/account", "Sign in as the original preparation author to sync this save.");
}
export async function executePrepChecklistPatch(db, operation, { doc, runTransaction, serverTimestamp }) {
  const parent = doc(db, "vehiclePrepRecords", vehiclePrepId(operation.bookingId, operation.vehicleId));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(parent);
    const existing = snapshot.exists() ? snapshot.data() : null;
    if (existing && ["companyId", "bookingId", "vehicleId"].some((key) => existing[key] !== operation[key])) throw prepError("prep/identity", "Preparation identity changed.");
    if ((existing?.statusRevision ?? 0) !== operation.expectedRevision || prepRecordVersion(existing) !== operation.expectedRecordVersion) throw prepError("prep/conflict", "Preparation changed on another device. Reload saved preparation before saving again.");
    const patch = operation.checklistPatch || {};
    if (![operation.companyId, operation.bookingId, operation.vehicleId, operation.actorUid].every(text) || Object.keys(patch).some((key) => !["checks", "equipmentChecks", "notes", "vehicleName", "registration", "prepDate"].includes(key))) throw prepError("prep/invalid", "Preparation checklist patch is invalid.");
    transaction.set(parent, { ...(!existing ? { companyId: operation.companyId, bookingId: operation.bookingId, vehicleId: operation.vehicleId, createdAt: serverTimestamp() } : {}), ...patch, updatedAt: serverTimestamp() }, { merge: true });
    return { recordId: parent.id };
  });
}
