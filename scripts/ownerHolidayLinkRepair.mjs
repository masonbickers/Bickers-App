// Pure validation only; credential handling and guarded transactions live outside Git.
const fail = () => { throw Error('Approved owner holiday link preconditions changed.'); };
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const disabled = data => ['disabled', 'archived', 'isArchived', 'appDisabled'].some(k => data[k] === true) || data.active === false || data.isEnabled === false;
const strong = ['employeeId', 'employeeDocId', 'staffId', 'ownerUid', 'authUid', 'employeeUid', 'uid', 'userId'];
const codes = ['employeeCode', 'userCode', 'staffCode', 'code'];
export function validateOwnerHolidayLinkRepair(plan, { profile, employee, records }) {
  if (!plan || plan.projectId !== 'bickers-booking' || plan.year !== 2026 || plan.holidayRecordsToChange !== 16
    || ![plan.ownerUid, plan.employeeId, plan.companyId].every(id)
    || JSON.stringify(plan.fieldsToChange) !== JSON.stringify(['employeeId'])
    || !Array.isArray(plan.changes) || plan.changes.length !== 16 || !Array.isArray(records) || records.length !== 16) fail();
  const data = employee?.data;
  if (!profile || !data || profile.uid !== plan.ownerUid || profile.employeeId !== plan.employeeId
    || profile.companyId !== plan.companyId || String(profile.role).toLowerCase() !== 'platformadmin'
    || profile.isEnabled !== true || profile.mobileAccessStatus !== 'active' || disabled(profile)
    || employee.id !== plan.employeeId || data.companyId !== plan.companyId || disabled(data)
    || ['uid', 'authUid', 'userId'].some(k => data[k] !== plan.ownerUid)
    || data.mobileAccess?.status !== 'active' || data.mobileAccess.approvedEmail !== 'mason@bickers.co.uk') fail();
  const seen = new Set();
  return plan.changes.map(change => {
    if (!/^holidays\/[A-Za-z0-9_-]{1,128}$/.test(change.path || '') || seen.has(change.path)) fail();
    seen.add(change.path);
    const record = records.find(row => row.path === change.path), row = record?.data;
    if (!row || change.companyId !== plan.companyId || row.companyId !== plan.companyId
      || change.employeeName !== 'Mason 2Bickers' || row.employee !== change.employeeName
      || change.status !== 'approved' || row.status !== change.status
      || !/^2026-\d{2}-\d{2}$/.test(change.startDate || '')
      || !/^2026-\d{2}-\d{2}$/.test(change.endDate || '')
      || strong.some(k => row[k] != null && row[k] !== '')
      || Object.hasOwn(row, 'employeeId') || JSON.stringify(change.before) !== JSON.stringify({ present: false })
      || codes.some(k => row[k] != null && row[k] !== '' && String(row[k]) !== String(data.userCode))
      || !Number.isInteger(change.expectedUpdateTimeSeconds) || !Number.isInteger(change.expectedUpdateTimeNanoseconds)
      || change.expectedUpdateTimeSeconds <= 0 || change.expectedUpdateTimeNanoseconds < 0 || change.expectedUpdateTimeNanoseconds > 999999999
      || record.updateTime?.seconds !== change.expectedUpdateTimeSeconds || record.updateTime?.nanoseconds !== change.expectedUpdateTimeNanoseconds
      || JSON.stringify(change.patch) !== JSON.stringify({ employeeId: plan.employeeId })) fail();
    return { path: change.path, patch: { employeeId: plan.employeeId } };
  });
}
