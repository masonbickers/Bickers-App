import { classifyIdentitySession } from './identitySession.js';
const rejectedAccessCodes = new Set([
  'permission-denied', 'unauthenticated',
  'auth/user-disabled', 'auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-not-found',
]);

export async function resolveMobileClerkAccess({ uid, getTokenResult, readUser, readEmployee, isCurrent }) {
  const denied = () => { throw Object.assign(new Error('Your current approved app identity could not be verified.'), { code: 'MOBILE_ACCESS_DENIED' }); };
  try {
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
  } catch (error) {
    if (!isCurrent()) return null;
    // Only credential/canonical-access reads enter this boundary. Preserve
    // transport failures; explicit Firebase rejection removes display eligibility.
    if (rejectedAccessCodes.has(error?.code)) denied();
    throw error;
  }
}
