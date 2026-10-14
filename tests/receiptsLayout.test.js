import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("../app/(protected)/receipts.js", import.meta.url), "utf8");
const native = readFileSync(new URL("../lib/receipts/native.js", import.meta.url), "utf8");
test("staff receipts use individual delivery states and the shared shell", () => {
  for (const text of ["Company-card receipts", "To send", "Sent", "Needs action", "Confirm details and send", "Keep on device for later"]) assert.ok(source.includes(text));
  assert.match(source, /<PageShell/); assert.doesNotMatch(source, /Submit statement|Declare no receipts|VAT claimed|receiptGroups/);
});
test("receipts never directly mutate Firestore or delete retained originals", () => {
  assert.doesNotMatch(source, /firebase\/firestore|deleteObject|deleteDoc|writeBatch|updateDoc/);
  assert.doesNotMatch(native, /deleteAsync|deleteObject|manipulateAsync/);
  assert.match(native, /FileSystem\.copyAsync/); assert.match(native, /FileSystem\.documentDirectory/);
});
test("capture supports multiple original photos and PDF pages with explicit suggestion review", () => {
  assert.match(source, /allowsMultipleSelection: true/); assert.match(source, /multiple: true/);
  assert.match(source, /type: \[\.\.\.RECEIPT_FILE_TYPES\]/); assert.match(source, /Use suggestions, then review/);
  assert.match(source, /MAX_FILE_BYTES/); assert.match(source, /DateField/); assert.match(source, /bookingJobs/);
  assert.match(source, /missingReceiptReason/); assert.match(source, /requestedTransactionId/);
});

test("retained PDFs open from device storage without the HTTP-only document route", () => {
  assert.match(source, /receiptAndroidContentUri/);
  assert.match(source, /allowingReadAccessToURL=\{preview\.uri\}/);
  assert.match(source, /javaScriptEnabled=\{false\}/);
  assert.doesNotMatch(source, /pathname: "\/document-viewer"/);
});

test("refunds and compatible image selection are explicit in the capture form", () => {
  assert.match(source, /label: "Purchase"/);
  assert.match(source, /label: "Refund"/);
  assert.match(source, /signedReceiptPence\(value, form\.isRefund\)/);
  assert.match(source, /suggestion\.grossPence !== 0/);
  assert.match(source, /UIImagePickerPreferredAssetRepresentationMode\.Compatible/);
  assert.doesNotMatch(source, /"image\/\*"/);
  assert.match(native, /receiptAssetType\(asset\)/);
  assert.match(native, /detectReceiptFileType\(header\) !== type/);
});

test("account changes clear previews and every asynchronous receipt entry point guards its scope", () => {
  assert.match(source, /setEditorOpen\(false\); setPreview\(null\); setForm\(blankFields\(\)\)/);
  assert.match(source, /getReceiptWorkspace\(user, queue\.companyId, \{ assertAccount: assertCurrentScope \}\)/);
  assert.match(source, /fileType, assertCurrentScope\)/);
  assert.match(source, /Attach saved file/);
  assert.match(native, /operationId, \{ assertAccount: guard, assertWorkspace:/);
  assert.match(native, /await user\.getIdToken\(\);\n  guard\(\)/);
});
