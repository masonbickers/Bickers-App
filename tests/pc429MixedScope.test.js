import test from 'node:test';
import assert from 'node:assert/strict';
import {assertLifecyclePolicy,assertBusinessPolicy,projectLifecycleResponse,assertDeviceRegistrationPolicy} from '../server/jobOnlyBusiness.js';
for(const flags of [{timesheets:true,expenses:false},{timesheets:false,expenses:true}]) {
 const employee={id:'e',uid:'u',authUid:'u',companyId:'c',jobTitle:'Freelancer',freelanceAccess:flags,payRate:500,bank:{secret:true}};
 const user={uid:'u',companyId:'c',employeeId:'e',jobOnlyAccess:true,freelanceAccess:flags};
 test(`mixed scope lifecycle preserves exact flags ${JSON.stringify(flags)}`,()=>{
  assert.equal(assertLifecyclePolicy(user,employee),true);
  const result=projectLifecycleResponse({employee,sessionData:{uid:'u',companyId:'c',employeeId:'e',payRate:500,timesheetYardStart:'09:00'}},user,employee);
  assert.equal(result.employee.jobOnlyAccess,true);
  assert.equal(result.sessionData.jobOnlyAccess,true);
  assert.deepEqual(result.employee.freelanceAccess,flags);
  assert.deepEqual(result.sessionData.freelanceAccess,flags);
  for(const key of ['payRate','bank','timesheetYardStart']) assert.ok(!JSON.stringify(result).includes(key));
  assert.doesNotThrow(()=>assertDeviceRegistrationPolicy({user,employee,uid:'u',registrationUid:'u',isAnonymous:false,userExists:true}));
 });
 test(`mixed scope business always denied ${JSON.stringify(flags)}`,()=>assert.throws(()=>assertBusinessPolicy(user,employee),{status:403}));
 test(`mixed scope missing/stale marker rejected ${JSON.stringify(flags)}`,()=>{
  assert.throws(()=>assertLifecyclePolicy({...user,jobOnlyAccess:false},employee),{status:403});
  assert.throws(()=>assertLifecyclePolicy({...user,freelanceAccess:{timesheets:false,expenses:false}},employee),{status:403});
 });
}
