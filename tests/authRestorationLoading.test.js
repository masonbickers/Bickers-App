import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import { loadVerifiedSession } from '../lib/startup/loadVerifiedSession.js';
import { resolveMobileClerkAccess } from '../lib/mobileClerkAccess.js';

const require = createRequire(import.meta.url);
const React = require('react');
const { transformSync } = require('@babel/core');
const filename = new URL('../providers/AuthProvider.tsx', import.meta.url).pathname;
const { code } = transformSync(readFileSync(filename, 'utf8'), {
  filename, configFile: false, babelrc: false,
  plugins: [['@babel/plugin-transform-typescript', { isTSX: true }], '@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});
const approved = { employeeId: 'employee', companyId: 'company', uid: 'owner', isEnabled: true, mobileAccessStatus: 'active' };

// Reproduce the render between Clerk's bridge onReady and the effect that
// reloads the employee session. Its previous sessionReady flag is still true.
function harness({ employee = null, ready = true, revision = 2, verifiedRevision = 1, error = null, hasClerkSession = true, enabled = true, user = { uid: 'owner' }, resolveAccess = async () => null, snapshotStore = null, terms = async () => ({accepted:true}), preferences = async () => [['employeeId', 'employee']] } = {}) {
  const states = [user, true, false, employee, true, null, { accepted: true }, null, 0];
  let stateIndex = 0;
  let refIndex = 0;
  const refs = [];
  const hooks = { ...React,
    useEffect() {}, useMemo: fn => fn(), useCallback: fn => fn,
    useRef: initial => refs[refIndex++] ||= { current: initial === -1 ? verifiedRevision : initial },
    useState: () => {
      const index = stateIndex++;
      return [states[index], value => { states[index] = value; }];
    },
  };
  const clerk = { enabled, ready, loading: false, hasClerkSession, error, revision, uid: 'owner', isReady: () => ready };
  const auth = { currentUser: user };
  const mocks = {
    '../lib/startup/timings': {startupTimings:{measure:async(_p,run)=>run(),mark(){}},beginForegroundTimings(){}},
    react: { ...hooks, default: hooks, __esModule: true },
    '@react-native-async-storage/async-storage': { default: { multiGet: preferences }, __esModule: true },
    'firebase/auth': {}, 'firebase/firestore': {},
    './StartupSnapshotProvider': { useStartupSnapshot: () => ({store:snapshotStore}) },
    '../lib/startup/loadVerifiedSession': { loadVerifiedSession },
    '../lib/accountSessionCache': {},
    './ClerkFirebaseProvider': { useClerkFirebase: () => clerk },
    '../lib/mobileClerkAccess': { resolveMobileClerkAccess: resolveAccess }, '../lib/access': { resolveWorkspaceAccess: () => ({ user: true, service: false }) }, '../lib/workingTermsApi': { loadWorkingTermsAcceptance: terms },
    '../firebaseConfig': { auth, db: {} },
    '../lib/sync/identity': {}, '../lib/authApi': {}, '../lib/workDiaryAccess': { resolveWorkDiaryAccess: () => false },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    assert.ok(name in mocks, `Unexpected import ${name}`);
    return mocks[name];
  } }, { filename });
  return {
    clerk, auth,
    render() { stateIndex = 0; refIndex = 0; return module.exports.AuthProvider({ children: null }).props.value; },
  };
}
const snapshot = options => harness(options).render();

test('restored Clerk bridge stays loading until its employee session is checked', () => {
  const value = snapshot();
  assert.equal(value.isAuthed, false);
  assert.equal(value.loading, true, 'the previous sessionReady must not send the owner to login');
});
test('a renewed bridge revision also waits for the matching session check', () => {
  assert.equal(snapshot({ employee: approved }).loading, true);
});
test('completed same-revision employee verification opens the approved session', () => {
  const value = snapshot({ employee: approved, verifiedRevision: 2 });
  assert.equal(value.loading, false);
  assert.equal(value.isAuthed, true);
});
test('bridge network errors expose retry and do not grant access', () => {
  const value = snapshot({ ready: false, error: 'Retry account access' });
  assert.equal(value.loading, false);
  assert.equal(value.isAuthed, false);
});
test('an existing session being verified retains the loading state', () => {
  assert.equal(snapshot({ ready: false }).loading, true);
});
test('a signed-out account can still reach login', () => {
  const value = snapshot({ ready: false, hasClerkSession: false, user: null });
  assert.equal(value.loading, false);
  assert.equal(value.isAuthed, false);
});
test('legacy authentication keeps its existing ready behavior', () => {
  const value = snapshot({ enabled: false, employee: approved });
  assert.equal(value.loading, false);
  assert.equal(value.isAuthed, true);
});

test('a restored bridge waits for the Firebase auth listener to catch up', () => {
  assert.equal(snapshot({ user: null, verifiedRevision: 2 }).loading, true);
});

const verifiedAccess = {
  profile: { ...approved, role: 'user', appAccess: { user: true, service: false } },
  employee: { ...approved, id: 'employee', mobileAccess: { status: 'active' } },
};
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('actual async session completion stamps only the checked revision', async () => {
  const pending = deferred();
  const app = harness({ resolveAccess: () => pending.promise });
  const loading = app.render().reloadSession();
  assert.equal(app.render().loading, true);
  pending.resolve(verifiedAccess);
  await loading;
  assert.equal(app.render().loading, false);
  assert.equal(app.render().isAuthed, true);
});
test('completion after a Firebase account switch cannot finish restoration', async () => {
  const pending = deferred();
  const app = harness({ resolveAccess: () => pending.promise });
  const loading = app.render().reloadSession();
  app.auth.currentUser = { uid: 'different' };
  pending.resolve(verifiedAccess);
  await loading;
  assert.equal(app.render().loading, true);
  assert.equal(app.render().employee, null);
});
test('completion from an older Clerk revision cannot finish a newer restoration', async () => {
  const pending = deferred();
  const app = harness({ resolveAccess: () => pending.promise });
  const loading = app.render().reloadSession();
  app.clerk.revision = 3;
  pending.resolve(verifiedAccess);
  await loading;
  assert.equal(app.render().loading, true);
});
test('a superseded load cannot clear the newer load pending state', async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const app = harness({ resolveAccess: () => (++calls === 1 ? first : second).promise });
  const oldLoad = app.render().reloadSession();
  const newLoad = app.render().reloadSession();
  first.resolve(verifiedAccess);
  await oldLoad;
  assert.equal(app.render().loading, true);
  second.resolve(verifiedAccess);
  await newLoad;
  assert.equal(app.render().loading, false);
  assert.equal(app.render().isAuthed, true);
});

