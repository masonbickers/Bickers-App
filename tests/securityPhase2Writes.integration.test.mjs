import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=process.env.SECURITY_OFFICE_ROOT;if(!root)throw Error('SECURITY_OFFICE_ROOT required');
const integrity=await readFile(path.join(root,'src/app/utils/hrIntegrity.js'),'utf8');const history=await readFile(path.join(root,'src/app/utils/hrHistory.js'),'utf8');
let code='';try{code=await readFile(path.join(root,'src/app/utils/hrLegacyActions.js'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
const integrityURL='data:text/javascript;base64,'+Buffer.from(integrity).toString('base64');const historyURL='data:text/javascript;base64,'+Buffer.from(history.replace('./hrIntegrity.js',integrityURL)).toString('base64');
const policy=code?await import('data:text/javascript;base64,'+Buffer.from(code.replace('./hrIntegrity.js',integrityURL).replace('./hrHistory.js',historyURL)).toString('base64')):{};
const crew={uid:'crew',companyId:'A',employeeId:'emp',role:'user',appAccess:{user:true}};
const manager={uid:'manager',companyId:'A',employeeId:'manager-emp',role:'user',appAccess:{user:true},hrApprovalAccess:{enabled:true,companyId:'A',employeeIds:['emp']}};
const directory=[{id:'emp',data:{companyId:'A',authUid:'crew',userCode:'CREW'}},{id:'manager-emp',data:{companyId:'A',authUid:'manager',userCode:'MANAGER'}}];
const mutate=(actor,collection,row,body)=>{assert.equal(typeof policy.prepareLegacyHrAction,'function');return policy.prepareLegacyHrAction(actor,collection,row,directory,body,'2026-10-14T14:00:00Z');};
const legacy={id:'CREW_2026-10-12',data:{employeeCode:'CREW',weekStart:'2026-10-12',status:'submitted',days:{monday:{hours:8}}},updateTime:'v1'};
test('assigned manager approves an unambiguous unstamped submission while preserving historical ownership shape',()=>{
 const patch=mutate(manager,'timesheets',legacy,{status:'approved',expectedUpdateTime:'v1'});assert.equal(patch.approved,true);assert.equal(patch.reviewerUid,'manager');assert.equal(patch.employeeId,undefined);assert.equal(patch.companyId,undefined);assert.equal(legacy.data.status,'submitted');
});
test('legacy approval is bound to the observed document version',()=>{assert.throws(()=>mutate(manager,'timesheets',legacy,{status:'approved',expectedUpdateTime:'old'}),e=>e.status===409);});
test('legacy manager self review, unassigned review and approved edits remain denied',()=>{
 assert.throws(()=>mutate({...manager,employeeId:'emp',uid:'crew'},'timesheets',legacy,{status:'approved',expectedUpdateTime:'v1'}));
 assert.throws(()=>mutate({...manager,hrApprovalAccess:{enabled:true,companyId:'A',employeeIds:['manager-emp']}},'timesheets',legacy,{status:'approved',expectedUpdateTime:'v1'}));
 assert.throws(()=>mutate(manager,'timesheets',{...legacy,data:{...legacy.data,approvedAt:'2026-10-12'}},{action:'edit',patch:{days:{}},expectedUpdateTime:'v1'}));
});
test('own pending legacy holiday cancellation retains request and audit evidence',()=>{
 const row={id:'leave',data:{employeeCode:'CREW',startDate:'2026-11-01',status:'requested',holidayReason:'Retain'},updateTime:'v1'};
 const patch=mutate(crew,'holidays',row,{action:'cancelPendingHoliday',expectedUpdateTime:'v1'});assert.equal(patch.status,'cancelled');assert.equal(patch.cancelledByUid,'crew');assert.equal(patch.approvalHistory.at(-1).action,'cancelPendingHoliday');assert.equal(patch.holidayReason,undefined);assert.equal(row.data.holidayReason,'Retain');
 for(const actor of [manager,{...crew,uid:'other'},{...crew,companyId:'B'}])assert.throws(()=>mutate(actor,'holidays',row,{action:'cancelPendingHoliday',expectedUpdateTime:'v1'}));
 for(const marker of [{status:'approved'},{approved:true},{isApproved:true},{approvedDate:'2026-10-12'}])assert.throws(()=>mutate(crew,'holidays',{...row,data:{...row.data,...marker}},{action:'cancelPendingHoliday',expectedUpdateTime:'v1'}));
});
test('legacy name-only or conflicting ownership is rejected before any action',()=>{
 for(const data of [{employeeName:'Crew',status:'submitted'},{...legacy.data,ownerUid:'intruder'},{...legacy.data,companyId:'B'}])assert.throws(()=>mutate(manager,'timesheets',{id:'row',data,updateTime:'v1'},{status:'approved',expectedUpdateTime:'v1'}));
});
test('admin retains self approval and reasoned correction for own historical evidence',()=>{
 const admin={...crew,role:'admin'};const patch=mutate(admin,'timesheets',legacy,{status:'approved',expectedUpdateTime:'v1'});assert.equal(patch.approved,true);
 const approved={...legacy,data:{...legacy.data,...patch},updateTime:'v2'};const reopen=mutate(admin,'timesheets',approved,{status:'reopened',reason:'Correct hours',expectedUpdateTime:'v2'});assert.equal(reopen.status,'reopened');
});
test('assigned projection removes payroll even when embedded inside days and entries',async()=>{
 const raw={companyId:'A',employeeId:'emp',ownerUid:'crew',days:{monday:{hours:8,payrollRates:{hourly:99},salary:500,startTime:'08:00',endTime:'16:00'}},entries:[{hours:8,payAdviceOverrides:{pay:99},jobNumber:'1234'}]};
 const p=await import(integrityURL);const result=p.projectHrApprovalRecord(raw,manager,'timesheets');assert.equal(result.days.monday.hours,8);assert.equal(result.days.monday.startTime,'08:00');assert.equal(result.days.monday.salary,undefined);assert.equal(result.days.monday.payrollRates,undefined);assert.equal(result.entries[0].payAdviceOverrides,undefined);assert.equal(result.entries[0].jobNumber,'1234');
});
