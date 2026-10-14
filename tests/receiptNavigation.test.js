import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { actionableReceiptRequest, correctionNeedsReview, getReceiptNotificationHref, ownsReceipt, receiptAttachments, receiptFinanceUrl, receiptNotificationIdentity, receiptNotificationVisible, resolveReceiptNavigation } from "../lib/receipts/navigation.js";
import { cachedReceiptWorkspace, createReceiptWorkspaceCache } from "../lib/receipts/workspaceCache.js";
import { startReceiptSyncSession } from "../lib/receipts/syncSession.js";
import { RECEIPT_FILE_EXTENSIONS } from "../lib/receipts/capture.js";

const actor = { uid: "user", personId: "person", companyId: "company", finance: false };
const receipt = { id: "receipt", ownerPersonId: "person", ownerUid: "user", version: 2, reviewState: "needs_action", evidenceIds: ["current"], versions: [{ version: 1, evidenceIds: ["original"], supplier: "Original merchant" }, { version: 2, evidenceIds: ["current"] }] };
const transaction = { id: "transaction", cardId: "card", amountPence: 1000, accountingState: "unrecorded", request: { personId: "person", note: "Please attach original" } };
const response = { actor, bookingJobs: [{ id: "booking", name: "Assigned job" }], workspace: { companyId: "company", revision: 3, receipts: { receipt }, transactions: { transaction }, evidence: { original: { id: "original", ownerPersonId: "person" }, current: { id: "current", ownerPersonId: "person" }, foreign: { id: "foreign", ownerPersonId: "other" } }, cards: { card: { id: "card", label: "Known card", last4: "1234", sageCardAccount: "SECRET", assignments: [{ personId: "person" }, { personId: "other" }] } }, settings: { sageCompany: "Private finance configuration" }, batches: { batch: { frozenCsv: "Private finance export" } } } };
const notification = { type: "receipt_request", companyId: "company", recipientUid: "user", recipientPersonId: "person", notificationId: "event", receiptId: "receipt", deepLink: "/(protected)/receipts?receiptId=receipt" };

