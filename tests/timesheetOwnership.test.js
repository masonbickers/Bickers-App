import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {timesheetOwnership} from '../lib/timesheetOwnership.js';
const employee={companyId:'bickers-action',employeeId:'employee-crew',uid:'crew'};
test('timesheet draft and submission stamp authenticated ownership after local state',()=>{
 const source=readFileSync(new URL('../app/(protected)/week/[id]/index.js',import.meta.url),'utf8');
 assert.equal(source.match(/\.\.\.prepared,\s*\.\.\.timesheetOwnership\(employee\),/g)?.length,2);
 assert.deepEqual({...{companyId:'foreign',employeeId:'other',ownerUid:'other'},...timesheetOwnership(employee)}, {companyId:'bickers-action',employeeId:'employee-crew',ownerUid:'crew'});
});
test('missing authenticated identity blocks writing rather than creating an unowned timesheet',()=>{for(const field of ['companyId','employeeId','uid'])for(const invalid of ['',null,undefined,42,' ','bad/path'])assert.throws(()=>timesheetOwnership({...employee,[field]:invalid}),/authenticated timesheet ownership/);});
test('the alternative timesheet entry form also stamps authenticated ownership',()=>{
 const source=readFileSync(new URL('../app/(protected)/add-timesheet.js',import.meta.url),'utf8');
 assert.match(source,/const \{ employee \} = useAuth\(\)/);
 assert.match(source,/weekData,\s*\.\.\.timesheetOwnership\(employee\),/);
 assert.match(source,/employeeCode: employee\.userCode/);
});
test('authenticated identifiers containing the letter s are valid',()=>{
 assert.deepEqual(timesheetOwnership({companyId:'bickers-action',employeeId:'staff-123',uid:'users-456'}),{
  companyId:'bickers-action',employeeId:'staff-123',ownerUid:'users-456',
 });
});
test('embedded whitespace is rejected in every authenticated identifier',()=>{
 for(const field of ['companyId','employeeId','uid']) {
  for(const invalid of ['staff member','staff\tmember','staff\nmember','staff\rmember']) {
   assert.throws(()=>timesheetOwnership({...employee,[field]:invalid}),/authenticated timesheet ownership/);
  }
 }
});
