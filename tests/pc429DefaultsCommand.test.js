import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
// Contract for the next step, not an implementation of the command.
// No Firebase SDK, network, credentials or real records are used.
let createCommand, createHandler;
const commandUrl=new URL('../server/timesheetDefaultsCommand.js',import.meta.url);
if(existsSync(commandUrl))({createTimesheetDefaultsCommand:createCommand,createTimesheetDefaultsHandler:createHandler}=await import(commandUrl.href));
test('PC-155: authorised defaults command is implemented',()=>assert.equal(typeof createCommand,'function','server/timesheetDefaultsCommand.js must export createTimesheetDefaultsCommand'));
const pending={skip:typeof createCommand!=='function'&&'Blocked: command not implemented; security behavior not yet exercised'};
const UID='demo-command-user',EMP='demo-command-employee',COMPANY='demo-command-company';
function fixture({profilePatch={},employeePatch={},claimsPatch={},tokenError=false}={}){
 const profile={uid:UID,employeeId:EMP,companyId:COMPANY,isEnabled:true,mobileAccessStatus:'active',role:'user',appAccess:{user:true,service:false},...profilePatch};
 const employee={id:EMP,uid:UID,authUid:UID,companyId:COMPANY,name:'Synthetic Demo',isEnabled:true,active:true,mobileAccess:{status:'active',approvedEmail:'demo@example.test'},auth:{uid:UID,email:'demo@example.test'},phone:'KEEP',payRate:100,timesheetDefaults:{defaultType:'yard',yardStart:'08:00',yardEnd:'16:30',officeStart:'09:00',officeEnd:'17:00'},...employeePatch};
 const records=new Map([[`users/${UID}`,profile],[`employees/${EMP}`,employee],['employees/demo-other',{id:'demo-other',companyId:COMPANY,phone:'OTHER KEEP'}]]);
 const before=structuredClone([...records]);const writes=[],authCalls=[];
 const ref=path=>({path,async get(){return snap(path);}});
 const snap=path=>({exists:records.has(path),id:path.split('/').at(-1),data:()=>structuredClone(records.get(path)),ref:ref(path)});
 function apply(path,patch){const value=structuredClone(records.get(path)||{});for(const [key,v]of Object.entries(patch)){const parts=key.split('.');let o=value;for(const part of parts.slice(0,-1))o=o[part]??=( {} );o[parts.at(-1)]=structuredClone(v);}records.set(path,value);}
 const db={collection:name=>({doc:id=>ref(`${name}/${id}`)}),async runTransaction(fn){const queued=[];const result=await fn({get:async r=>snap(r.path),update:(r,p)=>queued.push([r.path,p]),set:(r,p)=>queued.push([r.path,p])});for(const [path,patch]of queued){writes.push({path,patch});apply(path,patch);}return result;}};
 const claims={uid:UID,sub:UID,user_id:UID,email:'demo@example.test',auth_time:100,firebase:{sign_in_provider:'password'},...claimsPatch};
 const auth={async verifyIdToken(token,revoked){authCalls.push({token,revoked});if(tokenError)throw Object.assign(Error('Invalid or revoked token'),{code:'auth/id-token-revoked'});return structuredClone(claims);}};
 const run=(token,input)=>createCommand({db,auth})(token,input);
 return {run,records,before,writes,authCalls,handler:()=>createHandler({db,auth}),employee:()=>records.get(`employees/${EMP}`)};
}
const input={mode:'yard',start:'08:00',end:'16:30'};
for(const mode of ['yard','office','workshop'])test(`PC-155 command: authorised self ${mode} defaults save only permitted fields`,pending,async()=>{
 const f=fixture();await f.run('synthetic-token',{mode,start:'07:30',end:'18:15'});
 const e=f.employee();assert.equal(e.timesheetDefaults.defaultType,mode);assert.equal(e.timesheetDefaults[`${mode}Start`],'07:30');assert.equal(e.timesheetDefaults[`${mode}End`],'18:15');assert.equal(e[`${mode}StartTime`],'07:30');assert.equal(e[`${mode}EndTime`],'18:15');assert.equal(e.phone,'KEEP');assert.equal(e.payRate,100);assert.equal(e.name,'Synthetic Demo');assert.equal(e.companyId,COMPANY);assert.equal(f.writes.length,1);assert.equal(f.writes[0].path,`employees/${EMP}`);assert.equal(f.authCalls[0].revoked,true);assert.deepEqual(f.records.get('employees/demo-other'),f.before.find(([k])=>k==='employees/demo-other')[1]);
 const allowed=new Set(['timesheetDefaultType','timesheetDefaults',`timesheetDefaults.defaultType`,`timesheetDefaults.${mode}Start`,`timesheetDefaults.${mode}End`,`${mode}StartTime`,`${mode}EndTime`,`${mode}Start`,`${mode}End`,'updatedAt']);assert.ok(Object.keys(f.writes[0].patch).every(k=>allowed.has(k)));
 for(const other of ['yard','office'].filter(v=>v!==mode)){assert.equal(e.timesheetDefaults[`${other}Start`],f.before[1][1].timesheetDefaults[`${other}Start`]);}
});
const negatives=[
 ['missing token',{},'',input],
 ['revoked token',{tokenError:true},'synthetic-token',input],
 ['missing uid',{claimsPatch:{uid:null,sub:null,user_id:null}},'synthetic-token',input],
 ['disabled account',{profilePatch:{isEnabled:false}},'synthetic-token',input],
 ['disabled employee',{employeePatch:{active:false}},'synthetic-token',input],
 ['unapproved account',{profilePatch:{mobileAccessStatus:'disabled'}},'synthetic-token',input],
 ['no user workspace',{profilePatch:{appAccess:{user:false,service:true}}},'synthetic-token',input],
 ['foreign company',{employeePatch:{companyId:'foreign'}},'synthetic-token',input],
 ['foreign owner',{employeePatch:{uid:'other',authUid:'other',auth:{uid:'other'}}},'synthetic-token',input],
 ['spoofed employee target',{},'synthetic-token',{...input,employeeId:'demo-other'}],
 ['spoofed company target',{},'synthetic-token',{...input,companyId:'foreign'}],
 ['role escalation',{},'synthetic-token',{...input,role:'admin'}],
 ['pay-rate overpost',{},'synthetic-token',{...input,payRate:999}],
 ['invalid mode',{},'synthetic-token',{...input,mode:'admin'}],
 ['missing mode',{},'synthetic-token',{start:'08:00',end:'17:00'}],
 ['invalid hour',{},'synthetic-token',{...input,start:'25:00'}],
 ['invalid minute',{},'synthetic-token',{...input,end:'17:75'}],
 ['empty time',{},'synthetic-token',{...input,start:''}],
 ['numeric time',{},'synthetic-token',{...input,start:800}],
 ['null payload',{},'synthetic-token',null],
];
for(const [name,options,token,body]of negatives)test(`PC-155 command: rejects ${name} without writes`,pending,async()=>{const f=fixture(options);await assert.rejects(()=>f.run(token,body));assert.equal(f.writes.length,0);assert.deepEqual([...f.records],f.before);});

