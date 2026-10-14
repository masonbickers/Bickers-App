const { test, before, after } = require('node:test');
const fs = require('node:fs');
const { initializeTestEnvironment, assertSucceeds, assertFails, firestore: f, storage: s } = require('./helpers/securityRulesRuntime.cjs');
let env;
const base = { uid:'crew', companyId:'bickers-action', employeeId:'employee-crew', isEnabled:true, role:'user', mobileAccessStatus:'active', appAccess:{user:true,service:true} };
const variants = {
  crew:{}, stale:{sessionValidAfter:101}, equal:{sessionValidAfter:100}, fresh:{sessionValidAfter:99},
  revokedISO:{sessionsRevokedAt:'2026-10-14T10:00:00Z'}, malformed:{sessionValidAfter:'100'}, millis:{sessionValidAfter:1700000000000},
  reset:{passwordResetRequired:true}, nativeReset:{firebasePasswordResetAfter:99999}, setup:{appPasswordSetupRequired:true},
  appStale:{appPasswordSessionAfter:100}, appFresh:{appPasswordSessionAfter:99}, disabled:{isEnabled:false},
  unapproved:{mobileAccessStatus:'requested'}, missingApproval:{mobileAccessStatus:null}, unlinked:{employeeId:''},
  clerk:{clerkUserId:'clerk-id',appPasswordSetupRequired:true,mobileAccessStatus:null},
  clerkReset:{clerkUserId:'clerk-id',passwordResetRequired:true}, clerkNativeReset:{clerkUserId:'clerk-id',firebasePasswordResetAfter:99999},
};
before(async()=>{
 env=await initializeTestEnvironment({projectId:process.env.SECURITY_TEST_PROJECT_ID || 'demo-bickers-security-remediation',firestore:{rules:fs.readFileSync(process.env.SECURITY_FIRESTORE_RULES || 'firebase/security-remediation-2026-10-14/firestore.rules','utf8')},storage:{rules:fs.readFileSync(process.env.SECURITY_STORAGE_RULES || 'firebase/security-remediation-2026-10-14/storage.rules','utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  for(const [uid,patch] of Object.entries(variants)) await f.setDoc(f.doc(c.firestore(),'users',uid),{...base,uid,...patch,...(patch.clerkUserId?{clerkSessionLeases:{'session-id':{uid,companyId:'bickers-action',clerkUserId:'clerk-id',clerkSessionId:'session-id',sessionCreatedAt:100,status:'active',validUntilMs:Date.now()+300000}}}:{})});
  await f.setDoc(f.doc(c.firestore(),'employees','employee-crew'),{companyId:'bickers-action',authUid:'crew',userCode:'CREW',mobileAccess:{status:'active'}});
  await f.setDoc(f.doc(c.firestore(),'bookings','security-session'),{companyId:'bickers-action'});
  await s.uploadBytes(s.ref(c.storage(),'companies/bickers-action/quotes/security-session.pdf'),Buffer.from('fixture'),{contentType:'application/pdf'});
 });
});
after(async()=>env?.cleanup());
const claims = { firebase:{sign_in_provider:'password'}, auth_time:100 };
const clerkClaims = { firebase:{sign_in_provider:'custom'},auth_time:100,authMethod:'clerk',verifiedClerkEmail:true,identityLinkVersion:2,clerkUserId:'clerk-id',clerkSessionId:'session-id',identityCompanyId:'bickers-action',identityEmployeeId:'employee-crew' };
async function businessAccess(uid, token=claims, permitted=false) {
 const c=env.authenticatedContext(uid,token), check=permitted?assertSucceeds:assertFails;
 await check(f.getDoc(f.doc(c.firestore(),'bookings','security-session')));
 await check(s.getMetadata(s.ref(c.storage(),'companies/bickers-action/quotes/security-session.pdf')));
 await check(f.setDoc(f.doc(c.firestore(),'bookings',`session-${uid}`),{companyId:'bickers-action'}));
 await check(s.uploadBytes(s.ref(c.storage(),`companies/bickers-action/quotes/session-${uid}.pdf`),Buffer.from('fixture'),{contentType:'application/pdf'}));
}
for(const uid of ['crew','fresh','appFresh']) test(`fresh approved native session permits both data services: ${uid}`,()=>businessAccess(uid,claims,true));
for(const uid of ['stale','equal','revokedISO','malformed','millis','reset','nativeReset','setup','appStale','disabled','unapproved','missingApproval','unlinked']) test(`business reads and writes deny restricted native session: ${uid}`,()=>businessAccess(uid));
test('anonymous provider cannot use an enabled account',()=>businessAccess('crew',{...claims,firebase:{sign_in_provider:'anonymous'}}));
test('unvetted custom token cannot use an enabled account',()=>businessAccess('crew',{...claims,firebase:{sign_in_provider:'custom'}}));
test('missing auth_time cannot use an enabled account',()=>businessAccess('crew',{firebase:{sign_in_provider:'password'}}));
test('trusted office Clerk bypasses only native enrollment/setup',()=>businessAccess('clerk',clerkClaims,true));
test('trusted Clerk retains separate native password reset boundary',()=>businessAccess('clerkNativeReset',clerkClaims,true));
test('global password recovery denies Clerk business access',()=>businessAccess('clerkReset',clerkClaims));
for(const patch of [{identityCompanyId:'foreign'},{identityEmployeeId:'other'},{clerkUserId:'other'},{verifiedClerkEmail:false},{clerkSessionId:''}]) test(`forged office identity denied: ${JSON.stringify(patch)}`,()=>businessAccess('clerk',{...clerkClaims,...patch}));
test('restricted employee can get only their own recovery profile and cannot clear flags',async()=>{
 const db=env.authenticatedContext('reset',claims).firestore();
 await assertSucceeds(f.getDoc(f.doc(db,'users','reset')));
 await assertFails(f.getDoc(f.doc(db,'users','crew')));
 await assertFails(f.updateDoc(f.doc(db,'users','reset'),{passwordResetRequired:false,sessionValidAfter:0}));
});
