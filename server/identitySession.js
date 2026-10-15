// Consume only claims verified by Firebase; this module never parses raw JWTs.
const present = value => typeof value === 'string' && value.trim().length > 0;
const linkMatches = (value, expected) => value == null || value === '' || value === expected;
const seconds = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 10000000000;
export function isTrustedClerkIdentity(token, profile = {}) {
  return token?.firebase?.sign_in_provider === 'custom' && token.authMethod === 'clerk'
    && token.verifiedClerkEmail === true && token.identityLinkVersion === 2
    && present(token.clerkUserId) && present(token.clerkSessionId)
    && present(profile.uid) && token.uid === profile.uid
    && linkMatches(profile.clerkUserId, token.clerkUserId)
    && linkMatches(profile.auth?.clerkUserId, token.clerkUserId)
    && token.identityCompanyId === (profile.companyId ?? '')
    && (!profile.employeeId || token.identityEmployeeId === profile.employeeId);
}
export function classifyIdentitySession(token, profile = {}) {
  const cutoff = profile.sessionValidAfter ?? 0;
  if (profile.isEnabled !== true || profile.active === false || profile.disabled === true
    || profile.appDisabled === true || profile.archived === true || profile.isArchived === true
    || !present(profile.uid) || token?.uid !== profile.uid
    || !seconds(cutoff) || !seconds(token?.auth_time) || token.auth_time <= cutoff
    || profile.sessionsRevokedAt != null && profile.sessionValidAfter == null
    || profile.passwordResetRequired === true) return 'denied';
  if (isTrustedClerkIdentity(token, profile)) return profile.clerkPasswordResetAfter ? 'denied' : 'clerk';
  const appCutoff = profile.appPasswordSessionAfter ?? 0;
  if (token?.firebase?.sign_in_provider !== 'password' || profile.authMigrationState === 'clerk-only'
    || profile.appPasswordSetupRequired === true || profile.firebasePasswordResetAfter
    || !seconds(appCutoff) || token.auth_time <= appCutoff) return 'denied';
  return 'firebase-password';
}
export function identityAuthMetadata(token, previous = {}) {
  return token?.firebase?.sign_in_provider === 'password'
    ? { passwordEnabled: true, lastAuthMethod: 'firebase-password' }
    : { ...(typeof previous.passwordEnabled === 'boolean' ? { passwordEnabled: previous.passwordEnabled } : {}), lastAuthMethod: 'clerk' };
}