const clerkClaims = {firebase:{sign_in_provider:'custom'},authMethod:'clerk',verifiedClerkEmail:true,identityLinkVersion:2,identityCompanyId:COMPANY,identityEmployeeId:EMP,companyEmail:'demo@example.test',clerkUserId:'fixture-clerk',clerkSessionId:'fixture-session',clerkLeaseVersion:1};
const clerkProfile = () => ({clerkUserId:'fixture-clerk',clerkLeaseRequired:true,clerkSessionLeases:{'fixture-session':{status:'active',uid:UID,companyId:COMPANY,clerkUserId:'fixture-clerk',clerkSessionId:'fixture-session',sessionCreatedAt:100,validUntilMs:Date.now()+60000}}});
test('PC155 current Clerk lease can save self defaults',pending,async()=>{const f=fixture({profilePatch:clerkProfile(),claimsPatch:clerkClaims});const ack=await f.run('synthetic-token',input);assert.deepEqual(ack,{uid:UID,companyId:COMPANY,employeeId:EMP,defaults:input});assert.equal(f.writes.length,1);});
for (const state of ['expired','revoked','missing']) test(`PC155 ${state} Clerk lease cannot save defaults`,pending,async()=>{const profile=clerkProfile();if(state==='missing')profile.clerkSessionLeases={};else if(state==='expired')profile.clerkSessionLeases['fixture-session'].validUntilMs=Date.now()-1;else profile.clerkSessionLeases['fixture-session'].status='revoked';const f=fixture({profilePatch:profile,claimsPatch:clerkClaims});await assert.rejects(f.run('synthetic-token',input));assert.equal(f.writes.length,0);assert.deepEqual([...f.records],f.before);});

