import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshopSubmissionTransport } from '../lib/workshopSubmissionTransport.js';
test('transport sends one stable authenticated submission and preserves server validation errors', async () => {
  let sent;
  const send = createWorkshopSubmissionTransport({ getBaseUrl: () => 'https://api.test', getToken: async () => 'token', fetchImpl: async (url, init) => { sent = { url, init }; return { ok: true, json: async () => ({ recordId: 'one', replayed: true }) }; } });
  const payload = { recordId: 'one', record: { companyId: 'a' } };
  assert.equal((await send(payload)).replayed, true);
  assert.equal(sent.url, 'https://api.test/workshop/submissions');
  assert.equal(sent.init.headers.Authorization, 'Bearer token'); assert.deepEqual(JSON.parse(sent.init.body), payload);
  const denied = createWorkshopSubmissionTransport({ getBaseUrl: () => 'https://api.test', getToken: async () => 'token', fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ error: 'Service workspace access is required.' }) }) });
  await assert.rejects(denied(payload), error => error.message.includes('workspace') && error.code === 'permission-denied');
});
test('temporary server failures remain retryable, and missing authentication cannot send', async () => {
  const send = createWorkshopSubmissionTransport({ getBaseUrl: () => 'https://api.test', getToken: async () => 'token', fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
  await assert.rejects(send({ recordId: 'one' }), error => error.code === 'unavailable');
  const unauth = createWorkshopSubmissionTransport({ getBaseUrl: () => 'https://api.test', getToken: async () => null, fetchImpl: () => { throw Error('must not send'); } });
  await assert.rejects(unauth({}), /sign in/i);
});
