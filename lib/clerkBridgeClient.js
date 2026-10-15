export function clerkClientConfig({ enabled, environment, publishableKey, origin = 'https://booking.bickers.co.uk', deploymentRole = 'primary' }) {
  if (!enabled) return { enabled: false };
  const production = environment === 'production';
  if (!['primary', 'pilot'].includes(deploymentRole) || deploymentRole === 'pilot' && !production) throw new Error('The account sign-in configuration is unavailable.');
  const productionOrigin = deploymentRole === 'pilot' ? 'https://pilot.bickers.co.uk' : 'https://booking.bickers.co.uk';
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith(production ? 'pk_live_' : 'pk_test_')) throw new Error('The account sign-in configuration is unavailable.');
  const url = new URL(origin);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
    (production ? url.origin !== productionOrigin : !['http:', 'https:'].includes(url.protocol))) throw new Error('The account bridge configuration is unavailable.');
  return { enabled: true, publishableKey, origin: url.origin, deploymentRole };
}
export function createClerkBridgeClient({ origin, fetchImpl = globalThis.fetch, AbortControllerImpl = globalThis.AbortController, schedule = setTimeout, cancel = clearTimeout }) {
  return async ({ clerkToken }) => {
    if (!clerkToken) throw Object.assign(new Error('Sign in again.'), { status: 401 });
    const controller = new AbortControllerImpl();
    const timer = schedule(() => controller.abort(), 20000);
    try {
    const response = await fetchImpl(`${origin}/api/auth/firebase-token`, {
      method: 'POST', credentials: 'omit', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${clerkToken}` },
    });
    if (!response.ok) throw Object.assign(new Error(response.status === 403 ? 'This account is not approved for app access.' : 'Your app session could not be verified. Please retry.'), { status: response.status });
    return await response.json();
    } finally { cancel(timer); }
  };
}
