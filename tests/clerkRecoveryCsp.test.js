import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../firebase.auth-page.json', import.meta.url), 'utf8'));
const header = config.hosting.headers.find(rule => rule.source === '**').headers.find(item => item.key === 'Content-Security-Policy').value;
const directives = new Map(header.split(';').filter(value => value.trim()).map(value => {
  const [name, ...sources] = value.trim().split(/\s+/);
  return [name, new Set(sources)];
}));

test('recovery permits the Clerk Protect bootstrap and worker required before sign-in requests', () => {
  assert.ok(directives.get('script-src').has('https://cdn.protect.clerk.com'), 'Clerk Protect bootstrap must load');
  assert.ok(directives.get('worker-src')?.has("'self'"), 'first-party worker must load');
  assert.ok(directives.get('worker-src')?.has('blob:'), 'bundled SDK worker must load');
  assert.ok(directives.get('connect-src').has('https://*.protect.clerk.com:*'), 'Protect checks use documented non-default ports');
  assert.ok(directives.get('frame-src')?.has('https://*.protect.clerk.com'), 'Protect challenge must load');
});

test('recovery keeps untrusted scripts, framing, forms and recovery destinations restricted', () => {
  for (const [name, sources] of directives) {
    assert.ok(!sources.has('*'), `${name} must not permit every origin`);
    assert.ok(!sources.has('https:'), `${name} must not permit every HTTPS origin`);
    assert.ok(!sources.has("'unsafe-eval'"), `${name} must not evaluate arbitrary code`);
  }
  assert.deepEqual([...directives.get('default-src')], ["'self'"]);
  assert.deepEqual([...directives.get('frame-ancestors')], ["'none'"]);
  assert.deepEqual([...directives.get('form-action')], ["'self'"]);
  assert.deepEqual([...directives.get('object-src')], ["'none'"]);
  assert.ok(!directives.get('script-src').has("'unsafe-inline'"));
  assert.ok(directives.get('connect-src').has('https://pilot.bickers.co.uk'));
  assert.ok(directives.get('connect-src').has('https://booking.bickers.co.uk'));
});
