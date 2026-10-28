import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import crypto from 'node:crypto';
const policy=await import('../server/jobOnlyBusiness.js');
async function fixture(employeePatch={}){
 const routes=new Map(),effects={tokens:0,writes:0},employee={id:'e',companyId:'bickers-action',userCode:'1234',email:'fixture@example.test',name:'Fixture',isEnabled:true,jobTitle:'Freelance',...employeePatch};
 const snap={id:'e',data:()=>employee};
 const db={collection(name){return {where(){return this},limit(){return this},async get(){return name==='employees'?{empty:false,docs:[snap]}:{empty:true,docs:[]}},doc(id){return {id,async get(){return {exists:false,data:()=>undefined}}}}}},batch(){return {set(){effects.writes++},async commit(){}}}};
 const app={use(){},get(path,handler){routes.set('GET '+path,handler)},post(path,handler){routes.set('POST '+path,handler)},listen(){}};
 const express=()=>app;express.json=()=>()=>{};
 const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>0};
 const admin={apps:[{}],app:()=>({}),firestore,auth:()=>({createCustomToken:async()=>{effects.tokens++;return 'synthetic'}})};
 const noop=()=>()=>{};
 const deps={...policy,createPrivateHistoryHandler:noop,createHistorySnapshotRunner:noop,createWorkshopSubmissionHandler:noop,createWorkingTermsResolver:noop,createStagedPasswordTransition:()=>({}),createReceiptProxy:noop,receiptUpdateRequired:()=>{},anonymousDeviceIdentityMatches:()=>false,canonicalNotificationUid:()=>'',decodedTokenIsAnonymous:()=>false,axios:{},Buffer,cors:noop,crypto,dotenv:{config(){}},express,admin,process:{env:{}},console:{log(){},error(){}}};
 const source=(await readFile(new URL('../server/index.js',import.meta.url),'utf8')).replace(/^import[\s\S]*?from\s+["'][^"']+["'];\n/gm,'');
 new Function(...Object.keys(deps),source)(...Object.values(deps));
 const response={code:200,status(n){this.code=n;return this},json(body){this.body=body;return this}};
 await routes.get('POST /auth/employee-setup-lookup')({body:{code:'1234',email:'fixture@example.test'}},response);
 return {effects,response};
}
test('actual primary legacy setup route rejects canonical job-only without mirrors before Auth/user/employee writes',async()=>{const {effects,response}=await fixture({freelanceAccess:{timesheets:false,expenses:false}});assert.equal(response.code,403);assert.deepEqual(effects,{tokens:0,writes:0});});
test('actual primary full legacy setup retains custom token and existing two metadata writes',async()=>{const {effects,response}=await fixture();assert.equal(response.code,200);assert.deepEqual(effects,{tokens:1,writes:2});});
