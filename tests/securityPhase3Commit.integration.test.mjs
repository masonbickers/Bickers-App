import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';import path from 'node:path';
const office=process.env.SECURITY_OFFICE_ROOT;if(!office)throw Error('SECURITY_OFFICE_ROOT required');
const read=p=>readFile(path.join(office,'src/app',p),'utf8');
const policy=await import('data:text/javascript;base64,'+Buffer.from(await read('utils/firestoreCommitPlanning.js')).toString('base64'));
const encoding=await import('data:text/javascript;base64,'+Buffer.from(await read('utils/firestoreValueEncoding.js')).toString('base64'));
const source=(await read('api/_firebaseAdminRest.js')).replace(/^import[^;]+;\n/gm,'').replace(/export (?=(async )?function|const)/g,'');
function harness({race}={}) {
 const db=new Map([['vehicles/v',{data:{companyId:'A'},version:'v1'}],['maintenanceBookings/target',{data:{companyId:'A',vehicleId:'v',sourceId:'original'},version:'v2'}],['maintenanceLegacyArchive/child',{data:{notes:'Retain original'},version:'v3'}]]);let snap,reads=new Set(),scans=new Set(),commits=0,ctx;
 const copy=()=>structuredClone(db),root='projects/demo-bickers-phase3/databases/(default)/documents/',json=(data,status=200)=>Response.json(data,{status});
 const doc=(ref,row)=>({name:root+ref,fields:Object.fromEntries(Object.entries(row.data).map(([k,v])=>[k,{stringValue:v}])),updateTime:row.version});
 const fetch=async(url,init={})=>{
  assert.ok(String(url).startsWith('https://firestore.googleapis.com/v1/'+root.slice(0,-1)), 'Only synthetic demo transport allowed');
  const u=new URL(url),body=init.body?JSON.parse(init.body):{};
  if(u.pathname.endsWith(':beginTransaction')){snap=copy();return json({transaction:'synthetic-transaction'});}
  if(u.pathname.endsWith(':rollback'))return json({});
  if(u.pathname.endsWith(':runQuery')){assert.equal(body.transaction,'synthetic-transaction');const collection=body.structuredQuery.from[0].collectionId;scans.add(collection);return json([...snap].filter(([k])=>k.startsWith(collection+'/')).map(([k,v])=>({document:doc(k,v)})));}
  if(u.pathname.endsWith(':commit')){
   if(race)race(db);
   if(body.transaction){
    for(const ref of reads)if(snap.get(ref)?.version!==db.get(ref)?.version)return json({error:{status:'FAILED_PRECONDITION'}},412);
    for(const col of scans){const inventory=rows=>[...rows].filter(([k])=>k.startsWith(col+'/')).map(([k,v])=>k+':'+v.version).sort();if(JSON.stringify(inventory(snap))!==JSON.stringify(inventory(db)))return json({error:{status:'FAILED_PRECONDITION'}},412);}
   }
   for(const w of body.writes){const ref=w.update.name.slice(root.length);if(w.currentDocument?.updateTime!==db.get(ref)?.version)return json({error:{status:'FAILED_PRECONDITION'}},412);}
   for(const w of body.writes){const ref=w.update.name.slice(root.length);db.set(ref,{data:{...db.get(ref).data,...Object.fromEntries(Object.entries(w.update.fields).map(([k,v])=>[k,v.stringValue]))},version:'committed'});}commits++;return json({commitTime:'saved'});
  }
  const ref=decodeURIComponent(u.pathname.split('/documents/')[1]);if(u.searchParams.has('transaction'))reads.add(ref);const row=(u.searchParams.has('transaction')?snap:db).get(ref);return row?json(doc(ref,row)):json({},404);
 };
 ctx=vm.createContext({Response,URL,URLSearchParams,Date,Buffer,console,fetch,process:{env:{NEXT_PUBLIC_FIREBASE_PROJECT_ID:'demo-bickers-phase3'}},...policy,...encoding});vm.runInContext(source,ctx);ctx.getFirebaseAdminAccessToken=async()=> 'synthetic-only';
 return {commit:options=>ctx.adminCommitDocumentPatches([{collection:'maintenanceLegacyArchive',documentId:'child',patch:{notes:'Authorised update'},updateTime:'v3'}],options),sequence:(allocationCount,options)=>ctx.adminCommitDocumentPatchesWithSequence({writes:[{collection:'maintenanceLegacyArchive',documentId:'child',patch:{notes:'Authorised update'},updateTime:'v3'}],counterCollection:'maintenanceCounters',counterDocumentId:'sequence',allocationCount,applySequence:writes=>writes,...options}),db,commits:()=>commits,reads};
}
const readChecks=[{collection:'vehicles',documentId:'v',updateTime:'v1'},{collection:'maintenanceBookings',documentId:'target',updateTime:'v2'}];
test('actual commit helper preserves an unchanged expected linked-record version and child data',async()=>{const h=harness();await h.commit({readChecks});assert.equal(h.commits(),1);assert.equal(h.db.get('maintenanceLegacyArchive/child').data.notes,'Authorised update');assert.equal(h.db.get('maintenanceBookings/target').version,'v2');});
test('actual commit helper denies missing or changed expected linked-record versions before writing',async()=>{
 for(const mode of ['missing','changed']){const h=harness();if(mode==='missing')h.db.delete('vehicles/v');else h.db.set('vehicles/v',{data:{companyId:'B'},version:'newer'});await assert.rejects(h.commit({readChecks}),/FAILED_PRECONDITION/);assert.equal(h.commits(),0);assert.equal(h.db.get('maintenanceLegacyArchive/child').data.notes,'Retain original');}
});
test('linked record changed after transaction read cannot commit a stale child',async()=>{const h=harness({race:db=>db.set('vehicles/v',{data:{companyId:'B'},version:'newer'})});await assert.rejects(h.commit({readChecks}),/FAILED_PRECONDITION/);assert.equal(h.commits(),0);assert.equal(h.db.get('maintenanceLegacyArchive/child').data.notes,'Retain original');});
test('bounded dependency query rejects unexpected membership and later phantoms',async()=>{
 const queryChecks=[{collection:'maintenanceBookings',companyId:'A',vehicleId:'v',sourceId:'original',expected:[{id:'target',updateTime:'v2'}]}];
 for(const timing of ['before','commit']){const add=db=>db.set('maintenanceBookings/extra',{data:{companyId:'A',vehicleId:'v',sourceId:'original'},version:'extra'}),h=harness(timing==='commit'?{race:add}:{});if(timing==='before')add(h.db);await assert.rejects(h.commit({queryChecks}),/FAILED_PRECONDITION/);assert.equal(h.commits(),0);assert.equal(h.db.get('maintenanceLegacyArchive/child').data.notes,'Retain original');}
 const h=harness();await h.commit({queryChecks});assert.equal(h.commits(),1);
});

test('sequence allocation and zero-allocation delegation both retain expected dependency guards',async()=>{
 for(const allocationCount of [0,1]){const h=harness();h.db.set('vehicles/v',{data:{companyId:'B'},version:'newer'});await assert.rejects(h.sequence(allocationCount,{readChecks}),/FAILED_PRECONDITION/);assert.equal(h.commits(),0);assert.equal(h.db.get('maintenanceLegacyArchive/child').data.notes,'Retain original');}
});
