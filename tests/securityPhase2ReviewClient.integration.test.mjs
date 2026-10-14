import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=process.env.SECURITY_OFFICE_ROOT;if(!root)throw Error('SECURITY_OFFICE_ROOT required');let source='';try{source=await readFile(path.join(root,'src/app/utils/hrReviewClient.js'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
const client=source?await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')):{};
const row={id:'record',updateTime:'observed-v1',employeeId:'emp',companyId:'A',canApprove:true,approved:false};
test('manager decision submits exactly the version displayed, without refreshing it away',async()=>{
 assert.equal(typeof client.submitHrReview,'function');let calls=[];const user={getIdToken:async()=> 't'};await client.submitHrReview(user,'timesheets',row,'approved',async(url,init)=>{calls.push({url,init});return {ok:true,json:async()=>({ok:true})};});assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/hr/records');assert.equal(JSON.parse(calls[0].init.body).expectedUpdateTime,'observed-v1');
});
test('review client exposes stale version failures and refuses read-only rows',async()=>{
 assert.equal(typeof client.submitHrReview,'function');const user={getIdToken:async()=> 't'};await assert.rejects(client.submitHrReview(user,'timesheets',row,'approved',async()=>({ok:false,status:409,json:async()=>({error:'HR record changed. Refresh before retrying.'})})),/changed/);await assert.rejects(client.submitHrReview(user,'timesheets',{...row,approved:true,canApprove:false},'approved'));await assert.rejects(client.submitHrReview(user,'timesheets',row,'reopened'));
});
test('navigation requires explicit enabled scope; role label and payroll scope do not grant review access',()=>{
 assert.equal(typeof client.hasHrApprovalNavigation,'function');const manager={uid:'manager',companyId:'A',employeeId:'manager-emp',role:'manager',appAccess:{user:true}};assert.equal(client.hasHrApprovalNavigation(manager),false);assert.equal(client.hasHrApprovalNavigation({...manager,hrApprovalAccess:{enabled:true,companyId:'A',employeeIds:['emp']}}),true);assert.equal(client.hasHrApprovalNavigation({...manager,hrApprovalAccess:{enabled:true,companyId:'B',employeeIds:['emp']}}),false);
});
