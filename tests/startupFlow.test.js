import test from 'node:test';import assert from 'node:assert/strict';
import {createStartupSnapshotStore} from '../lib/startup/snapshotStore.js';
import {createStartupCacheLifecycle} from '../lib/startup/cacheLifecycle.js';
import {createClerkSessionCoordinator} from '../lib/clerkSessionCoordinator.js';
import {loadVerifiedSession} from '../lib/startup/loadVerifiedSession.js';
import {resolveStartupDisplay} from '../lib/startup/display.js';
const identity={clerkUserId:'u',clerkSessionId:'s',uid:'f',companyId:'c',employeeId:'e'};
async function fixture(){const disk=new Map(),storage={getItem:async k=>disk.get(k),setItem:async(k,v)=>disk.set(k,v),removeItem:async k=>disk.delete(k)};const deps={secureStorage:storage,dataStorage:storage,now:()=>1000};const previous=createStartupSnapshotStore(deps);await previous.activate(identity,1000);await previous.save({route:'home',selectedDateISO:'2026-10-16',jobs:[{id:'j',dateISO:'2026-10-16',title:'Saved'}],completeDates:[]},previous.getActive().generation);const store=createStartupSnapshotStore(deps);await store.restore();return{store,deps};}
for(const status of [503,401,403])test(`full restore flow distinguishes bridge status ${status} from authorization`,async()=>{
  const {store}=await fixture();let uid=null;let outcome='restoring';
  const coordinator=createClerkSessionCoordinator({getClerkIdentity:()=>identity,exchangeToken:async()=>{},getFirebaseUid:()=>uid,signInFirebase:async()=>{uid='f';},signOutFirebase:async()=>{uid=null;},signOutClerk:async()=>{},clearAccountCache:async()=>{},...createStartupCacheLifecycle({store,clear:async()=>{}}),invalidateDisplay:()=>store.invalidate('signed-out'),onBlocked:()=>{outcome=status===503?'unavailable':'denied';},now:()=>1000,schedule:()=>1,cancel:()=>{},
    getClerkToken:async()=>{throw Object.assign(Error('network-or-rejection'),{status});}});
  const display=()=>resolveStartupDisplay({snapshot:store.getState().snapshot,enabled:true,clerk:{loading:false,hasClerkSession:true,...identity},startupAccessStatus:outcome,loading:true,now:1000});
  assert.ok(display());await coordinator.reconcile();assert.equal(coordinator.isReady(),false);assert.equal(!!display(),status===503);coordinator.dispose();
});
test('restored data remains display-only until concurrent checks finish, then current data replaces it',async()=>{
  const {store}=await fixture();let release;const terms=new Promise(r=>{release=r;});let verified=false;
  const pending=loadVerifiedSession({readPreferences:async()=>[],resolveAccess:async()=>identity,readTerms:()=>terms,isCurrent:()=>true}).then(async result=>{assert.ok(result.terms);verified=true;const generation=await store.activate(identity,1000);await store.save({route:'home',selectedDateISO:'2026-10-16',jobs:[{id:'j',dateISO:'2026-10-16',title:'Fresh'}],completeDates:[]},generation);});
  await Promise.resolve();assert.equal(verified,false);assert.equal(store.getState().snapshot.jobs[0].title,'Saved');release({accepted:true});await pending;assert.equal(store.getState().snapshot.jobs[0].title,'Fresh');
});
