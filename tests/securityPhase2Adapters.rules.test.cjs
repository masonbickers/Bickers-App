const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const {initializeTestEnvironment,firestore:f}=require('./helpers/securityRulesRuntime.cjs');
const office=process.env.SECURITY_OFFICE_ROOT || process.env.FIREBASE_RULES_TEST_DEPENDENCIES;if(!office)throw Error('Office runtime required');
const project='demo-bickers-security-remediation';
const transport=require('./helpers/firestoreTransactionTransport.cjs').createTransactionTransport(project);
const source=p=>fs.readFileSync(path.join(office,'src/app',p),'utf8');
const loadModule=(code,names,deps={})=>{const ctx=vm.createContext({Response,Request,URL,URLSearchParams,Date,Buffer,console,fetch:transport.fetch,process:{env:{NEXT_PUBLIC_FIREBASE_PROJECT_ID:project,FIRESTORE_EMULATOR_HOST:process.env.FIRESTORE_EMULATOR_HOST}},...deps});vm.runInContext(code.replace(/^import[^;]+;\n/gm,'').replace(/export (?=(async )?function|const)/g,'')+'\nthis.exports={'+names.join(',')+'};',ctx);return {exports:ctx.exports,ctx};};
const integrity=loadModule(source('utils/hrIntegrity.js'),['HR_COLLECTIONS','ownsHrRecord','canReviewHrRecord','hrTransition','hrDraftEdit','hrRecordApproved','projectHrApprovalRecord']).exports;
const history=loadModule(source('utils/hrHistory.js'),['canonicalHrEmployeeUid','resolveHrRecordOwner','ownHrEmployee','assertOwnHrAccountLink','reviewHrEmployees','selectHrHistory','selectHrReviews','collectHrCandidates'],integrity).exports;
const legacy=loadModule(source('utils/hrLegacyActions.js'),['prepareLegacyHrAction'],{...integrity,...history}).exports;
const {normalizeServerRole,accessValidationFingerprint}=loadModule(source('api/admin/_lib.js'),['normalizeServerRole','accessValidationFingerprint']).exports;
const commit=loadModule(source('utils/firestoreCommitPlanning.js'),['buildFirestoreCommitWrites']).exports;
const encoding=loadModule(source('utils/firestoreValueEncoding.js'),['flattenFirestoreArrayValues']).exports;
const adminSource=source('api/_firebaseAdminRest.js').replace('https://firestore.googleapis.com/v1/',`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/`);
const admin=loadModule(adminSource,['adminRunReadWriteTransaction','adminReadDocumentWithMetadata','adminCommitDocumentPatches'],{...commit,...encoding,crypto:require('node:crypto')});admin.ctx.getFirebaseAdminAccessToken=async()=> 'owner';
const readerSource=source('api/hr/_readSnapshot.js').replace('https://firestore.googleapis.com/v1/',`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/`);
const reader=loadModule(readerSource,['withHrReadSnapshot','snapshotHrActor'],{getFirebaseAdminAccessToken:async()=> 'owner',normalizeServerRole,accessValidationFingerprint}).exports;
const legacyService=loadModule(source('api/hr/_legacyService.js'),['readLegacyHrRecord','mutateLegacyHrRecord'],{...admin.exports,...reader,...history,...legacy,...integrity}).exports;
const crew={uid:'crew',employeeId:'emp',companyId:'A',role:'user',isEnabled:true,mobileAccessStatus:'active',appAccess:{user:true,service:false}};
const manager={...crew,uid:'manager',employeeId:'manager-emp',hrApprovalAccess:{enabled:true,companyId:'A',employeeIds:['emp']}};
const actors={crew,manager,other:{...crew,uid:'other',employeeId:'other-emp'},admin:{...crew,uid:'admin',role:'admin'}};
let env,active='crew';const jsonError=(error,status=400)=>Response.json({error},{status});
const access=()=>active?{verifiedUser:{uid:active,sessionValidationFingerprint:accessValidationFingerprint(actors[active])},userData:structuredClone(actors[active])}:{error:jsonError('Sign in required.',401)};
function route(file){return loadModule(source(file),file.endsWith('records/route.js')?['GET','POST']:['GET'],{...reader,...history,...integrity,...admin.exports,...legacyService,safeInitialHrPayload:()=>{},jsonError,requireActiveUserFromRequest:async()=>access()}).exports;}
const historyRoute=route('api/hr/history/route.js'),reviewsRoute=route('api/hr/reviews/route.js'),recordsRoute=route('api/hr/records/route.js');
const req=(collection,endpoint='history')=>new Request(`http://localhost/api/hr/${endpoint}?collection=${collection}`);
before(async()=>{
 env=await initializeTestEnvironment({projectId:project,firestore:{rules:fs.readFileSync(process.env.MOBILE_RULES_PATH || 'firebase/security-remediation-2026-10-14/firestore.rules','utf8')}});await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();
  for(const [id,data] of Object.entries(actors))await f.setDoc(f.doc(db,'users',id),data);
  for(const [id,data] of [['emp',{companyId:'A',authUid:'crew',userCode:'CREW'}],['other-emp',{companyId:'A',authUid:'other',userCode:'OTHER'}],['manager-emp',{companyId:'A',authUid:'manager',userCode:'MANAGER'}]])await f.setDoc(f.doc(db,'employees',id),data);
  await f.setDoc(f.doc(db,'timesheets','CREW_2026-10-12'),{employeeCode:'CREW',weekStart:'2026-10-12',status:'submitted',days:{monday:{hours:8,salary:999}},payAdviceOverrides:{private:1}});
  await f.setDoc(f.doc(db,'timesheets','CREW_2026-10-05'),{weekStart:'2026-10-05',status:'submitted',notes:'Path-only historical identity'});
  await f.setDoc(f.doc(db,'timesheets','OTHER_2026-10-12'),{companyId:'A',employeeId:'other-emp',ownerUid:'other',employeeCode:'OTHER',weekStart:'2026-10-12',status:'submitted'});
  await f.setDoc(f.doc(db,'holidays','legacy'),{userCode:'CREW',status:'requested',holidayReason:'Retain history'});
  const batch=f.writeBatch(db);for(let i=0;i<303;i++)batch.set(f.doc(db,'holidays',`current-${String(i).padStart(3,'0')}`),{companyId:'A',employeeId:'emp',ownerUid:'crew',employeeCode:'CREW',status:'approved'});await batch.commit();
 });
});after(async()=>{await env?.clearFirestore();await env?.cleanup();await transport.close();});
test('real read-only Firestore snapshot returns current and unstamped own history with complete pagination',async()=>{
 active='crew';const before=await admin.exports.adminReadDocumentWithMetadata('holidays','legacy');const result=await historyRoute.GET(req('holidays'));assert.equal(result.status,200);const body=await result.json();assert.equal(body.records.length,304);assert.equal(body.historyComplete,true);assert.equal(body.records.find(r=>r.id==='legacy').employeeId,'emp');assert.equal(result.headers.get('cache-control'),'private, no-store');assert.equal((await admin.exports.adminReadDocumentWithMetadata('holidays','legacy')).updateTime,before.updateTime);
 const weeks=await (await historyRoute.GET(req('timesheets'))).json();assert.deepEqual(weeks.records.map(r=>r.id).sort(),['CREW_2026-10-05','CREW_2026-10-12']);
});
test('private history rejects selectors, anonymous and canonical link conflicts',async()=>{
 active=null;assert.equal((await historyRoute.GET(req('holidays'))).status,401);active='crew';assert.equal((await historyRoute.GET(new Request('http://localhost/api/hr/history?collection=holidays&employeeId=other-emp'))).status,400);
 await env.withSecurityRulesDisabled(c=>f.updateDoc(f.doc(c.firestore(),'employees','emp'),{uid:'conflicting'}));assert.equal((await historyRoute.GET(req('holidays'))).status,409);await env.withSecurityRulesDisabled(c=>f.updateDoc(f.doc(c.firestore(),'employees','emp'),{uid:f.deleteField()}));
});
test('assigned manager API includes only scoped current/legacy projection, without nested payroll',async()=>{
 active='manager';const r=await reviewsRoute.GET(req('timesheets','reviews'));assert.equal(r.status,200);const body=await r.json();assert.equal(body.records.length,2);const week=body.records.find(r=>r.id==='CREW_2026-10-12');assert.equal(week.days.monday.hours,8);assert.equal(week.days.monday.salary,undefined);assert.equal(week.payAdviceOverrides,undefined);assert.equal(week.canApprove,true);
 active='other';assert.equal((await reviewsRoute.GET(req('timesheets','reviews'))).status,403);
});
test('capability removal inside fresh read snapshot rejects a previously authenticated manager',async()=>{
 active='manager';await env.withSecurityRulesDisabled(c=>f.updateDoc(f.doc(c.firestore(),'users','manager'),{hrApprovalAccess:{enabled:false,companyId:'A',employeeIds:[]}}));assert.equal((await reviewsRoute.GET(req('timesheets','reviews'))).status,403);await env.withSecurityRulesDisabled(c=>f.setDoc(f.doc(c.firestore(),'users','manager'),manager));
});
test('HTTP legacy approval uses actual Firestore transaction and binds observed version',async()=>{
 active='manager';const queue=await (await reviewsRoute.GET(req('timesheets','reviews'))).json();const record=queue.records.find(r=>r.id==='CREW_2026-10-12');const request=new Request('http://localhost/api/hr/records',{method:'POST',body:JSON.stringify({collection:'timesheets',id:record.id,status:'approved',expectedUpdateTime:record.updateTime})});const retry=request.clone();const r=await recordsRoute.POST(request);assert.equal(r.status,200,JSON.stringify(await r.clone().json()));const stored=await admin.exports.adminReadDocumentWithMetadata('timesheets',record.id);assert.equal(stored.data.approved,true);assert.equal(stored.data.employeeId,undefined);assert.equal(stored.data.companyId,undefined);assert.equal(stored.data.days.monday.salary,999);assert.equal((await recordsRoute.POST(retry)).status,409);
});
test('own pending holiday cancellation through HTTP retains content and rejects approved cancellation',async()=>{
 active='crew';const own=await (await historyRoute.GET(req('holidays'))).json();const record=own.records.find(r=>r.id==='legacy');const request=r=>new Request('http://localhost/api/hr/records',{method:'POST',body:JSON.stringify({collection:'holidays',id:r.id,action:'cancelPendingHoliday',expectedUpdateTime:r.updateTime})});assert.equal((await recordsRoute.POST(request(record))).status,200);const retained=await admin.exports.adminReadDocumentWithMetadata('holidays','legacy');assert.equal(retained.data.holidayReason,'Retain history');assert.equal(retained.data.status,'cancelled');assert.equal((await recordsRoute.POST(request(own.records.find(r=>r.id==='current-000')))).status,403);
});

