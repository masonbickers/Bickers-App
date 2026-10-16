import test from 'node:test';
import assert from 'node:assert/strict';
import { createClerkSessionCoordinator } from '../lib/clerkSessionCoordinator.js';
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function fixture() {
  const state = { identity: { clerkUserId: 'user_1', clerkSessionId: 'sess_1' }, uid: null, ready: [], blocked: [], mutations: [], scheduled: [], now: 1000000 };
  const deps = { getClerkIdentity: () => state.identity, getClerkToken: async () => 'fixture-token',
    exchangeToken: async () => ({ customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 }),
    getFirebaseUid: () => state.uid, signInFirebase: async token => { state.uid = token === 'custom_1' ? 'uid_1' : 'uid_2'; state.mutations.push(['in', state.uid]); },
    signOutFirebase: async () => { state.uid = null; state.mutations.push(['out']); }, signOutClerk: async () => { state.mutations.push(['clerk-out']); },
    clearAccountCache: async () => { state.mutations.push(['clear']); }, onReady: value => state.ready.push(value.uid), onBlocked: error => state.blocked.push(error?.status || 0),
    now: () => state.now, schedule: (callback, delay) => { const timer = { callback, delay }; state.scheduled.push(timer); return timer; }, cancel: timer => { timer.cancelled = true; } };
  return { state, deps, coordinator: createClerkSessionCoordinator(deps) };
}
test('a fresh Clerk identity bridges before reporting ready and schedules renewal before expiry', async () => {
  const { state, coordinator } = fixture(); await coordinator.reconcile();
  assert.equal(state.uid, 'uid_1'); assert.deepEqual(state.ready, ['uid_1']);
  assert.equal(coordinator.isReady(), true);
  assert.equal(state.scheduled.at(-1).delay, 240000);
  assert.deepEqual(state.mutations, [['clear'], ['out'], ['in', 'uid_1']]);
});
test('concurrent renewal callers share one bridge request', async () => {
  const { state, deps } = fixture(); const gate = deferred(); let requests = 0;
  deps.exchangeToken = async () => { requests++; return gate.promise; }; const coordinator = createClerkSessionCoordinator(deps);
  const first = coordinator.reconcile(); const second = coordinator.reconcile();
  gate.resolve({ customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 });
  await Promise.all([first, second]); assert.equal(requests, 1); assert.deepEqual(state.ready, ['uid_1']);
});
test('sign-out invalidates a pending bridge response before it can restore Firebase', async () => {
  const { state, deps } = fixture(); const gate = deferred(); deps.exchangeToken = () => gate.promise;
  const coordinator = createClerkSessionCoordinator(deps); const pending = coordinator.reconcile();
  await coordinator.signOut(); gate.resolve({ customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 }); await pending;
  assert.equal(state.uid, null); assert.deepEqual(state.ready, []);
  assert.equal(state.mutations.some(row => row[0] === 'in'), false);
});
test('an account switch ignores the old bridge response and clears cache before the new sign-in', async () => {
  const { state, deps } = fixture(); const firstGate = deferred(); const secondGate = deferred(); let requests = 0;
  deps.exchangeToken = () => ++requests === 1 ? firstGate.promise : secondGate.promise;
  const coordinator = createClerkSessionCoordinator(deps); const old = coordinator.reconcile();
  await Promise.resolve(); await Promise.resolve();
  state.identity = { clerkUserId: 'user_2', clerkSessionId: 'sess_2' }; const current = coordinator.reconcile();
  secondGate.resolve({ customToken: 'custom_2', uid: 'uid_2', leaseExpiresAt: 1300000 }); await current;
  firstGate.resolve({ customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 }); await old;
  assert.equal(state.uid, 'uid_2'); assert.deepEqual(state.ready, ['uid_2']);
});
test('a disposed provider cannot sign out a newer provider after delayed Firebase sign-in', async () => {
  const { state, deps } = fixture(); const entered = deferred(); const finish = deferred();
  const realSignIn = deps.signInFirebase;
  deps.signInFirebase = async token => { entered.resolve(); await finish.promise; await realSignIn(token); };
  const oldCoordinator = createClerkSessionCoordinator(deps); const old = oldCoordinator.reconcile(); await entered.promise;
  oldCoordinator.dispose(); state.identity = { clerkUserId: 'user_2', clerkSessionId: 'sess_2' };
  const nextDeps = { ...deps, signInFirebase: realSignIn, exchangeToken: async () => ({ customToken: 'custom_2', uid: 'uid_2', leaseExpiresAt: 1300000 }) };
  const next = createClerkSessionCoordinator(nextDeps).reconcile(); finish.resolve(); await Promise.all([old, next]);
  assert.equal(state.uid, 'uid_2'); assert.deepEqual(state.ready, ['uid_2']);
});
test('a network outage blocks readiness and retries without signing out Clerk', async () => {
  const { state, deps } = fixture(); deps.exchangeToken = async () => { throw Object.assign(new Error('offline'), { status: 503 }); };
  const coordinator = createClerkSessionCoordinator(deps); await coordinator.reconcile();
  assert.deepEqual(state.ready, []); assert.deepEqual(state.blocked, [503]); assert.equal(state.scheduled.at(-1).delay, 5000);
  assert.equal(coordinator.isReady(), false);
  assert.equal(state.mutations.some(row => row[0] === 'clerk-out'), false);
});
test('a revoked provider session clears both sign-in systems and stops renewal', async () => {
  const { state, deps } = fixture(); deps.exchangeToken = async () => { throw Object.assign(new Error('revoked'), { status: 401 }); };
  const coordinator = createClerkSessionCoordinator(deps); await coordinator.reconcile();
  assert.equal(state.uid, null); assert.ok(state.mutations.some(row => row[0] === 'clerk-out')); assert.equal(state.scheduled.length, 0);
});
test('same-identity renewal refreshes the lease without replacing Firebase authentication', async () => {
  const { state, coordinator } = fixture(); await coordinator.reconcile(); state.now += 240000;
  await coordinator.reconcile(); assert.equal(state.mutations.filter(row => row[0] === 'in').length, 1);
  assert.deepEqual(state.ready, ['uid_1', 'uid_1']);
});
test('a forced freshness check blocks access immediately while renewing the current identity', async () => {
  const { state, deps } = fixture(); const gate = deferred(); let wait = false;
  const coordinator = createClerkSessionCoordinator({ ...deps, exchangeToken: async () => wait ? gate.promise : { customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 } });
  await coordinator.reconcile(); wait = true;
  const pending = coordinator.reconcile({ requireFresh: true }); assert.equal(coordinator.isReady(), false);
  gate.resolve({ customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 }); await pending;
  assert.equal(coordinator.isReady(), true); assert.equal(state.uid, 'uid_1');
});
test('a changed canonical UID clears the previous account cache before replacing Firebase', async () => {
  const { state, deps } = fixture();
  const responses = [{ customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 }, { customToken: 'custom_2', uid: 'uid_2', leaseExpiresAt: 1300000 }];
  const next = createClerkSessionCoordinator({ ...deps, exchangeToken: async () => responses.shift() });
  await next.reconcile(); await next.reconcile();
  assert.deepEqual(state.mutations, [['clear'], ['out'], ['in', 'uid_1'], ['clear'], ['out'], ['in', 'uid_2']]);
});
test('a Firebase credential UID that contradicts the bridge response never reports readiness', async () => {
  const { state, deps } = fixture();
  const coordinator = createClerkSessionCoordinator({ ...deps, exchangeToken: async () => ({ customToken: 'custom_2', uid: 'uid_1', leaseExpiresAt: 1300000 }) });
  await coordinator.reconcile(); assert.equal(state.uid, null); assert.deepEqual(state.ready, []); assert.deepEqual(state.blocked, [503]);
});
test('an old sign-out targets its captured Clerk session and cannot cancel a newer identity', async () => {
  const { state, deps } = fixture(); const entered = deferred(); const finish = deferred(); let once = true;
  const realOut = deps.signOutFirebase;
  deps.signOutFirebase = async () => { if (once) { once = false; entered.resolve(); await finish.promise; } await realOut(); };
  deps.signOutClerk = async options => { if (!options?.sessionId || options.sessionId === state.identity?.clerkSessionId) state.identity = null; };
  deps.exchangeToken = async () => ({ customToken: 'custom_2', uid: 'uid_2', leaseExpiresAt: 1300000 });
  const coordinator = createClerkSessionCoordinator(deps); const old = coordinator.signOut(); await entered.promise;
  state.identity = { clerkUserId: 'user_2', clerkSessionId: 'sess_2' }; const next = coordinator.reconcile(); finish.resolve();
  await Promise.all([old, next]); assert.equal(state.uid, 'uid_2'); assert.deepEqual(state.ready, ['uid_2']);
});
test('a suspended renewal timer cannot leave an expired lease ready',async()=>{
  const {state,coordinator}=fixture();await coordinator.reconcile();state.now=1300000;
  assert.equal(coordinator.isReady(),false);
});

