const { test, before, after } = require('node:test');
const fs=require('node:fs');
const { initializeTestEnvironment,assertSucceeds,assertFails,firestore:f }=require('./helpers/securityRulesRuntime.cjs');
let env;
const claims={firebase:{sign_in_provider:'password'},auth_time:100};
const owned={companyId:'bickers-action',ownerUid:'crew',employeeId:'employee-crew',employeeCode:'CREW',weekStart:'2026-10-12',days:{monday:{hours:8}},notes:'',submitted:true,status:'submitted',approved:false,approvalHistory:[]};
const legacy={employeeCode:'CREW',weekStart:'2026-09-28',days:{},notes:'',submitted:false,status:null};
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-bickers-security-remediation',firestore:{rules:fs.readFileSync(process.env.MOBILE_RULES_PATH || 'firebase/security-remediation-2026-10-14/firestore.rules','utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();
  for(const [uid,role,companyId] of [['crew','user','bickers-action'],['other','user','bickers-action'],['manager','manager','bickers-action'],['admin','admin','bickers-action'],['foreign','admin','foreign']]){
   await f.setDoc(f.doc(db,'users',uid),{uid,companyId,employeeId:`employee-${uid}`,isEnabled:true,mobileAccessStatus:'active',role,appAccess:{user:true}});
   await f.setDoc(f.doc(db,'employees',`employee-${uid}`),{companyId,authUid:uid,userCode:uid.toUpperCase()});
  }
  await f.setDoc(f.doc(db,'timesheets','CREW_2026-10-12'),owned);
  await f.setDoc(f.doc(db,'timesheets','CREW_2026-09-28'),legacy);
  await f.setDoc(f.doc(db,'timesheets','OTHER_2026-10-12'),{...owned,ownerUid:'other',employeeId:'employee-other',employeeCode:'OTHER'});
  await f.setDoc(f.doc(db,'timesheets','ADMIN_2026-10-12'),{...owned,ownerUid:'admin',employeeId:'employee-admin',employeeCode:'ADMIN'});
  for(const [week,patch] of [['2026-08-03',{status:'approved'}],['2026-08-10',{approved:true}],['2026-08-17',{approvedAt:'2026-10-14'}],['2026-08-24',{isApproved:true}],['2026-08-31',{approvalStatus:'approved'}]]) {
   await f.setDoc(f.doc(db,'timesheets',`CREW_${week}`),{...owned,weekStart:week,...patch});
   
  }
  await f.setDoc(f.doc(db,'timesheets','CREW_2026-07-06'),{...owned,weekStart:'2026-07-06',ownerUid:'other',employeeId:'employee-other'});
  for(const collection of ['holidays','shiftChangeRequests','sickLeave','hr']) {
   await f.setDoc(f.doc(db,collection,'own'),{companyId:'bickers-action',ownerUid:'crew',employeeId:'employee-crew',employeeCode:'CREW',status:'requested',holidayReason:'private'});
   await f.setDoc(f.doc(db,collection,'other'),{companyId:'bickers-action',ownerUid:'other',employeeId:'employee-other',employeeCode:'OTHER',status:'requested',holidayReason:'private'});
   await f.setDoc(f.doc(db,collection,'approved'),{companyId:'bickers-action',ownerUid:'crew',employeeId:'employee-crew',employeeCode:'CREW',status:'approved'});
  }
  await f.setDoc(f.doc(db,'holidays','legacy-own'),{companyId:'bickers-action',employeeCode:'CREW',status:'requested'});
  await f.setDoc(f.doc(db,'timesheetQueries','own'),{companyId:'bickers-action',timesheetId:'CREW_2026-10-12'});
  await f.setDoc(f.doc(db,'timesheetQueries','other'),{companyId:'bickers-action',timesheetId:'OTHER_2026-10-12'});
 });
});
after(async()=>env?.cleanup());
const dbFor=uid=>env.authenticatedContext(uid,claims).firestore();
test('employee can read/edit submitted but unapproved own full merge payload',async()=>{
 const ref=f.doc(dbFor('crew'),'timesheets','CREW_2026-10-12');
 await assertSucceeds(f.getDoc(ref));
 await assertSucceeds(f.setDoc(ref,{...owned,days:{monday:{hours:9}},jobSnapshot:{bookingIds:[]},jobId:null,jobNumber:null,turnaroundCredits:{total:0},updatedAt:f.serverTimestamp(),submittedAt:f.serverTimestamp()},{merge:true}));
});
test('installed deterministic legacy weeks remain readable/editable and can gain ownership stamps',async()=>{
 const ref=f.doc(dbFor('crew'),'timesheets','CREW_2026-09-28');
 await assertSucceeds(f.getDoc(ref));
 await assertSucceeds(f.setDoc(ref,{...legacy,companyId:'bickers-action',ownerUid:'crew',employeeId:'employee-crew',notes:'retained offline draft'},{merge:true}));
 await assertSucceeds(f.getDoc(f.doc(dbFor('crew'),'timesheets','CREW_2026-11-02')));
 await assertSucceeds(f.setDoc(f.doc(dbFor('crew'),'timesheets','CREW_2026-11-02'),{...legacy,weekStart:'2026-11-02'}));
});
test('own company/code query works; company-wide and other-code queries fail',async()=>{
 const db=dbFor('crew');
 await assertSucceeds(f.getDocs(f.query(f.collection(db,'timesheets'),f.where('companyId','==','bickers-action'),f.where('employeeCode','==','CREW'),f.where('ownerUid','==','crew'),f.where('employeeId','==','employee-crew'),f.limit(60))));
 await assertFails(f.getDocs(f.query(f.collection(db,'timesheets'),f.where('companyId','==','bickers-action'),f.where('employeeCode','==','CREW'),f.limit(60))));
 await assertFails(f.getDocs(f.query(f.collection(db,'timesheets'),f.where('companyId','==','bickers-action'))));
 await assertFails(f.getDocs(f.query(f.collection(db,'timesheets'),f.where('companyId','==','bickers-action'),f.where('employeeCode','==','OTHER'))));
});
for(const uid of ['crew','manager','foreign']) test(`${uid} cannot read/edit/delete another employee timesheet`,async()=>{
 const ref=f.doc(dbFor(uid),'timesheets','OTHER_2026-10-12');
 await assertFails(f.getDoc(ref));await assertFails(f.updateDoc(ref,{notes:'intrusion'}));await assertFails(f.deleteDoc(ref));
});
for(const field of ['approved','approvedAt','approvedByUid','approvalHistory','payAdviceOverrides','payrollRates','isApproved','approvalStatus','reviewerUid']) test(`employee cannot fabricate ${field}`,async()=>{
 const value=field==='approved'||field==='isApproved'?true:field==='approvalHistory'?[]:'forged';
 // Approval history already exists: actually change it, not a no-op.
 await assertFails(f.updateDoc(f.doc(dbFor('crew'),'timesheets','CREW_2026-10-12'),{[field]:field==='approvalHistory'?[{actorUid:'crew'}]:value}));
});
for(const [week,marker] of [['2026-08-03',{status:'approved'}],['2026-08-10',{approved:true}],['2026-08-17',{approvedAt:'2026-10-14'}],['2026-08-24',{isApproved:true}],['2026-08-31',{approvalStatus:'approved'}]]) test(`approved marker locks a valid own weekly document: ${week}`,async()=>{
 const ref=f.doc(dbFor('crew'),'timesheets',`CREW_${week}`);
 // First prove this exact ownership/path/payload is editable without the marker.
 await env.withSecurityRulesDisabled(c=>f.setDoc(f.doc(c.firestore(),'timesheets',`CREW_${week}`),{...owned,weekStart:week}));
 await assertSucceeds(f.updateDoc(ref,{days:{monday:{hours:9}}}));
 await env.withSecurityRulesDisabled(c=>f.updateDoc(f.doc(c.firestore(),'timesheets',`CREW_${week}`),marker));
 await assertFails(f.updateDoc(ref,{days:{monday:{hours:99}}}));await assertFails(f.updateDoc(ref,{status:null,approved:false,approvedAt:null,isApproved:false,approvalStatus:null}));await assertFails(f.deleteDoc(ref));
});
for(const patch of [{ownerUid:'other'},{employeeId:'employee-other'},{employeeCode:'OTHER'},{companyId:'foreign'},{weekStart:'2026-10-19'},{status:'approved'}]) test(`ownership/state tampering denied: ${JSON.stringify(patch)}`,()=>assertFails(f.updateDoc(f.doc(dbFor('crew'),'timesheets','CREW_2026-10-12'),patch)));
test('admin reads company records but direct approval/correction bypass remains server-owned',async()=>{
 const db=dbFor('admin');await assertSucceeds(f.getDoc(f.doc(db,'timesheets','OTHER_2026-10-12')));
 await assertFails(f.updateDoc(f.doc(db,'timesheets','OTHER_2026-10-12'),{status:'approved'}));
 await assertFails(f.updateDoc(f.doc(db,'timesheets','CREW_2026-08-03'),{days:{monday:{hours:99}}}));
});
for(const collection of ['holidays','shiftChangeRequests','sickLeave','hr']) test(`private ${collection} denies other employee and manager-string access`,async()=>{
 await assertSucceeds(f.getDoc(f.doc(dbFor('crew'),collection,'own')));
 for(const uid of ['crew','manager','foreign']) {await assertFails(f.getDoc(f.doc(dbFor(uid),collection,'other')));await assertFails(f.updateDoc(f.doc(dbFor(uid),collection,'other'),{status:'approved'}));}
});
test('own private holiday query, create and retained pending cancellation work',async()=>{
 const db=dbFor('crew');
 await assertSucceeds(f.getDocs(f.query(f.collection(db,'holidays'),f.where('companyId','==','bickers-action'),f.where('employeeCode','==','CREW'),f.where('ownerUid','==','crew'),f.where('employeeId','==','employee-crew'))));
 await assertFails(f.getDocs(f.query(f.collection(db,'holidays'),f.where('companyId','==','bickers-action'))));
 await assertSucceeds(f.setDoc(f.doc(db,'holidays','new'),{companyId:'bickers-action',ownerUid:'crew',employeeId:'employee-crew',employeeCode:'CREW',userCode:'CREW',employee:'Crew',employeeName:'Crew',employeeEmail:'crew@example.test',startDate:'2026-11-01',endDate:'2026-11-01',holidayYear:2026,holidayDateKeys:['2026-11-01'],startHalfDay:false,startAMPM:null,endHalfDay:false,endAMPM:null,holidayReason:'Test',paidStatus:'Paid',isUnpaid:false,unpaid:false,isAccrued:false,paid:true,isPaid:true,leaveType:'Paid',createdAt:f.serverTimestamp(),status:'requested'}));
 await assertSucceeds(f.updateDoc(f.doc(db,'holidays','own'),{status:'cancelled',cancelledByUid:'crew',cancelledAt:f.serverTimestamp()}));
 await assertSucceeds(f.updateDoc(f.doc(db,'holidays','legacy-own'),{status:'cancelled',cancelledByUid:'crew',cancelledAt:f.serverTimestamp()}));
 await assertFails(f.deleteDoc(f.doc(db,'holidays','own')));
 await assertFails(f.updateDoc(f.doc(db,'holidays','approved'),{status:'cancelled',cancelledByUid:'crew',cancelledAt:f.serverTimestamp()}));
});
test('employee messages are parent-authorised, append-only and cannot impersonate a reviewer',async()=>{
 const db=dbFor('crew'), own=f.collection(db,'timesheetQueries','own','messages');
 await assertSucceeds(f.setDoc(f.doc(own,'new'),{text:'Question',sender:'employee',authorUid:'crew',createdAt:f.serverTimestamp()}));
 await assertSucceeds(f.setDoc(f.doc(own,'legacy'),{text:'Installed app',sender:'employee',createdAt:f.serverTimestamp()}));
 await assertFails(f.setDoc(f.doc(own,'forged'),{text:'Approved',sender:'manager',authorUid:'crew',createdAt:f.serverTimestamp()}));
 await assertFails(f.setDoc(f.doc(db,'timesheetQueries','other','messages','intrusion'),{text:'Other',sender:'employee',authorUid:'crew',createdAt:f.serverTimestamp()}));
 await assertFails(f.updateDoc(f.doc(own,'new'),{text:'rewrite'}));await assertFails(f.deleteDoc(f.doc(own,'new')));
});
test('verified office admin can create/close an own-company employee query; staff cannot impersonate that creator',async()=>{
 const data={companyId:'bickers-action',ownerUid:'crew',employeeId:'employee-crew',timesheetId:'CREW_2026-10-12',employeeName:'Crew',employeeCode:'CREW',weekStart:'2026-10-12',day:'Monday',field:'overall',message:'Please clarify',note:'Please clarify',status:'open',createdAt:f.serverTimestamp(),createdByRole:'manager'};
 const admin=dbFor('admin');
 await assertSucceeds(f.setDoc(f.doc(admin,'timesheetQueries','office-new'),data));
 await assertSucceeds(f.updateDoc(f.doc(admin,'timesheetQueries','office-new'),{status:'closed',closedAt:f.serverTimestamp()}));
 await assertSucceeds(f.getDocs(f.query(f.collection(dbFor('crew'),'timesheetQueries'),f.where('companyId','==','bickers-action'),f.where('employeeCode','==','CREW'),f.where('ownerUid','==','crew'),f.where('employeeId','==','employee-crew'),f.limit(30))));
 await assertFails(f.setDoc(f.doc(dbFor('crew'),'timesheetQueries','employee-forged'),data));
 await assertFails(f.setDoc(f.doc(admin,'timesheetQueries','foreign-parent'),{...data,timesheetId:'missing'}));
 await assertFails(f.updateDoc(f.doc(admin,'timesheetQueries','office-new'),{employeeCode:'OTHER'}));
});
test('existing ownership stamps cannot be removed to regain a legacy access path',async()=>{
 const ref=f.doc(dbFor('crew'),'timesheets','CREW_2026-10-12');
 for(const field of ['ownerUid','employeeId','companyId']) await assertFails(f.updateDoc(ref,{[field]:f.deleteField()}));
});
test('conflicting canonical employee UID cannot acquire unstamped private records through a mislinked user',async()=>{
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();
  await f.setDoc(f.doc(db,'timesheets','OTHER_2026-09-21'),{...legacy,employeeCode:'OTHER',weekStart:'2026-09-21'});
  await f.setDoc(f.doc(db,'holidays','legacy-other'),{companyId:'bickers-action',employeeCode:'OTHER',status:'requested'});
  await f.updateDoc(f.doc(db,'users','crew'),{employeeId:'employee-other'});
 });
 try {
  const db=dbFor('crew');
  await assertFails(f.getDoc(f.doc(db,'timesheets','OTHER_2026-09-21')));
  await assertFails(f.updateDoc(f.doc(db,'timesheets','OTHER_2026-09-21'),{notes:'wrong owner'}));
  await assertFails(f.getDoc(f.doc(db,'timesheets','OTHER_2026-11-09')));
  await assertFails(f.getDoc(f.doc(db,'holidays','legacy-other')));
 } finally {
  await env.withSecurityRulesDisabled(c=>f.updateDoc(f.doc(c.firestore(),'users','crew'),{employeeId:'employee-crew'}));
 }
});
