import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

// Execute the production hooks with only React scheduling/cache and the external
// Firestore boundary replaced. Removing a company constraint must fail these tests.
function harness(file, auth = {}) {
  const requests = [];
  const resources = [];
  const cacheCalls = [];
  const effects = [];
  const context = vm.createContext({
    db: {},
    useAuth: () => ({ employee: { uid: "crew", employeeId: "employee-crew", companyId: " bickers ", userCode: " EMP1 " }, isAuthed: true, loading: false, ...auth }),
    collection: (_db, name) => ({ name, constraints: [] }),
    where: (field, op, value) => ({ field, op, value }),
    limit: (value) => ({ limit: value }),
    query: (ref, ...constraints) => ({ ...ref, constraints }),
    getDocs: async (request) => {
      requests.push({ kind: "get", ...request });
      return { docs: [{ id: "row1", data: () => ({ companyId: "bickers", employeeCode: "EMP1" }) }] };
    },
    onSnapshot: (request) => { requests.push({ kind: "listen", ...request }); return () => {}; },
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
    useEffect: (effect) => effects.push(effect),
    useRef: (value) => ({ current: value }),
    useState: (value) => [typeof value === "function" ? value() : value, () => {}],
    fetchEmployeeHistory: async (_user, employee, collection) => {
      requests.push({kind:'private-api',name:collection,identity:{...employee}});
      return {records:[{id:'own-history',ownerUid:employee.uid,employeeId:employee.employeeId,companyId:employee.companyId}],withheldCount:0};
    },
    useCachedResource: (resource) => { resources.push(resource); return { data: null }; },
    useDataCache: () => ({
      scope: "uid:bickers:EMP1", refreshSignal: 0,
      read: async () => null, write: async () => {}, mutate: async () => [],
      getOrFetch: async (key, fetcher, options) => { cacheCalls.push({ key, options }); return fetcher(); },
    }),
    acquireLiveResource: ({ start }) => start(() => {}, () => {}),
    publishLiveResource: () => {},
  });
  const source = readFileSync(new URL(`../hooks/${file}`, import.meta.url), "utf8")
    .replace(/import[\s\S]*?from\s+"[^"]+";\n/g, "")
    .replace(/export /g, "");
  vm.runInContext(source, context, { filename: file });
  return { context, requests, resources, cacheCalls, runEffects: () => effects.forEach((effect) => effect()) };
}

function companyConstraint(request) {
  assert.ok(request.constraints.some(({ field, op, value }) => field === "companyId" && op === "==" && value === "bickers"), `${request.kind} ${request.name} must constrain companyId`);
}

for (const name of ["employees", "bookings", "vehicles", "equipment", "holidays", "vehicleChecks", "vehiclePrepRecords"]) {
  test(`operational ${name} loader queries the authenticated company`, async () => {
    const h = harness("useOperationalData.js");
    h.context.useCompanyCollection(name);
    const rows = await h.resources[0].fetcher();
    assert.equal(rows[0].id, "row1");
    assert.equal(h.resources[0].key, `collection:${name}:company`);
    assert.equal(h.requests.length, 1);
    companyConstraint(h.requests[0]);
  });
}

for (const hook of ["useTimesheetQueries"]) {
  test(`${hook} retains employee and limit constraints while constraining company`, async () => {
    const h = harness("useOperationalData.js");
    h.context[hook]({ limit: 17 });
    await h.resources[0].fetcher();
    companyConstraint(h.requests[0]);
    assert.ok(h.requests[0].constraints.some(({ field, value }) => field === "employeeCode" && value === "EMP1"));
    assert.ok(h.requests[0].constraints.some(({ limit }) => limit === 17));
    assert.ok(h.requests[0].constraints.some(({ field, value }) => field === "ownerUid" && value === "crew"));
    assert.ok(h.requests[0].constraints.some(({ field, value }) => field === "employeeId" && value === "employee-crew"));
  });
}

test('timesheet and holiday hooks use server history with bound canonical identity and no broad query',async()=>{
  for (const hook of ['useEmployeeTimesheets','useHolidays']) {
    const h=harness('useOperationalData.js');h.context[hook]({limit:17});const result=await h.resources[0].fetcher();assert.equal(result.records[0].id,'own-history');assert.equal(h.requests.length,1);assert.equal(h.requests[0].kind,'private-api');assert.equal(h.requests[0].identity.uid,'crew');assert.equal(h.requests[0].identity.employeeId,'employee-crew');assert.equal(h.requests[0].identity.companyId.trim(),'bickers');
  }
});

const serviceNames = ["vehicles", "equipment", "serviceRecords", "vehicleChecks", "vehicleIssues", "defectReports", "equipmentInspections", "motPreChecks", "vehiclePrepRecords", "workshopRequests", "workshopVehicleChecks"];
for (const name of serviceNames) {
  test(`service ${name} listener, refresh and reader constrain company`, async () => {
    const h = harness("useServiceData.js");
    const resource = h.context.useServiceCollection(name);
    h.runEffects();
    await resource.refresh();
    await h.context.useServiceCollectionReader()(name, { force: true });
    assert.equal(h.requests.length, 3);
    for (const request of h.requests) companyConstraint(request);
    assert.equal(h.cacheCalls[0].key, `service:collection:${name}:company`);
    assert.equal(h.cacheCalls[0].options.force, true);
  });
}

for (const auth of [
  { employee: { userCode: "EMP1" } },
  { employee: { companyId: "  ", userCode: "EMP1" } },
  { isAuthed: false },
  { loading: true },
]) {
  test(`operational explicit enabled cannot bypass identity readiness ${JSON.stringify(auth)}`, () => {
    const h = harness("useOperationalData.js", auth);
    for (const hook of ["useEmployees", "useEmployeeTimesheets", "useTimesheetQueries"]) h.context[hook]({ enabled: true });
    for (const resource of h.resources) assert.equal(resource.enabled, false);
    assert.equal(h.requests.length, 0);
  });
  test(`service explicit enabled and reader fail closed ${JSON.stringify(auth)}`, async () => {
    const h = harness("useServiceData.js", auth);
    const resource = h.context.useServiceCollection("vehicles", { enabled: true });
    h.runEffects();
    await resource.refresh();
    const rows = await h.context.useServiceCollectionReader()("vehicles");
    assert.equal(rows.length, 0);
    assert.equal(h.requests.length, 0);
    assert.equal(h.cacheCalls.length, 0);
  });
}

test("explicit disabled preserves no-fetch behavior with a valid company", async () => {
  const operational = harness("useOperationalData.js");
  operational.context.useEmployees({ enabled: false });
  assert.equal(operational.resources[0].enabled, false);
  const service = harness("useServiceData.js");
  const resource = service.context.useServiceCollection("vehicles", { enabled: false });
  service.runEffects();
  await resource.refresh();
  assert.equal(service.requests.length, 0);
});
