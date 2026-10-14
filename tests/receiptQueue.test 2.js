import assert from "node:assert/strict";
import test from "node:test";
import { createReceiptQueue, drainReceiptQueue, validateReceiptFields } from "../lib/receipts/queue.js";
import { createReceiptTransport } from "../lib/receipts/transport.js";
import { detectReceiptFileType, receiptAmountInput, receiptAssetType, RECEIPT_FILE_TYPES, signedReceiptPence } from "../lib/receipts/capture.js";

function fixture() {
  const data = new Map(); let sequence = 0;
  const storage = { getItem: async (key) => data.get(key) || null, setItem: async (key, value) => { await Promise.resolve(); data.set(key, value); } };
  const options = { storage, companyId: "company", uid: `user-${Math.random()}`, makeId: () => `id-${++sequence}` };
  return { data, storage, options, queue: createReceiptQueue(options) };
}
const fields = { cardId: "card", supplier: "Shop", purchaseDate: "2026-09-12", currency: "GBP", grossPence: 1200, purpose: "Fuel", jobId: "", missingReceiptReason: "" };
const file = { uri: "file:///documents/receipt.jpg", fileName: "receipt.jpg", fileType: "image/jpeg", fileSize: 42 };
const okDependencies = { command: async (action) => ({ ok: true, result: action === "upload.intent" ? { storagePath: "staging/receipt" } : { receiptId: "id-1" } }), upload: async () => {}, extract: async () => ({ extraction: { supplier: "Suggested shop" } }) };

test("parallel field edits and captures survive serialization and another queue instance", async () => {
  const { queue, options } = fixture(); const row = await queue.create(fields);
  await Promise.all([queue.editFields(row.localId, { supplier: "Changed merchant" }), queue.editFields(row.localId, { purpose: "Changed purpose" }), queue.addFile(row.localId, file), queue.addFile(row.localId, { ...file, fileName: "page-2.jpg" })]);
  const [saved] = await createReceiptQueue(options).list();
  assert.equal(saved.fields.supplier, "Changed merchant"); assert.equal(saved.fields.purpose, "Changed purpose");
  assert.equal(saved.files.length, 2); assert.notEqual(saved.files[0].evidenceId, saved.files[1].evidenceId);
  assert.equal(saved.files[0].uri, file.uri);
});

test("different signed-in accounts never see another account's drafts", async () => {
  const { queue, options } = fixture(); await queue.create(fields);
  assert.deepEqual(await createReceiptQueue({ ...options, uid: "someone-else" }).list(), []);
  assert.deepEqual(await createReceiptQueue({ ...options, companyId: "other-company" }).list(), []);
});

test("corrupt saved state is surfaced without replacing original data", async () => {
  const { queue, data } = fixture(); const key = `receipt-v2:${queue.scope}`; data.set(key, "corrupt-original");
  await assert.rejects(queue.create(fields), /not been cleared/); assert.equal(data.get(key), "corrupt-original");
});

test("lost intent acknowledgement reuses evidence and operation IDs after restart", async () => {
  const { queue, options } = fixture(); const row = await queue.create(fields); await queue.addFile(row.localId, file); await queue.requestUpload(row.localId);
  const calls = []; let lose = true;
  const deps = { ...okDependencies, command: async (action, payload, operationId) => { calls.push({ action, payload, operationId }); if (action === "upload.intent" && lose) { lose = false; throw new Error("Connection lost after server commit"); } return okDependencies.command(action); } };
  await drainReceiptQueue(queue, deps); assert.equal((await queue.list())[0].phase, "uploading");
  const restarted = createReceiptQueue(options); await drainReceiptQueue(restarted, deps);
  const intents = calls.filter((call) => call.action === "upload.intent"); assert.deepEqual(intents[0], intents[1]);
  const [saved] = await restarted.list(); assert.equal(saved.phase, "review"); assert.equal(saved.files[0].finalized, true);
  assert.equal(saved.fields.supplier, "Shop"); assert.equal(saved.suggestions.supplier, "Suggested shop");
  assert.equal(saved.sendOperation, null, "OCR must never confirm or send a receipt");
});

