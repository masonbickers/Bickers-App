import test from 'node:test';
import assert from 'node:assert/strict';

const repair = await import('../scripts/ownerEmployeeLinkRepair.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});
function fixture() {
  return {
    expected: { uid: 'owner', companyId: 'company', employeeId: 'employee' },
    profile: { uid: 'owner', companyId: 'company', employeeId: 'employee', role: 'platformAdmin', isEnabled: true, mobileAccessStatus: 'active' },
    employee: { id: 'employee', data: { uid: 'owner', authUid: 'owner', userId: 'conflicting-link', companyId: 'company', mobileAccess: { status: 'active', approvedEmail: 'owner@example.test' } }, updateTime: { seconds: 100, nanoseconds: 123 } },
    approvedEmail: 'owner@example.test',
  };
}
test('owner repair plans exactly one identity field with its original value and exact document version', () => {
  assert.equal(typeof repair.planOwnerEmployeeLinkRepair, 'function');
  const plan = repair.planOwnerEmployeeLinkRepair(fixture());
  assert.equal(plan.documentPath, 'employees/employee');
  assert.deepEqual(plan.patch, { userId: 'owner' });
  assert.deepEqual(plan.before, { userId: 'conflicting-link' });
  assert.deepEqual(plan.employeeUpdateTime, { seconds: 100, nanoseconds: 123 });
});
for (const [name, mutate] of [
  ['wrong canonical UID', f => { f.profile.uid = 'other'; }],
  ['wrong company', f => { f.employee.data.companyId = 'other'; }],
  ['wrong employee', f => { f.profile.employeeId = 'other'; }],
  ['disagreeing strong UID links', f => { f.employee.data.authUid = 'other'; }],
  ['missing strong UID link', f => { delete f.employee.data.uid; }],
  ['disabled owner', f => { f.profile.isEnabled = false; }],
  ['unapproved mobile account', f => { f.profile.mobileAccessStatus = 'pending'; }],
  ['different approved email', f => { f.employee.data.mobileAccess.approvedEmail = 'other@example.test'; }],
  ['missing old identity value', f => { delete f.employee.data.userId; }],
  ['already reconciled record', f => { f.employee.data.userId = 'owner'; }],
]) test(`owner repair rejects ${name}`, () => {
  assert.equal(typeof repair.planOwnerEmployeeLinkRepair, 'function');
  const f = fixture(); mutate(f);
  assert.throws(() => repair.planOwnerEmployeeLinkRepair(f));
});
test('apply validation rejects a changed document or a widened patch', () => {
  assert.equal(typeof repair.validateOwnerEmployeeLinkRepair, 'function');
  const f = fixture(), plan = repair.planOwnerEmployeeLinkRepair(f);
  assert.deepEqual(repair.validateOwnerEmployeeLinkRepair(plan, f), { userId: 'owner' });
  const changed = fixture(); changed.employee.updateTime.nanoseconds++;
  assert.throws(() => repair.validateOwnerEmployeeLinkRepair(plan, changed));
  assert.throws(() => repair.validateOwnerEmployeeLinkRepair({ ...plan, patch: { userId: 'owner', role: 'admin' } }, f));
  assert.throws(() => repair.validateOwnerEmployeeLinkRepair({ ...plan, documentPath: 'employees/other' }, f));
  assert.throws(() => repair.validateOwnerEmployeeLinkRepair({ ...plan, before: { userId: 'different' } }, f));
});
