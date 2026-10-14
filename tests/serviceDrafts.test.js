import assert from "node:assert/strict";
import test from "node:test";
import { listServiceDrafts, removeServiceDraft } from "../lib/serviceDrafts.js";

function memoryStorage(initial) {
  let value = initial;
  return {
    async getItem() { return value; },
    async setItem(_key, next) { value = next; },
    async removeItem() { value = null; },
  };
}

test("deleting a service form removes its in-progress status while keeping other drafts", async () => {
  const storage = memoryStorage(JSON.stringify({
    "svc-van-1": { selectedVehicleId: "van", vehicleName: "Deleted form" },
    "svc-car-2": { selectedVehicleId: "car", vehicleName: "Other form" },
  }));

  await removeServiceDraft(storage, "svc-van-1");

  assert.deepEqual(await listServiceDrafts(storage), [
    { id: "svc-car-2", selectedVehicleId: "car", vehicleName: "Other form" },
  ]);
});

test("deletion waits for an overlapping auto-save before removing the draft", async () => {
  const storage = memoryStorage(null);
  let releaseSave;
  const save = new Promise((resolve) => { releaseSave = resolve; }).then(() =>
    storage.setItem("serviceFormDrafts_v1", JSON.stringify({
      "svc-van-1": { selectedVehicleId: "van" },
    }))
  );

  const deletion = removeServiceDraft(storage, "svc-van-1", [save]);
  releaseSave();
  await deletion;

  assert.deepEqual(await listServiceDrafts(storage), []);
});

test("deleting the visible draft does not reveal an older duplicate for the vehicle", async () => {
  const storage = memoryStorage(JSON.stringify({
    "svc-van-1": { selectedVehicleId: "van" },
    "svc-van-2": { selectedVehicleId: "van" },
    "svc-car-3": { selectedVehicleId: "car" },
  }));

  await removeServiceDraft(storage, "svc-van-2");

  assert.deepEqual(await listServiceDrafts(storage), [
    { id: "svc-car-3", selectedVehicleId: "car" },
  ]);
});
