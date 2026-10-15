import test from 'node:test';
import assert from 'node:assert/strict';
import { createClerkResetFlow } from '../firebase/auth-page/clerk-reset-flow.mjs';
test('pilot recovery returns to the pilot website only after provider and server confirmation', async () => {
  const { deps, calls } = setup();
  const flow = createClerkResetFlow({ ...deps, deployment: 'pilot' });
  flow.go('web'); assert.equal(calls.length, 0);
  await flow.request('staff@example.test'); await flow.verify('123456'); await flow.reset('New-password-123!', 'New-password-123!');
  flow.go('web'); assert.deepEqual(calls.at(-1), ['redirect', 'https://pilot.bickers.co.uk']);
  assert.throws(() => createClerkResetFlow({ ...deps, deployment: 'https://evil.test' }));
});
function setup() {
 const calls=[];const state={stage:'request',resetVerified:false,passwordSaved:false,factors:[]};
 const client={resume:async()=>({...state}),requestReset:async email=>{calls.push(['request',email]);state.stage='code';},
  verifyResetCode:async()=>{calls.push(['verify']);Object.assign(state,{stage:'password',resetVerified:true});return {...state};},
  resetPassword:async()=>{calls.push(['reset']);Object.assign(state,{stage:'complete',passwordSaved:true});return {...state};},
  prepareFactor:async factor=>{calls.push(['prepare',factor]);},verifyFactor:async()=>{calls.push(['factor']);state.stage='complete';return {...state};},
  activate:async()=>{calls.push(['activate']);return 'provider-proof';}};
 const deps={client,finishRecovery:async token=>{calls.push(['finish',token]);return {completed:true};},redirect:url=>calls.push(['redirect',url])};
 return {calls,state,client,deps,flow:createClerkResetFlow(deps)};
}
test('known and unknown accounts have identical code-request responses',async()=>{
 const known=setup(),unknown=setup();unknown.client.requestReset=async()=>{throw {code:'form_identifier_not_found'};};
 assert.deepEqual(await known.flow.request('staff@example.test'),await unknown.flow.request('staff@example.test'));
 await unknown.flow.verify('123456');assert.equal(unknown.calls.some(row=>row[0]==='verify'),false);assert.ok(unknown.flow.state.error);
});
test('code proof is required before accepting a new password',async()=>{
 const {flow,calls}=setup();await flow.reset('New-password-123!','New-password-123!');assert.equal(calls.length,0);
 await flow.request('staff@example.test');await flow.verify('123456');assert.equal(flow.state.view,'password');
 await flow.reset('short','short');await flow.reset('New-password-123!','different');assert.equal(calls.some(row=>row[0]==='reset'),false);
 await flow.reset('New-password-123!','New-password-123!');assert.equal(flow.state.view,'success');assert.deepEqual(calls.slice(-3),[['reset'],['activate'],['finish','provider-proof']]);
});
test('invalid, expired and throttled codes cannot enable password entry',async()=>{
 for(const code of ['form_code_incorrect','verification_expired','too_many_requests']) {
  const {flow,client}=setup();client.verifyResetCode=async()=>{throw {code};};await flow.request('staff@example.test');await flow.verify('123456');
  assert.equal(flow.state.view,'code');assert.ok(flow.state.error);
 }
});
test('provider password policy errors preserve a retryable password form',async()=>{
 const {flow,client,calls}=setup();client.resetPassword=async()=>{throw {code:'form_password_pwned'};};
 await flow.request('staff@example.test');await flow.verify('123456');await flow.reset('New-password-123!','New-password-123!');
 assert.equal(flow.state.view,'password');assert.ok(flow.state.error);assert.equal(calls.some(row=>row[0]==='finish'),false);
});
test('MFA is completed before recovery proof and success',async()=>{
 const {flow,client,state,calls}=setup();client.resetPassword=async()=>({...Object.assign(state,{stage:'challenge',passwordSaved:true,factors:['totp','backup_code']})});
 await flow.request('staff@example.test');await flow.verify('123456');await flow.reset('New-password-123!','New-password-123!');
 assert.equal(flow.state.view,'challenge');assert.equal(calls.some(row=>row[0]==='finish'),false);
 await flow.selectFactor('backup_code');await flow.verifyFactor('backup');assert.equal(flow.state.view,'success');
});
test('failed application proof reports saved password and retries confirmation without replaying the password',async()=>{
 const {deps,calls}=setup();let permitted=false;deps.finishRecovery=async()=>{calls.push(['finish']);if(!permitted)throw new Error('unavailable');return {completed:true};};
 const flow=createClerkResetFlow(deps);await flow.request('staff@example.test');await flow.verify('123456');await flow.reset('New-password-123!','New-password-123!');
 assert.equal(flow.state.view,'finish-error');permitted=true;await flow.retry();assert.equal(flow.state.view,'success');assert.equal(calls.filter(row=>row[0]==='reset').length,1);
});
test('reload resumes only provider-backed reset proof; a different browser restarts recovery',async()=>{
 const existing=setup();Object.assign(existing.state,{stage:'password',resetVerified:true});assert.equal((await existing.flow.open('')).view,'password');
 const fresh=setup();assert.equal((await fresh.flow.open('?code=untrusted&redirect=https://evil.test')).view,'request');assert.equal(fresh.calls.length,0);
 Object.assign(fresh.state,{stage:'complete',resetVerified:false,passwordSaved:false});assert.equal((await fresh.flow.open('')).view,'request');assert.equal(fresh.calls.length,0);
});
test('Firebase action codes are routed only to the legacy handler and never passed to Clerk',async()=>{
 const {flow,calls}=setup();const result=await flow.open('?mode=resetPassword&oobCode=firebase-code&continueUrl=https://evil.test&apiKey=evil');
 assert.equal(result.view,'legacy');assert.ok(result.url.startsWith('/legacy-reset-password?'));assert.ok(!result.url.includes('evil'));assert.deepEqual(calls,[]);
});
test('SDK outages are retryable and duplicate requests do not send extra messages',async()=>{
 const {flow,client,calls}=setup();let release;client.requestReset=async()=>{calls.push(['request']);await new Promise(resolve=>{release=resolve;});};
 const first=flow.request('staff@example.test');await flow.request('staff@example.test');release();await first;assert.equal(calls.length,1);
 client.resume=async()=>{throw new Error('SDK unavailable');};await flow.open('');assert.equal(flow.state.view,'load-error');
});
test('successful recovery exposes only fixed app and website destinations',async()=>{
 const {flow,calls}=setup();await flow.request('staff@example.test');await flow.verify('123456');await flow.reset('New-password-123!','New-password-123!');
 flow.go('https://evil.test');flow.go('web');flow.go('app');assert.deepEqual(calls.filter(row=>row[0]==='redirect'),[['redirect','https://booking.bickers.co.uk'],['redirect','bickersapp://login']]);
});
test('an MFA delivery outage keeps its verification controls available for retry',async()=>{
 const {flow,client,state}=setup();client.resetPassword=async()=>({...Object.assign(state,{stage:'challenge',passwordSaved:true,factors:['email_code']})});
 client.prepareFactor=async()=>{throw new Error('network');};
 await flow.request('staff@example.test');await flow.verify('123456');await flow.reset('New-password-123!','New-password-123!');
 assert.equal(flow.state.view,'challenge');assert.equal(flow.state.factor,'email_code');assert.ok(flow.state.error);
});
test('an uncertain password response checks provider state instead of resubmitting the password',async()=>{
 const {flow,client,state,calls}=setup();client.resetPassword=async()=>{calls.push(['reset']);Object.assign(state,{stage:'complete',resetVerified:true,passwordSaved:true});throw {code:'network_error'};};
 await flow.request('staff@example.test');await flow.verify('123456');await flow.reset('New-password-123!','New-password-123!');assert.equal(flow.state.view,'uncertain');
 await flow.retry();assert.equal(flow.state.view,'success');assert.equal(calls.filter(row=>row[0]==='reset').length,1);
});
