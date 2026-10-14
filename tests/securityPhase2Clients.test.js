import {Buffer} from 'node:buffer';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import * as identityBinding from '../lib/sync/identity.js';
async function load(file){try{return await import('data:text/javascript;base64,'+Buffer.from(await readFile(file,'utf8')).toString('base64'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
const history=await load('lib/privateHistoryClient.js'),proxy=await load('server/hrHistoryProxy.js');
const identity={uid:'crew',companyId:'A',employeeId:'emp'};
const row={id:'leave',ownerUid:'crew',companyId:'A',employeeId:'emp',status:'requested',updateTime:'v1'};
function setup(){let current={...identity},calls=[];assert.equal(typeof history.createPrivateHistoryClient,'function');const api=history.createPrivateHistoryClient({getIdentity:()=>current,getToken:async()=> 'token',request:async(path,init)=>{calls.push({path,init});return {records:[row],withheldCount:0,historyComplete:true};}});return {api,calls,switch:()=>{current={...identity,uid:'other'};}};}
test('history uses fixed private endpoint without client supplied tenant or employee selectors',async()=>{const h=setup();const result=await h.api.history('holidays');assert.equal(result.records[0].id,'leave');assert.equal(h.calls[0].path,'/hr/history?collection=holidays');assert.equal(h.calls[0].init.headers.Authorization,'Bearer token');});
test('history rejects foreign rows and invalid collections',async()=>{
 assert.equal(typeof history.createPrivateHistoryClient,'function');const api=history.createPrivateHistoryClient({getIdentity:()=>identity,getToken:async()=> 't',request:async()=>({records:[{...row,ownerUid:'other'}],withheldCount:0,historyComplete:true})});await assert.rejects(api.history('holidays'));await assert.rejects(api.history('users'));
});
test('history rejects response completion after account switch',async()=>{
 assert.equal(typeof history.createPrivateHistoryClient,'function');let current=identity,release;const api=history.createPrivateHistoryClient({getIdentity:()=>current,getToken:async()=> 't',request:()=>new Promise(resolve=>{release=resolve;})});const pending=api.history('timesheets');await new Promise(resolve=>setImmediate(resolve));current={...identity,uid:'other'};release({records:[],withheldCount:0,historyComplete:true});await assert.rejects(pending,/account|identity/i);
});
test('token wait cannot send an original employee request using another session',async()=>{
 assert.equal(typeof history.createPrivateHistoryClient,'function');let current=identity,release,calls=0;const api=history.createPrivateHistoryClient({getIdentity:()=>current,getToken:()=>new Promise(resolve=>{release=resolve;}),request:async()=>{calls++;return {};}});const pending=api.history('holidays');current={...identity,uid:'other'};release('t');await assert.rejects(pending);assert.equal(calls,0);
});
test('pending cancellation sends original observed version and never falls back to direct writes',async()=>{const h=setup();await h.api.cancelHoliday(row);const body=JSON.parse(h.calls[0].init.body);assert.deepEqual(body,{collection:'holidays',id:'leave',action:'cancelPendingHoliday',expectedUpdateTime:'v1'});assert.equal(h.calls[0].path,'/hr/records');await assert.rejects(h.api.cancelHoliday({...row,ownerUid:'other'}));});
test('optimistic same-account cache edits retain withheld warnings and legacy cache arrays',()=>{
 assert.equal(typeof history.updateHistoryCache,'function');const current={records:[row],withheldCount:2,historyComplete:false};const edited=history.updateHistoryCache(current,rows=>rows.map(r=>({...r,status:'cancelled'})));assert.equal(edited.records[0].status,'cancelled');assert.equal(edited.withheldCount,2);assert.equal(current.records[0].status,'requested');assert.deepEqual(history.updateHistoryCache([row],()=>[]),[]);
});
test('history binding detects employee-link changes without changing existing outbox identity envelopes',()=>{
 assert.equal(typeof identityBinding.getSyncEmployeeIdentity,'function');identityBinding.bindSyncIdentity(identity);const original=identityBinding.getSyncEmployeeIdentity('crew');identityBinding.bindSyncIdentity({...identity,employeeId:'changed'});assert.notDeepEqual(identityBinding.getSyncEmployeeIdentity('crew'),original);assert.deepEqual(identityBinding.getSyncIdentity('crew'),{uid:'crew',companyId:'A'});identityBinding.bindSyncIdentity(null);
});
function response(){return {headers:{},set(k,v){this.headers[k]=v;return this;},status(s){this.statusCode=s;return this;},json(body){this.body=body;return this;}};}
test('Render forwards only fixed history GET and own pending cancellation contracts',async()=>{
 assert.equal(typeof proxy.createHrHistoryProxy,'function');let calls=[];const handle=proxy.createHrHistoryProxy({origin:'https://office.test',fetchImpl:async(url,init)=>{calls.push({url:String(url),init});return {status:200,json:async()=>({records:[]})};}});
 let res=response();await handle({method:'GET',path:'/history',headers:{authorization:'Bearer token'},query:{collection:'holidays',companyId:'foreign'}},res);assert.equal(res.statusCode,400);assert.equal(calls.length,0);
 res=response();await handle({method:'GET',path:'/history',headers:{authorization:'Bearer token'},query:{collection:'holidays'}},res);assert.equal(res.statusCode,200);assert.equal(calls[0].url,'https://office.test/api/hr/history?collection=holidays');assert.equal(calls[0].init.redirect,'error');assert.equal(res.headers['Cache-Control'],'private, no-store');
 res=response();await handle({method:'POST',path:'/records',headers:{authorization:'Bearer token'},body:{action:'approve',collection:'timesheets'}},res);assert.equal(res.statusCode,400);assert.equal(calls.length,1);
 res=response();await handle({method:'GET',path:'/reviews',headers:{authorization:'Bearer token'},query:{collection:'timesheets'}},res);assert.equal(res.statusCode,404);
});
test('Render missing bearer and unsafe origin fail without upstream request',async()=>{
 assert.equal(typeof proxy.createHrHistoryProxy,'function');for(const origin of ['https://user:secret@office.test','https://office.test?x=1','http://office.test']){const handle=proxy.createHrHistoryProxy({origin,production:true,fetchImpl:()=>{throw Error('must not fetch');}});const res=response();await handle({method:'GET',path:'/history',headers:{authorization:'Bearer token'},query:{collection:'holidays'}},res);assert.equal(res.statusCode,503);}
 const res=response();await proxy.createHrHistoryProxy({origin:'https://office.test'})({method:'GET',path:'/history',headers:{},query:{collection:'holidays'}},res);assert.equal(res.statusCode,401);
});

test('history completeness is explicit and incomplete history cannot certify allowance',async()=>{
 const client=result=>history.createPrivateHistoryClient({getIdentity:()=>identity,getToken:async()=> 't',request:async()=>result});
 await assert.rejects(client({records:[row],withheldCount:0}).history('holidays'));
 assert.equal((await client({records:[row],withheldCount:0,historyComplete:false}).history('holidays')).historyComplete,false);
 assert.equal(history.updateHistoryCache({records:[row],withheldCount:0,historyComplete:false},()=>[]).historyComplete,false);
 const request=await readFile('app/(protected)/holiday-request.js','utf8');assert.match(request,/!result.historyComplete/);
});

test('current holiday notification listener uses the complete private-record identity',async()=>{
 const code=await readFile('hooks/useEmployeeNotifications.js','utf8');const query=code.slice(code.indexOf('const holidaysQuery = query('),code.indexOf('return onSnapshot(',code.indexOf('const holidaysQuery = query(')));
 for(const field of ['companyId','employeeCode','ownerUid','employeeId'])assert.match(query,new RegExp('where\\("'+field+'"'));
});