async function seed(collection,id,data){await env.withSecurityRulesDisabled(c=>f.setDoc(f.doc(c.firestore(),collection,id),data));}
const recordRequest=(id,body)=>new Request('http://localhost/api/hr/records',{method:'POST',body:JSON.stringify({collection:'timesheets',id,...body})});
test('stamped alias conflict and duplicate canonical UID reject direct record reads and approval',async()=>{
 active='manager';const id='stamped-conflict';await seed('timesheets',id,{companyId:'A',employeeId:'emp',ownerUid:'crew',authUid:'other',status:'submitted'});
 const row=await admin.exports.adminReadDocumentWithMetadata('timesheets',id);
 const get=id=>new Request(`http://localhost/api/hr/records?collection=timesheets&id=${id}&includeRecord=true`);
 assert.equal((await recordsRoute.GET(get(id))).status,409);assert.equal((await recordsRoute.POST(recordRequest(id,{status:'approved',expectedUpdateTime:row.updateTime}))).status,409);
 await seed('timesheets',id,{companyId:'A',employeeId:'emp',ownerUid:'crew',status:'submitted'});await seed('employees','duplicate',{companyId:'B',authUid:'crew',userCode:'DUP'});
 assert.equal((await recordsRoute.GET(get(id))).status,409);const duplicateRow=await admin.exports.adminReadDocumentWithMetadata('timesheets',id);assert.equal((await recordsRoute.POST(recordRequest(id,{status:'approved',expectedUpdateTime:duplicateRow.updateTime}))).status,409);
 await env.withSecurityRulesDisabled(async c=>{await f.deleteDoc(f.doc(c.firestore(),'employees','duplicate'));await f.deleteDoc(f.doc(c.firestore(),'timesheets',id));});
});
test('stamped approval rejects capability or session changes after authentication',async()=>{
 active='manager';const id='stamped-race';await seed('timesheets',id,{companyId:'A',employeeId:'emp',ownerUid:'crew',status:'submitted'});const row=await admin.exports.adminReadDocumentWithMetadata('timesheets',id);
 for(const patch of [{hrApprovalAccess:{enabled:false,companyId:'A',employeeIds:[]}},{sessionValidAfter:200},{passwordResetRequired:true}]){
  await seed('users','manager',{...manager,...patch});assert.equal((await recordsRoute.POST(recordRequest(id,{status:'approved',expectedUpdateTime:row.updateTime}))).status,403);
  assert.equal((await admin.exports.adminReadDocumentWithMetadata('timesheets',id)).data.status,'submitted');await seed('users','manager',manager);
 }
 await env.withSecurityRulesDisabled(c=>f.deleteDoc(f.doc(c.firestore(),'timesheets',id)));
});
test('UID-less shared employee link rejects direct own read, edit and cancellation for both claimants',async()=>{
 await seed('employees','emp',{companyId:'A',userCode:'CREW'});await seed('users','duplicate-user',{uid:'duplicate-user',employeeId:'emp',companyId:'A'});
 await seed('timesheets','uidless',{companyId:'A',employeeId:'emp',status:'submitted'});await seed('holidays','uidless',{companyId:'A',employeeId:'emp',status:'requested'});
 active='crew';const week=await admin.exports.adminReadDocumentWithMetadata('timesheets','uidless'),leave=await admin.exports.adminReadDocumentWithMetadata('holidays','uidless');
 assert.equal((await historyRoute.GET(req('holidays'))).status,409);
 assert.equal((await recordsRoute.GET(new Request('http://localhost/api/hr/records?collection=timesheets&id=uidless&includeRecord=true'))).status,409);
 assert.equal((await recordsRoute.POST(recordRequest('uidless',{action:'edit',patch:{days:{}},expectedUpdateTime:week.updateTime}))).status,409);
 assert.equal((await recordsRoute.POST(new Request('http://localhost/api/hr/records',{method:'POST',body:JSON.stringify({collection:'holidays',id:'uidless',action:'cancelPendingHoliday',expectedUpdateTime:leave.updateTime})}))).status,409);
 await env.withSecurityRulesDisabled(async c=>{await f.deleteDoc(f.doc(c.firestore(),'users','duplicate-user'));await f.deleteDoc(f.doc(c.firestore(),'timesheets','uidless'));await f.deleteDoc(f.doc(c.firestore(),'holidays','uidless'));});await seed('employees','emp',{companyId:'A',authUid:'crew',userCode:'CREW'});
});
test('identity-only catalog marks unassignable historical leave incomplete without exposing its body',async()=>{
 active='crew';await seed('holidays','unassignable',{employee:'Unverified historic name',holidayReason:'Other private contents',status:'requested'});
 const result=await (await historyRoute.GET(req('holidays'))).json();assert.equal(result.historyComplete,false);assert.equal(result.withheldCount,0);assert.equal(result.records.some(r=>r.id==='unassignable'),false);
 await env.withSecurityRulesDisabled(c=>f.deleteDoc(f.doc(c.firestore(),'holidays','unassignable')));
});

