import test from 'node:test';
import assert from 'node:assert/strict';
for(const env of ['primary']){
 const {submitWorkshopRecord}=await import('../server/workshopSubmission.js');
 const token={uid:'u1',auth_time:100,firebase:{sign_in_provider:'password'}};
 const body={recordId:'fixture-defect',kind:'defect',record:{vehicleName:'Fixture',description:'Fixture defect',severity:'General'}};
 const flags={timesheets:false,expenses:false};
 function fixture(userPatch={},employeePatch={}){
  const user={uid:'u1',employeeId:'e1',companyId:'c1',isEnabled:true,mobileAccessStatus:'active',appAccess:{service:true},role:'user',...userPatch};
  const employee={uid:'u1',authUid:'u1',companyId:'c1',jobTitle:'Freelance',...employeePatch};
  const rows=new Map([['users/u1',user],['employees/e1',employee]]),writes=[],reads=[];
  const db={collection:c=>({doc:id=>({path:`${c}/${id}`,id})}),runTransaction:async fn=>fn({get:async ref=>{reads.push(ref.path);return {exists:rows.has(ref.path),id:ref.id,data:()=>rows.get(ref.path)}},set:(ref,data)=>writes.push({path:ref.path,data}),update:(ref,data)=>writes.push({path:ref.path,data})})};
  return {user,employee,rows,writes,reads,run:()=>submitWorkshopRecord({db,uid:'u1',token,body})};
 }
 for(const [name,up,ep] of [
  ['downgrade after global allow',{jobOnlyAccess:true,freelanceAccess:flags},{freelanceAccess:flags}],
  ['canonical restriction with missing mirrors',{}, {freelanceAccess:flags}],
  ['stale user mirror',{jobOnlyAccess:true,freelanceAccess:flags},{}],
  ['foreign employee company',{}, {companyId:'foreign'}],
  ['mismatched active UID alias',{}, {authUid:'foreign'}],
  ['no active UID alias',{}, {uid:null,authUid:null}],
  ['disabled employee',{}, {active:false}],
  ['mirror restriction without employee link',{employeeId:'',jobOnlyAccess:true,freelanceAccess:flags},{}],
 ])test(`${env} workshop transaction rejects ${name} before write`,async()=>{const f=fixture(up,ep);await assert.rejects(f.run(),error=>[401,403].includes(error.status));assert.equal(f.writes.length,0);});
 test(`${env} workshop transaction preserves canonical full freelancer`,async()=>{const f=fixture();await f.run();assert.equal(f.writes.length,1);assert.ok(f.reads.includes('employees/e1'));});
 test(`${env} workshop transaction preserves unmarked legacy service without employee link`,async()=>{const f=fixture({employeeId:''});if(env==='pilot'){await assert.rejects(f.run(),{status:401});assert.equal(f.writes.length,0);}else{await f.run();assert.equal(f.writes.length,1);}});
 test(`${env} workshop transaction rejects missing employee`,async()=>{const f=fixture();f.rows.delete('employees/e1');await assert.rejects(f.run(),error=>[401,403].includes(error.status));assert.equal(f.writes.length,0);});
}
