const phases = Object.freeze({
  'clerk-token': ['A1', 'Your saved sign-in could not be refreshed. Check your connection and retry.'],
  bridge: ['A2', 'The account service could not confirm your session. Please retry.'],
  'firebase-sign-in': ['A3', 'Your account was confirmed, but app access could not be restored. Please retry.'],
  'employee-sync': ['A4', 'Your account was confirmed, but the app service could not be reached. Please retry.'],
  'account-cache': ['A5', 'Your saved app session could not be refreshed. Please retry.'],
});
export function describeClerkSessionFailure(error, { phase, diagnostic = false } = {}) {
  const selected = error?.clerkAuthPhase || phase;
  const [reference, temporary] = Object.hasOwn(phases, selected) ? phases[selected] : ['A0', 'Your app session could not be verified. Check your connection and retry.'];
  const status = error?.status;
  const message = status === 403 ? 'This account is not approved for app access.'
    : status === 401 ? 'Your sign-in has expired. Please sign in again.' : temporary;
  const kind = error?.name === 'AbortError' ? 'TIMEOUT'
    : ['auth/network-request-failed', 'network_error'].includes(error?.code) ? 'NETWORK'
    : Number.isInteger(status) && status >= 400 && status <= 599 ? String(status) : 'UNKNOWN';
  return diagnostic ? `${message} (Reference: ${reference}-${kind})` : message;
}
export async function withClerkAuthPhase(phase, operation) {
  try { return await operation(); }
  catch (error) {
    // Preserve the denial status used by logout, without retaining provider
    // response bodies, tokens, account identifiers or arbitrary error messages.
    throw Object.assign(new Error('Account verification failed.'), {
      status: error?.status, code: error?.code, name: error?.name || 'Error', clerkAuthPhase: phase,
    });
  }
}
