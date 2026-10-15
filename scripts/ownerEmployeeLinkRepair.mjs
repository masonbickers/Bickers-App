// Pure planning/validation only. This module never reads credentials or writes data.
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const fail = () => { throw new Error('Owner employee link repair preconditions changed.'); };
const disabled = data => data.active === false || data.disabled === true || data.appDisabled === true || data.archived === true || data.isArchived === true;
const profileKeys = ['uid', 'companyId', 'employeeId', 'role', 'isEnabled', 'mobileAccessStatus', 'active', 'disabled', 'appDisabled', 'archived', 'isArchived', 'appAccess', 'clerkUserId'];
const binding = data => JSON.parse(JSON.stringify(Object.fromEntries(profileKeys.map(key => [key, data[key]]))));

export function planOwnerEmployeeLinkRepair({ expected, profile, employee, approvedEmail }) {
  if (!expected || !profile || !employee?.data || ![expected.uid, expected.companyId, expected.employeeId].every(id)) fail();
  const data = employee.data, version = employee.updateTime;
  if (profile.uid !== expected.uid || profile.companyId !== expected.companyId || profile.employeeId !== expected.employeeId
    || String(profile.role).toLowerCase() !== 'platformadmin' || profile.isEnabled !== true || disabled(profile)
    || profile.mobileAccessStatus !== 'active' || employee.id !== expected.employeeId || data.companyId !== expected.companyId
    || data.uid !== expected.uid || data.authUid !== expected.uid || disabled(data) || data.isEnabled === false
    || data.mobileAccess?.status !== 'active' || !approvedEmail || data.mobileAccess.approvedEmail !== approvedEmail
    || !id(data.userId) || data.userId === expected.uid
    || !Number.isInteger(version?.seconds) || version.seconds <= 0 || !Number.isInteger(version.nanoseconds)
    || version.nanoseconds < 0 || version.nanoseconds > 999999999) fail();
  return {
    version: 1,
    scope: 'owner-employee-userId-only',
    documentPath: `employees/${expected.employeeId}`,
    expected: { uid: expected.uid, companyId: expected.companyId, employeeId: expected.employeeId },
    profileBinding: binding(profile),
    employeeUpdateTime: { seconds: version.seconds, nanoseconds: version.nanoseconds },
    before: { userId: data.userId },
    patch: { userId: expected.uid },
  };
}

export function validateOwnerEmployeeLinkRepair(plan, current) {
  const fresh = planOwnerEmployeeLinkRepair(current);
  if (JSON.stringify(plan) !== JSON.stringify(fresh)) fail();
  return { userId: fresh.expected.uid };
}