test("receipt and missing-transaction notifications select correction, response or immutable version", () => {
  assert.equal(resolveReceiptNavigation({ receiptId: "receipt" }, response).receipt.reviewState, "needs_action");
  assert.equal(resolveReceiptNavigation({ transactionId: "transaction" }, response).kind, "request");
  const draft = { id: "local", localId: "draft", phase: "draft", fields: { requestedTransactionId: "transaction" } };
  assert.equal(resolveReceiptNavigation({ transactionId: "transaction" }, response, [draft]).draft.localId, "draft");
  const answered = structuredClone(response); answered.workspace.transactions.transaction.responseReceiptId = "receipt"; answered.workspace.transactions.transaction.request.respondedAt = "now";
  assert.equal(resolveReceiptNavigation({ transactionId: "transaction" }, answered).receipt.id, "receipt");
  const version = resolveReceiptNavigation({ receiptId: "receipt", receiptVersion: "1" }, response).receipt;
  assert.equal(version.historicalVersion, true); assert.equal(version.reviewState, "version"); assert.deepEqual(version.evidenceIds, ["original"]);
  assert.equal(resolveReceiptNavigation({ receiptId: "receipt", receiptVersion: "99" }, response).kind, "unavailable");
  assert.equal(resolveReceiptNavigation({ companyId: "other", receiptId: "receipt" }, response).kind, "unavailable");
});
test("answered and matched requests are not duplicated in Needs action", () => {
  assert.equal(actionableReceiptRequest(transaction, "person"), true);
  for (const changed of [{ receiptId: "receipt" }, { responseReceiptId: "receipt" }, { request: { ...transaction.request, respondedAt: "now" } }, { request: { ...transaction.request, resolvedAt: "now" } }, { accountingState: "manual_recorded" }]) assert.equal(actionableReceiptRequest({ ...transaction, ...changed }, "person"), false);
  assert.equal(actionableReceiptRequest(transaction, "other"), false);
});
test("canonical person takes precedence over a reused login UID", () => {
  assert.equal(ownsReceipt(receipt, actor), true);
  assert.equal(ownsReceipt({ ...receipt, ownerPersonId: "previous_employee" }, actor), false);
  const moved = structuredClone(response); moved.workspace.receipts.receipt.ownerPersonId = "previous_employee";
  assert.equal(resolveReceiptNavigation({ receiptId: "receipt" }, moved).kind, "unavailable");
});
test("a correction is actionable only for its exact current receipt version and finance request", () => {
  const current = { ...receipt, request: { id: "query_v2", createdAt: "time_v2" } };
  const draft = { action: "receipt.correct", fields: { expectedReceiptVersion: 2, expectedRequestId: "query_v2" } };
  assert.equal(correctionNeedsReview(draft, current), false);
  assert.equal(correctionNeedsReview(draft, { ...current, version: 3 }), true);
  assert.equal(correctionNeedsReview(draft, { ...current, request: { id: "new_query" } }), true);
  assert.equal(correctionNeedsReview({ ...draft, fields: {} }, current), true);
  assert.equal(correctionNeedsReview(draft, { ...current, reviewState: "submitted" }), true);
  assert.equal(correctionNeedsReview({ ...draft, fields: { expectedReceiptVersion: 2, expectedRequestId: "time_v2" } }, { ...current, request: { createdAt: "time_v2" } }), false);
});
test("receipt inbox and push routing are restricted to the current company and recipient", () => {
  assert.equal(receiptNotificationVisible(notification, actor), true);
  for (const account of [{ ...actor, uid: "other" }, { ...actor, personId: "other" }, { ...actor, companyId: "other" }, {}]) {
    assert.equal(receiptNotificationVisible(notification, account), false); assert.equal(getReceiptNotificationHref(notification, account), null);
  }
  assert.equal(receiptNotificationVisible({ ...notification, recipientUid: "", recipientPersonId: "" }, actor), false);
  assert.equal(receiptNotificationVisible({ bookingId: "unrelated" }, {}), true);
  assert.deepEqual(getReceiptNotificationHref(notification, actor), { pathname: "/(protected)/receipts", params: { receiptId: "receipt", companyId: "company", notificationId: "event" } });
  const finance = getReceiptNotificationHref({ ...notification, deepLink: "/(protected)/receipts?workspace=finance&receiptId=receipt" }, actor);
  assert.equal(finance.params.workspace, "finance");
  assert.equal(receiptFinanceUrl(finance.params, "https://booking.example/privacy-policy"), "https://booking.example/receipts?companyId=company&receiptId=receipt&workspace=finance");
  assert.throws(() => receiptFinanceUrl(finance.params, "javascript:bad"));
  for (const origin of ["http://localhost:3000", "https://localhost:3000", "https://[::1]", "https://127.0.0.1", "https://user:secret@booking.example"]) {
    assert.throws(() => receiptFinanceUrl(finance.params, origin));
  }
});
test("same-text alerts for separate receipts or reminder events keep separate inbox identities", () => {
  const first = receiptNotificationIdentity(notification);
  assert.notDeepEqual(first, receiptNotificationIdentity({ ...notification, receiptId: "another_receipt" }));
  assert.notDeepEqual(first, receiptNotificationIdentity({ ...notification, notificationId: "day_three_reminder" }));
  assert.deepEqual(first, receiptNotificationIdentity({ ...notification }, "another_push_transport_id"));
});
test("sent multi-page receipts use retained local originals, including historical versions", () => {
  const localRows = [{ id: "receipt", phase: "sent", files: [{ evidenceId: "original", uri: "file:///original.pdf", fileName: "original.pdf", fileType: "application/pdf" }, { evidenceId: "current", uri: "file:///current.png", fileName: "current.png", fileType: "image/png" }] }];
  const latest = receiptAttachments(null, receipt, response.workspace.evidence, localRows);
  assert.equal(latest[0].uri, "file:///current.png");
  const both = receiptAttachments(null, { ...receipt, evidenceIds: ["original", "current"] }, {}, localRows);
  assert.deepEqual(both.map((file) => file.uri), ["file:///original.pdf", "file:///current.png"]);
  const historical = resolveReceiptNavigation({ receiptId: "receipt", receiptVersion: "1" }, response).receipt;
  assert.equal(receiptAttachments(null, historical, {}, localRows)[0].uri, "file:///original.pdf");
});
test("offline workspace restores only the exact account/person and omits finance/other-person data", async () => {
  const values = new Map(), storage = { getItem: async (key) => values.get(key) || null, setItem: async (key, value) => values.set(key, value) };
  const options = { scope: "company/user", companyId: "company", uid: "user" }, cache = createReceiptWorkspaceCache(storage, options);
  await cache.write(response);
  const restored = await cache.read("person");
  assert.equal(restored.workspace.cards.card.label, "Known card"); assert.equal(restored.workspace.cards.card.sageCardAccount, undefined); assert.equal(restored.workspace.cards.card.assignments.length, 1);
  assert.equal(restored.workspace.evidence.foreign, undefined); assert.deepEqual(restored.workspace.settings, {}); assert.deepEqual(restored.workspace.batches, {});
  assert.equal(await cache.read("reassigned_person"), null);
  assert.equal(await createReceiptWorkspaceCache(storage, { ...options, uid: "other_user" }).read("person"), null);
  assert.equal(await createReceiptWorkspaceCache(storage, { ...options, companyId: "other_company" }).read("person"), null);
  await assert.rejects(cache.write({ ...response, actor: { ...actor, uid: "other_user" } }), /account changed/);
  const finance = cachedReceiptWorkspace({ ...response, actor: { ...actor, finance: true } }); assert.deepEqual(finance.workspace.batches, {});
});
test("app-wide foreground/reconnect retries survive leaving Receipts and stop on account change", async () => {
  let network, appState, tick, syncs = 0, activeAccount = true, state = "active";
  const queue = { list: async () => [{ phase: "sending", uploadRequested: true }] };
  const stop = startReceiptSyncSession({ queue, assertAccount: () => { if (!activeAccount) throw new Error("Account switched"); }, sync: async (guard) => { guard(); syncs++; }, getAppState: () => state,
    subscribeNetwork: (fn) => { network = fn; return () => {}; }, subscribeAppState: (fn) => { appState = fn; return () => {}; }, interval: (fn) => { tick = fn; return 1; }, clear: () => {},
  });
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  await settle(); assert.equal(syncs, 1);
  network({ isConnected: false }); tick(); await settle(); assert.equal(syncs, 1);
  network({ isConnected: true }); await settle(); assert.equal(syncs, 2);
  state = "background"; tick(); await settle(); assert.equal(syncs, 2);
  state = "active"; appState("active"); await settle(); assert.equal(syncs, 3);
  activeAccount = false; tick(); await settle(); assert.equal(syncs, 3);
  stop(); activeAccount = true; tick(); await settle(); assert.equal(syncs, 3);
});
test("native evidence downloads an authorized foreground preview and reopens verified originals offline", async () => {
  const native = readFileSync(new URL("../lib/receipts/native.js", import.meta.url), "utf8").replace(/^import .*;\n/gm, "").replaceAll("export ", "");
  const files = new Map(), account = { currentUser: { uid: "user" } }; let downloads = 0;
  const fs = { FileSystemSessionType: { BACKGROUND: 0, FOREGROUND: 1 }, documentDirectory: "file:///documents/", makeDirectoryAsync: async () => {}, getInfoAsync: async (uri) => {
    const bytes = files.get(uri); return bytes ? { exists: true, size: bytes.length, md5: createHash("md5").update(bytes).digest("hex") } : { exists: false };
  }, readAsStringAsync: async (uri) => { if (!files.has(uri)) throw new Error("Missing"); return files.get(uri).toString(); }, writeAsStringAsync: async (uri, value) => files.set(uri, Buffer.from(value)), downloadAsync: async (url, path, options) => {
    assert.equal(url, "https://unused.example/evidence");
    assert.deepEqual(options, { sessionType: fs.FileSystemSessionType.FOREGROUND, headers: { Authorization: "Bearer synthetic-token" } });
    downloads++; files.set(path, Buffer.from("%PDF-1.7 cached original")); return { status: 200, uri: path };
  } };
  const { openSavedEvidence } = new Function("FileSystem", "auth", "receiptEvidenceUrl", "RECEIPT_FILE_EXTENSIONS", `${native}\nreturn { openSavedEvidence };`)(fs, account, () => "https://unused.example/evidence", RECEIPT_FILE_EXTENSIONS);
  const queue = { scope: "company/user", companyId: "company", uid: "user", list: async () => [] };
  const user = { uid: "user", getIdToken: async () => "synthetic-token" };
  const downloaded = await openSavedEvidence(queue, user, "downloaded"); assert.equal(downloads, 1);
  user.getIdToken = async () => { throw new Error("Offline"); };
  assert.deepEqual(await openSavedEvidence(queue, user, "downloaded"), downloaded); assert.equal(downloads, 1);
  files.set("file:///retained.pdf", Buffer.from("%PDF-1.7 local original"));
  queue.list = async () => [{ files: [{ evidenceId: "retained", uri: "file:///retained.pdf", fileType: "application/pdf", fileSize: files.get("file:///retained.pdf").length }] }];
  assert.equal((await openSavedEvidence(queue, user, "retained")).uri, "file:///retained.pdf");
  account.currentUser.uid = "other_user"; await assert.rejects(openSavedEvidence(queue, user, "retained"), /Sign back/);
  account.currentUser.uid = "user"; files.set(downloaded.uri, Buffer.from("%PDF-1.7 changed content"));
  await assert.rejects(openSavedEvidence(queue, user, "downloaded"), /Offline/);
});


test("an unbound identity hold cannot replace the authorized server receipt reached from a notification", () => {
  const target = resolveReceiptNavigation({ receiptId: "receipt" }, response, [{ localId: "old", id: "receipt", phase: "identity_hold", identityHold: true }]);
  assert.equal(target.kind, "receipt"); assert.equal(target.receipt.id, "receipt");
});
