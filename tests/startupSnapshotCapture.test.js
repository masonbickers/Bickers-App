import test from 'node:test';import assert from 'node:assert/strict';
import {createStartupSnapshotStore} from '../lib/startup/snapshotStore.js';
const api=await import('../lib/startup/capture.js').catch(()=>({}));
const identity={clerkUserId:'u',clerkSessionId:'s',uid:'f',companyId:'c',employeeId:'e'};
test('capture persists only the verified visible view, preserves valid empty dates and rejects failed or foreign resources',async()=>{
  assert.equal(typeof api.captureStartupSnapshot,'function');
  const map=new Map(),storage={getItem:async k=>map.get(k),setItem:async(k,v)=>map.set(k,v),removeItem:async k=>map.delete(k)};
  const store=createStartupSnapshotStore({secureStorage:storage,dataStorage:storage,now:()=>1000});await store.activate(identity,1000);
  const view={route:'home',selectedDateISO:'2026-10-16',selectedJobId:'mine',jobs:[{id:'mine',dateISO:'2026-10-16',title:'Assigned job',notes:'private',email:'private'}],completeDates:['2026-10-16']};
  assert.equal(await api.captureStartupSnapshot({store,identity,enabled:true,view}),true);
  assert.equal(store.getState().snapshot.selectedJobId,'mine');assert.equal(store.getState().snapshot.jobs[0].notes,undefined);
  for(const options of [{enabled:false},{identity:{...identity,uid:'other'}}])assert.equal(await api.captureStartupSnapshot({store,identity,enabled:true,view:{...view,jobs:[]},...options}),false);
  assert.equal(store.getState().snapshot.jobs.length,1);
  await api.captureStartupSnapshot({store,identity,enabled:true,view:{...view,jobs:[]}});assert.deepEqual(store.getState().snapshot.completeDates,['2026-10-16']);
});
