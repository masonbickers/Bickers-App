import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Optional local integration run; no sibling dependency import or deployment.
const officeRoot = process.env.SECURITY_OFFICE_ROOT;
if (!officeRoot) throw new Error('SECURITY_OFFICE_ROOT is required for this integration suite.');
const { createHrRouteHarness } = await import(pathToFileURL(path.join(officeRoot, 'tests/hrRouteHarness.mjs')).href);
const source = officeRoot ? await readFile(path.join(officeRoot,'src/app/utils/hrIntegrity.js'),'utf8') : '';
const policy = source ? await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')) : null;
const actor={uid:'manager',employeeId:'manager-employee',companyId:'A',role:'user',appAccess:{user:true},hrApprovalAccess:{enabled:true,companyId:'A',employeeIds:['emp']}};
const record={companyId:'A',employeeId:'emp',ownerUid:'employee',status:'submitted',approvalHistory:[]};
const options={collection:'timesheets',now:'2026-10-14T12:00:00Z'};
test('explicit delegated scope approves timesheets and holidays, without admin role',()=>{
 for(const collection of ['timesheets','holidays']) assert.equal(policy.hrTransition(record,'approved',actor,{...options,collection}).reviewerUid,'manager');
});
test('manager cannot self-approve, escape scope/company, review sickness or correct approved timesheets',()=>{
 for(const [r,a,o] of [[{...record,ownerUid:'manager'},actor,options],[{...record,employeeId:'manager-employee'},actor,options],[{...record,employeeId:'other'},actor,options],[{...record,companyId:'B'},actor,options],[record,{...actor,hrApprovalAccess:{...actor.hrApprovalAccess,companyId:'B'}},options],[record,actor,{collection:'sickLeave'}]]) assert.throws(()=>policy.hrTransition(r,'approved',a,o));
 assert.throws(()=>policy.hrTransition({...record,status:'approved'},'reopened',actor,{...options,reason:'Correction'}));
 assert.throws(()=>policy.hrDraftEdit({...record,status:'reopened',approvalHistory:[{newStatus:'approved'}]},{days:{}},actor));
 assert.throws(()=>policy.hrDraftEdit(record,{payAdviceOverrides:{}},actor));
});
test('role labels, disabled/malformed permissions never grant reviewer authority',()=>{
 for(const hrApprovalAccess of [undefined,{enabled:false,companyId:'A',employeeIds:['emp']},{enabled:true,companyId:'A',employeeIds:'emp'},{enabled:true,companyId:'A',employeeIds:['other']}]) assert.throws(()=>policy.hrTransition(record,'approved',{...actor,role:'manager',hrApprovalAccess},options));
});
test('delegated authority requires the User workspace and excludes private payroll in review projection',()=>{
 assert.throws(()=>policy.hrTransition(record,'approved',{...actor,appAccess:{service:true}},options));
 assert.equal(typeof policy.projectHrApprovalRecord,'function');
 const projected=policy.projectHrApprovalRecord({...record,days:{monday:{hours:8}},payAdviceOverrides:{salary:123},payrollRates:{salary:123},employeeEmail:'private@example.test'},actor,'timesheets');
 assert.equal(projected.days.monday.hours,8);
 for(const field of ['payAdviceOverrides','payrollRates','employeeEmail']) assert.equal(projected[field],undefined);
 assert.throws(()=>policy.projectHrApprovalRecord({...record,employeeId:'other'},actor,'timesheets'));
});
test('only company admins can assign a bounded, verified employee list',()=>{
 assert.equal(typeof policy.validateHrApprovalAssignment,'function');
 const admin={uid:'admin',companyId:'A',role:'admin'},target={uid:'manager',employeeId:'manager-employee',companyId:'A',isEnabled:true,appAccess:{user:true}},employees={emp:{companyId:'A'},foreign:{companyId:'B'},'manager-employee':{companyId:'A'}};
 assert.deepEqual(policy.validateHrApprovalAssignment(admin,target,true,['emp'],employees,'now').employeeIds,['emp']);
 for(const [a,t,ids] of [[actor,target,['emp']],[admin,{...target,companyId:'B'},['emp']],[admin,target,['foreign']],[admin,target,['manager-employee']],[admin,target,['missing']],[admin,target,['emp','emp']],[admin,target,['bad/path']],[admin,target,[]]]) assert.throws(()=>policy.validateHrApprovalAssignment(a,t,true,ids,employees,'now'));
 assert.equal(policy.validateHrApprovalAssignment(admin,target,false,[],employees,'now').enabled,false);
});
test('admins can self-approve and correct their approved timesheet through reasoned reopen/edit/reapprove',()=>{
 const admin={...actor,uid:'employee',employeeId:'emp',role:'admin',hrApprovalAccess:undefined};
 const approved={...record,...policy.hrTransition(record,'approved',admin,options)};
 const reopened={...approved,...policy.hrTransition(approved,'reopened',admin,{...options,reason:'Correct recorded hours'})};
 const edited={...reopened,...policy.hrDraftEdit(reopened,{days:{monday:{hours:7}}},admin)};
 const final=policy.hrTransition(edited,'approved',admin,options);
 assert.equal(final.approved,true);assert.equal(final.approvalHistory.length,4);
 assert.throws(()=>policy.hrDraftEdit(approved,{days:{}},{...admin,role:'user'}));
});
test('owner cannot edit reopened evidence after approval; admins retain correction authority',()=>{
 const reopened={...record,status:'reopened',approved:false,approvalHistory:[{newStatus:'approved'},{newStatus:'reopened'}]};
 assert.throws(()=>policy.hrDraftEdit(reopened,{days:{}},{uid:'employee',employeeId:'emp',companyId:'A',role:'user'}));
 assert.doesNotThrow(()=>policy.hrDraftEdit(reopened,{days:{}},{uid:'admin',companyId:'A',role:'admin'}));
});
test('actual HR HTTP route enforces capability, target identity and optimistic concurrency',async()=>{
 const h=await createHrRouteHarness({officeRoot,actor,record});
 assert.equal((await h.post({status:'approved',expectedUpdateTime:'v1'})).status,200);
 assert.equal(h.current().reviewerUid,'manager');
 assert.equal((await h.post({status:'approved',expectedUpdateTime:'v1'})).status,409);
 assert.equal(h.committed(),1);
});
test('all recognised approval aliases lock employee API edits and review transitions',()=>{
 const owner={uid:'employee',employeeId:'emp',companyId:'A',role:'user'};
 for(const marker of [{approved:true},{isApproved:true},{approvedAt:'2026-10-14'},{approvedDate:'2026-10-14'},{approvalStatus:'approved'},{holidayStatus:'approved'},{state:'approved'}]) {
  assert.throws(()=>policy.hrDraftEdit({...record,...marker},{days:{}},owner));
  assert.throws(()=>policy.hrTransition({...record,...marker},'approved',actor,options));
 }
});
test('HTTP projection rejects conflicting canonical UID and approval commit binds the employee version',async()=>{
 const h=await createHrRouteHarness({officeRoot,actor,record:{...record,ownerUid:'conflicting'},beforeCommit:({mutate})=>mutate('employees','emp',{authUid:'reassigned-employee'})});
 assert.equal((await h.get('includeRecord=true')).status,409);
 h.setCurrent({ownerUid:'employee'});
 assert.equal((await h.post({status:'approved',expectedUpdateTime:'v1'})).status,409);
 assert.equal(h.current().status,'submitted');
 assert.equal(h.committed(),0);
});
test('manager cannot self-approve a legacy unstamped record when their employee link is missing',()=>{
 assert.throws(()=>policy.hrTransition({...record,ownerUid:undefined},'approved',{...actor,employeeId:undefined},options));
});
test('admin corrections preserve legacy approval evidence while unlocking only the admin API',()=>{
 const admin={uid:'admin',companyId:'A',role:'admin'};
 for(const marker of [{isApproved:true},{approvedDate:'2026-10-14'},{approvalStatus:'approved'}]) {
  const approved={...record,status:'submitted',...marker};
  const reopened={...approved,...policy.hrTransition(approved,'reopened',admin,{...options,reason:'Verified correction'})};
  assert.doesNotThrow(()=>policy.hrDraftEdit(reopened,{days:{}},admin));
  assert.deepEqual(reopened.approvalHistory.at(-1).previousApprovalEvidence,marker);
 }
});
test('verified office records without mobile accounts retain admin and delegated review by canonical employee ID',()=>{
 const admin={uid:'admin',companyId:'A',role:'admin'};
 const historical={...record,ownerUid:undefined};
 assert.doesNotThrow(()=>policy.validateHrRecordEmployee(admin,historical,{companyId:'A'}));
 assert.equal(policy.hrTransition(historical,'approved',admin,options).status,'approved');
 assert.doesNotThrow(()=>policy.validateHrRecordEmployee(actor,historical,{companyId:'A'}));
 assert.equal(policy.hrTransition(historical,'approved',actor,options).status,'approved');
 assert.throws(()=>policy.hrTransition({...historical,employeeId:actor.employeeId},'approved',actor,options));
});
