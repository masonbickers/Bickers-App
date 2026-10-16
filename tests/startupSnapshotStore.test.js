import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../lib/startup/snapshotStore.js').catch(() => ({}));
const identity = { clerkUserId:'u',clerkSessionId:'s',uid:'f',companyId:'c',employeeId:'e' };
const view = { route:'home',selectedDateISO:'2026-10-16',jobs:[{id:'j',dateISO:'2026-10-16',title:'Job'}],completeDates:['2026-10-16'] };
function setup() {
  const secure = new Map(), data = new Map(); let now = 1000;
  const io = map => ({getItem:async k=>map.get(k)||null,setItem:async(k,v)=>{map.set(k,v);},removeItem:async k=>{map.delete(k);}});
  const deps = {secureStorage:io(secure),dataStorage:io(data),now:()=>now};
  return { deps, secure, data, clock:v=>{now=v;}, make:()=>api.createStartupSnapshotStore(deps) };
}
test('eligible snapshot restores after process restart, expires, and exact session changes invalidate', async () => {
  assert.equal(typeof api.createStartupSnapshotStore,'function');
  const f=setup(), store=f.make(); await store.restore();
  const gen=await store.activate(identity,1000); await store.save(view,gen);
  const next=f.make(); await next.restore(); assert.equal(next.getState().snapshot.jobs[0].title,'Job');
  assert.equal(next.matchesIdentity(identity),true);
  assert.equal(next.matchesIdentity({...identity,clerkSessionId:'S'}),false);
  f.clock(86401000); next.checkEligibility(); assert.equal(next.getState().snapshot,null);
});
test('durable logout survives failed deletion and rejects delayed old saves', async () => {
  assert.equal(typeof api.createStartupSnapshotStore,'function');
  const f=setup(), store=f.make(); await store.restore();
  const gen=await store.activate(identity,1000); await store.save(view,gen);
  f.deps.dataStorage.removeItem=async()=>{throw Error('disk');};
  const invalidating=store.invalidate('signed-out'); assert.equal(store.getState().snapshot,null);
  await invalidating; assert.equal(await store.save(view,gen),false);
  const next=f.make(); await next.restore(); assert.equal(next.getState().snapshot,null);
});
test('storage failure cannot activate a successor or report successful invalidation', async () => {
  assert.equal(typeof api.createStartupSnapshotStore,'function');
  const f=setup(),store=f.make(); await store.restore();
  const gen=await store.activate(identity,1000); await store.save(view,gen);
  f.deps.secureStorage.setItem=async()=>{throw Error('locked');};
  await assert.rejects(store.invalidate('signed-out')); assert.equal(store.getState().snapshot,null);
  await assert.rejects(store.activate({...identity,uid:'new'},1000));
});
test('restoration and delayed payload writes cannot resurrect an invalidated generation', async () => {
  assert.equal(typeof api.createStartupSnapshotStore,'function');
  const f=setup(),store=f.make(); await store.restore();
  const gen=await store.activate(identity,1000); await store.save(view,gen);
  let release; const real=f.deps.dataStorage.setItem;
  f.deps.dataStorage.setItem=async(...args)=>{await new Promise(r=>{release=r;});return real(...args);};
  const pending=store.save({...view,selectedJobId:'j'},gen);
  await new Promise(r=>setImmediate(r)); const removed=store.invalidate('denied'); release();
  await pending; await removed;
  assert.equal(store.getState().snapshot,null);
  const next=f.make(); await next.restore(); assert.equal(next.getState().snapshot,null);
});
test('secure read failure and malformed payload never become display eligible', async () => {
  assert.equal(typeof api.createStartupSnapshotStore,'function');
  const f=setup(); f.deps.secureStorage.getItem=async()=>{throw Error('locked');};
  const store=f.make(); await store.restore(); assert.equal(store.getState().status,'unavailable');
});

test('a superseded verification cannot activate a snapshot after storage restoration yields', async () => {
  const f=setup(),store=f.make();await store.restore();let current=true;
  const pending=store.activate(identity,1000,()=>current);current=false;
  assert.equal(await pending,null);assert.equal(store.getActive(),null);
});
