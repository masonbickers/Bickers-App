import { sameIdentity } from './snapshot.js';
export async function captureStartupSnapshot({ store, identity, enabled, view }) {
  const active = store?.getActive();
  if (!enabled || !active || !sameIdentity(active.identity, identity)) return false;
  return store.save(view, active.generation);
}
