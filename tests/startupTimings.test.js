import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../lib/startup/timings.js').catch(()=>({}));
test('timings use fixed non-sensitive fields, stay monotonic, deduplicate marks and bound output',async()=>{
  assert.equal(typeof api.createStartupTimings,'function');let now=100;const records=[];
  const t=api.createStartupTimings({now:()=>now,emit:r=>records.push(r)});
  t.mark('local-restore');now=80;t.mark('first-saved-layout');t.mark('first-saved-layout');
  t.mark('secret-user-id');t.mark('bridge','secret-token');
  assert.equal(records.length,2);assert.deepEqual(records.map(r=>r.elapsedMs),[0,0]);
  now=180;await assert.rejects(t.measure('bridge',async()=>{throw Error('secret-password');}));
  assert.equal(JSON.stringify(records).includes('secret'),false);
  for(let i=0;i<50;i++)await t.measure('access',async()=>true);assert.equal(records.length,32);
  t.reset('foreground');t.mark('first-saved-layout');assert.equal(records.at(-1).kind,'foreground');assert.equal(records.at(-1).elapsedMs,0);
});

test('a cancelled previous startup cannot publish timing into the foreground cycle',async()=>{
  let now=0,release;const records=[];const t=api.createStartupTimings({now:()=>now,emit:r=>records.push(r)});
  const old=t.measure('bridge',()=>new Promise(r=>{release=r;}));now=100;t.reset('foreground');release();await old;
  assert.equal(records.length,0);t.mark('first-saved-layout');assert.equal(records[0].elapsedMs,0);
});
