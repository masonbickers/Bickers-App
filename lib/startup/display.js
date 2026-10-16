import { validateSnapshot, validDate } from './snapshot.js';
export function resolveStartupDisplay({ snapshot, enabled, clerk, startupAccessStatus, loading, isAuthed, workingTermsAccepted, securityTransition, updateRequired, now = Date.now() }) {
  if (!enabled || securityTransition || updateRequired || ['denied', 'signed-out', 'terms-required'].includes(startupAccessStatus)) return null;
  if (!loading && isAuthed && workingTermsAccepted) return null;
  if (!validateSnapshot(snapshot, { now })) return null;
  if (!clerk.loading && (!clerk.hasClerkSession || clerk.clerkUserId !== snapshot.identity.clerkUserId || clerk.clerkSessionId !== snapshot.identity.clerkSessionId)) return null;
  return snapshot;
}

export const restoreStartupDate = value => validDate(value) ? new Date(`${value}T12:00:00`) : null;

/** Restore the saved day without replacing a screen that is already mounted. */
export function restoreStartupRoute(router, saved, pathname) {
  const screen = saved.route === 'schedule' ? 'schedule' : 'homescreen';
  const params = { date: saved.date };
  if (pathname === `/screens/${screen}`) {
    router.setParams(params);
  } else {
    router.replace({ pathname: `/(protected)/(main-tabs)/screens/${screen}`, params });
  }
}

/** Retain display-only saved content until the verified native destination is ready. */
export function resolveStartupHandoff(options) {
  if (!options.loading && options.isAuthed && options.isServiceOnlyUser) return null;
  const saved = resolveStartupDisplay(options);
  if (saved) return saved;
  if (options.loading || !options.isAuthed || !options.workingTermsAccepted) return null;
  const destination = options.snapshot?.route === 'schedule' ? '/screens/schedule' : '/screens/homescreen';
  if (options.pathname === destination && options.readyRoute === destination && options.readyCycle === options.handoffCycle) return null;
  // Reapply all snapshot/session/denial eligibility checks during the handoff.
  return resolveStartupDisplay({ ...options, loading: true });
}