// Phase 3: actual Firebase Auth emulator tokens through the production native
// verifier/session gate and HR handlers. Business data and accounts are synthetic.
let authApp,authAdmin;const authTokens={};
async function realAuthRoutes() {
 if(!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || ''))throw Error('Loopback Auth emulator required');
 if(!authApp){
  const {createRequire}=require('node:module'),dep=createRequire(path.join(office,'package.json'));
  authApp=dep('firebase-admin/app').initializeApp({projectId:project},'phase3-auth-fixtures');authAdmin=dep('firebase-admin/auth').getAuth(authApp);
  for(const uid of ['crew','manager','other','admin']){
   await authAdmin.createUser({uid,email:`${uid}@synthetic.example`,password:'Synthetic-only-12345!'});
   const response=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`${uid}@synthetic.example`,password:'Synthetic-only-12345!',returnSecureToken:true})});assert.equal(response.status,200);authTokens[uid]=(await response.json()).idToken;
  }
 }
 const accessPolicy=loadModule(source('utils/accountAccess.js'),['hasCanonicalAccessRecord','hasCompanyAccess','hasServiceWorkspaceAccess','isAccountDisabled']).exports;
 const native=loadModule(source('utils/mobilePasswordAccess.js'),['mobilePasswordAccessAllowed']).exports;
 const service=loadModule(source('api/sessionSecurityService.mjs'),['createSessionSecurityService']).exports.createSessionSecurityService({firebase:authAdmin,clerk:{sessions:{getSession:async()=>{throw Error('No external provider in synthetic fixture');}}},readUser:async uid=>(await admin.exports.adminReadDocumentWithMetadata('users',uid))?.data,patchUser:async()=>{throw Error('Recovery completion requires separate provider fixture');},firebasePasswordChangedAt:async()=>{throw Error('No unverified recovery proof');}});
 const security=loadModule(source('api/admin/_lib.js'),['requireActiveUserFromRequest'],{...accessPolicy,...native,getFirebaseAuthAdmin:()=>authAdmin,enforceFirebaseSession:(token,user)=>service.firebaseAllowed(token,user),adminReadDocument:async(c,id)=>(await admin.exports.adminReadDocumentWithMetadata(c,id))?.data,adminCreateDocument:async()=>{}}).exports;
 function real(file){return loadModule(source(file),file.endsWith('records/route.js')?['GET','POST']:['GET'],{...reader,...history,...integrity,...admin.exports,...legacyService,safeInitialHrPayload:()=>{},jsonError,requireActiveUserFromRequest:security.requireActiveUserFromRequest}).exports;}
 return {history:real('api/hr/history/route.js'),reviews:real('api/hr/reviews/route.js'),records:real('api/hr/records/route.js')};
}
const authed=(uid,url,body)=>new Request('http://localhost/api/hr/'+url,{...(body?{method:'POST',body:JSON.stringify(body)}:{}),headers:{Authorization:`Bearer ${authTokens[uid] || ''}`}});
after(async()=>{if(authApp){for(const uid of Object.keys(authTokens))await authAdmin.deleteUser(uid);const {createRequire}=require('node:module');await createRequire(path.join(office,'package.json'))('firebase-admin/app').deleteApp(authApp);}});
test('real native employee sessions return only own current and legacy history and reject foreign private reads',async()=>{
 const routes=await realAuthRoutes();await seed('timesheets','auth-week',{companyId:'A',employeeId:'emp',ownerUid:'crew',employeeCode:'CREW',status:'submitted',notes:'Synthetic private work',days:{monday:{hours:8,salary:999}}});
 const result=await routes.history.GET(authed('crew','history?collection=timesheets'));assert.equal(result.status,200);const body=await result.json();assert.ok(body.records.some(row=>row.id==='CREW_2026-10-05'));assert.ok(body.records.some(row=>row.id==='auth-week'));assert.ok(body.records.every(row=>row.ownerUid==='crew' && row.employeeId==='emp'));
 assert.equal((await routes.records.GET(authed('other','records?collection=timesheets&id=auth-week&includeRecord=true'))).status,403);
 assert.equal((await routes.history.GET(new Request('http://localhost/api/hr/history?collection=holidays',{headers:{Authorization:'Bearer not-a-valid-jwt'}}))).status,401);
});
test('real native manager approval preserves admin authority and denies self-approval or approved corrections',async()=>{
 const routes=await realAuthRoutes();const queue=await routes.reviews.GET(authed('manager','reviews?collection=timesheets'));assert.equal(queue.status,200);const body=await queue.json(),week=body.records.find(row=>row.id==='auth-week');assert.equal(week.days.monday.salary,undefined);
 assert.equal((await routes.records.POST(authed('manager','records',{collection:'timesheets',id:week.id,status:'approved',expectedUpdateTime:week.updateTime}))).status,200);
 const stored=await admin.exports.adminReadDocumentWithMetadata('timesheets','auth-week');for(const uid of ['crew','manager'])assert.equal((await routes.records.POST(authed(uid,'records',{collection:'timesheets',id:'auth-week',action:'edit',patch:{days:{}},expectedUpdateTime:stored.updateTime}))).status,403);
 await seed('timesheets','auth-self',{companyId:'A',employeeId:'manager-emp',ownerUid:'manager',status:'submitted'});const self=await admin.exports.adminReadDocumentWithMetadata('timesheets','auth-self');assert.equal((await routes.records.POST(authed('manager','records',{collection:'timesheets',id:'auth-self',status:'approved',expectedUpdateTime:self.updateTime}))).status,403);
 assert.equal((await routes.reviews.GET(authed('admin','reviews?collection=timesheets'))).status,200);assert.equal((await routes.reviews.GET(authed('other','reviews?collection=timesheets'))).status,403);
});
test('real native tokens fail at equal session cutoff, recovery restriction and provider disablement',async()=>{
 const routes=await realAuthRoutes(),token=await authAdmin.verifyIdToken(authTokens.crew);
 for(const patch of [{sessionValidAfter:token.auth_time},{passwordResetRequired:true}]){await seed('users','crew',{...crew,...patch});assert.ok([401,403].includes((await routes.history.GET(authed('crew','history?collection=holidays'))).status));await seed('users','crew',crew);}
 await authAdmin.updateUser('crew',{disabled:true});assert.ok([401,403].includes((await routes.history.GET(authed('crew','history?collection=holidays'))).status));await authAdmin.updateUser('crew',{disabled:false});assert.equal((await routes.history.GET(authed('crew','history?collection=holidays'))).status,200);
});
