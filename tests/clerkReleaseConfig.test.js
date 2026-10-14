import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { requireClerkReleaseConfig } = createRequire(import.meta.url)('../scripts/clerk-release-config.cjs');
const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url))).expo;
const production = { EXPO_PUBLIC_CLERK_SHARED_AUTH_ENABLED: '1', EXPO_PUBLIC_APP_ENV: 'production',
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_Y2xlcmsuYmlja2Vycy5jby51ayQ', EXPO_PUBLIC_CLERK_BRIDGE_ORIGIN: 'https://booking.bickers.co.uk' };
test('Clerk native releases require both registered identifiers, native plugins and a separate runtime', () => {
  assert.doesNotThrow(() => requireClerkReleaseConfig(production, config));
  for (const patch of [{ ios: {} }, { android: {} }, { plugins: [] }, { runtimeVersion: '5.0.12' }]) assert.throws(() => requireClerkReleaseConfig(production, { ...config, ...patch }));
});
test('Clerk release keys cannot cross production and preview environments or choose another bridge', () => {
  for (const patch of [{ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_fixture' }, { EXPO_PUBLIC_APP_ENV: 'staging' }, { EXPO_PUBLIC_CLERK_BRIDGE_ORIGIN: 'https://foreign.example' }]) assert.throws(() => requireClerkReleaseConfig({ ...production, ...patch }, config));
  assert.doesNotThrow(() => requireClerkReleaseConfig({}, config));
});
test('the signed Clerk pilot has an isolated channel and runtime without enabling normal production sign-in',()=>{
  const eas=JSON.parse(readFileSync(new URL('../eas.json',import.meta.url)));
  assert.equal(config.version,'5.0.14');
  assert.equal(eas.build['clerk-pilot']?.channel,'clerk-pilot');
  assert.equal(eas.build['clerk-pilot']?.extends,'internal');
  assert.equal(eas.build['clerk-pilot']?.env.EXPO_PUBLIC_CLERK_SHARED_AUTH_ENABLED,'1');
  assert.notEqual(eas.build.production.env.EXPO_PUBLIC_CLERK_SHARED_AUTH_ENABLED,'1');
  assert.equal(config.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='@clerk/expo')?.[1].appleSignIn,false);
});
