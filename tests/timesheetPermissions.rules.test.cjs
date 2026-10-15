const {test,before,after}=require('node:test');
const fs=require('node:fs');
const deps='/Users/masonbickers/Desktop/Projects/Bickers-Booking1/node_modules/';
const {initializeTestEnvironment,assertSucceeds,assertFails}=require(deps+'@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc}=require(deps+'firebase/firestore');
let env;
const legacy={employeeCode:'CREW',weekStart:'2026-09-28',days:{},submitted:false,status:null};
before(async()=>{
 env=await initializeTestEnvironment({projectId:process.env.SECURITY_TEST_PROJECT_ID || 'demo-mobile-permissions',firestore:{rules:fs.readFileSync(process.env.MOBILE_RULES_PATH||'firebase/mobile-compat/firestore.rules','utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  for(const [uid,patch] of [['crew',{}],['other',{employeeId:'employee-other'}],['disabled',{isEnabled:false}],['no-access',{appAccess:{user:false}}],['foreign',{companyId:'foreign'}],['stale',{appPasswordSessionAfter:200}],['setup',{appPasswordSetupRequired:true}]])
   await setDoc(doc(db,'users',uid),{uid,mobileAccessStatus:'active',companyId:'bickers-action',employeeId:'employee-crew',isEnabled:true,role:'user',appAccess:{user:true},...patch});
  await setDoc(doc(db,'employees','employee-crew'),{companyId:'bickers-action',userCode:'CREW'});
  await setDoc(doc(db,'employees','employee-other'),{companyId:'bickers-action',userCode:'OTHER'});
  await setDoc(doc(db,'users','fresh'),{uid:'fresh',mobileAccessStatus:'active',companyId:'bickers-action',employeeId:'employee-crew',isEnabled:true,role:'user',appAccess:{user:true},appPasswordSessionAfter:50});
  await setDoc(doc(db,'users','clerk'),{uid:'clerk',companyId:'bickers-action',employeeId:'employee-crew',isEnabled:true,role:'user',appAccess:{user:true},appPasswordSetupRequired:true,clerkUserId:'clerk-id',clerkLeaseRequired:true,clerkSessionLeases:{'session-id':{uid:'clerk',companyId:'bickers-action',clerkUserId:'clerk-id',clerkSessionId:'session-id',sessionCreatedAt:100,status:'active',validUntilMs:Date.now()+300000}}});
  await setDoc(doc(db,'timesheets','CREW_2026-09-28'),legacy);
  await setDoc(doc(db,'timesheets','CREW_2026-09-14'),{...legacy,weekStart:'2026-09-14'});
  await setDoc(doc(db,'timesheets','CREW_2026-09-21'),{...legacy,weekStart:'2026-09-21',companyId:'foreign'});
 });
});
after(async()=>env?.cleanup());
const dbFor=uid=>uid?env.authenticatedContext(uid,{firebase:{sign_in_provider:'password'},auth_time:100}).firestore():env.unauthenticatedContext().firestore();
test('installed app can create and update its own deterministic legacy week',async()=>{
 const db=dbFor('crew');
 await assertSucceeds(setDoc(doc(db,'timesheets','CREW_2026-10-05'),{...legacy,weekStart:'2026-10-05'}));
 await assertSucceeds(getDoc(doc(db,'timesheets','CREW_2026-09-28')));
 await assertSucceeds(updateDoc(doc(db,'timesheets','CREW_2026-09-28'),{days:{monday:{hours:8}}}));
});
test('new weeks can confirm their own document is missing before initializing',async()=>{
 await assertSucceeds(getDoc(doc(dbFor('crew'),'timesheets','CREW_2026-11-02')));
 await assertFails(getDoc(doc(dbFor('other'),'timesheets','CREW_2026-11-02')));
 await assertFails(getDoc(doc(dbFor('crew'),'timesheets','random-missing')));
});
test('new app can stamp ownership onto its existing legacy week',async()=>{
 await assertSucceeds(updateDoc(doc(dbFor('crew'),'timesheets','CREW_2026-09-14'),{companyId:'bickers-action',ownerUid:'crew',employeeId:'employee-crew'}));
});
test('compatibility never permits foreign ownership, spoofed identities or arbitrary ids',async()=>{
 const db=dbFor('crew');
 for(const patch of [{companyId:'foreign'},{ownerUid:'other'},{employeeId:'employee-other'},{employeeCode:'OTHER'}])
  await assertFails(setDoc(doc(db,'timesheets','CREW_2026-10-12'),{...legacy,weekStart:'2026-10-12',...patch}));
 await assertFails(setDoc(doc(db,'timesheets','random'),legacy));
 await assertFails(updateDoc(doc(db,'timesheets','CREW_2026-09-21'),{companyId:'bickers-action'}));
 await assertFails(getDoc(doc(db,'timesheets','CREW_2026-09-21')));
});
test('legacy access stays denied to other staff, disabled users and invalid sessions',async()=>{
 for(const uid of ['other','disabled','no-access','foreign','stale','setup',null]){
  await assertFails(setDoc(doc(dbFor(uid),'timesheets','CREW_2026-10-19'),{...legacy,weekStart:'2026-10-19'}));
  await assertFails(getDoc(doc(dbFor(uid),'timesheets','CREW_2026-09-28')));
 }
});
test('fresh recovered password and trusted web sessions can save legacy weeks',async()=>{
 const fresh=dbFor('fresh');
 await assertSucceeds(updateDoc(doc(fresh,'timesheets','CREW_2026-09-28'),{notes:'Fresh password session'}));
 const web=env.authenticatedContext('clerk',{firebase:{sign_in_provider:'custom'},auth_time:100,clerkSessionId:'session-id',authMethod:'clerk',verifiedClerkEmail:true,identityLinkVersion:2,clerkLeaseVersion:1,clerkUserId:'clerk-id',identityCompanyId:'bickers-action',identityEmployeeId:'employee-crew'}).firestore();
 await assertSucceeds(updateDoc(doc(web,'timesheets','CREW_2026-09-28'),{notes:'Trusted web session'}));
});
