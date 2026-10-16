const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { deviceHubConfig } = require('../scripts/start-device-hub.cjs');
test('Device Hub always serves the owning project with the installed Clerk pilot environment', () => {
  const config = deviceHubConfig({ EXPO_PUBLIC_API_URL: 'http://wrong-project', EXPO_PUBLIC_CLERK_SHARED_AUTH_ENABLED: '0' });
  assert.equal(config.cwd, path.resolve(path.dirname(module.filename), '..'));
  assert.equal(config.env.EXPO_PUBLIC_CLERK_SHARED_AUTH_ENABLED, '1');
  assert.equal(config.env.EXPO_PUBLIC_API_URL, 'https://bickers-clerk-pilot-api.onrender.com');
  assert.equal(config.env.EXPO_NO_DOTENV, '1');
  assert.deepEqual(config.args.slice(1), ['start', '--localhost', '--port', '8081']);
});
