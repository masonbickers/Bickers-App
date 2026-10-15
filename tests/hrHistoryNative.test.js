import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createPrivateHistoryClient } from '../lib/privateHistoryClient.js';

const require = createRequire(import.meta.url);
// These are the same implementations installed by React Native's setUpXHR.
const { AbortController, AbortSignal } = require('abort-controller');
const identity = { uid: 'crew', companyId: 'company', employeeId: 'employee' };
const row = { id: 'leave', ownerUid: 'crew', companyId: 'company', employeeId: 'employee' };

async function harness(fetchImpl) {
  const timers = new Map();
  const context = vm.createContext({
    AbortController, AbortSignal, fetch: fetchImpl,
    setTimeout: (callback, delay) => { const id = {}; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const source = await readFile(new URL('../lib/hrHistoryApi.js', import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(source, { context });
  const imports = {
    '../firebaseConfig': { auth: { currentUser: { uid: identity.uid } } },
    './api': { getApiBaseUrl: () => 'https://pilot-api.example.test' },
    './sync/identity': { getSyncEmployeeIdentity: () => identity },
    './privateHistoryClient': { createPrivateHistoryClient },
  };
  await module.link(name => new vm.SyntheticModule(Object.keys(imports[name]), function () {
    for (const [key, value] of Object.entries(imports[name])) this.setExport(key, value);
  }, { context }));
  await module.evaluate();
  return { history: () => module.namespace.fetchEmployeeHistory({ getIdToken: async () => 'fixture-token' }, identity, 'holidays'), timers };
}

test('native history reaches the fixed service with React Native abort support and clears its deadline after parsing', async () => {
  let request;
  const h = await harness(async (url, init) => {
    request = { url, init };
    return { ok: true, json: async () => ({ records: [row], withheldCount: 0, historyComplete: true }) };
  });
  const result = await h.history();
  assert.equal(result.records[0].id, 'leave');
  assert.equal(request.url, 'https://pilot-api.example.test/hr/history?collection=holidays');
  assert.equal(request.init.headers.Authorization, 'Bearer fixture-token');
  assert.equal(request.init.signal.aborted, false);
  assert.equal(h.timers.size, 0);
});

test('native history aborts a stalled request at the existing 45-second deadline', async () => {
  let signal;
  const h = await harness((_url, init) => new Promise((_resolve, reject) => {
    signal = init.signal;
    signal.addEventListener('abort', () => reject(new Error('history-deadline')));
  }));
  const outcome = h.history().then(value => ({ value }), error => ({ error }));
  for (let i = 0; i < 10 && !signal; i++) await Promise.resolve();
  if (!signal) assert.fail(`Native history never reached fetch: ${(await outcome).error?.message}`);
  assert.equal(h.timers.size, 1);
  const [deadline] = h.timers.values();
  assert.equal(deadline.delay, 45000);
  deadline.callback();
  assert.match((await outcome).error?.message || '', /history-deadline/);
  assert.equal(signal.aborted, true);
  assert.equal(h.timers.size, 0);
});

test('native history releases its timer on HTTP denial or malformed response without falling back to public reads', async () => {
  for (const response of [
    { ok: false, status: 403, json: async () => ({ error: 'Access denied' }) },
    { ok: true, json: async () => { throw new Error('Invalid JSON'); } },
  ]) {
    let calls = 0;
    const h = await harness(async () => { calls++; return response; });
    await assert.rejects(h.history(), /Access denied|Invalid JSON/);
    assert.equal(calls, 1);
    assert.equal(h.timers.size, 0);
  }
});
