import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../server/jobOnlyBusiness.js').catch(() => ({}));
const { createJobOnlyBusinessGate, assertBusinessPolicy } = module;
const identity = { uid:'u1', companyId:'c1', employeeId:'e1' };
function response() { return { statusCode:200, headers:{}, set(k,v){this.headers[k]=v;return this;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;} }; }
const request = (path='/dvla/vehicle',method='GET', authorization='Bearer original') => ({path,method,headers:{authorization}});
const session = jobOnlyAccess => ({version:1, identity, jobOnlyAccess, capabilities:{jobOnlyAccess}});
async function run(req, body=session(true),status=200) {
 const calls=[]; let passed=false; const res=response();
 const gate=createJobOnlyBusinessGate({origin:'https://booking.bickers.co.uk',verifyIdToken:async()=>({uid:'u1'}),readCurrentUser:async()=>identity,fetchImpl:async (...args)=>{calls.push(args);return {ok:status===200,status,json:async()=>body};}});
 await gate(req,res,()=>{passed=true;});return {res,passed,calls,gate};
}
test('business guard exports required enforcement',()=>{assert.equal(typeof createJobOnlyBusinessGate,'function');assert.equal(typeof assertBusinessPolicy,'function');});
test('all business families including future routes deny job-only',async()=>{
 for(const path of ['/timesheets/defaults','/hr/history','/hr/records','/employee-notifications','/dvla/vehicle','/workshop/submissions','/receipts/v2/evidence/id','/receipt-groups/id/transition','/receipts/id/resubmit','/files/id','/fleet','/future-business']){
 const {res,passed}=await run(request(path,'POST'));assert.equal(passed,false,path);assert.equal(res.statusCode,403,path); }
});
test('normal full freelancer/employee/service session continues with original bearer',async()=>{ const {passed,calls}=await run(request(),session(false));assert.equal(passed,true);assert.equal(calls[0][0],'https://booking.bickers.co.uk/api/mobile/session');assert.equal(calls[0][1].headers.Authorization,'Bearer original');assert.equal(calls[0][1].redirect,'error'); });
test('essential lifecycle routes preserve existing route auth and behavior',async()=>{
 for(const [method,path] of [['GET','/app-config'],['POST','/device-tokens'],['POST','/auth/employee-setup-lookup'],['GET','/auth/working-terms-acceptance'],['POST','/auth/sync-employee-auth'],['POST','/auth/phone/start'],['POST','/auth/phone/check'],['POST','/auth/app-password-setup'],['GET','/auth/password-transition'],['POST','/auth/password-transition/email'],['POST','/auth/password-transition/complete']]){
 const {passed,calls}=await run(request(path,method,''));assert.equal(passed,true,path);assert.equal(calls.length,0,path); }
 const result=await run(request('/device-tokens/other','POST'));assert.equal(result.passed,false);
});
test('missing bearer, bad session, unconfigured or unavailable canonical service fail closed',async()=>{
 for(const [body,status] of [[{},200],[session('false'),200],[session(false),401],[session(false),403],[session(false),500]]) {const {passed,res}=await run(request(),body,status);assert.equal(passed,false);assert.ok([401,403,503].includes(res.statusCode));}
 const missing=await run(request('/dvla/vehicle','GET',''));assert.equal(missing.res.statusCode,401);assert.equal(missing.calls.length,0);
 const res=response();let pass=false;await createJobOnlyBusinessGate({origin:'https://evil.example/path'})(request(),res,()=>{pass=true;});assert.equal(pass,false);assert.equal(res.statusCode,503);
});
test('fresh canonical capability consulted for every refresh without cached allow',async()=>{
 let count=0;let passes=0; const gate=createJobOnlyBusinessGate({origin:'https://booking.bickers.co.uk',verifyIdToken:async()=>({uid:'u1'}),readCurrentUser:async()=>identity,fetchImpl:async()=>({ok:true,status:200,json:async()=>session(++count>1)})});
 await gate(request(),response(),()=>passes++);const res=response();await gate(request(),res,()=>passes++);assert.equal(passes,1);assert.equal(count,2);assert.equal(res.statusCode,403);
});
test('transaction policy checks canonical employee and mirrors fail closed',()=>{
 const user={jobOnlyAccess:true,freelanceAccess:{timesheets:false,expenses:false}};
 const employee={jobTitle:'Freelance',freelanceAccess:{timesheets:false,expenses:false}};
 assert.throws(()=>assertBusinessPolicy(user,employee),{status:403});
 for(const u of [{}, {...user,jobOnlyAccess:false},{...user,freelanceAccess:{timesheets:true,expenses:false}}]) assert.throws(()=>assertBusinessPolicy(u,employee),{status:403});
 assert.doesNotThrow(()=>assertBusinessPolicy({}, {jobTitle:'Freelance'}));
 assert.doesNotThrow(()=>assertBusinessPolicy({}, {jobTitle:'Employee'}));
 assert.doesNotThrow(()=>assertBusinessPolicy({}, {jobTitle:'Service'}));
 assert.doesNotThrow(()=>assertBusinessPolicy({jobOnlyAccess:false,freelanceAccess:{timesheets:true,expenses:true}}, {jobTitle:['Freelancer'],freelanceAccess:{timesheets:true,expenses:true}}));
 assert.throws(()=>assertBusinessPolicy({...user,jobOnlyAccess:'false'},employee),{status:403});
});

test('upstream identity and duplicate boolean must agree with verified caller',async()=>{for(const body of [{...session(false),identity:{...identity,uid:'foreign'}},{...session(false),identity:{...identity,companyId:'foreign'}},{...session(false),jobOnlyAccess:true}]){const {passed}=await run(request(),body);assert.equal(passed,false);}});
test('business summary routing prefers explicit job-only office origin without changing auth origins',async()=>{
 const before=Object.fromEntries(['JOB_ONLY_OFFICE_ORIGIN','AUTH_WEB_ORIGIN','RECEIPTS_WEB_ORIGIN'].map(k=>[k,process.env[k]]));
 try{process.env.JOB_ONLY_OFFICE_ORIGIN='https://booking.bickers.co.uk';process.env.AUTH_WEB_ORIGIN='https://pilot.bickers.co.uk';process.env.RECEIPTS_WEB_ORIGIN='https://receipts.example.test';let target;
 const gate=createJobOnlyBusinessGate({verifyIdToken:async()=>({uid:'u1'}),readCurrentUser:async()=>identity,fetchImpl:async url=>{target=url;return {ok:true,json:async()=>session(false)}}});
 let passed=false;await gate(request(),response(),()=>passed=true);assert.equal(passed,true);assert.equal(target,'https://booking.bickers.co.uk/api/mobile/session');assert.equal(process.env.AUTH_WEB_ORIGIN,'https://pilot.bickers.co.uk');assert.equal(process.env.RECEIPTS_WEB_ORIGIN,'https://receipts.example.test');
 }finally{for(const [k,v]of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
