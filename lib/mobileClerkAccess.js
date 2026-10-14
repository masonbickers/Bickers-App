import { classifyIdentitySession } from './identitySession.js';
export async function resolveMobileClerkAccess({ uid, getTokenResult, readUser, readEmployee, isCurrent }) {
  const denied = () => { throw new Error('Your current approved app identity could not be verified.'); };
  if (!isCurrent()) return null;
  const result = await getTokenResult();
  if (!isCurrent()) return null;
  const claims = result.claims || {};
  if ((claims.user_id || claims.sub) !== uid) denied();
  const profile = await readUser(uid);
  if (!isCurrent()) return null;
  if (classifyIdentitySession({ ...claims, uid }, profile || {}) !== 'clerk'
    || profile.mobileAccessStatus !== 'active' || profile.appPasswordSetupRequired === true
    || !profile.employeeId || !profile.companyId) denied();
  const employee = await readEmployee(profile.employeeId);
  if (!isCurrent()) return null;
  const links = [employee?.uid, employee?.authUid, employee?.auth?.uid].filter(value => value != null && value !== '');
  const verifiedEmail = typeof claims.companyEmail === 'string' ? claims.companyEmail.trim().toLowerCase() : '';
  if (!employee || employee.id !== profile.employeeId || employee.companyId !== profile.companyId
    || !links.length || links.some(value => value !== uid) || employee.mobileAccess?.status !== 'active'
    || !verifiedEmail || String(employee.mobileAccess?.approvedEmail || '').trim().toLowerCase() !== verifiedEmail
    || employee.isEnabled === false || employee.active === false || employee.disabled === true
    || employee.archived === true || employee.isArchived === true || employee.appDisabled === true) denied();
  return { profile, employee };
}
