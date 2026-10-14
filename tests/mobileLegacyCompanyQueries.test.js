import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import { privateHolidayFilters } from '../lib/holidayOwnership.js';
const require = createRequire(import.meta.url);
const { parse } = require('@babel/parser');

// Run the production callbacks; replace only UI state and the network boundary.
async function run(file, target, company = ' bickers ', overrides = {}) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const nodes = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type) nodes.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  };
  walk(ast);
  const requests = [];
  const noop = () => {};
  const employee = { companyId: String(company || '').trim(), uid:'uid1', userCode: 'EMP1', employeeId: 'person1', name: 'Mason' };
  const context = vm.createContext({
    employee, user: { uid: 'uid1' }, companyId: String(company || '').trim(),
    db: {}, loading: false, authLoading: false, isAuthed: true, id: 'query1', employeeCode: 'EMP1',
    NOTIFICATIONS_ENABLED: true, preferencesLoading: false, maintenanceRemindersEnabled: true,
    ownerUid: 'uid1', currentNoteCreatorId: 'uid1', currentNoteEmployeeName: 'Mason',
    boardIdentity: 'uid1:bickers', boardIdentityRef: { current: 'uid1:bickers' }, cachedBoardData: null, boardDataRequest: null, mountedRef: { current: true },
    setEmployeeData: noop, setEmpRecord: noop, setEmpLoading: noop, setHolidays: noop,
    setHolidaysLoading: noop, setBookings: noop, setBookingsLoading: noop,
    setHolidaysError: noop, privateHolidayFilters,
    fetchEmployeeHistory: async (_user,identity,collection) => {requests.push({name:'privateHistory:'+collection,identity:{...identity}});return {records:[],withheldCount:0};},
    setLoading: noop, setRefreshing: noop, setError: noop, applyBoardData: noop,
    setQueryData: noop, setTimesheetEntry: noop, setJobsByDay: noop,
    setExpenses: noop, setLoadError: noop, setSentNotes: noop, setNoteHistoryLoading: noop,
    groupSentNotes: (rows) => rows, canonicalCode: (value) => value,
    getActiveTimesheetReminderWeekStart: () => '2026-09-28', DAYS: ['Monday'], dateToISO: (date) => date.toISOString().slice(0, 10),
    console, collection: (_db, name, ...path) => ({ name, path, constraints: [] }),
    doc: (_db, name, ...path) => ({ name, path, document: true }),
    query: (ref, ...constraints) => ({ ...ref, constraints }),
    where: (field, op, value) => ({ field, op, value }), limit: (value) => ({ limit: value }),
    getDoc: async request => {requests.push(request);return ({ exists: () => true, data: () => ({ weekStart: '2026-09-28', employeeCode: 'EMP1', day: 'Monday', companyId: 'bickers' }) });},
    getDocs: async (request) => {
      requests.push(request);
      return { docs: request.name === 'employees' ? [{ id: 'person1', data: () => ({ userCode: 'EMP1', name: 'Mason', companyId: 'bickers' }) }] : [] };
    },
    onSnapshot: (request) => { requests.push(request); return noop; },
    updateDoc: async () => { throw new Error('Read regression test must not write'); },
    ...overrides,
  });
  const companyDeclaration = nodes.find((n) => n.type === 'VariableDeclarator' && n.id?.name === 'companyId');
  if (companyDeclaration) context.companyId = vm.runInContext(source.slice(companyDeclaration.init.start, companyDeclaration.init.end), context);
  const boardIdentityDeclaration = nodes.find((n) => n.type === 'VariableDeclarator' && n.id?.name === 'boardIdentity');
  if (boardIdentityDeclaration) context.boardIdentity = vm.runInContext(source.slice(boardIdentityDeclaration.init.start, boardIdentityDeclaration.init.end), context);
  let callbacks;
  if (target === 'effects') {
    callbacks = nodes.filter((n) => n.type === 'CallExpression' && n.callee?.name === 'useEffect')
      .map((n) => n.arguments[0]).filter((n) => /getDocs|getDoc|onSnapshot|fetchEmployeeHistory/.test(source.slice(n.start, n.end)));
  } else {
    const declaration = nodes.find((n) => n.type === 'VariableDeclarator' && n.id?.name === target);
    callbacks = [declaration.init.type === 'CallExpression' ? declaration.init.arguments[0] : declaration.init];
  }
  for (const callback of callbacks) await vm.runInContext(`(${source.slice(callback.start, callback.end)})()`, context);
  await new Promise((resolve) => setImmediate(resolve));
  requests.boardIdentity = context.boardIdentity;
  return requests;
}
const cases = [
  ['hooks/useEmployeeNotifications.js', 'effects', ['bookings', 'holidays', 'maintenanceBookings']],
  
  ['app/(protected)/holiday-request.js', 'effects', ['employees', 'bookings']],
  ['app/(protected)/work-diary-board.js', 'loadBookings', ['bookings', 'vehicles']],
  ['app/(protected)/query/[id]/index.js', 'effects', ['employees', 'bookings']],
  ['app/(protected)/fix.js', 'effects', ['employees']],
  ['app/(protected)/expenses.js', 'loadExpenses', ['expenses']],
  ['app/(protected)/(main-tabs)/me.js', 'loadSentNotes', ['notes']],
];
for (const [file, target, collections] of cases) {
  test(`${file} sends company-scoped reads`, async () => {
    const requests = await run(file, target);
    for (const name of collections) {
      const reads = requests.filter((request) => request.name === name);
      assert.ok(reads.length, `Expected ${name} read`);
      for (const request of reads) assert.ok(request.constraints.some((c) => c.field === 'companyId' && c.op === '==' && c.value === 'bickers'), `${name} must constrain canonical companyId`);
    }
  });
  test(`${file} cannot read company collections before company identity exists`, async () => {
    const requests = await run(file, target, '  ');
    assert.equal(requests.filter((request) => collections.includes(request.name)).length, 0);
  });
}
test('holiday request uses bound private history API instead of Firestore leave queries',async()=>{
 const requests=await run('app/(protected)/holiday-request.js','effects');assert.equal(requests.filter(r=>r.name==='holidays').length,0);const read=requests.find(r=>r.name==='privateHistory:holidays');assert.equal(read.identity.uid,'uid1');assert.equal(read.identity.employeeId,'person1');assert.equal(read.identity.companyId,'bickers');
});
test('holiday history profile uses exact canonical employee document, not name or email matching',async()=>{
 const requests=await run('app/(protected)/holidaypage.js','effects');const read=requests.find(r=>r.name==='employees');assert.ok(read.document);assert.deepEqual([...read.path],['person1']);assert.equal(requests.filter(r=>r.name==='holidays').length,0);
});
test('notification recipient query preserves employee parent-rule identity', async () => {
  const reads = await run('hooks/useEmployeeNotifications.js', 'effects');
  const inbox = reads.find((request) => request.name === 'employeeNotifications');
  assert.deepEqual(JSON.parse(JSON.stringify(inbox.constraints)), [{ field: 'employeeId', op: '==', value: 'person1' }]);
  const bookings = reads.find((request) => request.name === 'bookings');
  assert.ok(bookings.constraints.some((c) => c.field === 'employeeCodes' && c.op === 'array-contains' && c.value === 'EMP1'));
  const holidays = reads.find((request) => request.name === 'holidays');
  assert.ok(holidays.constraints.some((c) => c.field === 'employeeCode' && c.value === 'EMP1'));
});


test('work diary does not reuse another company pending request', async () => {
  const requests = await run('app/(protected)/work-diary-board.js', 'loadBookings', 'bickers', {
    boardDataRequest: Promise.resolve([{ docs: [] }, { docs: [] }]),
    boardDataRequestCompanyId: 'other-company',
  });
  assert.equal(requests.length, 2);
});


test('work diary ignores a response after authenticated identity changes', async () => {
  let published = 0;
  await run('app/(protected)/work-diary-board.js', 'loadBookings', 'bickers', {
    boardIdentityRef: { current: 'uid2:bickers' },
    applyBoardData: () => { published++; },
  });
  assert.equal(published, 0);
});


for (const readiness of [{ authLoading: true }, { isAuthed: false }, { user: null }]) {
  test(`work diary invalidates cache identity when auth is unready ${JSON.stringify(readiness)}`, async () => {
    const requests = await run('app/(protected)/work-diary-board.js', 'loadBookings', 'bickers', readiness);
    assert.equal(requests.boardIdentity, '');
  });
}
