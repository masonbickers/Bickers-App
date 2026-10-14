import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/(protected)/vehicle-check.js", import.meta.url), "utf8");
const start = source.indexOf("  const loadData = useCallback(async () => {");
const body = source.slice(start + "  const loadData = useCallback(async () => {".length, source.indexOf("\n  }, [", start));

function runLoader(getDocs, employee = { companyId: "company-a" }) {
  const loadingStates = [], errors = [], existingStates = [], queries = [], restored = {};
  const mocks = {
    loading: false, isAuthed: true, jobId: "", db: {}, checkDocId: "draft-id", user: { uid: "staff" }, employee,
    setLoadingDoc: (value) => loadingStates.push(value), setLoadError: (value) => errors.push(value),
    setHasExisting: (value) => existingStates.push(value),
    setOdometer: (value) => { restored.odometer = value; },
    setTrailerId: (value) => { restored.trailerId = value; },
    setNotes: (value) => { restored.notes = value; },
    setPhotos: (value) => { restored.photos = value; },
    vehiclesResource: { data: [] },
    findVehicleRecord: () => null,
    collection: (_db, name) => name, documentId: () => "__name__",
    where: (...values) => values, query: (...values) => { queries.push(values); return values; },
    getDocs, console: { warn() {} },
  };
  const load = new Function(...Object.keys(mocks), `return async () => {${body}}`)(...Object.values(mocks));
  return { load, loadingStates, errors, existingStates, queries, restored };
}

test("vehicle-check read failures are handled and release the loading state", async () => {
  const state = runLoader(async () => { throw new Error("permission-denied"); });
  await assert.doesNotReject(state.load());
  assert.deepEqual(state.loadingStates, [true, false]);
  assert.equal(state.errors[0], "");
  assert.match(state.errors[1], /Could not load/);
  assert.match(state.errors[1], /saved check has not been changed/);
});

test("a new daily check uses a company-scoped draft query and accepts no saved record", async () => {
  const state = runLoader(async () => ({ docs: [] }));
  await state.load();
  assert.deepEqual(state.errors, [""]);
  assert.deepEqual(state.existingStates, [false]);
  assert.deepEqual(state.queries, [["vehicleChecks", ["companyId", "==", "company-a"], ["driverUid", "==", "staff"]]]);
});

test("a draft lookup never runs without an authenticated company", async () => {
  let reads = 0;
  const state = runLoader(async () => { reads++; }, {});
  await state.load();
  assert.equal(reads, 0);
  assert.match(state.errors[1], /Could not load/);
});

test("an existing company draft retains its saved fields and original photos", async () => {
  const state = runLoader(async () => ({ docs: [{ id: "draft-id", data: () => ({ status: "draft", odometer: "12345", trailerId: "TR1", notes: "Saved note", photos: ["https://example.com/original.jpg"] }) }] }));
  await state.load();
  assert.deepEqual(state.errors, [""]);
  assert.deepEqual(state.existingStates, [true]);
  assert.deepEqual(state.restored, { odometer: "12345", trailerId: "TR1", notes: "Saved note", photos: [{ uri: "https://example.com/original.jpg", remote: true }] });
});
