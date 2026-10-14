const { createRequire } = require('node:module');
const path = require('node:path');
for (const key of ['FIRESTORE_EMULATOR_HOST','FIREBASE_STORAGE_EMULATOR_HOST']) {
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[key] || '')) {
    throw new Error(`Local loopback emulator required: ${key}`);
  }
}
// Reuse an installed test runtime without installing or pinning a sibling path.
const load = process.env.FIREBASE_RULES_TEST_DEPENDENCIES
  ? createRequire(path.resolve(process.env.FIREBASE_RULES_TEST_DEPENDENCIES, 'package.json'))
  : require;
module.exports = {
  ...load('@firebase/rules-unit-testing'),
  firestore: load('firebase/firestore'),
  storage: load('firebase/storage'),
};
