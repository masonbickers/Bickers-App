import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=process.env.SECURITY_OFFICE_ROOT;if(!root)throw Error('SECURITY_OFFICE_ROOT required');
const integrity=await readFile(path.join(root,'src/app/utils/hrIntegrity.js'),'utf8');
let source='';try{source=await readFile(path.join(root,'src/app/utils/hrHistory.js'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
const policy=source?await import('data:text/javascript;base64,'+Buffer.from(source.replace('./hrIntegrity.js','data:text/javascript;base64,'+Buffer.from(integrity).toString('base64'))).toString('base64')):{};
const employee={id:'emp',data:{companyId:'A',authUid:'crew',userCode:'CREW',name:'Employee'}};
const other={id:'other',data:{companyId:'A',authUid:'other-user',userCode:'OTHER',name:'Employee'}};
const directory=[employee,other];const current={companyId:'A',employeeId:'emp',ownerUid:'crew',employeeCode:'CREW',weekStart:'2026-10-12',status:'submitted'};
const owner=(data,dir=directory,id='CREW_2026-10-12',collection='timesheets')=>{assert.equal(typeof policy.resolveHrRecordOwner,'function');return policy.resolveHrRecordOwner({id,data},collection,dir);};
test('current records resolve canonical identity and tenant',()=>{assert.equal(owner(current)?.id,'emp');});
test('unstamped week and holiday code records resolve without names or data mutation',()=>{
 const data={employeeCode:'CREW',weekStart:'2026-10-12',notes:'history'};assert.equal(owner(data)?.id,'emp');assert.deepEqual(data,{employeeCode:'CREW',weekStart:'2026-10-12',notes:'history'});
 assert.equal(owner({userCode:'CREW',status:'requested'},directory,'legacy-holiday','holidays')?.id,'emp');
});
test('authoritative employee ID supports unstamped nonmobile office records',()=>{const staff={id:'nonmobile',data:{companyId:'A'}};assert.equal(owner({employeeId:'nonmobile'},[staff],'nonmobile-row')?.id,'nonmobile');});
test('foreign tenant and conflicting explicit identity stamps cannot override code',()=>{
 for(const patch of [{companyId:'B'},{ownerUid:'other-user'},{employeeId:'other'},{employeeDocId:'other'},{uid:'other-user'},{userCode:'OTHER'}])assert.equal(owner({...current,...patch}),null);
});
test('name email actor and requestedBy fields confer no historical ownership',()=>{
 assert.equal(owner({employee:'Employee',employeeName:'Employee',employeeEmail:'crew@test',createdBy:'crew',requestedByUid:'crew'},directory,'unowned','holidays'),null);
 assert.equal(owner({...current,requestedByUid:'other-user',createdBy:'other-user'})?.id,'emp');
});
test('reused code across active archived or foreign employees is ambiguous even with a matching name',()=>{
 for(const extra of [{id:'archived',data:{companyId:'A',userCode:'CREW',archived:true}},{id:'foreign',data:{companyId:'B',userCode:'CREW'}}])assert.equal(owner({employeeCode:'CREW'},[...directory,extra]),null);
 // Strong canonical ID remains valid when the weak code is reused.
 assert.equal(owner(current,[...directory,{id:'archived',data:{companyId:'A',userCode:'CREW'}}])?.id,'emp');
});
test('duplicate canonical UID and conflicting employee UID aliases are rejected',()=>{
 assert.equal(owner(current,[...directory,{id:'duplicate',data:{companyId:'A',authUid:'crew',userCode:'OLD'}}]),null);
 assert.equal(owner(current,[{...employee,data:{...employee.data,uid:'different'}},other]),null);
});
test('legacy week path conflicting with claimed code is rejected; holiday IDs are not guessed',()=>{assert.equal(owner({...current},directory,'OTHER_2026-10-12'),null);assert.equal(owner({weekStart:'2026-10-12'},directory,'CREW_2026-10-12')?.id,'emp');assert.equal(owner({},directory,'CREW','holidays'),null);});
test('own history selection never returns another employee and reports ambiguous withheld rows',()=>{
 assert.equal(typeof policy.selectHrHistory,'function');
 const actor={uid:'crew',companyId:'A',employeeId:'emp',appAccess:{user:true}};
 const rows=[{id:'current',data:current,updateTime:'v1'},{id:'CREW_2026-10-12',data:{employeeCode:'CREW',weekStart:'2026-10-12'},updateTime:'v2'},{id:'other',data:{companyId:'A',employeeId:'other',ownerUid:'other-user'},updateTime:'v3'},{id:'ambiguous',data:{...current,ownerUid:'other-user'},updateTime:'v4'}];
 const result=policy.selectHrHistory(actor,'timesheets',directory,rows);assert.deepEqual(result.records.map(r=>r.id),['current','CREW_2026-10-12']);assert.equal(result.withheldCount,1);assert.equal(result.records[1].employeeId,'emp');assert.equal(result.records[1].companyId,'A');
 assert.throws(()=>policy.selectHrHistory({...actor,uid:'other-user'},'timesheets',directory,rows));
});
test('manager queue is explicit scoped projection, excludes self and payroll, and includes legacy records',()=>{
 assert.equal(typeof policy.selectHrReviews,'function');
 const manager={uid:'manager',employeeId:'manager-emp',companyId:'A',role:'user',appAccess:{user:true},hrApprovalAccess:{enabled:true,companyId:'A',employeeIds:['emp']}};
 const dir=[...directory,{id:'manager-emp',data:{companyId:'A',authUid:'manager',userCode:'MANAGER'}}];
 const rows=[{id:'pending',data:{...current,payAdviceOverrides:{salary:1},employeeEmail:'private@test'},updateTime:'v1'},{id:'legacy',data:{employeeCode:'CREW',status:'submitted'},updateTime:'v2'},{id:'self',data:{employeeId:'manager-emp',ownerUid:'manager',companyId:'A',status:'submitted'},updateTime:'v3'},{id:'other',data:{employeeId:'other',ownerUid:'other-user',companyId:'A',status:'submitted'},updateTime:'v4'}];
 const result=policy.selectHrReviews(manager,'timesheets',dir,rows);assert.deepEqual(result.records.map(r=>r.id),['pending','legacy']);assert.equal(result.records[0].updateTime,'v1');assert.equal(result.records[0].payAdviceOverrides,undefined);assert.equal(result.records[0].employeeEmail,undefined);
 assert.throws(()=>policy.selectHrReviews({...manager,hrApprovalAccess:undefined},'timesheets',dir,rows));
 assert.throws(()=>policy.selectHrReviews({...manager,appAccess:{service:true}},'timesheets',dir,rows));
});
