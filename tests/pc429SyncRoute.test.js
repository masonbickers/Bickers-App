import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import crypto from 'node:crypto';
const policy=await import('../server/jobOnlyBusiness.js');
const {preserveClerkSyncAuthorization}=await import('../server/employeeAuthSession.js').catch(()=>({}));
for(const env of ['primary']){
 async function fixture({mirror=true,restricted=true,legacy=false,device=false,existing=true,foreign=false,mixed=false}={}){
  const flags={timesheets:mixed,expenses:false};const routes=new Map();let writes=0;const patches=[];
  const employee={id:'e',uid:'u',authUid:'u',companyId:'bickers-action',userCode:'1234',email:'fixture@example.test',name:'Fixture',isEnabled:true,jobTitle:'Freelance',...(restricted?{freelanceAccess:flags}:{}),mobileAccess:{status:'active',approvedEmail:'fixture@example.test'},payRate:500,niNumber:'SECRET',auth:{uid:'u',email:'fixture@example.test'}};
  const user={uid:'u',employeeId:'e',companyId:'bickers-action',isEnabled:true,mobileAccessStatus:'active',...(mirror&&restricted?{jobOnlyAccess:true,freelanceAccess:flags}:{}),appAccess:{user:true}};
  const db={collection(name){return {where(){return this},limit(){return this},async get(){return {empty:false,docs:[{id:'e',data:()=>employee}]}},doc(id){return {id,collection:n=>db.collection(n),async get(){return {id,exists:name==='employees'||name==='users'&&existing,data:()=>name==='users'?(existing?user:undefined):name==='employees'?employee:undefined}}}}}},batch(){return {set(ref,data){writes++;patches.push(data)},update(ref,data){writes++;patches.push(data)},async commit(){}}}};
  const app={use(){},get(p,h){routes.set('GET '+p,h)},post(p,h){routes.set('POST '+p,h)},listen(){}};const express=()=>app;express.json=()=>()=>{};const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>0};
  const token={uid:foreign?'foreign':'u',email:'fixture@example.test',auth_time:100,firebase:{sign_in_provider:'password'}};
  const admin={apps:[{}],app:()=>({}),firestore,auth:()=>({verifyIdToken:async()=>token})};const noop=()=>()=>{};
  const deps={...policy,preserveClerkSyncAuthorization,identityAuthMetadata:()=>({}),mobilePasswordAccessAllowed:()=>true,createAppPasswordProxy:noop,createTimesheetDefaultsHandler:noop,createHrHistoryProxy:noop,createSessionGate:noop,createPrivateHistoryHandler:noop,createHistorySnapshotRunner:noop,createWorkshopSubmissionHandler:noop,createWorkingTermsResolver:noop,createStagedPasswordTransition:()=>({}),createReceiptProxy:noop,receiptUpdateRequired:()=>{},anonymousDeviceIdentityMatches:()=>false,canonicalNotificationUid:()=>'',decodedTokenIsAnonymous:()=>false,axios:{},Buffer,cors:noop,crypto,dotenv:{config(){}},express,admin,process:{env:{}},console:{log(){},error(){}}};
  const source=(await readFile(new URL('../server/index.js',import.meta.url),'utf8')).replace(/^import[\s\S]*?from\s+["'][^"']+["'];\n/gm,'');
  new Function(...Object.keys(deps),source)(...Object.values(deps));
  const response={code:200,status(n){this.code=n;return this},json(body){this.body=body;return this}};
  await routes.get(device?'POST /device-tokens':'POST /auth/sync-employee-auth')(device?{headers:{authorization:'Bearer fixture'},body:{token:'ExpoPushToken[fixture]',employeeId:'e'}}:legacy?{headers:{},body:{idToken:'fixture',employeeId:'e'}}:{headers:{authorization:'Bearer fixture'}},response);
  return {response,writes,patches};
 }
 test(`${env} actual restrictive device route rejects missing canonical account with zero writes`,async()=>{const {response,writes}=await fixture({device:true,existing:false});assert.equal(response.code,403);assert.equal(writes,0);});
 test(`${env} actual restrictive device route rejects email-only foreign UID with zero writes`,async()=>{const {response,writes}=await fixture({device:true,foreign:true});assert.equal(response.code,403);assert.equal(writes,0);});
 test(`${env} actual canonical restrictive device registration remains available`,async()=>{const {response,writes}=await fixture({device:true});assert.equal(response.code,200);assert.equal(writes,2);});
 if(env==='primary'){
 test('primary body-token sync denies canonical job-only before alternate provisioning writes',async()=>{const {response,writes}=await fixture({legacy:true});assert.equal(response.code,403);assert.equal(writes,0);});
 test('primary body-token sync preserves ordinary full legacy metadata writes',async()=>{const {response,writes}=await fixture({restricted:false,legacy:true});assert.equal(response.code,200);assert.equal(writes,2);});
 }
 test(`${env} actual sync restrictive response excludes financial/HR data`,async()=>{const {response,writes}=await fixture();assert.equal(response.code,200);assert.ok(writes>0);assert.equal(response.body.employee.name,'Fixture');assert.equal(response.body.employee.jobOnlyAccess,true);for(const forbidden of ['payRate','niNumber','timesheetYardStart'])assert.ok(!JSON.stringify(response.body).includes(forbidden));});
 test(`${env} actual mixed sync preserves scope and does not overwrite policy mirrors`,async()=>{const {response,writes,patches}=await fixture({mixed:true});assert.equal(response.code,200);assert.ok(writes>0);assert.equal(response.body.sessionData.jobOnlyAccess,true);assert.deepEqual(response.body.sessionData.freelanceAccess,{timesheets:true,expenses:false});for(const patch of patches){assert.equal(Object.hasOwn(patch,'jobOnlyAccess'),false);assert.equal(Object.hasOwn(patch,'freelanceAccess'),false);}for(const forbidden of ['payRate','niNumber','timesheetYardStart'])assert.ok(!JSON.stringify(response.body).includes(forbidden));});
 test(`${env} actual sync drift denies before metadata writes`,async()=>{const {response,writes}=await fixture({mirror:false});assert.equal(response.code,403);assert.equal(writes,0);});
 test(`${env} actual sync full response preserves existing employee data`,async()=>{const {response}=await fixture({restricted:false});assert.equal(response.code,200);assert.equal(response.body.employee.payRate,500);});
}