for (const [operation, expectedPhase] of [['getClerkToken', 'clerk-token'], ['exchangeToken', 'bridge'], ['clearAccountCache', 'account-cache'], ['signInFirebase', 'firebase-sign-in']]) {
  test(`a ${operation} failure identifies its stage without granting readiness`, async () => {
    const { deps, state } = fixture();
    const failure = new Error('network unavailable');
    deps[operation] = async () => { throw failure; };
    let observed;
    deps.onBlocked = (error, context) => { observed = { error, phase: context.phase }; };
    const coordinator = createClerkSessionCoordinator(deps);
    await coordinator.reconcile();
    assert.equal(coordinator.isReady(), false);
    assert.equal(observed.error, failure);
    assert.equal(observed.phase, expectedPhase);
    assert.deepEqual(state.ready, []);
  });
}

test('backgrounding cancels an in-flight exchange and resume starts a fresh guarded exchange', async () => {
  const { state, deps } = fixture();
  const requests = [];
  deps.exchangeToken = ({ signal }) => new Promise((resolve, reject) => {
    requests.push({ signal, resolve });
    signal.addEventListener('abort', () => reject(Object.assign(Error('cancelled'), { name: 'AbortError' })), { once: true });
  });
  const coordinator = createClerkSessionCoordinator(deps);
  const pending = coordinator.reconcile();
  await Promise.resolve();
  assert.equal(requests.length, 1);
  coordinator.suspend();
  assert.equal(requests[0].signal.aborted, true);
  await pending;
  assert.deepEqual(state.blocked, []);
  await coordinator.reconcile();
  assert.equal(requests.length, 1);
  const resumed = coordinator.resume();
  await Promise.resolve();
  assert.equal(requests.length, 2);
  requests[1].resolve({ customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 });
  await resumed;
  assert.equal(coordinator.isReady(), true);
  assert.deepEqual(state.ready, ['uid_1']);
});