test("lost finalise acknowledgement retries finalise and does not upload the file again", async () => {
  const { queue, options } = fixture(); const row = await queue.create(fields); await queue.addFile(row.localId, file); await queue.requestUpload(row.localId);
  let uploaded = 0; let lose = true; const finalizes = [];
  const deps = { ...okDependencies, upload: async () => { uploaded += 1; }, command: async (action, payload, operationId) => { if (action === "upload.finalize") { finalizes.push(operationId); if (lose) { lose = false; throw new Error("Lost acknowledgement"); } } return okDependencies.command(action); } };
  await drainReceiptQueue(queue, deps); await drainReceiptQueue(createReceiptQueue(options), deps);
  assert.equal(uploaded, 1); assert.equal(finalizes.length, 2); assert.equal(finalizes[0], finalizes[1]);
});

test("a lost submission acknowledgement freezes payload and retries the same operation", async () => {
  const { queue, options } = fixture(); const row = await queue.create({ ...fields, missingReceiptReason: "Receipt was lost" });
  await queue.requestSend(row.localId, { ...fields, missingReceiptReason: "Receipt was lost" });
  let lose = true; const submissions = [];
  const deps = { ...okDependencies, command: async (action, payload, operationId) => { submissions.push({ action, payload, operationId }); if (lose) { lose = false; throw new Error("Timeout after success"); } return { ok: true, result: { receiptId: row.id } }; } };
  await drainReceiptQueue(queue, deps); assert.equal((await queue.list())[0].phase, "sending");
  await assert.rejects(queue.editFields(row.localId, { supplier: "Different" }), /confirmation/);
  const restarted = createReceiptQueue(options); await drainReceiptQueue(restarted, deps);
  assert.deepEqual(submissions[0], submissions[1]); assert.equal((await restarted.list())[0].phase, "sent");
});

test("account change stops all network work and preserves pending receipt", async () => {
  const { queue } = fixture(); const row = await queue.create(fields); await queue.addFile(row.localId, file); await queue.requestUpload(row.localId);
  let network = 0;
  await drainReceiptQueue(queue, { ...okDependencies, assertAccount: () => { throw new Error("Account changed"); }, command: () => { network += 1; } });
  assert.equal(network, 0); const [saved] = await queue.list(); assert.equal(saved.error, "Account changed"); assert.equal(saved.files[0].uri, file.uri);
});

test("two sync triggers share one worker and never submit twice", async () => {
  const { queue } = fixture(); const row = await queue.create(fields); await queue.requestSend(row.localId, fields);
  let calls = 0; const deps = { ...okDependencies, command: async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 10)); return { ok: true, result: {} }; } };
  await Promise.all([drainReceiptQueue(queue, deps), drainReceiptQueue(queue, deps)]); assert.equal(calls, 1);
});

test("invalid amounts/dates and missing evidence cannot be confirmed", () => {
  assert.throws(() => validateReceiptFields(fields, 0), /Attach/);
  assert.throws(() => validateReceiptFields({ ...fields, grossPence: 1.5 }, 1), /amount/);
  assert.throws(() => validateReceiptFields({ ...fields, purchaseDate: "2026-02-30" }, 1), /valid purchase date/);
  assert.throws(() => validateReceiptFields({ ...fields, purchaseDate: "2026-99-30" }, 1), /valid purchase date/);
  assert.equal(validateReceiptFields({ ...fields, missingReceiptReason: "Merchant could not issue a receipt", requestedTransactionId: "request-1" }, 0).requestedTransactionId, "request-1");
});

test("revision conflict refreshes revision while retaining operation ID and exact payload", async () => {
  const calls = []; let revision = 1; let posts = 0;
  const transport = createReceiptTransport({ getBaseUrl: () => "https://render.example", fetchImpl: async (url, options) => {
    if (options.method === "GET") return Response.json({ workspace: { revision: revision++ } });
    calls.push(JSON.parse(options.body)); posts += 1;
    return posts === 1 ? Response.json({ error: "Refresh", code: "revision_conflict" }, { status: 409 }) : Response.json({ ok: true, result: {} });
  } });
  await transport.command({ uid: "user", getIdToken: async () => "token" }, "company", "receipt.submit", fields, "stable-operation");
  assert.equal(calls.length, 2); assert.equal(calls[0].expectedRevision, 1); assert.equal(calls[1].expectedRevision, 2);
  assert.equal(calls[0].operationId, calls[1].operationId); assert.deepEqual(calls[0].payload, calls[1].payload);
});

