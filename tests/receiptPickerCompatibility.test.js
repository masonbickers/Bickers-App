import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { pickReceiptDocuments } from '../lib/receipts/documentPicker.js';

test('receipt routes do not eagerly load the native file picker in older OTA runtimes', () => {
  const source = readFileSync(new URL('../app/(protected)/receipts.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import\s+\*\s+as\s+DocumentPicker\s+from/);
});
test('missing native file picker leaves photo attachment available with an actionable error', async () => {
  await assert.rejects(pickReceiptDocuments({}, async () => {
    throw new Error("Cannot find native module 'ExpoDocumentPicker'");
  }), /attach a photo instead/);
});
test('available native picker receives the original options and returns its result', async () => {
  const options = { multiple: true };
  const result = { canceled: true };
  assert.equal(await pickReceiptDocuments(options, async () => ({
    getDocumentAsync: async (received) => { assert.equal(received, options); return result; },
  })), result);
});
