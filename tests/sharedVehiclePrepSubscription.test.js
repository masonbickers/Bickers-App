import test from 'node:test';import assert from 'node:assert/strict';
import {subscribePrepResource} from '../lib/vehiclePrepStatus.js';
test('subscription resets scope, rejects foreign data, marks errors, and ignores closed callbacks',()=>{
 const receivers={};const values=[];let closed=0;
 const stop=subscribePrepResource({companyId:'a',retryMs:60000,onChange:r=>values.push(r),subscribe:(source,next,fail)=>{receivers[source]={next,fail};return()=>closed++;}});
 assert.equal(values[0].shared.state,'loading');
 receivers.shared.next({records:[{companyId:'a',completed:true},{companyId:'b',completed:true}],fromCache:true});
 assert.equal(values.at(-1).shared.state,'cached');assert.equal(values.at(-1).shared.records.length,1);
 receivers.shared.next({records:[{companyId:'a'}],hasPendingWrites:true});assert.equal(values.at(-1).shared.state,'pending');
 receivers.shared.fail(new Error('permission-denied'));assert.equal(values.at(-1).shared.state,'error');
 receivers.legacy.next({companyId:'b',records:{bad:{completed:true}}});assert.deepEqual(values.at(-1).legacy.records,{});
 stop();const count=values.length;receivers.shared.next({records:[{companyId:'a'}]});assert.equal(values.length,count);assert.equal(closed,2);
});