for (const [label, resolveAccess, terms, expected] of [
  ['approved', async () => verifiedAccess, async () => ({accepted:true}), 'verified'],
  ['offline terms', async () => verifiedAccess, async () => {throw Error('offline');}, 'unavailable'],
  ['absent terms', async () => verifiedAccess, async () => null, 'terms-required'],
  ['denied', async () => {throw Object.assign(Error('denied'),{code:'MOBILE_ACCESS_DENIED'});}, async () => ({accepted:true}), 'denied'],
]) {
  test(`Auth publishes ${label} separately and only full verification activates a snapshot`, async () => {
    let activations=0, invalidations=0;
    const h=harness({resolveAccess,terms,snapshotStore:{getActive:()=>null,activate:async()=>{activations++;},invalidate:async()=>{invalidations++;}}});
    await h.render().reloadSession();const result=h.render();
    assert.equal(result.startupAccessStatus,expected);
    assert.equal(activations,expected==='verified'?1:0);
    assert.equal(invalidations,['denied','terms-required'].includes(expected)?1:0);
  });
}

for (const code of ['permission-denied', 'unauthenticated', 'auth/user-disabled', 'auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-not-found', 'unavailable', 'deadline-exceeded', 'auth/network-request-failed']) {
  test(`actual access boundary and provider distinguish ${code}`, async () => {
    let invalidations = 0, activations = 0;
    const app = harness({
      resolveAccess: deps => resolveMobileClerkAccess({...deps, getTokenResult: async () => {throw Object.assign(Error(code), {code});}}),
      snapshotStore: {getActive: () => null, invalidate: async () => {invalidations++;}, activate: async () => {activations++;}},
    });
    await app.render().reloadSession();
    const rejected = !['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(code);
    assert.equal(app.render().startupAccessStatus, rejected ? 'denied' : 'unavailable');
    assert.equal(invalidations, rejected ? 1 : 0);
    assert.equal(activations, 0);
    assert.equal(app.render().isAuthed, false);
  });
}

test('an early preference failure cannot swallow a later access denial while terms remain pending', async () => {
  const pending = deferred();
  let invalidations = 0;
  const app = harness({
    preferences: async () => {throw Error('device storage unavailable');},
    resolveAccess: () => pending.promise,
    terms: () => new Promise(() => {}),
    snapshotStore: {invalidate: async () => {invalidations++;}},
  });
  const loading = app.render().reloadSession();
  await new Promise(setImmediate);
  pending.reject(Object.assign(Error('denied'), {code: 'MOBILE_ACCESS_DENIED'}));
  await loading;
  assert.equal(app.render().startupAccessStatus, 'denied');
  assert.equal(invalidations, 1);
  assert.equal(app.render().isAuthed, false);
});

test('a preference failure after successful access never publishes partial authorization', async () => {
  let activations = 0, invalidations = 0;
  const app = harness({
    preferences: async () => {throw Object.assign(Error('storage error'), {code: 'permission-denied'});},
    resolveAccess: async () => verifiedAccess,
    snapshotStore: {getActive: () => null, activate: async () => {activations++;}, invalidate: async () => {invalidations++;}},
  });
  await app.render().reloadSession();
  assert.equal(app.render().startupAccessStatus, 'unavailable');
  assert.equal(app.render().isAuthed, false);
  assert.equal(activations, 0);
  assert.equal(invalidations, 0);
});

test('an old Firebase rejection after account replacement cannot invalidate the current snapshot', async () => {
  const pending = deferred();
  let invalidations = 0;
  const app = harness({
    resolveAccess: deps => resolveMobileClerkAccess({...deps, getTokenResult: () => pending.promise}),
    snapshotStore: {invalidate: async () => {invalidations++;}},
  });
  const loading = app.render().reloadSession();
  await new Promise(setImmediate);
  app.auth.currentUser = {uid: 'replacement'};
  pending.reject(Object.assign(Error('revoked'), {code: 'auth/user-token-expired'}));
  await loading;
  assert.equal(invalidations, 0);
  assert.equal(app.render().employee, null);
});
