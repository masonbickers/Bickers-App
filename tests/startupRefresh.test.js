import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../lib/startup/refresh.js').catch(()=>({}));
test('foreground and reconnect coalesce into one bounded refresh; account cleanup cancels pending work',()=>{
  assert.equal(typeof api.createRefreshCoalescer,'function');let runs=0;const timers=[];
  const refresh=api.createRefreshCoalescer({refresh:()=>runs++,schedule:(fn,delay)=>{const t={fn,delay};timers.push(t);return t;},cancel:t=>{t.cancelled=true;}});
  refresh.request();refresh.request();assert.equal(timers.length,1);assert.equal(timers[0].delay,250);timers[0].fn();assert.equal(runs,1);
  refresh.request();refresh.dispose();timers[1].fn();assert.equal(runs,1);
});
