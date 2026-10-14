import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeErrorEvent } from '../lib/errorMonitoringPrivacy.js';

test('error reports discard employee and request data while retaining diagnostic frames', () => {
  const event = {
    event_id: 'test-event', platform: 'javascript', release: 'bickers@1.0.0',
    user: { email: 'employee@example.com', id: 'employee-id' },
    request: { url: 'https://example.com?token=private', data: 'private-body' },
    breadcrumbs: [{ message: 'private-message' }], extra: { password: 'private-password' },
    tags: { employee: 'private-name' }, contexts: { employee: { name: 'private-name' }, os: { name: 'iOS', version: '18', other: 'private-context' } },
    message: 'private-message', transaction: 'employee/path',
    debug_meta: { images: [{ type: 'sourcemap', debug_id: 'map-id', code_file: 'app:///index.bundle?token=private', other: 'private' }] },
    exception: { values: [{ type: 'TypeError', value: 'employee@example.com private-message', stacktrace: { frames: [{ filename: 'app:///index.bundle?token=private', function: 'loadData', lineno: 12, vars: { password: 'private-password' } }] } }] },
  };
  const clean = sanitizeErrorEvent(event);
  assert.equal(clean.release, 'bickers@1.0.0');
  assert.equal(clean.exception.values[0].type, 'TypeError');
  assert.equal(clean.exception.values[0].stacktrace.frames[0].lineno, 12);
  assert.equal(clean.exception.values[0].stacktrace.frames[0].filename, 'app:///index.bundle');
  assert.deepEqual(clean.debug_meta.images[0], { type: 'sourcemap', debug_id: 'map-id', code_file: 'app:///index.bundle' });
  assert.deepEqual(clean.contexts.os, { name: 'iOS', version: '18' });
  for (const field of ['user', 'request', 'breadcrumbs', 'extra', 'tags', 'message', 'transaction']) assert.equal(clean[field], undefined);
  assert.ok(!JSON.stringify(clean).includes('private'));
  assert.equal(event.user.email, 'employee@example.com');
});

test('empty or native error reports are safely filtered', () => {
  assert.deepEqual(sanitizeErrorEvent({}), {});
  const clean = sanitizeErrorEvent({ exception: { values: [{ type: 'SIGABRT', value: 'private', mechanism: { type: 'signal', handled: false, data: 'private' } }] }, contexts: { device: { model: 'iPhone', id: 'private' } } });
  assert.equal(clean.exception.values[0].mechanism.handled, false);
  assert.deepEqual(clean.contexts.device, { model: 'iPhone' });
  assert.ok(!JSON.stringify(clean).includes('private'));
});
