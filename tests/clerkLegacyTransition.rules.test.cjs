const {test,before,after}=require('node:test');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails,firestore:f,storage:s}=require('./helpers/securityRulesRuntime.cjs');
let env;
const base={companyId:'company',employeeId:'emp',isEnabled:true,role:'user',appAccess:{user:true,service:true},mobileAccessStatus:'active'};
const token={firebase:{sign_in_provider:'custom'},auth_time:100,authMethod:'clerk',verifiedClerkEmail:true,identityLinkVersion:2,clerkUserId:'dev_clerk',clerkSessionId:'session',identityCompanyId:'company',identityEmployeeId:'emp'};
const start=Date.now()-1000;
const allowance={version:1,instanceId:'ins_3GUkXKRF1LLr0E5Z5OS7LeHJO34',clerkUserId:'dev_clerk',companyId:'company',employeeId:'emp',role:'user',allowEmptyEmployeeClaim:false,issuedAtMs:start,validUntilMs:start+1209600000};
const variants={
 staff:{ok:true},admin:{ok:true,profile:{role:'admin',mobileAccessStatus:'invited'},grant:{role:'admin',allowEmptyEmployeeClaim:true},token:{identityEmployeeId:''}},
 platform:{ok:true,profile:{role:'platformAdmin'},grant:{role:'platformadmin',allowEmptyEmployeeClaim:true},token:{identityEmployeeId:''}},
 unlinkedAdmin:{ok:true,profile:{role:'admin',employeeId:''},grant:{role:'admin',employeeId:'',allowEmptyEmployeeClaim:true},token:{identityEmployeeId:''}},
 oldStaffNoSession:{ok:true,noSession:true},oldAdminNoSession:{ok:true,noSession:true,profile:{role:'admin'},grant:{role:'admin',allowEmptyEmployeeClaim:true},token:{identityEmployeeId:''}},
 oldNoSessionNoGrant:{noSession:true,noGrant:true},oldNoSessionSticky:{noSession:true,profile:{clerkLeaseRequired:true}},oldEmptySession:{token:{clerkSessionId:''}},oldMalformedSession:{token:{clerkSessionId:7}},
 missing:{noGrant:true},expired:{grant:{validUntilMs:1}},future:{grant:{issuedAtMs:Date.now()+60000}},oversized:{grant:{validUntilMs:start+1209600001}},
 wrongInstance:{grant:{instanceId:'other'}},wrongUid:{grant:{uid:'other'}},wrongCompany:{grant:{companyId:'other'}},wrongEmployee:{grant:{employeeId:'other'}},wrongProvider:{grant:{clerkUserId:'other'}},
 unlinkedForeignClaim:{profile:{role:'admin',employeeId:''},grant:{role:'admin',employeeId:'',allowEmptyEmployeeClaim:true},token:{identityEmployeeId:'foreign'}},
 foreignClaim:{token:{identityEmployeeId:'other'}},emptyStaff:{token:{identityEmployeeId:''},grant:{allowEmptyEmployeeClaim:true}},emptyAdminNotAllowed:{profile:{role:'admin'},grant:{role:'admin'},token:{identityEmployeeId:''}},
 changedRole:{grant:{role:'admin',allowEmptyEmployeeClaim:true}},conflictingAlias:{profile:{clerkUserId:'dev_clerk',auth:{clerkUserId:'foreign'}}},malformedAlias:{profile:{clerkUserId:false}},
 cutoff:{profile:{sessionValidAfter:101}},revoked:{profile:{sessionsRevokedAt:'2026-10-15'}},reset:{profile:{passwordResetRequired:true}},providerReset:{profile:{clerkPasswordResetAfter:99}},disabled:{profile:{isEnabled:false}},archived:{profile:{archived:true}},
 unrelatedCustom:{token:{authMethod:'other'}},unverified:{token:{verifiedClerkEmail:false}},
 newTokenNoLease:{token:{clerkLeaseVersion:1}},oldTokenSticky:{profile:{clerkLeaseRequired:true}},oldTokenFalse:{profile:{clerkLeaseRequired:false}},oldTokenNull:{profile:{clerkLeaseRequired:null}},oldTokenMalformed:{profile:{clerkLeaseRequired:'true'}},
 falseToken:{token:{clerkLeaseVersion:false}},nullToken:{token:{clerkLeaseVersion:null}},unknownToken:{token:{clerkLeaseVersion:2}},
 shared:{ok:true,shared:true},sharedMissingSession:{shared:true,noSession:true},sharedMissingSticky:{shared:true,noSticky:true},sharedNoLease:{shared:true,noLease:true},sharedFalseToken:{shared:true,token:{clerkLeaseVersion:false}},sharedNullSticky:{shared:true,profile:{clerkLeaseRequired:null}},sharedAdminEmpty:{shared:true,profile:{role:'admin'},token:{identityEmployeeId:''}},
};
function profile(uid,v){
 const p={...base,uid,legacyClerkWebAccess:{...allowance,uid,...v.grant},...v.profile};
 if(v.noGrant)delete p.legacyClerkWebAccess;
 if(v.shared){
  if(!v.noSticky && !Object.hasOwn(v.profile||{},'clerkLeaseRequired'))p.clerkLeaseRequired=true;
  if(!v.noLease)p.clerkSessionLeases={session:{uid,companyId:'company',clerkUserId:'dev_clerk',clerkSessionId:'session',sessionCreatedAt:100,status:'active',validUntilMs:Date.now()+240000}};
 }
 return p;
}
function context(uid){const v=variants[uid];const claims={...token,...(v.shared?{clerkLeaseVersion:1}:{}),...v.token};if(v.noSession)delete claims.clerkSessionId;return env.authenticatedContext(uid,claims);}
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-bickers-clerk-auth',firestore:{rules:fs.readFileSync('firebase/clerk-auth/firestore.rules','utf8')},storage:{rules:fs.readFileSync('firebase/clerk-auth/storage.rules','utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  for(const [uid,v] of Object.entries(variants))await f.setDoc(f.doc(c.firestore(),'users',uid),profile(uid,v));
  await f.setDoc(f.doc(c.firestore(),'bookings','booking'),{companyId:'company'});
  await s.uploadBytes(s.ref(c.storage(),'companies/company/quotes/existing.pdf'),Buffer.from('fixture'),{contentType:'application/pdf'});
 });
});
after(async()=>env?.cleanup());
for(const [uid,v] of Object.entries(variants))test(`${v.ok?'retains':'denies'} both services: ${uid}`,async()=>{
 const c=context(uid),check=v.ok?assertSucceeds:assertFails;
 await check(f.getDoc(f.doc(c.firestore(),'bookings','booking')));
 await check(f.setDoc(f.doc(c.firestore(),'bookings',uid),{companyId:'company'}));
 await check(s.getMetadata(s.ref(c.storage(),'companies/company/quotes/existing.pdf')));
 await check(s.uploadBytes(s.ref(c.storage(),`companies/company/quotes/${uid}.pdf`),Buffer.from('fixture'),{contentType:'application/pdf'}));
});
test('staff and administrators cannot manufacture, modify or delete transition policy',async()=>{
 for(const uid of ['staff','admin','shared']){
  const db=context(uid).firestore();
  for(const patch of [...(uid!=='shared'?[{clerkLeaseRequired:true}]:[]),{clerkLeaseRequired:false},{legacyClerkWebAccess:{}},{legacyClerkWebAccess:f.deleteField()},{clerkSessionLeases:{}},...(uid==='shared'?[{clerkLeaseRequired:f.deleteField()}]:[])])await assertFails(f.updateDoc(f.doc(db,'users',uid),patch));
  await assertFails(f.setDoc(f.doc(db,'clerkSessionLeases','forged'),{uid}));
 }
});
test('shared and transitional sessions retain the existing Storage user-plus-booking read budget',async()=>{
 for(const uid of ['staff','admin','shared'])await assertSucceeds(s.uploadBytes(s.ref(context(uid).storage(),`recces/booking/2026-10-15/${uid}/location/photo.jpg`),Buffer.from('fixture'),{contentType:'image/jpeg'}));
});
test('existing and shared sessions can query tenant dashboard collections',async()=>{
 for(const uid of ['staff','admin','platform','shared']){
  const db=context(uid).firestore();
  for(const name of ['bookings','employees','vehicles','notes','maintenanceBookings','maintenanceJobs','serviceRecords','holidays']){
   await assertSucceeds(f.getDocs(f.query(f.collection(db,name),f.where('companyId','==','company'))));
  }
 }
});
