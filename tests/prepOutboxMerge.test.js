import test from 'node:test';import assert from 'node:assert/strict';import * as merge from '../lib/vehiclePrepStatus.js';
test('sync acknowledgement preserves mutations queued while a transaction is in flight',()=>{
 const rows=merge.mergePrepOutboxFlush?.([{id:'processed'},{id:'new',data:{notes:'new'}}],['processed'],[])||[];
 assert.deepEqual(rows,[{id:'new',data:{notes:'new'}}]);
});
test('sync conflict retains the error and leaves unrelated operations untouched',()=>{
 const rows=merge.mergePrepOutboxFlush?.([{id:'prep'},{id:'other'}],['prep'],[{id:'prep',lastErrorCode:'prep/conflict'}])||[];
 assert.deepEqual(rows,[{id:'prep',lastErrorCode:'prep/conflict'},{id:'other'}]);
});
