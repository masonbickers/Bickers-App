import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require = createRequire(import.meta.url), React = require('react');
const { transformSync } = require('@babel/core');
const filename = new URL('../providers/ClerkFirebaseProvider.jsx', import.meta.url).pathname;
const { code } = transformSync(readFileSync(filename, 'utf8') + '\nexport { ClerkRuntime };', { filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] });
test('verified Clerk Firebase sign-in is not blocked by the separate Render employee-sync service', async () => {
  const effects = []; let deps;
  const user = { uid: 'owner', getIdToken: async () => 'firebase-token' };
  const hooks = { ...React, useEffect: effect => effects.push(effect), useRef: current => ({ current }), useState: initial => [initial, () => {}], useCallback: fn => fn };
  const sdk = { isLoaded: false, isSignedIn: false };
  const mocks = {
    react: { ...hooks, default: hooks, __esModule: true },
    '@clerk/expo': { useAuth: () => sdk, useClerk: () => ({}), useSignIn: () => ({}), useUser: () => ({}) },
    '@clerk/expo/hosted-auth': { useHostedAuth: () => ({}) },
    'firebase/auth': { onIdTokenChanged: () => () => {}, signInWithCustomToken: async () => ({ user }) },
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    '../firebaseConfig': { auth: {} },
    '../lib/authApi': { syncEmployeeAuth: async () => { throw Error('Render unavailable'); } },
    '../lib/clerkBridgeClient': { createClerkBridgeClient: () => () => {} },
    '../lib/clerkSessionCoordinator': { createClerkSessionCoordinator: options => { deps = options; return { isReady: () => false }; } },
    '../lib/clerkSignInFlow': { createClerkSignInFlow: () => ({}) },
    '../lib/clerkSessionFailure': { withClerkAuthPhase: async (_phase, run) => run() },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { exports: module.exports, module, require: name => mocks[name] || {} }, { filename });
  module.exports.ClerkRuntime({ config: { origin: 'https://pilot.bickers.co.uk', deploymentRole: 'pilot' }, children: null });
  effects[0]();
  await assert.doesNotReject(deps.signInFirebase('verified-custom-token'));
});
