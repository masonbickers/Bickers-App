import { identityKey, projectStartupSnapshot, sameIdentity, validIdentity, validateSnapshot } from './snapshot.js';
const ENVELOPE_KEY = 'bickers.startup.envelope.v1';
const dataKey = identity => `@bickers.startup.v1.${identityKey(identity)}`;
const parse = raw => { try { return JSON.parse(raw); } catch { return null; } };

export function createStartupSnapshotStore({ secureStorage, dataStorage, now = Date.now }) {
  let epoch = 0, blocked = false, restored = null;
  /** @type {{identity:import('./snapshot.js').StartupIdentity,verifiedAt:number,generation:number}|null} */
  let active = null;
  /** @type {{restored:boolean,status:string,snapshot:ReturnType<typeof projectStartupSnapshot>|null}} */
  let state = { restored: false, status: 'loading', snapshot: null };
  let tail = Promise.resolve();
  const listeners = new Set();
  const publish = (status, snapshot = null) => { state = { restored: true, status, snapshot }; listeners.forEach(fn => fn()); };
  const serialize = run => { const result = tail.then(run, run); tail = result.catch(() => {}); return result; };
  const checkEligibility = () => {
    if (state.snapshot && !validateSnapshot(state.snapshot, { now: now() })) publish('empty');
    return state;
  };
  const restore = () => {
    if (restored) return restored;
    const captured = epoch;
    restored = serialize(async () => {
      try {
        const envelope = parse(await secureStorage.getItem(ENVELOPE_KEY));
        if (captured !== epoch) return;
        if (envelope?.version !== 1 || envelope.status !== 'active' || !validIdentity(envelope.identity) || !Number.isInteger(envelope.generation)) { publish('empty'); return; }
        const payload = parse(await dataStorage.getItem(dataKey(envelope.identity)));
        if (captured !== epoch) return;
        const snapshot = validateSnapshot(payload, { identity: envelope.identity, now: now() });
        if (!snapshot || snapshot.generation !== envelope.generation || snapshot.verifiedAt !== envelope.verifiedAt) { publish('empty'); return; }
        epoch = Math.max(epoch, snapshot.generation); active = { identity: snapshot.identity, verifiedAt: snapshot.verifiedAt, generation: epoch };
        publish('available', snapshot);
      } catch { if (captured === epoch) { blocked = true; publish('unavailable'); } }
    });
    return restored;
  };
  const invalidate = reason => {
    const oldIdentity = active?.identity || state.snapshot?.identity;
    const generation = ++epoch;
    active = null; blocked = true; publish('invalidated');
    return serialize(async () => {
      // Commit the tombstone before sign-out or best-effort payload deletion.
      await secureStorage.setItem(ENVELOPE_KEY, JSON.stringify({ version: 1, status: 'invalidated', generation }));
      if (generation === epoch) blocked = false;
      if (oldIdentity) await dataStorage.removeItem(dataKey(oldIdentity)).catch(() => {});
    });
  };
  const activate = async (identity, verifiedAt, isCurrent = () => true) => {
    await restore();
    if (!isCurrent()) return null;
    if (!validIdentity(identity) || !Number.isFinite(verifiedAt) || verifiedAt > now()) throw Error('Invalid startup identity');
    if (blocked) throw Error('Startup storage requires invalidation retry');
    if (active && !sameIdentity(active.identity, identity)) await invalidate('identity-changed');
    if (!isCurrent()) return null;
    const generation = ++epoch;
    active = { identity, verifiedAt, generation };
    return generation;
  };
  const save = (view, generation) => serialize(async () => {
    if (blocked || generation !== epoch || !active || active.generation !== generation) return false;
    const incoming = projectStartupSnapshot({ ...view, ...active, savedAt: now() });
    if (!validateSnapshot(incoming, { now: now() })) return false;
    const previous = validateSnapshot(state.snapshot, { identity: active.identity, now: now() });
    // A screen only knows the dates it loaded. Preserve other saved dates;
    // a completed empty date deliberately removes its previously assigned jobs.
    const completeDates = new Set(incoming.completeDates);
    // Prioritize fresh work when the bounded projection evicts older rows.
    const jobKey = job => JSON.stringify([job.id, job.dateISO]);
    const jobs = new Map(incoming.jobs.map(job => [jobKey(job), job]));
    (previous?.jobs || []).forEach(job => {
      if (!completeDates.has(job.dateISO) && !jobs.has(jobKey(job))) jobs.set(jobKey(job), job);
    });
    const home = incoming.home || previous?.home;
    const days = new Map((incoming.home?.days || []).map(day => [day.dateISO, day]));
    (previous?.home?.days || []).forEach(day => { if (!days.has(day.dateISO)) days.set(day.dateISO, day); });
    const snapshot = projectStartupSnapshot({ ...incoming,
      ...(home ? { home: { ...home, days: [...days.values()] } } : {}),
      jobs: [...jobs.values()],
      completeDates: [...completeDates, ...(previous?.completeDates || []).filter(day => !completeDates.has(day))],
      truncated: incoming.truncated,
    });
    if (!validateSnapshot(snapshot, { now: now() })) return false;
    const key = dataKey(active.identity);
    await dataStorage.setItem(key, JSON.stringify(snapshot));
    if (blocked || generation !== epoch) return false;
    await secureStorage.setItem(ENVELOPE_KEY, JSON.stringify({ version: 1, status: 'active', ...active }));
    if (blocked || generation !== epoch) return false;
    publish('available', snapshot);
    return true;
  });
  return { restore, activate, save, invalidate, checkEligibility,
    getState: () => state, getActive: () => active,
    matchesIdentity: identity => !!active && Object.entries(identity).every(([key, value]) => active.identity[key] === value),
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); } };
}
