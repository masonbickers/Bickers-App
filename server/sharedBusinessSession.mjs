// Read-only business authorization contract from the pinned shared Firebase rules.
// Provider verification precedes this predicate. It never creates/renews a lease,
// clears recovery flags, changes identity or performs migration/bootstrap work.
export const LEGACY_CLERK_INSTANCE_ID = 'ins_3GUkXKRF1LLr0E5Z5OS7LeHJO34';
const own = (value, key) => Object.hasOwn(value, key);
const map = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const get = (value, key, fallback) => map(value) && own(value, key) ? value[key] : fallback;
const number = value => typeof value === 'number' && Number.isFinite(value);
const text = value => typeof value === 'string' && value.length > 0;
const link = (value, expected) => value === '' || value === null || value === expected;

export function captureBusinessSessionClaims(token) {
  const keys = ['uid', 'auth_time', 'authMethod', 'verifiedClerkEmail', 'identityLinkVersion', 'identityCompanyId', 'identityEmployeeId', 'clerkUserId', 'clerkSessionId', 'clerkLeaseVersion'];
  const claims = structuredClone(Object.fromEntries(keys.filter(key => own(token, key)).map(key => [key, token[key]])));
  claims.firebase = structuredClone({ sign_in_provider: token.firebase?.sign_in_provider });
  const freeze = value => {
    if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
    return value;
  };
  return freeze(claims);
}

export function sharedBusinessSessionAllowed(token, user, { nowMs = Date.now() } = {}) {
  if (!map(token) || !map(user) || !number(nowMs) || user.isEnabled !== true ||
      user.active === false || user.disabled === true || user.appDisabled === true ||
      user.archived === true || user.isArchived === true) return false;
  const cutoff = get(user, 'sessionValidAfter', 0);
  if (!text(user.uid) || user.uid !== token.uid || !number(token.auth_time) || token.auth_time <= 0 ||
      !number(cutoff) || cutoff < 0 || cutoff >= 10000000000 || token.auth_time <= cutoff ||
      user.sessionsRevokedAt != null && !own(user, 'sessionValidAfter') ||
      get(user, 'passwordResetRequired', false) !== false) return false;
  const provider = get(token.firebase, 'sign_in_provider', '');
  if (provider === 'password') {
    const appCutoff = get(user, 'appPasswordSessionAfter', 0);
    const reset = get(user, 'firebasePasswordResetAfter', null);
    return user.authMigrationState !== 'clerk-only' && get(user, 'appPasswordSetupRequired', false) === false &&
      (reset === null || reset === 0) && user.mobileAccessStatus === 'active' &&
      text(user.employeeId) && text(user.companyId) && number(appCutoff) && appCutoff >= 0 &&
      appCutoff < 10000000000 && token.auth_time > appCutoff;
  }
  const grant = user.legacyClerkWebAccess;
  const legacyEmptyEmployee = !own(token, 'clerkLeaseVersion') && map(grant) && grant.allowEmptyEmployeeClaim === true;
  const employeeId = get(token, 'identityEmployeeId', null);
  if (provider !== 'custom' || token.authMethod !== 'clerk' || token.verifiedClerkEmail !== true || token.identityLinkVersion !== 2 ||
      (own(token, 'clerkLeaseVersion') || own(token, 'clerkSessionId')) && !text(token.clerkSessionId) ||
      !text(token.clerkUserId) || !link(get(user, 'clerkUserId', ''), token.clerkUserId) ||
      !link(get(user.auth, 'clerkUserId', ''), token.clerkUserId) ||
      get(token, 'identityCompanyId', '') !== get(user, 'companyId', '') || typeof employeeId !== 'string' ||
      !(employeeId === get(user, 'employeeId', '') || legacyEmptyEmployee && employeeId === '') ||
      user.clerkPasswordResetAfter != null) return false;
  const lease = get(user.clerkSessionLeases, token.clerkSessionId, null);
  if (token.clerkLeaseVersion === 1 && user.clerkLeaseRequired === true && map(lease) && lease.status === 'active' &&
      lease.uid === token.uid && lease.companyId === get(user, 'companyId', '') && lease.clerkUserId === token.clerkUserId &&
      lease.clerkSessionId === token.clerkSessionId && number(lease.sessionCreatedAt) && lease.sessionCreatedAt > cutoff &&
      number(lease.validUntilMs) && nowMs < lease.validUntilMs) return true;
  if (own(token, 'clerkLeaseVersion') || own(user, 'clerkLeaseRequired') || own(user, 'clerkSessionLeases') ||
      user.authMigrationState === 'clerk-only' || !map(grant)) return false;
  const role = typeof user.role === 'string' ? user.role.toLowerCase() : null;
  return grant.version === 1 && grant.instanceId === LEGACY_CLERK_INSTANCE_ID && grant.uid === token.uid &&
    grant.clerkUserId === token.clerkUserId && grant.companyId === get(user, 'companyId', '') &&
    get(grant, 'employeeId', null) === get(user, 'employeeId', '') && role !== null && grant.role === role &&
    typeof grant.allowEmptyEmployeeClaim === 'boolean' && grant.allowEmptyEmployeeClaim === ['admin', 'platformadmin'].includes(role) &&
    Number.isSafeInteger(grant.issuedAtMs) && grant.issuedAtMs > 0 && Number.isSafeInteger(grant.validUntilMs) &&
    grant.validUntilMs > grant.issuedAtMs && grant.validUntilMs - grant.issuedAtMs <= 1209600000 &&
    grant.issuedAtMs <= nowMs && nowMs < grant.validUntilMs;
}

// Capture only after existing trusted lifecycle/recovery processing finishes.
// Keeping this separate avoids changing the pilot's renewal convergence loop.
export function businessSessionFingerprint(user) {
  const keys = ['uid', 'companyId', 'employeeId', 'role', 'isEnabled', 'active', 'disabled', 'appDisabled', 'archived', 'isArchived', 'appAccess', 'hrApprovalAccess', 'featureFlags', 'isService', 'sessionValidAfter', 'sessionsRevokedAt', 'passwordResetRequired', 'firebasePasswordResetAfter', 'clerkPasswordResetAfter', 'appPasswordSetupRequired', 'appPasswordSessionAfter', 'mobileAccessStatus', 'clerkUserId', 'authMigrationState', 'clerkLeaseRequired', 'clerkSessionLeases', 'legacyClerkWebAccess'];
  const state = { ...Object.fromEntries(keys.map(key => [key, user[key]])), nestedClerkUserId: user.auth?.clerkUserId };
  return JSON.stringify(state, (_key, value) => map(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
}
