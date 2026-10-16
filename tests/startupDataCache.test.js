import test from 'node:test';
import assert from 'node:assert/strict';
import { providerHarness } from './helpers/providerHarness.js';
import * as session from '../lib/sessionCache.js';
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
  let auth={user:{uid:'u'},employee:{companyId:'c',employeeId:'e'},isAuthed:true,loading:false};
  const disk=new Map();
  const storage={getItem:async k=>disk.get(k),setItem:async(k,v)=>{disk.set(k,v);},removeItem:async k=>disk.delete(k),getAllKeys:async()=>[...disk.keys()],multiGet:async keys=>keys.map(k=>[k,disk.get(k)]),multiRemove:async keys=>keys.forEach(k=>disk.delete(k))};
  const h=providerHarness(new URL('../providers/DataCacheProvider.tsx',import.meta.url).pathname,'DataCacheProvider',{
    '@react-native-async-storage/async-storage':{default:storage,__esModule:true},'@react-native-community/netinfo':{default:{addEventListener:()=>()=>{}},__esModule:true},'react-native':{AppState:{addEventListener:()=>({remove(){}})}},'../lib/sessionCache':session,'./AuthProvider':{useAuth:()=>auth}
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
