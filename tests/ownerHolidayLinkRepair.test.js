import assert from 'node:assert/strict';
import test from 'node:test';
const repair = await import('../scripts/ownerHolidayLinkRepair.mjs').catch(e => { if (e.code === 'ERR_MODULE_NOT_FOUND') return {}; throw e; });
function fixture() {
  const ownerUid = 'owner', employeeId = 'employee', companyId = 'company';
  const changes = Array.from({ length: 16 }, (_, i) => ({ path: `holidays/leave-${i}`, companyId, employeeName: 'Mason 2Bickers', status: 'approved', startDate: '2026-01-05', endDate: '2026-01-05', expectedUpdateTimeSeconds: 100, expectedUpdateTimeNanoseconds: i, before: { present: false }, patch: { employeeId } }));
  return {
    plan: { projectId: 'bickers-booking', ownerUid, employeeId, companyId, year: 2026, holidayRecordsToChange: 16, fieldsToChange: ['employeeId'], changes },
    current: {
      profile: { uid: ownerUid, employeeId, companyId, role: 'platformAdmin', isEnabled: true, mobileAccessStatus: 'active' },
      employee: { id: employeeId, data: { uid: ownerUid, authUid: ownerUid, userId: ownerUid, companyId, userCode: '9453', mobileAccess: { status: 'active', approvedEmail: 'mason@bickers.co.uk' } } },
      records: changes.map(c => ({ path: c.path, data: { companyId, employee: 'Mason 2Bickers', status: 'approved' }, updateTime: { seconds: c.expectedUpdateTimeSeconds, nanoseconds: c.expectedUpdateTimeNanoseconds } })),
    },
  };
}
test('reviewed repair produces only 16 exact employeeId updates', () => {
  assert.equal(typeof repair.validateOwnerHolidayLinkRepair, 'function');
  const { plan, current } = fixture();
  const patches = repair.validateOwnerHolidayLinkRepair(plan, current);
  assert.equal(patches.length, 16);
  assert.deepEqual(patches[0], { path: 'holidays/leave-0', patch: { employeeId: 'employee' } });
});
for (const [name, change] of [
  ['stale holiday version', f => f.current.records[0].updateTime.nanoseconds++],
  ['changed owner UID', f => { f.current.profile.uid = 'other'; }],
  ['different employee', f => { f.current.employee.id = 'other'; }],
  ['foreign company', f => { f.current.records[0].data.companyId = 'other'; }],
  ['preexisting employee link', f => { f.current.records[0].data.employeeId = 'other'; }],
  ['conflicting UID', f => { f.current.records[0].data.ownerUid = 'other'; }],
  ['conflicting code', f => { f.current.records[0].data.employeeCode = 'other'; }],
  ['unapproved owner', f => { f.current.profile.mobileAccessStatus = 'pending'; }],
  ['wrong approved mailbox', f => { f.current.employee.data.mobileAccess.approvedEmail = 'other@example.test'; }],
  ['declined record', f => { f.current.records[0].data.status = 'declined'; }],
  ['extra write field', f => { f.plan.changes[0].patch.status = 'approved'; }],
  ['different before-value', f => { f.plan.changes[0].before = { present: true, value: null }; }],
  ['duplicate path', f => { f.plan.changes[1].path = f.plan.changes[0].path; }],
  ['wider record count', f => { f.plan.changes.push(f.plan.changes[0]); }],
]) test(`owner holiday repair rejects ${name}`, () => {
  assert.equal(typeof repair.validateOwnerHolidayLinkRepair, 'function');
  const f = fixture(); change(f);
  assert.throws(() => repair.validateOwnerHolidayLinkRepair(f.plan, f.current));
});