test("server-rejected form data can be corrected without reusing a rejected operation", async () => {
  const { queue } = fixture(); const row = await queue.create(fields); await queue.requestSend(row.localId, fields);
  const originalOperation = (await queue.list())[0].sendOperation.operationId;
  await drainReceiptQueue(queue, { ...okDependencies, command: async () => { const error = new Error("The purchase date is invalid"); error.operationRejected = true; throw error; } });
  const [saved] = await queue.list(); assert.equal(saved.phase, "review"); assert.equal(saved.sendOperation, null); assert.equal(saved.rejectedOperation.operationId, originalOperation);
  await queue.editFields(row.localId, { purchaseDate: "2026-09-11" }); await queue.requestSend(row.localId, { ...fields, purchaseDate: "2026-09-11" });
  assert.notEqual((await queue.list())[0].sendOperation.operationId, originalOperation);
});

test("a sync requested during another upload drains a newly confirmed receipt afterwards", async () => {
  const { queue } = fixture(); const first = await queue.create(fields); await queue.requestSend(first.localId, fields);
  let release; const blocked = new Promise((resolve) => { release = resolve; }); const sent = [];
  const deps = { ...okDependencies, command: async (_action, payload) => { sent.push(payload.id); if (sent.length === 1) await blocked; return { ok: true, result: {} }; } };
  const running = drainReceiptQueue(queue, deps);
  await new Promise((resolve) => setTimeout(resolve, 5));
  const next = await queue.create(fields); await queue.requestSend(next.localId, fields);
  const trailing = drainReceiptQueue(queue, deps); release(); await Promise.all([running, trailing]);
  assert.deepEqual(sent, [first.id, next.id]); assert.ok((await queue.list()).every((row) => row.phase === "sent"));
});

test("completed create-only uploads recover by finalising before any second upload", async () => {
  const { queue, options } = fixture(); const row = await queue.create(fields); await queue.addFile(row.localId, file); await queue.requestUpload(row.localId);
  let objectExists = false; let uploads = 0;
  const deps = { ...okDependencies, upload: async () => { uploads += 1; assert.equal(objectExists, false); objectExists = true; throw new Error("App stopped after storage committed"); }, command: async (action) => {
    if (action === "upload.finalize" && !objectExists) { const error = new Error("Not uploaded"); error.code = "upload_pending"; throw error; }
    return okDependencies.command(action);
  } };
  await drainReceiptQueue(queue, deps); assert.equal((await queue.list())[0].files[0].uploaded, false);
  await drainReceiptQueue(createReceiptQueue(options), deps);
  assert.equal(uploads, 1); assert.equal((await queue.list())[0].phase, "review"); assert.equal((await queue.list())[0].files[0].finalized, true);
});

test("expired intents renew safely from the retained original before submission starts", async () => {
  const { queue } = fixture(); const row = await queue.create(fields); await queue.addFile(row.localId, file); await queue.requestSend(row.localId, fields);
  const [before] = await queue.list(); const oldId = before.files[0].evidenceId;
  const oldSubmit = before.sendOperation.operationId; const submissions = []; let expired = true;
  const deps = { ...okDependencies, command: async (action, payload, operationId) => {
    if (action === "upload.finalize" && payload.evidenceId === oldId && expired) { expired = false; const error = new Error("Expired"); error.code = "upload_expired"; throw error; }
    if (action === "receipt.submit") submissions.push({ payload, operationId });
    return okDependencies.command(action);
  } };
  await drainReceiptQueue(queue, deps); const [saved] = await queue.list();
  assert.equal(saved.phase, "sent"); assert.equal(saved.files[0].uri, file.uri); assert.notEqual(saved.files[0].evidenceId, oldId);
  assert.equal(saved.files[0].previousUploads[0].evidenceId, oldId); assert.notEqual(submissions[0].operationId, oldSubmit);
  assert.deepEqual(submissions[0].payload.evidenceIds, [saved.files[0].evidenceId]); assert.equal(submissions.length, 1);
});

