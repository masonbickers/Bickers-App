const {test,before,after} = require('node:test');
const fs = require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails,firestore:f,storage:s} = require('./helpers/securityRulesRuntime.cjs');
let env;
const profile = { clerkLeaseRequired:true, uid:'staff',companyId:'company',employeeId:'emp',isEnabled:true,role:'user',appAccess:{user:true,service:true},mobileAccessStatus:'active',clerkUserId:'clerk',auth:{clerkUserId:'clerk'} };
const claims = {firebase:{sign_in_provider:'custom'},auth_time:100,authMethod:'clerk',verifiedClerkEmail:true,identityLinkVersion:2,clerkLeaseVersion:1,clerkUserId:'clerk',clerkSessionId:'session',identityCompanyId:'company',identityEmployeeId:'emp'};
const lease = uid => ({uid,companyId:'company',clerkUserId:'clerk',clerkSessionId:'session',status:'active',sessionCreatedAt:100,validUntilMs:Date.now()+240000});
const variants = {
  valid:{},missing:{clerkSessionLeases:{}},expired:{lease:{validUntilMs:1}},revoked:{lease:{status:'inactive'}},
  wrongOwner:{lease:{uid:'other'}},wrongCompany:{lease:{companyId:'other'}},wrongSession:{lease:{clerkSessionId:'other'}},wrongProvider:{lease:{clerkUserId:'other'}},
  nullAliases:{clerkUserId:null,auth:{clerkUserId:null}},malformedLink:{clerkUserId:false},mixed:{auth:{clerkUserId:'other'}},cutoff:{sessionValidAfter:101},malformed:{sessionValidAfter:'1'},
  refreshed:{sessionValidAfter:101,token:{auth_time:200}},reset:{passwordResetRequired:true},providerReset:{clerkPasswordResetAfter:99},disabled:{isEnabled:false},
  legacy:{password:true},retired:{password:true,authMigrationState:'clerk-only'},retiredClerk:{authMigrationState:'clerk-only'},
};
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-bickers-clerk-auth',firestore:{rules:fs.readFileSync(process.env.CLERK_FIRESTORE_RULES||'firebase/clerk-auth/firestore.baseline.rules','utf8')},storage:{rules:fs.readFileSync(process.env.CLERK_STORAGE_RULES||'firebase/clerk-auth/storage.baseline.rules','utf8')}});
  await env.withSecurityRulesDisabled(async c=>{
    for(const [uid,variant] of Object.entries(variants)) {
      const {lease:patch,token,password,...fields}=variant;
      await f.setDoc(f.doc(c.firestore(),'users',uid),{...profile,uid,clerkSessionLeases:{session:{...lease(uid),...patch}},...fields});
    }
    await f.setDoc(f.doc(c.firestore(),'users','admin'),{...profile,uid:'admin',role:'admin'});
    await f.setDoc(f.doc(c.firestore(),'bookings','booking'),{companyId:'company'});
    await f.setDoc(f.doc(c.firestore(),'employees','emp'),{companyId:'company',authUid:'valid',phone:'123'});
    await s.uploadBytes(s.ref(c.storage(),'companies/company/quotes/test.pdf'),Buffer.from('fixture'),{contentType:'application/pdf'});
  });
});
after(async()=>env?.cleanup());
test('owned vehicle-check photos can be created but never overwritten',async()=>{
  for(const uid of ['valid','legacy']) {
    const token=uid==='legacy'?{firebase:{sign_in_provider:'password'},auth_time:100}:claims;
    const storage=env.authenticatedContext(uid,token).storage();
    const photo=s.ref(storage,`vehicle-checks/${uid}/check/original.jpg`);
    await assertSucceeds(s.uploadBytes(photo,Buffer.from('original'),{contentType:'image/jpeg'}));
    await assertFails(s.uploadBytes(photo,Buffer.from('replacement'),{contentType:'image/jpeg'}));
  }
});
async function access(uid,allowed) {
  const variant=variants[uid], check=allowed?assertSucceeds:assertFails;
  const c=env.authenticatedContext(uid,{...claims,...variant.token,...(variant.password?{firebase:{sign_in_provider:'password'}}:{})});
  await check(f.getDoc(f.doc(c.firestore(),'bookings','booking')));
  await check(s.getMetadata(s.ref(c.storage(),'companies/company/quotes/test.pdf')));
  await check(f.setDoc(f.doc(c.firestore(),'bookings',uid),{companyId:'company'}));
  await check(s.uploadBytes(s.ref(c.storage(),`companies/company/quotes/${uid}.pdf`),Buffer.from('fixture'),{contentType:'application/pdf'}));
}
for(const uid of ['valid','legacy','retiredClerk','nullAliases']) test(`approved session retains direct data access: ${uid}`,()=>access(uid,true));
for(const uid of Object.keys(variants).filter(uid=>!['valid','legacy','retiredClerk','nullAliases'].includes(uid))) test(`restricted session cannot read or write either service: ${uid}`,()=>access(uid,false));
test('client cannot manufacture a lease, change the user mirror or retire policy even as admin',async()=>{
  for(const uid of ['legacy','admin']) {
    const db=env.authenticatedContext(uid,{firebase:{sign_in_provider:'password'},auth_time:100}).firestore();
    await assertFails(f.setDoc(f.doc(db,'clerkSessionLeases','forged'),lease(uid)));
    await assertFails(f.updateDoc(f.doc(db,'users',uid),{clerkSessionLeases:{session:lease(uid)}}));
    await assertFails(f.updateDoc(f.doc(db,'users',uid),{authMigrationState:'legacy'}));
  }
});
test('lease does not replace company and owned-upload permission checks',async()=>{
  const c=env.authenticatedContext('valid',claims);
  await assertFails(f.setDoc(f.doc(c.firestore(),'bookings','foreign'),{companyId:'other'}));
  await assertFails(s.uploadBytes(s.ref(c.storage(),'expenses/other/photo.jpg'),Buffer.from('fixture'),{contentType:'image/jpeg'}));
  // This path reads user + booking: the lease must not add a third document.
  await assertSucceeds(s.uploadBytes(s.ref(c.storage(),'recces/booking/2026-10-14/valid/location/photo.jpg'),Buffer.from('fixture'),{contentType:'image/jpeg'}));
});
test('Clerk staff can update their phone and submit owned vehicle checks within the rules budget',async()=>{
  const db=env.authenticatedContext('valid',claims).firestore();
  await assertSucceeds(f.updateDoc(f.doc(db,'employees','emp'),{phone:'456'}));
  await assertSucceeds(f.setDoc(f.doc(db,'vehicleChecks','clerk-owned'),{companyId:'company',driverUid:'valid',recordVersion:2,status:'draft'}));
  await assertSucceeds(f.setDoc(f.doc(db,'vehicleIssues','clerk-issue'),{companyId:'company',reporterUid:'valid',status:'open',description:'Fault'}));
});
