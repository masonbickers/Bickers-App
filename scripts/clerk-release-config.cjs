// Build-time checks only. No server credential belongs in a native bundle.
function requireClerkReleaseConfig(environment = {}, config = {}) {
  if (environment.EXPO_PUBLIC_CLERK_SHARED_AUTH_ENABLED !== '1') return { enabled: false };
  const production = environment.EXPO_PUBLIC_APP_ENV === 'production';
  const role = environment.EXPO_PUBLIC_CLERK_DEPLOYMENT_ROLE || 'primary';
  const key = environment.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  const errors = [];
  // EAS evaluates dynamic config locally before it supplies cloud-worker metadata.
  const wrongPilotProfile = environment.EAS_BUILD_PROFILE ? environment.EAS_BUILD_PROFILE !== 'clerk-pilot' : environment.EAS_BUILD === 'true';
  if (!['primary', 'pilot'].includes(role) || role === 'pilot' && (!production || wrongPilotProfile)) errors.push('The Clerk pilot is restricted to its production pilot build profile.');
  if (production ? key !== 'pk_live_Y2xlcmsuYmlja2Vycy5jby51ayQ' : !key.startsWith('pk_test_')) errors.push('Clerk credentials must match the build environment.');
  if (config.ios?.bundleIdentifier !== 'com.bickers.booking' || config.android?.package !== 'com.bickers.bickersapp' || config.scheme !== 'bickersapp') errors.push('Both registered native identifiers and the app scheme are required.');
  if (config.runtimeVersion?.policy !== 'appVersion') errors.push('Clerk native modules require a separate app-version runtime.');
  const plugins = (config.plugins || []).map(plugin => Array.isArray(plugin) ? plugin[0] : plugin);
  if (!plugins.includes('@clerk/expo') || !plugins.includes('expo-secure-store') || !plugins.includes('expo-web-browser')) errors.push('Clerk callback, secure storage and browser plugins are required.');
  const bridge = environment.EXPO_PUBLIC_CLERK_BRIDGE_ORIGIN || 'https://booking.bickers.co.uk';
  try {
    const url = new URL(bridge);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (production ? url.origin !== (role === 'pilot' ? 'https://pilot.bickers.co.uk' : 'https://booking.bickers.co.uk') : !['http:', 'https:'].includes(url.protocol))) throw new Error();
  } catch { errors.push('The account bridge is not valid for this build.'); }
  if (!production && !environment.EXPO_PUBLIC_CLERK_RECOVERY_URL) errors.push('Development builds require a separate recovery page.');
  if (errors.length) throw new Error(`Invalid native authentication configuration:\n- ${errors.join('\n- ')}`);
  return { enabled: true, production };
}
module.exports = { requireClerkReleaseConfig };