test("refund toggle uses an absolute keypad amount and keeps the payload negative", async () => {
  assert.equal(signedReceiptPence("12.34", true), -1234);
  assert.equal(signedReceiptPence("12,34", true), -1234);
  assert.equal(signedReceiptPence("12.34", false), 1234);
  assert.deepEqual(receiptAmountInput(-1234), { isRefund: true, text: "12.34" });
  assert.deepEqual(receiptAmountInput(0, true), { isRefund: true, text: "" });
  assert.deepEqual(receiptAmountInput(1234, true), { isRefund: false, text: "12.34" });
  assert.equal(signedReceiptPence("12.345", true), 0);
  const { queue, options } = fixture();
  const refund = { ...fields, grossPence: -1234, requestedTransactionId: "refund-request", missingReceiptReason: "Refund evidence requested" };
  const row = await queue.create(refund); const valid = validateReceiptFields(refund, 0);
  await queue.requestSend(row.localId, valid);
  const [restarted] = await createReceiptQueue(options).list();
  assert.equal(restarted.fields.grossPence, -1234); assert.equal(restarted.sendOperation.payload.grossPence, -1234);
  assert.equal(restarted.sendOperation.payload.requestedTransactionId, "refund-request");
  assert.throws(() => validateReceiptFields({ ...refund, grossPence: 0 }, 0), /non-zero/);
});

test("negative OCR suggestions stay suggestions until a person confirms the refund", async () => {
  const { queue } = fixture(); const row = await queue.create(fields); await queue.addFile(row.localId, file); await queue.requestUpload(row.localId);
  await drainReceiptQueue(queue, { ...okDependencies, extract: async () => ({ extraction: { supplier: "Refund merchant", grossPence: -1234 } }) });
  const [saved] = await queue.list();
  assert.equal(saved.suggestions.grossPence, -1234); assert.equal(saved.fields.grossPence, fields.grossPence); assert.equal(saved.sendOperation, null);
  assert.deepEqual(receiptAmountInput(saved.suggestions.grossPence), { isRefund: true, text: "12.34" });
});

