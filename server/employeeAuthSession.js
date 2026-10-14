import { classifyIdentitySession } from './identitySession.js';

// Clerk's canonical account already exists. A login may refresh activity but
// must never copy a different office/mobile permission record over it.
export function preserveClerkSyncAuthorization({ token, user, sessionData, userPatch }) {
  const identity = classifyIdentitySession(token, user);
  if (identity === 'firebase-password') return { sessionData, userPatch };
  if (identity !== 'clerk' || !user.appAccess || typeof user.appAccess !== 'object') {
    throw Object.assign(new Error('The approved account identity could not be verified.'), { status: 401 });
  }
  return {
    sessionData: { ...sessionData, role: user.role, appAccess: user.appAccess, isService: user.appAccess.service === true },
    userPatch: { updatedAt: userPatch.updatedAt },
    employeePatch: { 'auth.lastLoginAt': userPatch.updatedAt, 'auth.lastAuthMethod': 'clerk', 'mobileAccess.lastLoginAt': userPatch.updatedAt },
  };
}
