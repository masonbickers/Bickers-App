import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
import {mobilePasswordAccessAllowed as native} from '../server/appPasswordSetup.js';
const root=process.env.SECURITY_OFFICE_ROOT;if(!root)throw Error('SECURITY_OFFICE_ROOT required');
const office=await import('data:text/javascript;base64,'+Buffer.from(await readFile(path.join(root,'src/app/utils/mobilePasswordAccess.js'),'utf8')).toString('base64'));
const user={uid:'crew',companyId:'A',employeeId:'emp',isEnabled:true,mobileAccessStatus:'active'};
const password={uid:'crew',firebase:{sign_in_provider:'password'},auth_time:100};
for(const [name,gate] of [['mobile API',native],['office API',office.mobilePasswordAccessAllowed]]) {
 test(`${name} requires verified provider and canonical native enrollment`,()=>{
  assert.equal(gate(password,user),true);
  for(const patch of [{mobileAccessStatus:'pending'},{mobileAccessStatus:null},{employeeId:''},{uid:'other'},{isEnabled:false}]) assert.equal(gate(password,{...user,...patch}),false);
  for(const provider of ['anonymous','custom']) assert.equal(gate({...password,firebase:{sign_in_provider:provider}},user),false);
  for(const cutoff of [100,'99',1700000000000]) assert.equal(gate(password,{...user,appPasswordSessionAfter:cutoff}),false);
 });
 test(`${name} retains vetted Clerk setup access, rejects conflicting links and missing session proof`,()=>{
  const actor={...user,clerkUserId:'clerk-id',mobileAccessStatus:null,appPasswordSetupRequired:true};
  const token={...password,firebase:{sign_in_provider:'custom'},authMethod:'clerk',clerkUserId:'clerk-id',clerkSessionId:'session',verifiedClerkEmail:true,identityLinkVersion:2,identityCompanyId:'A',identityEmployeeId:'emp'};
  assert.equal(gate(token,actor),true);
  assert.equal(gate({...token,clerkSessionId:''},actor),false);
  assert.equal(gate(token,{...actor,auth:{clerkUserId:'conflicting'}}),false);
 });
}
