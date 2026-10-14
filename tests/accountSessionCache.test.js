import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAccountSessionCache } from '../lib/accountSessionCache.js';
test('identity changes erase cached permissions and data without discarding owned unsent work or device preferences',async()=>{
  const records=new Map([['employeeId','old'],['sessionUserAccess','1'],['@bickers.dataCache.v2.v2.old','data'],['@bickers.service.cache.v1.old','data'],['@bickers.sync.outbox.v1','owned queued work'],['bickers-theme-preference','dark']]);
  await clearAccountSessionCache({getAllKeys:async()=>[...records.keys()],multiRemove:async keys=>keys.forEach(key=>records.delete(key))});
  assert.deepEqual([...records],[['@bickers.sync.outbox.v1','owned queued work'],['bickers-theme-preference','dark']]);
});
