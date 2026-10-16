import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMobileClerkAccess } from '../lib/mobileClerkAccess.js';
function fixture() {
 const state={current:true,profile:{uid:'staff',companyId:'company',employeeId:'emp',isEnabled:true,mobileAccessStatus:'active'},employee:{id:'emp',authUid:'staff',companyId:'company',mobileAccess:{status:'active',approvedEmail:'staff@example.test'}}};
 const result={claims:{user_id:'staff',auth_time:100,firebase:{sign_in_provider:'custom'},authMethod:'clerk',verifiedClerkEmail:true,companyEmail:'staff@example.test',identityLinkVersion:2,clerkUserId:'clerk',clerkSessionId:'session',identityCompanyId:'company',identityEmployeeId:'emp'}};
 const deps={uid:'staff',getTokenResult:async()=>result,readUser:async()=>structuredClone(state.profile),readEmployee:async()=>structuredClone(state.employee),isCurrent:()=>state.current};
 return {state,deps};
}
test('mobile access uses current verified claims and canonical employee data',async()=>{
 const {deps}=fixture();const result=await resolveMobileClerkAccess(deps);assert.equal(result.profile.uid,'staff');assert.equal(result.employee.id,'emp');
});
test('stale provider state cannot restore a delayed server profile',async()=>{
 const {state,deps}=fixture();let release;deps.readUser=()=>new Promise(resolve=>{release=resolve;});
 const pending=resolveMobileClerkAccess(deps);for(let i=0;i<5&&!release;i++)await Promise.resolve();state.current=false;release(state.profile);
 assert.equal(await pending,null);
});
test('approval, account retirement proof and conflicting employee links remain enforced',async()=>{
 for(const change of [s=>s.profile.auth={clerkUserId:'other'},s=>s.profile.appPasswordSetupRequired=true,s=>s.employee.mobileAccess.status='invited',s=>s.employee.mobileAccess.approvedEmail='other@example.test',s=>s.employee.uid='other',s=>s.employee.companyId='other',s=>s.profile.passwordResetRequired=true]) {
  const {state,deps}=fixture();change(state);await assert.rejects(resolveMobileClerkAccess(deps));
 }
});

test('local approval rejection has a structured outcome distinct from network failure', async () => {
  await assert.rejects(resolveMobileClerkAccess({ uid:'u',getTokenResult:async()=>({claims:{sub:'other'}}),isCurrent:()=>true }),{code:'MOBILE_ACCESS_DENIED'});
});
