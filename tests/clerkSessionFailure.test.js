import assert from 'node:assert/strict';
import test from 'node:test';
import { describeClerkSessionFailure, withClerkAuthPhase } from '../lib/clerkSessionFailure.js';

test('pilot failure references identify only the failed stage and safe error class', () => {
  assert.match(describeClerkSessionFailure({ name: 'AbortError' }, { phase: 'bridge', diagnostic: true }), /A2-TIMEOUT/);
  assert.match(describeClerkSessionFailure({ code: 'auth/network-request-failed' }, { phase: 'employee-sync', diagnostic: true }), /A4-NETWORK/);
  assert.match(describeClerkSessionFailure({ status: 503 }, { phase: 'clerk-token', diagnostic: true }), /A1-503/);
});
test('provider messages and unknown stages never expose account internals', () => {
  const message = describeClerkSessionFailure({ message: 'SECRET_TOKEN_uid', clerkAuthPhase: 'SECRET_TOKEN_uid' }, { phase: 'SECRET_TOKEN_uid', diagnostic: true });
  assert.doesNotMatch(message, /SECRET|uid/);
  assert.match(message, /A0-UNKNOWN/);
});
test('ordinary builds omit diagnostic references', () => {
  assert.doesNotMatch(describeClerkSessionFailure({ status: 503 }, { phase: 'bridge' }), /Reference|A2/);
});
test('authorization denial remains distinct from temporary service failures', () => {
  assert.match(describeClerkSessionFailure({ status: 403 }), /not approved/);
  assert.match(describeClerkSessionFailure({ status: 401 }), /expired/);
});
test('phase wrappers preserve denial status without carrying private messages', async () => {
  await assert.rejects(withClerkAuthPhase('employee-sync', async () => { throw Object.assign(new Error('private payload'), { status: 403 }); }), error => {
    assert.equal(error.status, 403);
    assert.equal(error.clerkAuthPhase, 'employee-sync');
    assert.doesNotMatch(error.message, /private/);
    return true;
  });
});
