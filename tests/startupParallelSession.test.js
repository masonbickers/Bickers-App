import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../lib/startup/loadVerifiedSession.js').catch(()=>({}));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
test('preferences, access and terms overlap, with no publication until all required results finish',async()=>{
  assert.equal(typeof api.loadVerifiedSession,'function');
  const gates=[deferred(),deferred(),deferred()],started=[];let finished=false;
  const run=api.loadVerifiedSession({readPreferences:()=>{started.push('preferences');return gates[0].promise;},resolveAccess:()=>{started.push('access');return gates[1].promise;},readTerms:()=>{started.push('terms');return gates[2].promise;},isCurrent:()=>true}).then(r=>{finished=true;return r;});
  await Promise.resolve();assert.deepEqual(started,['preferences','access','terms']);
  gates[1].resolve({approved:true});gates[0].resolve([]);await Promise.resolve();assert.equal(finished,false);
  gates[2].resolve({accepted:true});assert.deepEqual(await run,{preferences:[],access:{approved:true},terms:{accepted:true},termsError:null});
});
test('unavailable terms remains distinct from absent acceptance and superseded results are discarded',async()=>{
  assert.equal(typeof api.loadVerifiedSession,'function');
  const deps={readPreferences:async()=>[],resolveAccess:async()=>({approved:true}),readTerms:async()=>null,isCurrent:()=>true};
  assert.equal((await api.loadVerifiedSession(deps)).termsError,null);
  const error=Error('offline');const result=await api.loadVerifiedSession({...deps,readTerms:async()=>{throw error;}});assert.equal(result.termsError,error);
  assert.equal(await api.loadVerifiedSession({...deps,isCurrent:()=>false}),null);
});
test('confirmed denial is surfaced before a slow terms service finishes',async()=>{
  assert.equal(typeof api.loadVerifiedSession,'function');
  const error=Object.assign(Error('denied'),{code:'MOBILE_ACCESS_DENIED'});
  await assert.rejects(api.loadVerifiedSession({readPreferences:async()=>[],resolveAccess:async()=>{throw error;},readTerms:()=>new Promise(()=>{}),isCurrent:()=>true}),{code:'MOBILE_ACCESS_DENIED'});
});
