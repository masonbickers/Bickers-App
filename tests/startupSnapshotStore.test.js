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

test('a partial schedule refresh retains saved jobs on other dates and replaces confirmed empty dates', async () => {
  const f=setup(), store=f.make(); await store.restore();
  const gen=await store.activate(identity,1000);
  await store.save({...view,jobs:[...view.jobs,{id:'tomorrow',dateISO:'2026-10-17',title:'Saved tomorrow'}],completeDates:['2026-10-16','2026-10-17']},gen);
  await store.save({...view,jobs:[],completeDates:['2026-10-16']},gen);
  assert.deepEqual(store.getState().snapshot.jobs.map(job=>job.title),['Saved tomorrow']);
  assert.deepEqual(store.getState().snapshot.completeDates,['2026-10-16','2026-10-17']);
  const next=f.make(); await next.restore();
  assert.deepEqual(next.getState().snapshot.jobs.map(job=>job.title),['Saved tomorrow']);
  await next.save({...view,selectedDateISO:'2026-10-17',jobs:[],completeDates:['2026-10-17']},next.getActive().generation);
  assert.deepEqual(next.getState().snapshot.jobs,[]);
});
test('partial or truncated responses cannot erase previously saved work', async () => {
  const f=setup(),store=f.make();await store.restore();
  const gen=await store.activate(identity,1000);await store.save(view,gen);
  await store.save({...view,jobs:[],completeDates:[]},gen);
  assert.equal(store.getState().snapshot.jobs[0].title,'Job');
  await store.save({...view,jobs:[],truncated:true},gen);
  assert.equal(store.getState().snapshot.jobs[0].title,'Job');
  assert.deepEqual(store.getState().snapshot.completeDates,[]);
});

test('expired and different-account snapshots are never merged into new saved work', async () => {
  for (const changeAccount of [false, true]) {
    const f=setup(),store=f.make();await store.restore();
    const gen=await store.activate(identity,1000);await store.save(view,gen);
    if (!changeAccount) f.clock(86401000);
    const next=await store.activate(changeAccount ? {...identity,uid:'other'} : identity,changeAccount ? 1000 : 86401000);
    await store.save({...view,jobs:[],completeDates:['2026-10-17']},next);
    assert.deepEqual(store.getState().snapshot.jobs,[]);
    assert.deepEqual(store.getState().snapshot.completeDates,['2026-10-17']);
  }
});

test('freshly loaded jobs take priority when retained dates fill the snapshot limit', async () => {
  const f=setup(),store=f.make();await store.restore();const gen=await store.activate(identity,1000);
  await store.save({...view,jobs:Array.from({length:200},(_,i)=>({id:`old-${i}`,dateISO:'2026-10-16',title:'Saved'}))},gen);
  await store.save({...view,selectedDateISO:'2026-10-17',jobs:[{id:'fresh',dateISO:'2026-10-17',title:'Fresh'}],completeDates:['2026-10-17']},gen);
  assert.equal(store.getState().snapshot.jobs[0].title,'Fresh');
  assert.equal(store.getState().snapshot.jobs.length,200);
});
test('a completed refresh recovers confirmed-empty dates after a truncated response', async () => {
  const f=setup(),store=f.make();await store.restore();const gen=await store.activate(identity,1000);
  await store.save({...view,truncated:true},gen);
  assert.equal(store.getState().snapshot.truncated,true);
  await store.save({...view,jobs:[]},gen);
  assert.equal(store.getState().snapshot.truncated,false);
  assert.deepEqual(store.getState().snapshot.completeDates,['2026-10-16']);
  assert.deepEqual(store.getState().snapshot.jobs,[]);
});

test('newly confirmed empty dates take priority over the saved date capacity', async () => {
  const f=setup(),store=f.make();await store.restore();const gen=await store.activate(identity,1000);
  const dates=Array.from({length:62},(_,i)=>new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10));
  await store.save({...view,jobs:[],completeDates:dates},gen);
  await store.save({...view,jobs:[]},gen);
  assert.equal(store.getState().snapshot.completeDates[0],'2026-10-16');
  assert.equal(store.getState().snapshot.completeDates.length,62);
});

test('schedule refreshes preserve the saved Home presentation for the same account', async () => {
  const f=setup(),store=f.make();await store.restore();const gen=await store.activate(identity,1000);
  const home={name:'Saved Employee',userCode:'123',days:[{dateISO:'2026-10-16',label:'Yard Based'}]};
  await store.save({...view,home},gen);
  await store.save({...view,route:'schedule'},gen);
  assert.deepEqual(store.getState().snapshot.home,home);
  const next=f.make();await next.restore();assert.deepEqual(next.getState().snapshot.home,home);
  const other=await next.activate({...identity,uid:'other'},1000);
  await next.save(view,other);assert.equal(next.getState().snapshot.home,undefined);
});
