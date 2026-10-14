import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=process.env.SECURITY_OFFICE_ROOT;if(!root)throw Error('SECURITY_OFFICE_ROOT required');
const policy=await import('data:text/javascript;base64,'+Buffer.from(await readFile(path.join(root,'src/app/utils/hrIntegrity.js'),'utf8')).toString('base64'));
const source=(await readFile(process.env.SECURITY_ADMIN_ROUTE_SOURCE || path.join(root,'src/app/api/admin/users/[userId]/route.js'),'utf8')).replace(/^import[\s\S]*?;\s*/gm,'').replaceAll('export async function','async function');
function harness({role='admin',companyId='A',employeeCompany='A',race=false,failCommit=false}={}) {
 let version=1,granted=null,writes=[];
 const target={uid:'manager',employeeId:'manager-employee',companyId:'A',isEnabled:true,appAccess:{user:true}};
 const actor={uid:'admin',role,companyId};
 const gate=async()=>['admin','platformAdmin'].includes(role)?{userData:actor,verifiedUser:{uid:'admin'},idToken:'test'}:{error:Response.json({error:'admin required'},{status:403})};
 const ctx=vm.createContext({Response,URL,Date,crypto:{randomUUID:()=> 'audit-id'},console,validateHrApprovalAssignment:policy.validateHrApprovalAssignment,jsonError:(error,status=400)=>Response.json({error},{status}),requireCompanyAdminFromRequest:gate,requirePlatformAdminFromRequest:gate,adminCompanyId:user=>user.companyId,canAccessCompany:(user,company)=>user.companyId===company,isPlatformAdminAccess:user=>user.role==='platformAdmin',adminReadDocument:async()=>target,adminReadDocumentWithMetadata:async(collection,id)=>collection==='users'?{data:structuredClone(target),updateTime:`v${version}`}:{data:{companyId:employeeCompany},updateTime:'employee-v1'},adminCommitDocumentPatches:async batch=>{if(race)version++;if(failCommit || batch[0].updateTime!==`v${version}`)throw Error('FAILED_PRECONDITION');writes=batch;granted=batch[0].patch.hrApprovalAccess;},revokeUserSessions:()=>{throw Error('must not revoke');}});
 vm.runInContext(source,ctx);
 return {request:body=>ctx.PATCH(new Request('http://localhost/api/admin/users/manager',{method:'PATCH',body:JSON.stringify({action:'setHrApprovalAccess',enabled:true,employeeIds:['employee'],...body})}),{params:Promise.resolve({userId:'manager'})}),grant:()=>granted,writes:()=>writes};
}
test('authenticated company admin assigns exact employee scope and commits audit atomically',async()=>{
 const h=harness();assert.equal((await h.request({})).status,200);assert.deepEqual(Array.from(h.grant().employeeIds),['employee']);assert.equal(h.grant().companyId,'A');assert.equal(h.grant().assignedByUid,'admin');assert.equal(h.writes().at(-1).collection,'adminAuditLogs');assert.equal(h.writes().at(-1).exists,false);
});
test('manager cannot grant permission, and foreign scope cannot be assigned',async()=>{
 for(const options of [{role:'manager'},{companyId:'B'},{employeeCompany:'B'}]) {const h=harness(options);assert.equal((await h.request({})).status,403);assert.equal(h.grant(),null);}
});
test('self, unknown, malformed and duplicate manager scope are rejected',async()=>{
 for(const employeeIds of [['manager-employee'],['bad/path'],['employee','employee'],[]]) {const h=harness();const response=await h.request({employeeIds});assert.ok([400,403].includes(response.status));assert.equal(h.grant(),null);}
});
test('concurrent account/employee change or failed audit cannot partially grant permission',async()=>{
 for(const options of [{race:true},{failCommit:true}]) {const h=harness(options);assert.equal((await h.request({})).status,409);assert.equal(h.grant(),null);}
});
