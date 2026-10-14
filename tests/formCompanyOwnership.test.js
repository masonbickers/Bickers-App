import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('recce writes carry the authenticated company on both top-level documents', () => {
  const source = readFileSync(new URL('../app/(protected)/recce-form.js', import.meta.url), 'utf8');
  assert.match(source, /const companyId = employee\?\.companyId/);
  assert.match(source, /\{ companyId, recceForms: \{ \[dateISO\]: payload \} \}/);
  assert.match(source, /doc\(db, "recces", recceDocId\),\s*\{\s*companyId,/);
  assert.match(source, /if \(!companyId\) throw new Error/);
});

test('vehicle-check draft, submission and original-draft transition carry authenticated company', () => {
  const source = readFileSync(new URL('../app/(protected)/vehicle-check.js', import.meta.url), 'utf8');
  assert.match(source, /const companyId = employee\?\.companyId/);
  assert.match(source, /const payload = \{\s*companyId,/);
  assert.match(source, /checkDocId\), \{ companyId, status: "submitted-copy"/);
  assert.match(source, /if \(!companyId\) throw new Error/);
});
