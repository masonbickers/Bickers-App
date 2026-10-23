import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../server/privateHistory.js').catch(()=>({}));
const now=1800000000000;
const token={uid:'owner',auth_time:now/1000-10,firebase:{sign_in_provider:'custom'},authMethod:'clerk',verifiedClerkEmail:true,identityLinkVersion:2,identityCompanyId:'company',identityEmployeeId:'employee',clerkUserId:'clerk',clerkSessionId:'session',clerkLeaseVersion:1};
const profile={uid:'owner',isEnabled:true,companyId:'company',employeeId:'employee',appAccess:{user:true},clerkUserId:'clerk',clerkLeaseRequired:true,clerkSessionLeases:{session:{uid:'owner',companyId:'company',clerkUserId:'clerk',clerkSessionId:'session',status:'active',sessionCreatedAt:now/1000-30,validUntilMs:now+60000}}};
const employee={id:'employee',data:{uid:'owner',companyId:'company',userCode:'42'}};
function fixture({user=profile,claims=token,rows=[],employees=[employee],verify=async()=>claims}={}) {
 const snapshot={readDocument:async(c,id)=>c==='users'?{id,data:user}:c==='holidayBalanceReviews'?null:rows.find(r=>r.id===id),queryDocuments:async c=>c==='employees'?employees:c==='users'?[{id:'owner',data:user}]:rows};
 const handler=module.createPrivateHistoryHandler?.({verifyIdToken:verify,withSnapshot:fn=>fn(snapshot),now:()=>now});
 const res={statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};
 return {handler,res,request:{headers:{authorization:'Bearer verified-test-token'},query:{collection:'holidays'}}};
}
async function call(options,change=()=>{}) {const f=fixture(options);assert.equal(typeof f.handler,'function','private history handler must exist');change(f.request);await f.handler(f.request,f.res);return f.res;}
test('serves canonical own history and no-store response',async()=>{const r=await call({rows:[{id:'own',data:{employeeId:'employee',companyId:'company',ownerUid:'owner'},updateTime:'2026-10-23T00:00:00Z'}]});assert.equal(r.statusCode,200);assert.equal(r.body.records.length,1);assert.equal(r.body.records[0].ownerUid,'owner');assert.equal(r.headers['Cache-Control'],'private, no-store');});
test('does not return another employee or company records',async()=>{const r=await call({employees:[employee,{id:'foreign',data:{uid:'other',companyId:'elsewhere',userCode:'99'}}],rows:[{id:'foreign-record',data:{employeeId:'foreign',ownerUid:'other',companyId:'elsewhere'}}]});assert.equal(r.statusCode,200);assert.deepEqual(r.body.records,[]);});
for(const [name,patch] of [['disabled',{disabled:true}],['reset',{passwordResetRequired:true}],['no-workspace',{appAccess:{user:false}}],['wrong-employee',{employeeId:'other'}],['expired-lease',{clerkSessionLeases:{session:{...profile.clerkSessionLeases.session,validUntilMs:now-1}}}],['revoked-lease',{clerkSessionLeases:{session:{...profile.clerkSessionLeases.session,status:'revoked'}}}],['wrong-clerk',{clerkUserId:'other'}]])test('denies '+name,async()=>{const r=await call({user:{...profile,...patch}});assert.ok([401,403,409].includes(r.statusCode));assert.equal(r.body.records,undefined);});
test('missing bearer is rejected before verifier or reads',async()=>{const r=await call({verify:()=>{throw Error('should not run')}},q=>q.headers={});assert.equal(r.statusCode,401);});
test('revoked Firebase token is rejected',async()=>{const r=await call({verify:()=>{throw Error('revoked')}});assert.equal(r.statusCode,401);});
test('rejects client-specified employee or collection',async()=>{const r=await call({},q=>q.query={collection:'holidays',employeeId:'other'});assert.equal(r.statusCode,400);});
test('ambiguous employee UID fails closed',async()=>{const r=await call({employees:[employee,{id:'duplicate',data:{...employee.data}}]});assert.equal(r.statusCode,409);});
test('unresolved weak identity withholds history confidence',async()=>{const r=await call({employees:[employee,{id:'other',data:{uid:'other',companyId:'company',userCode:'42'}}],rows:[{id:'ambiguous',data:{employeeCode:'42'}}]});assert.equal(r.statusCode,200);assert.deepEqual(r.body.records,[]);assert.equal(r.body.historyComplete,false);assert.equal(r.body.balanceVerification.complete,false);});
test('snapshot adapter preserves timestamp fields and nanosecond update versions',async()=>{
 const stamp={seconds:1792713600,nanoseconds:123456789,toDate:()=>new Date('2026-10-23T00:00:00.123Z')};
 const document={exists:true,id:'record',updateTime:stamp,data:()=>({startDate:stamp,nested:{at:stamp},list:[stamp]})};
 const database={collection:()=>({doc:()=>({})}),runTransaction:async callback=>callback({get:async()=>document})};
 const runner=module.createHistorySnapshotRunner(database);
 const row=await runner(snapshot=>snapshot.readDocument('holidays','record'));
 assert.equal(row.updateTime,'2026-10-23T00:00:00.123456789Z');
 assert.equal(row.data.startDate,row.updateTime);assert.equal(row.data.nested.at,row.updateTime);assert.deepEqual(row.data.list,[row.updateTime]);
});
test('serves timesheet history with the same canonical ownership contract',async()=>{const r=await call({rows:[{id:'42_2026-10-19',data:{employeeCode:'42',weekStart:'2026-10-19'}}]},q=>q.query={collection:'timesheets'});assert.equal(r.statusCode,200);assert.equal(r.body.records[0].ownerUid,'owner');assert.equal(r.body.balanceVerification,undefined);});
test('supports active Firebase-password identity without widening Clerk-only access',async()=>{const claims={uid:'owner',auth_time:now/1000-10,firebase:{sign_in_provider:'password'}};const user={...profile,mobileAccessStatus:'active'};assert.equal((await call({claims,user})).statusCode,200);assert.equal((await call({claims,user:{...user,authMigrationState:'clerk-only'}})).statusCode,401);});
test('missing profile fails closed',async()=>assert.equal((await call({user:{}})).statusCode,401));
test('disabled employee fails closed',async()=>assert.equal((await call({employees:[{...employee,data:{...employee.data,disabled:true}}]})).statusCode,401));
for(const collection of [['holidays','timesheets'],'users',undefined])test('invalid or duplicate collection is rejected '+JSON.stringify(collection),async()=>assert.equal((await call({},q=>q.query={collection})).statusCode,400));
