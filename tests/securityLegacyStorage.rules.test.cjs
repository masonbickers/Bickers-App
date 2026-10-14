const {test,before,after}=require('node:test');const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails,firestore:f,storage:s}=require('./helpers/securityRulesRuntime.cjs');
let env;
const claims={firebase:{sign_in_provider:'password'},auth_time:100};
const roots=['quotes','booking_pdfs','maintenance-quotes','images'];
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-bickers-security-remediation',firestore:{rules:fs.readFileSync(process.env.MOBILE_RULES_PATH || 'firebase/security-remediation-2026-10-14/firestore.rules','utf8')},storage:{rules:fs.readFileSync(process.env.MOBILE_STORAGE_RULES_PATH || 'firebase/security-remediation-2026-10-14/storage.rules','utf8')}});
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore(), st=c.storage();
  for(const [uid,companyId,role,access] of [['crew','bickers-action','user',{user:true,service:true}],['other','foreign','user',{user:true,service:true}],['admin','bickers-action','admin',{}],['platform','foreign','platformAdmin',{}],['user-only','bickers-action','user',{user:true}]])
   await f.setDoc(f.doc(db,'users',uid),{uid,companyId,role,employeeId:`employee-${uid}`,isEnabled:true,mobileAccessStatus:'active',appAccess:access});
  for(const collection of ['vehicles','bookings','jobNumbers','employees','hsCheckRecords']) {
   await f.setDoc(f.doc(db,collection,'owned'),{companyId:'bickers-action'});
   await f.setDoc(f.doc(db,collection,'foreign'),{companyId:'foreign'});
  }
  for(const root of roots) {
   const objectPath=`${root}/owned.pdf`,ownershipReviewId=`${root}-review`;
   const result=await s.uploadBytes(s.ref(st,objectPath),Buffer.from('original'),{contentType:'application/pdf',customMetadata:{ownershipReviewId}});
   await f.setDoc(f.doc(db,'legacyStorageOwnership',ownershipReviewId),{companyId:'bickers-action',bucket:result.metadata.bucket,objectPath,generation:result.metadata.generation,expiresAtMillis:Date.now()+86400000});
   await s.uploadBytes(s.ref(st,`${root}/unreviewed.pdf`),Buffer.from('original'),{contentType:'application/pdf',customMetadata:{companyId:'bickers-action',ownershipExpiresAtMillis:String(Date.now()+86400000),ownershipReviewId}});
  }
  for(const [path,type] of [['vehicles/owned/records/file.pdf','application/pdf'],['vehicles/foreign/records/file.pdf','application/pdf'],['job_attachments/owned/file.pdf','application/pdf'],['hr/contracts/owned/file.pdf','application/pdf'],['h-and-s/training-policy/owned/item/file.pdf','application/pdf'],['h-and-s/certificates/owned/file.pdf','application/pdf'],['recce-photos/crew/owned/file.jpg','image/jpeg'],['recce-photos/other/foreign/file.jpg','image/jpeg'],['profilePhotos/crew/photo.jpg','image/jpeg'],['profilePhotos/other/photo.jpg','image/jpeg'],['insurance/shared.pdf','application/pdf'],['spec sheets/shared.pdf','application/pdf']]) await s.uploadBytes(s.ref(st,path),Buffer.from('original'),{contentType:type});
  for(const [index,path] of ['vehicles/owned/records/file.pdf','job_attachments/owned/file.pdf','hr/contracts/owned/file.pdf','h-and-s/training-policy/owned/item/file.pdf','h-and-s/certificates/owned/file.pdf'].entries()) {
   const metadata=await s.getMetadata(s.ref(st,path));const ownershipReviewId=`structured-${index}`;
   await s.updateMetadata(s.ref(st,path),{customMetadata:{ownershipReviewId}});
   await f.setDoc(f.doc(db,'legacyStorageOwnership',ownershipReviewId),{companyId:'bickers-action',bucket:metadata.bucket,objectPath:path,generation:metadata.generation,expiresAtMillis:Date.now()+86400000});
  }
  await s.uploadBytes(s.ref(st,'companies/bickers-action/quotes/owned.pdf'),Buffer.from('original'),{contentType:'application/pdf'});
 });
});
after(async()=>env?.cleanup());const st=uid=>env.authenticatedContext(uid,claims).storage();
for(const root of roots) test(`reviewed historical ${root} retains company/audience read; unowned, foreign and mutable access fail`,async()=>{
 const allowedUid=root==='images'?'admin':'crew';
 await assertSucceeds(s.getMetadata(s.ref(st(allowedUid),`${root}/owned.pdf`)));
 for(const uid of ['other','platform']) await assertFails(s.getMetadata(s.ref(st(uid),`${root}/owned.pdf`)));
 await assertFails(s.getMetadata(s.ref(st(allowedUid),`${root}/unreviewed.pdf`)));
 await assertFails(s.uploadBytes(s.ref(st(allowedUid),`${root}/owned.pdf`),Buffer.from('overwrite'),{contentType:'application/pdf'}));
 await assertFails(s.deleteObject(s.ref(st(allowedUid),`${root}/owned.pdf`)));
 await assertFails(s.uploadBytes(s.ref(st(allowedUid),`${root}/new.pdf`),Buffer.from('spoof'),{contentType:'application/pdf',customMetadata:{companyId:'bickers-action',ownershipReviewId:`${root}-review`}}));
});
test('server-owned review cannot be forged or metadata relinked by clients',async()=>{
 await assertFails(f.setDoc(f.doc(env.authenticatedContext('admin',claims).firestore(),'legacyStorageOwnership','fake'),{companyId:'bickers-action'}));
 await assertFails(s.updateMetadata(s.ref(st('crew'),'quotes/owned.pdf'),{customMetadata:{ownershipReviewId:'fake'}}));
});
test('expired review denies historical file without deleting it',async()=>{
 await env.withSecurityRulesDisabled(c=>f.updateDoc(f.doc(c.firestore(),'legacyStorageOwnership','quotes-review'),{expiresAtMillis:0}));
 await assertFails(s.getMetadata(s.ref(st('crew'),'quotes/owned.pdf')));
});
for(const [path,uid] of [['vehicles/owned/records/file.pdf','crew'],['job_attachments/owned/file.pdf','crew'],['hr/contracts/owned/file.pdf','admin'],['h-and-s/training-policy/owned/item/file.pdf','admin'],['h-and-s/certificates/owned/file.pdf','admin']]) test(`server-reviewed structured legacy object retains read only: ${path}`,async()=>{
 await assertSucceeds(s.getMetadata(s.ref(st(uid),path)));
 await assertFails(s.getMetadata(s.ref(st('other'),path)));
 await assertFails(s.uploadBytes(s.ref(st(uid),path),Buffer.from('overwrite'),{contentType:'application/pdf'}));
 await assertFails(s.deleteObject(s.ref(st(uid),path)));
});
test('Service workspace remains required for vehicle and maintenance files',async()=>{
 await assertFails(s.getMetadata(s.ref(st('user-only'),'vehicles/owned/records/file.pdf')));
 await assertFails(s.getMetadata(s.ref(st('user-only'),'maintenance-quotes/owned.pdf')));
});
test('private contract and training evidence remains admin-only',async()=>{
 for(const path of ['hr/contracts/owned/file.pdf','h-and-s/training-policy/owned/item/file.pdf','h-and-s/certificates/owned/file.pdf']) await assertFails(s.getMetadata(s.ref(st('crew'),path)));
});
test('profile photos preserve same-company read and own upload but deny foreign profile access',async()=>{
 await assertSucceeds(s.getMetadata(s.ref(st('admin'),'profilePhotos/crew/photo.jpg')));
 await assertSucceeds(s.uploadBytes(s.ref(st('crew'),'profilePhotos/crew/new.jpg'),Buffer.from('new'),{contentType:'image/jpeg'}));
 await assertFails(s.getMetadata(s.ref(st('crew'),'profilePhotos/other/photo.jpg')));
 await assertFails(s.uploadBytes(s.ref(st('admin'),'profilePhotos/other/new.jpg'),Buffer.from('new'),{contentType:'image/jpeg'}));
});
test('recce permissions validate booking tenant and original uploader; create remains compatible',async()=>{
 await assertSucceeds(s.getMetadata(s.ref(st('crew'),'recce-photos/crew/owned/file.jpg')));
 await assertSucceeds(s.uploadBytes(s.ref(st('crew'),'recce-photos/crew/owned/new.jpg'),Buffer.from('new'),{contentType:'image/jpeg'}));
 await assertFails(s.getMetadata(s.ref(st('crew'),'recce-photos/other/foreign/file.jpg')));
 await assertFails(s.uploadBytes(s.ref(st('crew'),'recce-photos/crew/foreign/new.jpg'),Buffer.from('new'),{contentType:'image/jpeg'}));
 await assertFails(s.uploadBytes(s.ref(st('crew'),'recce-photos/admin/owned/new.jpg'),Buffer.from('new'),{contentType:'image/jpeg'}));
});
test('tenant-prefixed new uploads retain MIME limits and deny foreign platform override',async()=>{
 await assertSucceeds(s.uploadBytes(s.ref(st('crew'),'companies/bickers-action/quotes/new.pdf'),Buffer.from('new'),{contentType:'application/pdf'}));
 await assertFails(s.uploadBytes(s.ref(st('crew'),'companies/bickers-action/booking_pdfs/bad.exe'),Buffer.from('bad'),{contentType:'application/x-msdownload'}));
 for(const uid of ['other','platform']) {await assertFails(s.getMetadata(s.ref(st(uid),'companies/bickers-action/quotes/owned.pdf')));await assertFails(s.uploadBytes(s.ref(st(uid),'companies/bickers-action/quotes/new.pdf'),Buffer.from('new'),{contentType:'application/pdf'}));}
});
test('mixed legacy root listing is denied and shared technical libraries remain readable',async()=>{
 await assertFails(s.listAll(s.ref(st('crew'),'quotes')));
 for(const path of ['insurance/shared.pdf','spec sheets/shared.pdf']) await assertSucceeds(s.getMetadata(s.ref(st('crew'),path)));
});
test('a matching current parent cannot establish ownership of an unreviewed historical object',async()=>{
 await assertFails(s.getMetadata(s.ref(st('crew'),'vehicles/foreign/records/file.pdf')));
 await env.withSecurityRulesDisabled(c=>f.updateDoc(f.doc(c.firestore(),'vehicles','foreign'),{companyId:'bickers-action'}));
 await assertFails(s.getMetadata(s.ref(st('crew'),'vehicles/foreign/records/file.pdf')));
});
