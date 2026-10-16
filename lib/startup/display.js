import { validateSnapshot, validDate } from './snapshot.js';
export function resolveStartupDisplay({ snapshot, enabled, clerk, startupAccessStatus, loading, isAuthed, workingTermsAccepted, securityTransition, updateRequired, now = Date.now() }) {
  if (!enabled || securityTransition || updateRequired || ['denied', 'signed-out', 'terms-required'].includes(startupAccessStatus)) return null;
  if (!loading && isAuthed && workingTermsAccepted) return null;
  if (!validateSnapshot(snapshot, { now })) return null;
  if (!clerk.loading && (!clerk.hasClerkSession || clerk.clerkUserId !== snapshot.identity.clerkUserId || clerk.clerkSessionId !== snapshot.identity.clerkSessionId)) return null;
  return snapshot;
}

export const restoreStartupDate = value => validDate(value) ? new Date(`${value}T12:00:00`) : null;
