const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(path.dirname(module.filename), '..');

// Match the already-installed Clerk pilot binary. No dotenv or server secrets.
function deviceHubConfig(environment = process.env) {
  const profile = require('../eas.json').build['clerk-pilot'];
  return {
    cwd: root,
    env: { ...environment, ...profile.env, EXPO_NO_DOTENV: '1' },
    args: [path.join(root, 'node_modules/expo/bin/cli'), 'start', '--localhost', '--port', '8081'],
  };
}
if (require.main === module) {
  const { args, ...options } = deviceHubConfig();
  console.log(`Device Hub live source: ${root}`);
  const child = spawn(process.execPath, args, { ...options, stdio: 'inherit' });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
}
module.exports = { deviceHubConfig };
