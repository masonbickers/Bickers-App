import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyIdentitySession, isTrustedClerkIdentity, identityAuthMetadata } from '../lib/identitySession.js';
const profile = { uid: 'staff', companyId: 'company', employeeId: 'employee', isEnabled: true, clerkUserId: 'clerk', auth: { clerkUserId: 'clerk' } };
const token = { uid: 'staff', auth_time: 100, firebase: { sign_in_provider: 'custom' }, authMethod: 'clerk', verifiedClerkEmail: true, identityLinkVersion: 2, clerkUserId: 'clerk', clerkSessionId: 'session', identityCompanyId: 'company', identityEmployeeId: 'employee' };
test('verified claims retain the canonical Clerk identity', () => {
  assert.equal(isTrustedClerkIdentity(token, profile), true);
  assert.equal(classifyIdentitySession(token, profile), 'clerk');
});
test('both stored links, session proof and company/employee must agree', () => {
  for (const patch of [{ auth: { clerkUserId: 'other' } }, { clerkUserId: 'other' }, { clerkUserId: false }, { clerkUserId: 0 }, { uid: 'other' }, { companyId: 'other' }, { employeeId: 'other' }]) {
    assert.equal(isTrustedClerkIdentity(token, { ...profile, ...patch }), false);
  }
  assert.equal(isTrustedClerkIdentity(token, { ...profile, clerkUserId: null, auth: { clerkUserId: null } }), true);
  for (const patch of [{ clerkSessionId: '' }, { clerkUserId: '' }, { identityLinkVersion: 1 }, { verifiedClerkEmail: false }, { authMethod: 'other' }]) {
    assert.equal(classifyIdentitySession({ ...token, ...patch }, profile), 'denied');
  }
});
test('global disable, recovery and malformed cutoffs deny both providers', () => {
  const password = { ...token, firebase: { sign_in_provider: 'password' } };
  for (const patch of [{ isEnabled: false }, { active: false }, { passwordResetRequired: true }, { sessionValidAfter: 100 }, { sessionValidAfter: NaN }, { sessionValidAfter: Infinity }, { sessionValidAfter: '1' }, { sessionValidAfter: 1700000000000 }, { sessionsRevokedAt: '2026-01-01' }]) {
    for (const proof of [token, password]) assert.equal(classifyIdentitySession(proof, { ...profile, ...patch }), 'denied');
  }
});
test('legacy password restrictions stay separate and retirement is enforced', () => {
  const password = { ...token, firebase: { sign_in_provider: 'password' } };
  assert.equal(classifyIdentitySession(password, profile), 'firebase-password');
  for (const patch of [{ appPasswordSetupRequired: true }, { appPasswordSessionAfter: 100 }, { firebasePasswordResetAfter: 99 }, { authMigrationState: 'clerk-only' }]) {
    assert.equal(classifyIdentitySession(password, { ...profile, ...patch }), 'denied');
    assert.equal(classifyIdentitySession(token, { ...profile, ...patch }), 'clerk');
  }
  assert.equal(classifyIdentitySession(token, { ...profile, clerkPasswordResetAfter: 99 }), 'denied');
});
test('Clerk sync never invents a configured Firebase password', () => {
  assert.deepEqual(identityAuthMetadata(token, { passwordEnabled: false }), { passwordEnabled: false, lastAuthMethod: 'clerk' });
  assert.deepEqual(identityAuthMetadata(token, {}), { lastAuthMethod: 'clerk' });
  assert.deepEqual(identityAuthMetadata({ ...token, firebase: { sign_in_provider: 'password' } }, {}), { passwordEnabled: true, lastAuthMethod: 'firebase-password' });
});
