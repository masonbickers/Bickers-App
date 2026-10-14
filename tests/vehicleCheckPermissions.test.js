import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("both workspaces can save and submit vehicle checks while deletion stays Service-only", () => {
  const source = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const rules = source.slice(source.indexOf("match /vehicleChecks/{docId}"), source.indexOf("match /defects/{docId}"));
  assert.match(rules, /allow read: if canReadAnyWorkspaceTenantDoc\(\)/);
  assert.match(rules, /allow create: if canCreateAnyWorkspaceTenantDoc\(\)/);
  assert.match(rules, /allow update: if canUpdateAnyWorkspaceTenantDoc\(\)/);
  assert.match(rules, /allow delete: if canDeleteServiceTenantDoc\(\)/);
  assert.match(rules, /request\.resource\.data\.keys\(\)\.hasAll\(\["submittedAt", "submissionSnapshot"\]\)/);
  assert.match(rules, /request\.resource\.data\.submissionSnapshot == resource\.data\.submissionSnapshot/);
  assert.match(rules, /request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\["items", "updatedAt"\]\)/);
});
