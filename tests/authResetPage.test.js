import test from 'node:test';
import assert from 'node:assert/strict';
import { createResetFlow } from '../firebase/auth-page/reset-flow.mjs';

function setup(overrides = {}) {
  const calls = [];
  const flow = createResetFlow({
    verifyCode: async code => { calls.push(['verify', code]); return 'staff@example.test'; },
    validatePassword: async () => ({ isValid: true }),
    confirmReset: async (code, password) => { calls.push(['confirm', code, password]); },
    sendReset: async email => { calls.push(['send', email]); },
    ...overrides,
  });
  return { flow, calls };
}

test('only a verified reset code enables the password form', async () => {
  const { flow, calls } = setup();
  assert.equal((await flow.open('?mode=resetPassword')).view, 'request');
  assert.deepEqual(calls, []);
  const state = await flow.open('?mode=resetPassword&oobCode=valid-code&apiKey=untrusted');
  assert.equal(state.view, 'ready');
  assert.equal(state.email, 'staff@example.test');
  assert.equal(JSON.stringify(state).includes('valid-code'), false);
  assert.deepEqual(calls, [['verify', 'valid-code']]);
});

test('expired codes offer recovery while network failures offer a verification retry', async () => {
  for (const [code, expected] of [['auth/expired-action-code', 'expired'], ['auth/invalid-action-code', 'expired'], ['auth/network-request-failed', 'retry']]) {
    const { flow } = setup({ verifyCode: async () => { throw { code }; } });
    assert.equal((await flow.open('?mode=resetPassword&oobCode=bad')).view, expected);
  }
});

test('password validation blocks mismatches, short passwords and Firebase policy failures', async () => {
  const { flow, calls } = setup({ validatePassword: async () => ({ isValid: false, containsNumericCharacter: false }) });
  await flow.open('?mode=resetPassword&oobCode=valid');
  assert.equal((await flow.submit('short', 'short')).view, 'ready');
  assert.equal((await flow.submit('long-password', 'different')).view, 'ready');
  const state = await flow.submit('long-password', 'long-password');
  assert.match(state.error, /number/i);
  assert.equal(calls.some(([name]) => name === 'confirm'), false);
});

test('a valid reset changes the password once and prevents duplicate submissions', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const { flow, calls } = setup({ validatePassword: async () => { await pending; return { isValid: true }; } });
  await flow.open('?mode=resetPassword&oobCode=valid');
  const first = flow.submit('New-password-123!', 'New-password-123!');
  await flow.submit('Other-password-123!', 'Other-password-123!');
  release();
  assert.equal((await first).view, 'success');
  await flow.submit('Another-password-123!', 'Another-password-123!');
  assert.deepEqual(calls.filter(([name]) => name === 'confirm'), [['confirm', 'valid', 'New-password-123!']]);
});

test('a code that expires during submission returns to recovery', async () => {
  const { flow } = setup({ confirmReset: async () => { throw { code: 'auth/invalid-action-code' }; } });
  await flow.open('?mode=resetPassword&oobCode=valid');
  assert.equal((await flow.submit('New-password-123!', 'New-password-123!')).view, 'expired');
});

test('reset requests hide account existence but report network failures', async () => {
  for (const code of [null, 'auth/user-not-found', 'auth/user-disabled']) {
    const { flow } = setup({ sendReset: async () => { if (code) throw { code }; } });
    assert.equal((await flow.request('staff@example.test')).view, 'sent');
  }
  const { flow, calls } = setup();
  assert.ok((await flow.request('invalid')).error);
  assert.deepEqual(calls, []);
  const failed = setup({ sendReset: async () => { throw { code: 'auth/network-request-failed' }; } });
  assert.equal((await failed.flow.request('staff@example.test')).view, 'request');
  assert.ok(failed.flow.state.error);
});

test('other Firebase email actions keep working without accepting arbitrary redirects', async () => {
  const { flow, calls } = setup();
  const state = await flow.open('?mode=verifyEmail&oobCode=verify-code&continueUrl=https://evil.test&apiKey=evil&lang=en');
  assert.equal(state.view, 'fallback');
  const url = new URL(state.url);
  assert.equal(url.origin, 'https://bickers-booking.firebaseapp.com');
  assert.equal(url.pathname, '/__/auth/action');
  assert.equal(url.searchParams.get('oobCode'), 'verify-code');
  assert.equal(url.searchParams.has('continueUrl'), false);
  assert.equal(url.searchParams.get('apiKey'), 'AIzaSyBiKz88kMEAB5C-oRn3qN6E7KooDcmYTWE');
  assert.deepEqual(calls, []);
  assert.equal((await flow.open('?mode=malicious&oobCode=bad')).view, 'invalid');
});
