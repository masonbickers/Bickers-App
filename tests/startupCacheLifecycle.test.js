import assert from 'node:assert/strict';
import test from 'node:test';
import {createStartupSnapshotStore} from '../lib/startup/snapshotStore.js';
const api=await import('../lib/startup/cacheLifecycle.js').catch(()=>({}));
const identity={clerkUserId:'u',clerkSessionId:'s',uid:'f',companyId:'c',employeeId:'e'};
async function fixture(){const map=new Map();const storage={getItem:async k=>map.get(k),setItem:async(k,v)=>map.set(k,v),removeItem:async k=>map.delete(k)};const store=createStartupSnapshotStore({secureStorage:storage,dataStorage:storage,now:()=>1000});await store.restore();const generation=await store.activate(identity,1000);await store.save({route:'home',selectedDateISO:'2026-10-16',jobs:[],completeDates:[]},generation);let cleared=0;return{store,clear:async()=>{cleared++;},count:()=>cleared};}
test('matching Clerk user/session and canonical UID preserve data; each mismatch clears it',async()=>{
  assert.equal(typeof api.createStartupCacheLifecycle,'function');
  for(const change of [{},{uid:'F'},{clerkSessionId:'S'},{clerkUserId:'U'}]){
    const f=await fixture(),lifecycle=api.createStartupCacheLifecycle({store:f.store,clear:f.clear});
    const next={...identity,...change};await lifecycle.prepareAccountCache({clerkIdentity:{clerkUserId:next.clerkUserId,clerkSessionId:next.clerkSessionId},uid:next.uid});
    assert.equal(f.count(),Object.keys(change).length?1:0);
    assert.equal(!!f.store.getState().snapshot,!Object.keys(change).length);
  }
});
test('a new Clerk session invalidates before a bridge response is available',async()=>{
  assert.equal(typeof api.createStartupCacheLifecycle,'function');
  const f=await fixture(),lifecycle=api.createStartupCacheLifecycle({store:f.store,clear:f.clear});
  await lifecycle.checkIdentity({clerkUserId:'u',clerkSessionId:'different'});
  assert.equal(f.store.getState().snapshot,null);
});
