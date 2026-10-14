import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {mergePrepOutboxFlush} from '../lib/vehiclePrepStatus.js';
import {bindSyncIdentity,getSyncIdentity} from '../lib/sync/identity.js';
const strip=source=>source.replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*/gm,'').replaceAll('export ','');
function fixture(rows=[]) {
 const stored=new Map([['@bickers.sync.outbox.v1',JSON.stringify(rows)]]),writes=[];
 let companyId='A',beforeWrite=()=>{};
 const auth={currentUser:{uid:'crew'}};
 const ctx=vm.createContext({Date,Math,JSON,Promise,Set,console,auth,db:{},storage:{},mergePrepOutboxFlush,
  AsyncStorage:{getItem:async key=>stored.get(key)||null,setItem:async(key,value)=>stored.set(key,value),removeItem:async key=>stored.delete(key)},
  getSyncIdentity:uid=>uid?{uid,companyId}:null,
  doc:(_db,...parts)=>parts.join('/'),setDoc:async(ref,data)=>{writes.push({uid:auth.currentUser?.uid,ref,data});await beforeWrite();},updateDoc:async()=>{},deleteDoc:async()=>{},serverTimestamp:()=>({server:true}),arrayUnion:(...items)=>items,
  isTransientNetworkError:()=>false,commitVehiclePrepStatus:async()=>{},commitVehiclePrepChecklist:async()=>{},sendWorkshopSubmission:async()=>{},syncConfig:{},Platform:{OS:'test'},NetInfo:{fetch:async()=>({isConnected:true})},
 });
 vm.runInContext(strip(readFileSync('lib/sync/outbox.js','utf8'))+'\n'+strip(readFileSync('lib/sync/engine.js','utf8')),ctx);
 return {ctx,writes,stored,switchTo:(uid,company='A')=>{auth.currentUser=uid?{uid}:null;companyId=company;},beforeWrite:fn=>beforeWrite=fn,rows:()=>JSON.parse(stored.get('@bickers.sync.outbox.v1'))};
}
test('new queued work captures its original employee/company',async()=>{
 const h=fixture();await h.ctx.enqueueOutboxMutation({docPath:'timesheets/own',data:{notes:'offline'}});
 assert.deepEqual(h.rows()[0].identity,{uid:'crew',companyId:'A'});
});
test('wrong account retains queued work, original employee can subsequently resume it',async()=>{
 const h=fixture();await h.ctx.enqueueOutboxMutation({docPath:'timesheets/own',data:{notes:'offline'}});
 h.switchTo('other');await h.ctx.flushFirestoreOutbox();assert.equal(h.writes.length,0);assert.equal(h.rows().length,1);assert.equal(h.rows()[0].data.notes,'offline');
 h.switchTo('crew');await h.ctx.flushFirestoreOutbox();assert.equal(h.writes.length,1);assert.equal(h.rows().length,0);
});
test('different company, signed-out and unowned historical work are held without loss',async()=>{
 const h=fixture([{id:'historical',target:'firestore',docPath:'timesheets/legacy',data:{notes:'old retained'}}]);
 await h.ctx.enqueueOutboxMutation({docPath:'timesheets/new',data:{notes:'new retained'}});
 h.switchTo('crew','B');await h.ctx.flushFirestoreOutbox();assert.equal(h.writes.length,0);assert.equal(h.rows().length,2);
 h.switchTo(null);await h.ctx.flushFirestoreOutbox();assert.equal(h.writes.length,0);assert.equal(h.rows().length,2);
 h.switchTo('crew');await h.ctx.flushFirestoreOutbox();assert.equal(h.writes.length,1);assert.equal(h.rows()[0].data.notes,'old retained');
});
test('identity is checked between writes when authentication changes during a flush',async()=>{
 const h=fixture();for(const id of ['one','two']) await h.ctx.enqueueOutboxMutation({docPath:`timesheets/${id}`,data:{notes:id}});
 h.beforeWrite(()=>h.switchTo('other'));await h.ctx.flushFirestoreOutbox();assert.equal(h.writes.length,1);assert.equal(h.rows().length,1);assert.equal(h.rows()[0].data.notes,'two');
});
test('foreign rows do not starve the current employee or remove concurrently enqueued work',async()=>{
 const h=fixture([{id:'foreign',target:'firestore',docPath:'timesheets/other',identity:{uid:'other',companyId:'A'},data:{notes:'foreign'}}]);
 await h.ctx.enqueueOutboxMutation({docPath:'timesheets/own',data:{notes:'own'}});
 h.beforeWrite(()=>h.ctx.enqueueOutboxMutation({docPath:'timesheets/new',data:{notes:'concurrent'}}));
 await h.ctx.flushFirestoreOutbox();assert.equal(h.writes.length,1);assert.deepEqual(h.rows().map(row=>row.data.notes),['foreign','concurrent']);
});
test('canonical identity binding cannot survive a Firebase account switch',()=>{
 bindSyncIdentity({uid:'crew',companyId:'A'});
 assert.deepEqual(getSyncIdentity('crew'),{uid:'crew',companyId:'A'});
 assert.equal(getSyncIdentity('other'),null);
 bindSyncIdentity(null);assert.equal(getSyncIdentity(undefined),null);
});
test('network lookup cannot switch the employee who owns the queued mutation',async()=>{
 const h=fixture();vm.runInContext(strip(readFileSync('lib/sync/firestoreQueue.js','utf8')),h.ctx);
 h.ctx.NetInfo.fetch=async()=>{h.switchTo('other');return {isConnected:false};};
 await h.ctx.runOrQueueFirestoreMutation({run:()=>{throw Error('must not send');},mutation:{docPath:'timesheets/own',data:{notes:'original'}}});
 assert.deepEqual(h.rows()[0].identity,{uid:'crew',companyId:'A'});
});
test('online account switch queues original work without sending under the new identity',async()=>{
 const h=fixture();vm.runInContext(strip(readFileSync('lib/sync/firestoreQueue.js','utf8')),h.ctx);
 h.ctx.NetInfo.fetch=async()=>{h.switchTo('other');return {isConnected:true};};
 let sent=0;await h.ctx.runOrQueueFirestoreMutation({run:()=>{sent++;},mutation:{docPath:'timesheets/own',data:{notes:'original'}}});
 assert.equal(sent,0);assert.deepEqual(h.rows()[0].identity,{uid:'crew',companyId:'A'});
});
test('an account switch during photo URL resolution cannot replay a Firestore mutation as somebody else',async()=>{
 const h=fixture();h.ctx.storageRef=(_st,path)=>path;h.ctx.getDownloadURL=async()=>{h.switchTo('other');return 'https://test.invalid/photo';};
 await h.ctx.enqueueOutboxMutation({docPath:'workshopVehicleChecks/own',data:{photoURL:{__storageDownloadURL:'owned/photo.jpg'}}});
 await h.ctx.flushFirestoreOutbox();assert.equal(h.writes.length,0);assert.equal(h.rows().length,1);
});
