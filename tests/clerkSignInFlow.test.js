import test from 'node:test';
import assert from 'node:assert/strict';
import { createClerkSignInFlow } from '../lib/clerkSignInFlow.js';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {resolve,promise};};
function fixture(status='complete',factors=[]) {
  const calls=[];
  const resource={status:'needs_identifier',supportedSecondFactors:factors.map(strategy=>({strategy})),
    password:async input=>{calls.push(['password',input.emailAddress]);resource.status=status;return {error:null};},
    finalize:async ({navigate})=>{calls.push(['activate']);await navigate({session:{currentTask:null}});return {error:null};},
    reset:async()=>{calls.push(['reset']);resource.status='needs_identifier';return {error:null};},mfa:{}};
  for(const method of ['sendEmailCode','sendPhoneCode','verifyEmailCode','verifyPhoneCode','verifyTOTP','verifyBackupCode']) resource.mfa[method]=async()=>{calls.push([method]);if(method.startsWith('verify'))resource.status='complete';return {error:null};};
  const states=[]; const flow=createClerkSignInFlow({getSignIn:()=>resource,onChange:state=>states.push(state),cancelSession:async sessionId=>calls.push(['revoke',sessionId])});
  return {flow,resource,calls,states};
}
test('password sign-in activates only a completed provider attempt and never requests enrollment',async()=>{
  const {flow,calls}=fixture();await flow.password('staff@example.test','private');
  assert.deepEqual(calls,[['password','staff@example.test'],['activate']]);assert.equal(flow.getState().step,'complete');
});
test('device trust sends email code and activates only after verification',async()=>{
  const {flow,calls}=fixture('needs_client_trust',['email_code']);await flow.password('staff@example.test','private');
  assert.equal(flow.getState().step,'challenge');assert.equal(flow.getState().factor,'email_code');assert.equal(calls.some(row=>row[0]==='activate'),false);
  await flow.verify('123456');assert.deepEqual(calls.map(row=>row[0]),['password','sendEmailCode','verifyEmailCode','activate']);
});
test('authenticator and backup-code MFA remain available without silently dropping a factor',async()=>{
  const {flow,calls}=fixture('needs_second_factor',['totp','backup_code']);await flow.password('staff@example.test','private');
  assert.deepEqual(flow.getState().factors,['totp','backup_code']);await flow.selectFactor('backup_code');await flow.verify('backup');
  assert.equal(calls.at(-2)[0],'verifyBackupCode');assert.equal(flow.getState().step,'complete');
});
test('unsupported challenges and password recovery never falsely report success',async()=>{
  for(const [status,want] of [['needs_protect_check','browser'],['needs_new_password','recovery']]) {
    const {flow,calls}=fixture(status);await flow.password('staff@example.test','private');
    assert.equal(flow.getState().step,want);assert.equal(calls.some(row=>row[0]==='activate'),false);
  }
});
test('provider validation errors stay retryable and never activate',async()=>{
  const {flow,resource,calls}=fixture();resource.password=async()=>({error:{code:'form_password_incorrect'}});
  await flow.password('staff@example.test','private');assert.equal(flow.getState().step,'password');assert.ok(flow.getState().error);
  assert.equal(calls.some(row=>row[0]==='activate'),false);
});
test('cancellation and duplicate submission cannot activate a delayed password response',async()=>{
  const {flow,resource,calls}=fixture();const gate=deferred();resource.password=async()=>{calls.push(['request']);await gate.promise;resource.status='complete';return {error:null};};
  const pending=flow.password('staff@example.test','private');await Promise.resolve();
  const duplicate=flow.password('staff@example.test','private');const cancelled=flow.cancel();gate.resolve();
  await Promise.all([pending,duplicate,cancelled]);assert.equal(calls.filter(row=>row[0]==='request').length,1);assert.equal(calls.some(row=>row[0]==='activate'),false);assert.equal(flow.getState().step,'password');
});
test('session tasks are surfaced before reporting completed sign-in',async()=>{
  const {flow,resource}=fixture();resource.finalize=async({navigate})=>{await navigate({session:{currentTask:{key:'reset-password'}}});return {error:null};};
  await flow.password('staff@example.test','private');assert.equal(flow.getState().step,'browser');
});
test('cancelling during activation ends only the captured newly created session',async()=>{
  const {flow,resource,calls}=fixture();const gate=deferred();
  resource.createdSessionId='session-old-attempt';resource.finalize=async()=>{calls.push(['activating']);await gate.promise;return {error:null};};
  const pending=flow.password('staff@example.test','private');
  for(let i=0;i<5&&!calls.some(row=>row[0]==='activating');i++)await Promise.resolve();
  const cancel=flow.cancel();gate.resolve();await Promise.all([pending,cancel]);
  assert.ok(calls.some(row=>row[0]==='revoke'&&row[1]==='session-old-attempt'));assert.equal(flow.getState().step,'password');
});
