import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';import vm from 'node:vm';
const root=process.env.SECURITY_OFFICE_ROOT;if(!root)throw Error('SECURITY_OFFICE_ROOT required');const read=p=>readFile(path.join(root,'src/app',p),'utf8');
function load(source,names,deps={}){const ctx=vm.createContext({Response,Request,URL,Date,process,Buffer,console,...deps});vm.runInContext(source.replace(/^import[^;]+;\n/gm,'').replace(/export (?=(async )?function|const)/g,'')+'\nthis.exports={'+names.map(name=>`${name}:typeof ${name}==='undefined'?undefined:${name}`).join(',')+'};',ctx);return ctx.exports;}
const mobile=load(await read('utils/mobilePasswordAccess.js'),['mobilePasswordAccessAllowed']);
const readerSource=await read('api/hr/_readSnapshot.js');
const original={uid:'crew',companyId:'A',employeeId:'emp',role:'user',isEnabled:true,mobileAccessStatus:'active',appAccess:{user:true}};
async function gate(change,{recover=false}={}) {
 let current=structuredClone(original),reads=0;
 const dependencies={...mobile,getFirebaseAuthAdmin:()=>({verifyIdToken:async()=>({uid:'crew',auth_time:100,firebase:{sign_in_provider:'password'}})}),adminReadDocument:async()=>{const snapshot=structuredClone(current);reads++;if(reads===1)current={...current,...change};return snapshot;},adminCreateDocument:async()=>{},enforceFirebaseSession:async(token,user)=>{if(token.auth_time<=(user.sessionValidAfter || 0))return false;if(user.passwordResetRequired){if(!recover)return false;current={...current,passwordResetRequired:false,firebasePasswordResetAfter:null};}return true;},hasCanonicalAccessRecord:u=>!!u?.uid,hasCompanyAccess:u=>!!u?.companyId,isAccountDisabled:u=>u.isEnabled!==true,hasServiceWorkspaceAccess:()=>true};
 if(recover)current={...current,passwordResetRequired:true,firebasePasswordResetAfter:1};
 const lib=load(await read('api/admin/_lib.js'),['verifyFirebaseIdToken','requireActiveUserFromRequest','normalizeServerRole','accessValidationFingerprint'],dependencies);
 const access=await lib.requireActiveUserFromRequest(new Request('http://localhost/api/hr/history',{headers:{Authorization:'Bearer token'}}));
 if(access.error)return access.error.status;
 const actor=load(readerSource,['snapshotHrActor'],{normalizeServerRole:lib.normalizeServerRole,accessValidationFingerprint:lib.accessValidationFingerprint}).snapshotHrActor;
 try{await actor({readDocument:async()=>({data:current})},access);return 200;}catch(error){return error.status;}
}
test('session cutoff changed between validated user read and access reread is rejected',async()=>assert.ok([401,403].includes(await gate({sessionValidAfter:200}))));
test('new recovery restriction between verifier and access reread is rejected',async()=>assert.ok([401,403].includes(await gate({passwordResetRequired:true,firebasePasswordResetAfter:200}))));
test('trusted recovery completion still permits the fresh personal-password workflow',async()=>assert.equal(await gate({}, {recover:true}),200));
const integrity=load(await read('utils/hrIntegrity.js'),['canReviewHrRecord','projectHrApprovalRecord','ownsHrRecord']);
const history=load(await read('utils/hrHistory.js'),['resolveHrRecordOwner','canonicalHrEmployeeUid','ownHrEmployee','assertOwnHrAccountLink'],integrity);
test('UID-less account ambiguity guard is shared by list and per-record workflows',async()=>{
 assert.equal(typeof history.assertOwnHrAccountLink,'function');const employee={id:'emp',data:{companyId:'A',userCode:'CREW'}};
 const snapshot={queryDocuments:async()=>[{id:'crew',data:{uid:'crew',employeeId:'emp',companyId:'A'}},{id:'other',data:{uid:'other',employeeId:'emp',companyId:'A'}}]};
 for(const uid of ['crew','other'])await assert.rejects(history.assertOwnHrAccountLink(snapshot,{...original,uid},employee,[employee]));
 await assert.doesNotReject(history.assertOwnHrAccountLink({queryDocuments:async()=>[{id:'crew',data:original}]},original,employee,[employee]));
});
const reviewSource=await read('utils/hrReviewClient.js');const review=load(reviewSource,['submitHrReview','hasHrApprovalNavigation','hrReviewIdentity']);
test('manager permission identity changes for same UID scope reduction and tenant/link changes',()=>{
 assert.equal(typeof review.hrReviewIdentity,'function');const actor={...original,hrApprovalAccess:{enabled:true,companyId:'A',employeeIds:['emp','other'],assignedAt:'v1'}};const key=review.hrReviewIdentity(actor);for(const patch of [{companyId:'B'},{employeeId:'other'},{hrApprovalAccess:{...actor.hrApprovalAccess,employeeIds:['other']}}])assert.notEqual(review.hrReviewIdentity({...actor,...patch}),key);assert.equal(review.hrReviewIdentity({...actor,hrApprovalAccess:{...actor.hrApprovalAccess,employeeIds:['other','emp']}}),key);
});
test('review token wait cannot commit after the permission guard changes',async()=>{
 let release,current='crew',calls=0;const user={uid:'crew',getIdToken:()=>new Promise(resolve=>{release=resolve;})};const promise=review.submitHrReview(user,'timesheets',{id:'r',canApprove:true,updateTime:'v1'},'approved',async()=>{calls++;return {ok:true,json:async()=>({})};},()=>current);current=null;release('token');await assert.rejects(promise);assert.equal(calls,0);
});

test('snapshot detects raw archived role after provider validation even though business role normalizes to user',async()=>{
 const lib=load(await read('api/admin/_lib.js'),['normalizeServerRole','accessValidationFingerprint']);
 const actor=load(readerSource,['snapshotHrActor'],lib).snapshotHrActor;
 const access={userData:original,verifiedUser:{uid:original.uid,sessionValidationFingerprint:lib.accessValidationFingerprint(original)}};
 await assert.rejects(actor({readDocument:async()=>({data:{...original,role:'archived'}})},access));
});
