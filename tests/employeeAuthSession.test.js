import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveClerkSyncAuthorization } from '../server/employeeAuthSession.js';
const user = { uid:'staff',companyId:'company',employeeId:'emp',isEnabled:true,role:'admin',appAccess:{user:true,service:false} };
const token = { uid:'staff',auth_time:100,firebase:{sign_in_provider:'custom'},authMethod:'clerk',verifiedClerkEmail:true,identityLinkVersion:2,clerkUserId:'clerk',clerkSessionId:'session',identityCompanyId:'company',identityEmployeeId:'emp' };
const sessionData = { role:'user',companyId:'company',employeeId:'emp',appAccess:{user:false,service:true},isService:true,displayName:'Staff' };
const userPatch = { uid:'staff',role:'user',isEnabled:true,appAccess:{user:false,service:true},updatedAt:'server-time' };
test('Clerk login sync preserves canonical role and access instead of copying office employee permissions',()=>{
  const result=preserveClerkSyncAuthorization({token,user,sessionData,userPatch});
  assert.deepEqual(result.userPatch,{updatedAt:'server-time'});
  assert.deepEqual(result.employeePatch,{'auth.lastLoginAt':'server-time','auth.lastAuthMethod':'clerk','mobileAccess.lastLoginAt':'server-time'});
  assert.deepEqual(result.sessionData,{role:'admin',companyId:'company',employeeId:'emp',appAccess:{user:true,service:false},isService:false,displayName:'Staff'});
});
test('legacy password sync retains its existing approved payload',()=>{
  const result=preserveClerkSyncAuthorization({token:{...token,firebase:{sign_in_provider:'password'}},user,sessionData,userPatch});
  assert.deepEqual(result,{sessionData,userPatch});
});
test('unverified custom identity cannot reach a sync mutation',()=>{
  assert.throws(()=>preserveClerkSyncAuthorization({token:{...token,verifiedClerkEmail:false},user,sessionData,userPatch}));
});
