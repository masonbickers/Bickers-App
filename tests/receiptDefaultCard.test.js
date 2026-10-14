import assert from "node:assert/strict";
import test from "node:test";
import { createReceiptQueue } from "../lib/receipts/queue.js";
import { defaultReceiptCardId, eligibleReceiptCards } from "../lib/receipts/cardSelection.js";

const today = "2026-09-13";
const card = { id: "operations", label: "Operations", last4: "4242", active: true, assignments: [{ personId: "staff", from: "2026-09-01", to: "2026-09-30" }] };
const fields = { cardId: "", supplier: "", purchaseDate: today, currency: "GBP", grossPence: 0, purpose: "" };
function fixture() {
  const data = new Map(); let sequence = 0;
  const options = { companyId: "company", uid: `uid-${Math.random()}`, personId: "staff", storage: { getItem: async (key) => data.get(key) || null, setItem: async (key, value) => { await Promise.resolve(); data.set(key, value); } }, makeId: () => `row-${++sequence}` };
  const response = { actor: { uid: options.uid, personId: "staff" }, workspace: { companyId: "company", cards: { operations: card } } };
  const queue = createReceiptQueue(options); queue.verifyWorkspace(response);
  return { queue, options, response };
}

test("late workspace defaults the single eligible card after other details and originals are saved, and persists across reopen", async () => {
  const { queue, options, response } = fixture(), row = await queue.create(fields);
  assert.equal(defaultReceiptCardId(row, null, today), "");
  await queue.editFields(row.localId, { supplier: "Shop", grossPence: 850, purpose: "Travel" });
  await queue.addFile(row.localId, { uri: "file:///retained/original.png", fileName: "original.png", fileType: "image/png", fileSize: 42 });
  const saved = await queue.applyDefaultCard(row.localId, response, today);
  assert.equal(saved.fields.cardId, "operations");
  assert.equal(saved.fields.grossPence, 850); assert.equal(saved.files.length, 1); assert.equal(saved.cardTouched, false);
  const [reopened] = await createReceiptQueue(options).list();
  assert.equal(reopened.fields.cardId, "operations");
});

test("manual choices and explicit clearing win against a concurrently arriving default, including after reopen", async () => {
  for (const chosen of ["manual-card", ""]) {
    for (const manualFirst of [true, false]) {
      const { queue, options, response } = fixture(), row = await queue.create(fields);
      const manual = () => queue.editFields(row.localId, { cardId: chosen });
      const automatic = () => queue.applyDefaultCard(row.localId, response, today);
      await Promise.all(manualFirst ? [manual(), automatic()] : [automatic(), manual()]);
      const reopened = createReceiptQueue(options);
      await reopened.applyDefaultCard(row.localId, response, today);
      const [saved] = await reopened.list();
      assert.equal(saved.fields.cardId, chosen); assert.equal(saved.cardTouched, true);
    }
  }
});

test("assignment boundaries, inactive cards, and ambiguous choices never guess the purchase card", async () => {
  const { queue, response } = fixture(), row = await queue.create(fields);
  assert.equal(eligibleReceiptCards({ card }, "staff", "2026-08-31", today).length, 0);
  assert.equal(eligibleReceiptCards({ card }, "staff", "2026-09-01", today).length, 1);
  assert.equal(eligibleReceiptCards({ card }, "staff", "2026-09-30", today).length, 1);
  assert.equal(eligibleReceiptCards({ card }, "staff", "2026-10-01", today).length, 0);
  assert.equal(eligibleReceiptCards({ card }, "another-person", today, today).length, 0);
  assert.equal(eligibleReceiptCards({ card: { ...card, active: false } }, "staff", today, today).length, 0);
  assert.equal(eligibleReceiptCards({ card: { ...card, active: false } }, "staff", "2026-09-12", today).length, 1);
  assert.equal(defaultReceiptCardId(row, { ...response, workspace: { ...response.workspace, cards: { card, other: { ...card, id: "other" } } } }, today), "");
});

test("changing purchase date recomputes only an automatic card, while a manual choice remains explicit", async () => {
  const { queue, response } = fixture(), row = await queue.create(fields);
  await queue.applyDefaultCard(row.localId, response, today);
  await queue.editFields(row.localId, { purchaseDate: "2026-08-01" });
  assert.equal((await queue.applyDefaultCard(row.localId, response, today)).fields.cardId, "");
  await queue.editFields(row.localId, { purchaseDate: today });
  assert.equal((await queue.applyDefaultCard(row.localId, response, today)).fields.cardId, "operations");
  await queue.editFields(row.localId, { cardId: "manual-card", purchaseDate: "2026-08-01" });
  assert.equal((await queue.applyDefaultCard(row.localId, response, today)).fields.cardId, "manual-card");
});

test("confirmed operations, corrections, old ambiguous drafts and identity changes never default", async () => {
  const { queue, response } = fixture(), row = await queue.create(fields);
  for (const changed of [{ cardTouched: undefined }, { action: "receipt.correct" }, { sendOperation: { operationId: "frozen" } }, { sendAttempted: true }, { rejectedOperation: { operationId: "rejected" } }, { phase: "sent" }, { acknowledgedAt: today }, { requestedTransactionId: "request" }, { capturedPersonId: "reassigned" }, { uid: "another-user" }, { companyId: "another-company" }]) {
    assert.equal(defaultReceiptCardId({ ...row, ...changed }, response, today), "");
  }
  await queue.requestSend(row.localId, { ...fields, supplier: "Confirmed", grossPence: 850, missingReceiptReason: "Lost" });
  const [before] = await queue.list();
  const after = await queue.applyDefaultCard(row.localId, response, today);
  assert.deepEqual(after, before);
});
