export const SERVICE_DRAFTS_KEY = "serviceFormDrafts_v1";

export async function listServiceDrafts(storage) {
  const raw = await storage.getItem(SERVICE_DRAFTS_KEY);
  if (!raw) return [];
  const records = JSON.parse(raw) || {};
  const byVehicle = new Map();
  const withoutVehicle = [];
  for (const [id, draft] of Object.entries(records)) {
    if (!draft || typeof draft !== "object") continue;
    const entry = { id, ...draft };
    if (!entry.selectedVehicleId) {
      withoutVehicle.push(entry);
      continue;
    }
    const previous = byVehicle.get(entry.selectedVehicleId);
    const timestamp = (item) => Number(String(item.id).split("-").pop()) || 0;
    if (!previous || timestamp(entry) > timestamp(previous)) {
      byVehicle.set(entry.selectedVehicleId, entry);
    }
  }
  return [...withoutVehicle, ...byVehicle.values()];
}

export async function removeServiceDraft(storage, formId, pendingWrites = []) {
  await Promise.allSettled(pendingWrites);
  const raw = await storage.getItem(SERVICE_DRAFTS_KEY);
  if (!raw) return;
  const records = JSON.parse(raw) || {};
  if (!Object.hasOwn(records, formId)) return;
  const vehicleId = records[formId]?.selectedVehicleId;
  for (const [id, draft] of Object.entries(records)) {
    if (id === formId || (vehicleId && draft?.selectedVehicleId === vehicleId)) {
      delete records[id];
    }
  }
  if (Object.keys(records).length) {
    await storage.setItem(SERVICE_DRAFTS_KEY, JSON.stringify(records));
  } else {
    await storage.removeItem(SERVICE_DRAFTS_KEY);
  }
}