test('background renewal timers cannot send requests or retain readiness; foreground still rechecks access', async () => {
  const { state, deps } = fixture(); let requests = 0;
  const exchange = deps.exchangeToken;
  deps.exchangeToken = async args => { requests++; return exchange(args); };
  const coordinator = createClerkSessionCoordinator(deps);
  await coordinator.reconcile();
  const scheduled = state.scheduled.at(-1);
  coordinator.suspend();
  assert.equal(scheduled.cancelled, true);
  assert.equal(coordinator.isReady(), false);
  scheduled.callback();
  await Promise.resolve();
  assert.equal(requests, 1);
  await coordinator.resume();
  assert.equal(requests, 2);
  assert.equal(coordinator.isReady(), true);
});

test('a suspended request that ignores abort cannot publish a late timeout after successful resume', async () => {
  const { state, deps } = fixture();
  let failOld; let requests = 0;
  deps.exchangeToken = async () => {
    requests++;
    if (requests === 1) return new Promise((_resolve, reject) => { failOld = reject; });
    return { customToken: 'custom_1', uid: 'uid_1', leaseExpiresAt: 1300000 };
  };
  const coordinator = createClerkSessionCoordinator(deps);
  const old = coordinator.reconcile();
  await Promise.resolve();
  coordinator.suspend();
  await coordinator.resume();
  assert.equal(coordinator.isReady(), true);
  failOld(Object.assign(Error('late deadline'), { name: 'AbortError' }));
  await old;
  assert.equal(coordinator.isReady(), true);
  assert.deepEqual(state.blocked, []);
  assert.deepEqual(state.ready, ['uid_1']);
});

test('cold restoration prepares a matching account cache without deleting it, but still obtains fresh Firebase auth', async () => {
  const {state,deps}=fixture(); state.uid='uid_1';
  const coordinator=createClerkSessionCoordinator({...deps,prepareAccountCache:async args=>{assert.equal(args.uid,'uid_1');assert.deepEqual(args.clerkIdentity,state.identity);}});
  await coordinator.reconcile();
  assert.deepEqual(state.mutations,[['out'],['in','uid_1']]);
});
test('logout hides display synchronously and awaits durable invalidation before signing out', async () => {
  const {state,deps}=fixture(); const gate=deferred(); let visible=true;
  const coordinator=createClerkSessionCoordinator({...deps,invalidateDisplay:()=>{visible=false;return gate.promise;}});
  const pending=coordinator.signOut(); assert.equal(visible,false);
  await Promise.resolve();assert.deepEqual(state.mutations,[]);
  gate.resolve();await pending;assert.deepEqual(state.mutations,[['clear'],['out'],['clerk-out']]);
});
