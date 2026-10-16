import test from 'node:test';
import assert from 'node:assert/strict';
import { providerHarness } from './helpers/providerHarness.js';
import {createRefreshCoalescer} from '../lib/startup/refresh.js';
import * as session from '../lib/sessionCache.js';
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
  let auth={user:{uid:'u'},employee:{companyId:'c',employeeId:'e'},isAuthed:true,loading:false};
  const disk=new Map();
  const storage={getItem:async k=>disk.get(k),setItem:async(k,v)=>{disk.set(k,v);},removeItem:async k=>disk.delete(k),getAllKeys:async()=>[...disk.keys()],multiGet:async keys=>keys.map(k=>[k,disk.get(k)]),multiRemove:async keys=>keys.forEach(k=>disk.delete(k))};
  const h=providerHarness(new URL('../providers/DataCacheProvider.tsx',import.meta.url).pathname,'DataCacheProvider',{
    '@react-native-async-storage/async-storage':{default:storage,__esModule:true},'@react-native-community/netinfo':{default:{addEventListener:()=>()=>{}},__esModule:true},'react-native':{AppState:{addEventListener:()=>({remove(){}})}},'../lib/startup/refresh':{createRefreshCoalescer},'../lib/sessionCache':session,'./AuthProvider':{useAuth:()=>auth}
  });
  return{h,disk,storage,setAuth:value=>{auth=value;}};
}
test('temporary auth restoration does not delete the previously verified cache scope',async()=>{
  const f=fixture();let value=f.h.render();f.h.effects();await value.write('jobs',[1]);
  f.setAuth({user:{uid:'u'},employee:null,isAuthed:false,loading:true});f.h.render();f.h.effects();await tick();
  assert.equal(f.disk.size,1);
  f.setAuth({user:{uid:'v'},employee:{companyId:'d',employeeId:'x'},isAuthed:true,loading:false});f.h.render();f.h.effects();await tick();assert.equal(f.disk.size,0);f.h.dispose();
});
test('late old-account fetches and writes cannot repopulate persistent cache after account switch',async()=>{
  const f=fixture();const old=f.h.render();f.h.effects();let release;
  const pending=old.getOrFetch('jobs',()=>new Promise(r=>{release=r;}),{force:true});await tick();
  f.setAuth({user:{uid:'v'},employee:{companyId:'d',employeeId:'x'},isAuthed:true,loading:false});const current=f.h.render();f.h.effects();await tick();
  release(['old']);await pending;await old.write('late',['old']);
  assert.equal(current.peek('jobs'),null);assert.equal(f.disk.size,0);f.h.dispose();
});

test('concurrent screens deduplicate the same scoped fetch and invalidating jobs retains other sections',async()=>{
  const f=fixture(),value=f.h.render();f.h.effects();let release,calls=0;
  const fetch=()=>{calls++;return new Promise(r=>{release=r;});};
  const a=value.getOrFetch('jobs',fetch,{force:true}),b=value.getOrFetch('jobs',fetch,{force:true});await tick();assert.equal(calls,1);release([1]);await Promise.all([a,b]);
  await value.write('vehicles',[2]);await value.invalidate('jobs');
  assert.deepEqual(value.peek('vehicles').data,[2]);assert.deepEqual(value.peek('jobs').data,[1]);assert.equal(value.peek('jobs').updatedAt,0);f.h.dispose();
});

test('a delayed invalidation cannot recreate a previous account record',async()=>{
  const f=fixture(),old=f.h.render();f.h.effects();await old.write('jobs',[1]);
  let release;const original=f.storage.multiGet;f.storage.multiGet=async keys=>{const rows=await original(keys);await new Promise(r=>{release=r;});return rows;};
  const pending=old.invalidate('jobs');await tick();
  f.setAuth({user:{uid:'v'},employee:{companyId:'d',employeeId:'x'},isAuthed:true,loading:false});f.h.render();f.h.effects();await tick();release();await pending;
  assert.equal(f.disk.size,0);f.h.dispose();
});
test('case-distinct account identities cannot reuse an old writer even when legacy cache keys collide',async()=>{
  const f=fixture(),old=f.h.render();f.h.effects();
  f.setAuth({user:{uid:'U'},employee:{companyId:'c',employeeId:'e'},isAuthed:true,loading:false});f.h.render();f.h.effects();await tick();await old.write('jobs',['old']);assert.equal(f.disk.size,0);f.h.dispose();
});
