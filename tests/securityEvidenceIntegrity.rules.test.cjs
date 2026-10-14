const {test,before,after}=require('node:test');const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails,firestore:f}=require('./helpers/securityRulesRuntime.cjs');let env;
const claims={firebase:{sign_in_provider:'password'},auth_time:100};
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-bickers-security-remediation',firestore:{rules:fs.readFileSync(process.env.MOBILE_RULES_PATH || 'firebase/security-remediation-2026-10-14/firestore.rules','utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  for(const [uid,role,companyId] of [['crew','user','bickers-action'],['admin','admin','bickers-action'],['foreign','admin','foreign']]) await f.setDoc(f.doc(c.firestore(),'users',uid),{uid,role,companyId,employeeId:`employee-${uid}`,mobileAccessStatus:'active',isEnabled:true,appAccess:{user:true,service:true}});
  await f.setDoc(f.doc(c.firestore(),'employees','employee-crew'),{companyId:'bickers-action',userCode:'CREW'});
  for(const collection of ['hsRegister','hsCheckRecords','ppeIssueRecords','employeeTrainingRecords']) await f.setDoc(f.doc(c.firestore(),collection,'retained'),{companyId:'bickers-action',employeeId:'employee-other',status:'completed',notes:'retained evidence'});
  await f.setDoc(f.doc(c.firestore(),'vehicles','legal'),{companyId:'bickers-action',registration:'TEST'});
  await f.setDoc(f.doc(c.firestore(),'equipment','own-equipment'),{companyId:'bickers-action'});
  await f.setDoc(f.doc(c.firestore(),'equipment','foreign-equipment'),{companyId:'foreign'});
  await f.setDoc(f.doc(c.firestore(),'vehicleIssues','equipment-issue'),{companyId:'bickers-action',equipmentDocId:'own-equipment',status:'open'});
 });
});
after(async()=>env?.cleanup());const db=uid=>env.authenticatedContext(uid,claims).firestore();
for(const collection of ['hsRegister','hsCheckRecords','ppeIssueRecords','employeeTrainingRecords']) test(`employee cannot fabricate, overwrite or delete issued ${collection} evidence`,async()=>{
 const d=db('crew');await assertFails(f.setDoc(f.doc(d,collection,'forged'),{companyId:'bickers-action',employeeId:'employee-other',status:'completed'}));await assertFails(f.updateDoc(f.doc(d,collection,'retained'),{notes:'tampered'}));await assertFails(f.deleteDoc(f.doc(d,collection,'retained')));
});
test('verified existing office admin can create a company register; evidence edits use the API',async()=>{
 const d=db('admin');await assertSucceeds(f.setDoc(f.doc(d,'hsRegister','new-admin'),{companyId:'bickers-action',item:'New item',frequencyWeeks:4,customRegisterItem:true,createdAt:f.serverTimestamp(),updatedAt:f.serverTimestamp()}));await assertFails(f.updateDoc(f.doc(d,'hsRegister','retained'),{notes:'direct overwrite'}));await assertFails(f.setDoc(f.doc(db('foreign'),'hsRegister','foreign-forged'),{companyId:'bickers-action',item:'Foreign'}));
});
test('live vehicle compliance guards remain intact alongside permitted ordinary updates',async()=>{
 const ref=f.doc(db('admin'),'vehicles','legal');
 await assertSucceeds(f.updateDoc(ref,{registration:'TEST2'}));
 for(const field of ['lastMotDate','lastPmi','lastServiceDate']) await assertFails(f.updateDoc(ref,{[field]:'2026-10-14'}));
});
test('latest live defect update protection preserves same-company equipment and rejects foreign or missing parents',async()=>{
 const ref=f.doc(db('admin'),'vehicleIssues','equipment-issue');
 await assertSucceeds(f.updateDoc(ref,{notes:'verified correction'}));
 for(const equipmentDocId of ['foreign-equipment','missing-equipment']) await assertFails(f.updateDoc(ref,{equipmentDocId}));
});
