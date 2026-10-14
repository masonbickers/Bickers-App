import test from 'node:test';
import assert from 'node:assert/strict';
import * as ownership from '../lib/holidayOwnership.js';
import {readFileSync} from 'node:fs';
test('new holiday ownership derives only from the authenticated session',()=>{
 assert.equal(typeof ownership.holidayOwnership,'function');
 assert.deepEqual(ownership.holidayOwnership({uid:'crew',employeeId:'emp',companyId:'bickers-action'}),{ownerUid:'crew',employeeId:'emp',companyId:'bickers-action'});
 for(const field of ['uid','employeeId','companyId']) assert.throws(()=>ownership.holidayOwnership({uid:'crew',employeeId:'emp',companyId:'bickers-action',[field]:''}));
});
test('personal holiday queries require canonical identity and exact employee code',()=>{
 assert.equal(typeof ownership.privateHolidayFilters,'function');
 assert.deepEqual(ownership.privateHolidayFilters({uid:'crew',employeeId:'emp',companyId:'A',userCode:'CREW'}),[['companyId','==','A'],['employeeCode','==','CREW'],['ownerUid','==','crew'],['employeeId','==','emp']]);
 assert.throws(()=>ownership.privateHolidayFilters({companyId:'A',userCode:'CREW'}));
});
test('request and shared mobile hook use the protected own-history adapter and retained cancellation',()=>{
 for(const file of ['app/(protected)/holiday-request.js','hooks/useOperationalData.js']) {
  const source=readFileSync(file,'utf8');assert.match(source,/fetchEmployeeHistory\(user, employee, "holidays"\)/);
 }
 const history=readFileSync('app/(protected)/holidaypage.js','utf8');
 assert.doesNotMatch(history,/await deleteDoc\(/);assert.match(history,/cancelEmployeeHoliday\(user, employee, record\)/);
 assert.match(history,/useHolidays\(\)/);
});
