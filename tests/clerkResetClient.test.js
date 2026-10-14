import test from 'node:test';
import assert from 'node:assert/strict';
import { createClerkResetClient, confirmClerkRecovery } from '../firebase/auth-page/clerk-client.mjs';

function fixture() {
  const calls = []; const signIn = { id: 'attempt', status: 'needs_first_factor', firstFactorVerification: { status: 'unverified', strategy: 'reset_password_email_code' },
    create: async params => { calls.push(params); return signIn; },
    attemptFirstFactor: async params => { calls.push(params); signIn.status = 'needs_new_password'; signIn.firstFactorVerification.status = 'verified'; return signIn; },
    resetPassword: async params => { calls.push(params); signIn.status = 'complete'; signIn.createdSessionId = 'recovered'; return signIn; },
    prepareSecondFactor: async params => { calls.push(params); }, attemptSecondFactor: async params => { calls.push(params); signIn.status = 'complete'; signIn.createdSessionId = 'recovered'; return signIn; },
  };
  const clerk = { client: { signIn }, session: { id: 'ordinary', getToken: async () => 'wrong' },
    setActive: async options => { calls.push(options.session); clerk.session = { id: options.session, getToken: async () => 'proof' }; await options.navigate({ session: clerk.session }); },
  };
  return { clerk, signIn, calls, client: createClerkResetClient({ loadClerk: async () => clerk }) };
}
test('SDK adapter uses supported email recovery APIs and activates only the recovered session', async () => {
  const h = fixture(); assert.equal(await h.client.resume(), null);
  await h.client.requestReset('staff@bickers.co.uk');
  assert.deepEqual(await h.client.verifyResetCode('fixture'), { stage: 'password', resetVerified: true });
  assert.deepEqual(await h.client.resetPassword('synthetic-password'), { stage: 'complete', resetVerified: true, passwordSaved: true });
  assert.equal(await h.client.activate(), 'proof');
  assert.deepEqual(h.calls.slice(0, 3), [{ strategy: 'reset_password_email_code', identifier: 'staff@bickers.co.uk' }, { strategy: 'reset_password_email_code', code: 'fixture' }, { password: 'synthetic-password', signOutOfOtherSessions: true }]);
  assert.equal(h.calls[3], 'recovered');
});
test('ordinary signed-in sessions and unverified attempts cannot prove password recovery', async () => {
  const h = fixture(); h.signIn.status = 'complete'; h.signIn.createdSessionId = 'ordinary';
  assert.equal(await h.client.resume(), null); await assert.rejects(h.client.activate());
  await assert.rejects(h.client.resetPassword('synthetic-password')); assert.deepEqual(h.calls, []);
});
test('a provider-backed reset can resume but unknown challenges cannot complete', async () => {
  const h = fixture(); h.signIn.status = 'needs_new_password'; h.signIn.firstFactorVerification.status = 'verified';
  assert.equal((await h.client.resume()).stage, 'password');
  h.signIn.status = 'needs_second_factor'; h.signIn.supportedSecondFactors = [{ strategy: 'phone_code', phoneNumberId: 'phone' }, { strategy: 'totp' }];
  assert.deepEqual((await h.client.resume()).factors, ['phone_code', 'totp']);
  await h.client.prepareFactor('phone_code'); assert.deepEqual(h.calls[0], { strategy: 'phone_code', phoneNumberId: 'phone' });
  await assert.rejects(h.client.prepareFactor('email_link'));
  await h.client.verifyFactor('totp', 'fixture'); assert.equal(await h.client.activate(), 'proof');
});
test('pending tasks and changed active sessions cannot return a recovery token', async () => {
  for (const pending of [true, false]) {
    const h = fixture(); await h.client.verifyResetCode('fixture'); await h.client.resetPassword('synthetic-password');
    h.clerk.setActive = async options => { h.clerk.session = { id: pending ? 'recovered' : 'different', currentTask: pending ? { key: 'required' } : null, getToken: async () => 'must-not-return' }; await options.navigate({ session: h.clerk.session }); };
    await assert.rejects(h.client.activate());
  }
});
test('recovery confirmation sends only a bearer token to the fixed endpoint, never browser credentials or password', async () => {
  let received;
  const fetchImpl = async (...args) => { received = args; return { ok: true, json: async () => ({ completed: true }) }; };
  assert.deepEqual(await confirmClerkRecovery('proof', fetchImpl), { completed: true });
  assert.equal(received[0], 'https://booking.bickers.co.uk/api/security/clerk-recovery');
  assert.equal(received[1].credentials, 'omit'); assert.equal(received[1].headers.Authorization, 'Bearer proof'); assert.equal(received[1].body, undefined);
  await assert.rejects(confirmClerkRecovery('proof', async () => ({ ok: false })));
});
