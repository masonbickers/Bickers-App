// Serialize Firebase mutations across provider remounts as well as account switches.
let mutationTail = Promise.resolve();
const serialize = operation => {
  const result = mutationTail.then(operation, operation);
  mutationTail = result.catch(() => {});
  return result;
};

export function createClerkSessionCoordinator({ getClerkIdentity, getClerkToken, exchangeToken,
  getFirebaseUid, signInFirebase, signOutFirebase, signOutClerk, clearAccountCache, prepareAccountCache, checkIdentity, invalidateDisplay = () => {},
  onReady = () => {}, onBlocked = () => {}, onPending = () => {}, onSignedOut = () => {},
  now = Date.now, schedule = setTimeout, cancel = clearTimeout, AbortControllerImpl = globalThis.AbortController }) {
  let generation = 0;
  let activeKey = null;
  let completedKey = null;
  let inFlight = null;
  let timer = null;
  let disposed = false;
  let suspended = false;
  let ready = false;
  let leaseExpiresAt = 0;
  const keyOf = identity => identity?.clerkUserId && identity?.clerkSessionId ? `${identity.clerkUserId}:${identity.clerkSessionId}` : null;
  const stopTimer = () => { if (timer != null) cancel(timer); timer = null; };
  const current = (token, key) => !disposed && !suspended && token === generation && activeKey === key && keyOf(getClerkIdentity()) === key;
  const later = (delay, token, key) => {
    stopTimer();
    timer = schedule(() => { timer = null; if (current(token, key)) void reconcile(); }, delay);
  };

  const abortExchange = () => { inFlight?.controller.abort(); };
  function suspend() {
    if (disposed || suspended) return;
    suspended = true; generation++; ready = false; stopTimer(); abortExchange();
    onPending();
  }
  function resume() {
    if (disposed) return Promise.resolve();
    const requireFresh = suspended;
    suspended = false;
    return reconcile({ requireFresh });
  }

  async function signOut({ clerk = true } = {}) {
    const identity = getClerkIdentity();
    const token = ++generation; abortExchange(); activeKey = null; completedKey = null; ready = false; stopTimer();
    onPending();
    const invalidation = invalidateDisplay();
    await serialize(async () => {
      await invalidation;
      await clearAccountCache();
      await signOutFirebase();
      if (clerk && identity?.clerkSessionId) await signOutClerk({ sessionId: identity.clerkSessionId });
    });
    if (!disposed && token === generation && activeKey === null) onSignedOut();
  }

  function reconcile({ requireFresh = false } = {}) {
    if (disposed || suspended) return Promise.resolve();
    const identity = getClerkIdentity();
    const key = keyOf(identity);
    if (!key) return signOut({ clerk: false });
    const changed = key !== activeKey;
    if (changed) { generation++; activeKey = key; completedKey = null; ready = false; stopTimer(); onPending(); }
    else if (requireFresh) { generation++; ready = false; stopTimer(); onPending(); }
    const token = generation;
    if (inFlight?.generation === token) return inFlight.promise;
    abortExchange();
    const controller = new AbortControllerImpl();
    const promise = (async () => {
      let phase = 'clerk-token';
      try {
        if (checkIdentity) { await checkIdentity(identity); if (!current(token, key)) return; }
        const clerkToken = await getClerkToken();
        if (!current(token, key)) return;
        if (!clerkToken) throw Object.assign(new Error('Sign in again.'), { status: 401 });
        phase = 'bridge';
        const response = await exchangeToken({ clerkToken, signal: controller.signal });
        if (!current(token, key)) return;
        if (!response?.customToken || !/^[A-Za-z0-9_-]{1,128}$/.test(response.uid || '') ||
          !Number.isFinite(response.leaseExpiresAt) || response.leaseExpiresAt <= now()) {
          throw Object.assign(new Error('The application session was not confirmed.'), { status: 503 });
        }
        await serialize(async () => {
          if (!current(token, key)) return;
          if (completedKey !== key || getFirebaseUid() !== response.uid) {
            phase = 'account-cache';
            completedKey = null;
            if (prepareAccountCache) await prepareAccountCache({ clerkIdentity: identity, uid: response.uid });
            else await clearAccountCache();
            if (!current(token, key)) return;
            await signOutFirebase();
          }
          if (!current(token, key)) return;
          if (completedKey !== key || getFirebaseUid() !== response.uid) {
            phase = 'firebase-sign-in';
            await signInFirebase(response.customToken);
            if (!current(token, key)) { await signOutFirebase(); return; }
            if (getFirebaseUid() !== response.uid) {
              await signOutFirebase();
              throw Object.assign(new Error('The Firebase credential did not match the approved identity.'), { status: 503 });
            }
          }
          completedKey = key;
          leaseExpiresAt = response.leaseExpiresAt;
          ready = true;
          onReady(response);
        });
        if (current(token, key)) later(Math.max(1000, Math.min(240000, response.leaseExpiresAt - now() - 60000)), token, key);
      } catch (error) {
        if (!current(token, key)) return;
        ready = false;
        onBlocked(error, { phase });
        if ([401, 403].includes(error?.status)) await signOut();
        else later(5000, token, key);
      } finally { if (inFlight?.generation === token) inFlight = null; }
    })();
    inFlight = { generation: token, promise, controller };
    return promise;
  }
  return { reconcile, suspend, resume, signOut, isReady: () => ready && !disposed && !suspended && now() < leaseExpiresAt,
    dispose: () => { disposed = true; generation++; abortExchange(); activeKey = null; completedKey = null; ready = false; stopTimer(); } };
}