for (const [name,employeePatch,profilePatch] of [
  ['retired code login UID',{codeLoginUid:'retired-uid'},{}],
  ['retired nested code UID',{auth:{uid:UID,email:'demo@example.test',codeLoginUid:'retired-uid'}},{}],
  ['historical account email',{}, {email:'old@example.test'}],
  ['historical employee auth email',{auth:{uid:UID,email:'old@example.test'}},{}],
]) test(`PC155 canonically approved Clerk identity tolerates ${name}`,pending,async()=>{
  const f=fixture({profilePatch:{...clerkProfile(),...profilePatch},employeePatch,claimsPatch:clerkClaims});
  const before=f.employee();await f.run('synthetic-token',input);
  assert.equal(f.writes.length,1);assert.equal(f.employee().codeLoginUid,before.codeLoginUid);
  assert.deepEqual(f.employee().auth,before.auth,'historical identity metadata is not rewritten');
});
for (const employeePatch of [{uid:'foreign'},{authUid:'foreign'},{auth:{uid:'foreign'}},{uid:null,authUid:null,auth:null,codeLoginUid:UID},{mobileAccess:{status:'active',approvedEmail:'foreign@example.test'}}]) test('PC155 Clerk defaults still reject changed active identity or approved email without writes',pending,async()=>{
  const f=fixture({profilePatch:clerkProfile(),employeePatch,claimsPatch:clerkClaims});
  await assert.rejects(f.run('synthetic-token',input));assert.equal(f.writes.length,0);assert.deepEqual([...f.records],f.before);
});

function response(){return {statusCode:200,body:null,headers:{},set(key,value){this.headers[key]=value;return this;},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
test('PC155 HTTP adapter verifies revocation and returns only canonical acknowledgement',pending,async()=>{const f=fixture({profilePatch:clerkProfile(),claimsPatch:clerkClaims}),res=response();await f.handler()({headers:{authorization:'Bearer synthetic-token'},body:input},res);assert.equal(res.statusCode,200);assert.deepEqual(res.body,{uid:UID,employeeId:EMP,companyId:COMPANY,defaults:input});assert.equal(res.headers['Cache-Control'],'no-store');assert.deepEqual(f.authCalls,[{token:'synthetic-token',revoked:true}]);assert.equal(f.writes.length,1);});
for(const [header,status,options] of [[null,401,{}],['Basic synthetic-token',401,{}],['Bearer synthetic-token',401,{tokenError:true}],['Bearer synthetic-token',403,{profilePatch:{isEnabled:false}}]])test(`PC155 HTTP adapter rejects invalid authority (${header}/${status}) without writes`,pending,async()=>{const f=fixture(options),res=response();await f.handler()({headers:{authorization:header},body:input},res);assert.equal(res.statusCode,status);assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(f.writes.length,0);assert.equal(JSON.stringify(res.body).includes('synthetic-token'),false);});
for(const [name,employeePatch,profilePatch] of [
 ['job-only',{jobTitle:'Freelancer',freelanceAccess:{timesheets:false,expenses:false}},{jobOnlyAccess:true,freelanceAccess:{timesheets:false,expenses:false}}],
 ['missing mirror',{jobTitle:'Freelance',freelanceAccess:{timesheets:false,expenses:false}},{}],
 ['partial restriction',{jobTitle:'Freelance',freelanceAccess:{timesheets:false}},{freelanceAccess:{timesheets:false}}],
 ['stale restrictive mirror',{jobTitle:'Freelance'},{jobOnlyAccess:true,freelanceAccess:{timesheets:false,expenses:false}}],
]) test(`PC429 defaults transaction rejects ${name} with zero writes`,async()=>{const f=fixture({employeePatch,profilePatch});await assert.rejects(f.run('synthetic-token',input),{status:403});assert.equal(f.writes.length,0);});
test('PC429 defaults transaction refresh denies capability downgrade after previous success',async()=>{const f=fixture();await f.run('synthetic-token',input);Object.assign(f.employee(),{jobTitle:'Freelance',freelanceAccess:{timesheets:false,expenses:false}});Object.assign(f.records.get(`users/${UID}`),{jobOnlyAccess:true,freelanceAccess:{timesheets:false,expenses:false}});await assert.rejects(f.run('synthetic-token',input),{status:403});assert.equal(f.writes.length,1);});