test("unsupported attachments cannot silently enter the upload queue", () => {
  assert.deepEqual(RECEIPT_FILE_TYPES, ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
  assert.throws(() => receiptAssetType({ mimeType: "image/heic", fileName: "photo.heic" }), /HEIC/);
  assert.throws(() => receiptAssetType({ fileName: "photo.heif" }), /Choose a PDF/);
  assert.throws(() => receiptAssetType({ mimeType: "image/svg+xml", fileName: "image.svg" }), /Choose a PDF/);
  assert.equal(receiptAssetType({ mimeType: "image/jpeg", fileName: "photo.jpg" }), "image/jpeg");
  assert.equal(receiptAssetType({ mimeType: "application/octet-stream", fileName: "receipt.pdf" }), "application/pdf");
  const ascii = (text) => Uint8Array.from(text, (character) => character.charCodeAt(0));
  assert.equal(detectReceiptFileType(ascii("%PDF-1.7")), "application/pdf");
  assert.equal(detectReceiptFileType(new Uint8Array([255,216,255,224])), "image/jpeg");
  assert.equal(detectReceiptFileType(new Uint8Array([137,80,78,71,13,10,26,10])), "image/png");
  assert.equal(detectReceiptFileType(ascii("GIF89a")), "image/gif");
  assert.equal(detectReceiptFileType(ascii("RIFFxxxxWEBP")), "image/webp");
  assert.equal(detectReceiptFileType(ascii("xxxxftypheic")), "");
});

test("a file captured as syncing starts is included in the atomic upload snapshot", async () => {
  const { queue } = fixture(); const row = await queue.create(fields);
  await queue.addFile(row.localId, file); await queue.requestUpload(row.localId);
  const running = drainReceiptQueue(queue, okDependencies);
  await queue.addFile(row.localId, { ...file, fileName: "second-page.jpg", uri: "file:///second-page.jpg" });
  await running;
  const [saved] = await queue.list(); assert.equal(saved.files.length, 2); assert.ok(saved.files.every((item) => item.finalized));
  assert.deepEqual(saved.files.map((item) => item.fileName), ["receipt.jpg", "second-page.jpg"]);
});

test("a capture blocked by active uploading retains its original for an explicit retry", async () => {
  const { queue } = fixture(); const row = await queue.create(fields);
  await queue.patch(row.localId, { phase: "uploading" });
  const captured = await queue.addFile(row.localId, file);
  assert.equal(captured.files.length, 0); assert.equal(captured.heldFiles[0].uri, file.uri);
  await assert.rejects(queue.retryHeldFile(row.localId, captured.heldFiles[0].evidenceId), /Wait/);
  assert.equal((await queue.list())[0].heldFiles[0].uri, file.uri);
  await queue.patch(row.localId, { phase: "review" });
  const retried = await queue.retryHeldFile(row.localId, captured.heldFiles[0].evidenceId);
  assert.equal(retried.heldFiles.length, 0); assert.equal(retried.files[0].uri, file.uri);
});

test("explicit OCR retry calls extraction again while keeping manual fields unchanged", async () => {
  const { queue } = fixture(); const row = await queue.create(fields); await queue.addFile(row.localId, file);
  let attempts = 0; const deps = { ...okDependencies, extract: async () => { attempts++; if (attempts === 1) throw new Error("Temporary unavailable"); return { extraction: { supplier: "Recovered suggestion" } }; } };
  await queue.requestUpload(row.localId); await drainReceiptQueue(queue, deps);
  assert.ok((await queue.list())[0].extractionWarning);
  await queue.requestUpload(row.localId); await drainReceiptQueue(queue, deps);
  assert.equal(attempts, 2); assert.equal((await queue.list())[0].suggestions.supplier, "Recovered suggestion"); assert.equal((await queue.list())[0].fields.supplier, fields.supplier);
});

test("UID changes during token retrieval stop the request before fetch", async () => {
  let currentUid = "user-a"; let fetches = 0;
  const transport = createReceiptTransport({ getBaseUrl: () => "https://render.example", assertSession: (user) => { if (user.uid !== currentUid) throw new Error("UID changed"); }, fetchImpl: async () => { fetches++; return Response.json({}); } });
  const user = { uid: "user-a", getIdToken: async () => { currentUid = "user-b"; return "old-token"; } };
  await assert.rejects(transport.workspace(user, "company"), /UID changed/); assert.equal(fetches, 0);
});

test("company changes while GET is pending prevent the following command POST", async () => {
  let activeCompany = "company-a"; const methods = [];
  const transport = createReceiptTransport({ getBaseUrl: () => "https://render.example", fetchImpl: async (_url, options) => { methods.push(options.method); activeCompany = "company-b"; return Response.json({ workspace: { revision: 1 } }); } });
  const user = { uid: "same-user", getIdToken: async () => "token" };
  await assert.rejects(transport.command(user, "company-a", "receipt.submit", fields, "stable-op", { assertAccount: () => { if (activeCompany !== "company-a") throw new Error("Company changed"); } }), /Company changed/);
  assert.deepEqual(methods, ["GET"]);
});

test("a POST reply arriving after account change is uncertain and retains its original operation", async () => {
  const { queue } = fixture(); const row = await queue.create(fields); await queue.requestSend(row.localId, fields); const operationId = (await queue.list())[0].sendOperation.operationId;
  let current = true;
  const transport = createReceiptTransport({ getBaseUrl: () => "https://render.example", fetchImpl: async (_url, options) => {
    if (options.method === "GET") return Response.json({ workspace: { revision: 1 } });
    current = false; return Response.json({ ok: true, result: { receiptId: row.id } });
  } });
  await drainReceiptQueue(queue, { ...okDependencies, command: (action, payload, id) => transport.command({ uid: queue.uid, getIdToken: async () => "token" }, queue.companyId, action, payload, id, { assertAccount: () => { if (!current) throw new Error("Account changed"); } }) });
  const [saved] = await queue.list(); assert.equal(saved.phase, "sending"); assert.equal(saved.sendOperation.operationId, operationId); assert.equal(saved.acknowledgedAt, undefined);
});
