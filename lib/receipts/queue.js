// Durable, account-scoped state. All read/modify/write operations share one lane,
// including when a screen remount creates another queue instance.
import { defaultReceiptCardId } from "./cardSelection.js";
const lanes = new Map();
const workers = new Map();
const clone = (value) => JSON.parse(JSON.stringify(value));

export function receiptOperationId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 3) | 8).toString(16);
  });
}

export function receiptScope(companyId, uid) {
  if (!companyId || !uid) throw new Error("Sign in to a company account to use receipts.");
  return `${encodeURIComponent(companyId)}/${encodeURIComponent(uid)}`;
}

export function createReceiptQueue({ storage, companyId, uid, personId = "", makeId = receiptOperationId, now = () => new Date().toISOString() }) {
  const scope = receiptScope(companyId, uid);
  const key = `receipt-v2:${scope}`;
  const listeners = new Set();
  let verifiedPerson = !personId;
  const owns = (row) => !personId || row.capturedPersonId === personId;
  const findRow = (saved, localId) => saved.entries.find((entry) => entry.localId === localId && owns(entry));
  const serial = (task) => {
    const next = (lanes.get(key) || Promise.resolve()).catch(() => {}).then(task);
    lanes.set(key, next);
    return next;
  };
  const read = async () => {
    const raw = await storage.getItem(key);
    if (!raw) return { version: 1, companyId, uid, entries: [] };
    let saved;
    try { saved = JSON.parse(raw); } catch { throw new Error("Saved receipts could not be read. They have not been cleared."); }
    if (saved.version !== 1 || saved.companyId !== companyId || saved.uid !== uid || !Array.isArray(saved.entries)) {
      throw new Error("Saved receipts need recovery. They have not been cleared.");
    }
    return saved;
  };
  const change = (fn) => serial(async () => {
    const saved = await read();
    const result = fn(saved);
    await storage.setItem(key, JSON.stringify(saved));
    listeners.forEach((listener) => listener());
    return clone(result);
  });
  const queue = {
    scope, companyId, uid, personId,
    verifyWorkspace(response) {
      if (response?.actor?.uid !== uid || response?.actor?.personId !== personId || response?.workspace?.companyId !== companyId) throw new Error("Your receipt identity changed. Saved receipts are retained for their original staff account.");
      verifiedPerson = true;
    },
    list: () => serial(async () => {
      const rows = (await read()).entries.filter((row) => row.phase !== "discarded" && (owns(row) || !row.capturedPersonId));
      return clone(rows.map((row) => owns(row) ? row : { localId: row.localId, id: row.id, identityHold: true, phase: "identity_hold", fields: {}, files: [], uploadRequested: false, error: "Earlier saved receipt needs staff identity review. Its original files and server acknowledgement are retained. Contact finance or support to recover it." }));
    }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    create: (fields = {}, options = {}) => change((saved) => {
      if (!verifiedPerson) throw new Error("Connect once to verify your receipt account before creating a receipt. Existing originals remain saved.");
      const id = options.receiptId || makeId();
      const existing = saved.entries.find((entry) => entry.id === id && entry.phase !== "sent" && entry.phase !== "discarded" && owns(entry));
      if (existing) return existing;
      const entry = { localId: makeId(), id, companyId, uid, ...(personId ? { capturedPersonId: personId } : {}), action: options.correct ? "receipt.correct" : "receipt.submit", fields: clone(fields), cardTouched: Boolean(fields.cardId), files: [], existingEvidenceIds: [...(options.evidenceIds || [])], phase: "draft", sendOperation: null, uploadRequested: false, extractionAttempted: false, createdAt: now(), updatedAt: now(), error: "" };
      if (options.correct) {
        const sources = saved.entries.filter((item) => item.id === id && item.phase === "sent" && item.heldFiles?.length && owns(item));
        entry.heldFiles = sources.flatMap((item) => item.heldFiles);
        sources.forEach((item) => { item.forwardedHeldFiles = [...(item.forwardedHeldFiles || []), ...item.heldFiles]; item.heldFiles = []; });
      }
      saved.entries.push(entry);
      return entry;
    }),
    discard: (localId) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row) throw new Error("Saved draft not found.");
      if (!["draft", "review"].includes(row.phase) || row.sendOperation || row.uploadRequested || workers.has(scope)) {
        throw new Error("Only unsent drafts can be discarded. Wait for any upload or sending to finish.");
      }
      // Retain captured originals and history; remove the draft from active work.
      Object.assign(row, { phase: "discarded", discardedAt: now(), updatedAt: now() });
      return row;
    }),
    patch: (localId, patch) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row) throw new Error("Saved receipt not found.");
      if (patch.fields && row.sendOperation) throw new Error("This receipt is waiting for confirmation. Retry sending before making changes.");
      Object.assign(row, clone(patch), { updatedAt: now() });
      if (patch.fields && Object.hasOwn(patch.fields, "cardId")) row.cardTouched = true;
      return row;
    }),
    editFields: (localId, fields) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row || row.sendOperation) throw new Error("This receipt is waiting for server confirmation.");
      if (Object.hasOwn(fields, "purchaseDate") && fields.purchaseDate !== row.fields.purchaseDate && row.cardTouched === false && row.defaultedCardId === row.fields.cardId) {
        row.fields.cardId = ""; row.defaultedCardId = "";
      }
      row.fields = { ...row.fields, ...clone(fields) };
      if (Object.hasOwn(fields, "cardId")) row.cardTouched = true;
      row.updatedAt = now();
      return row;
    }),
    applyDefaultCard: (localId, response, today) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row) throw new Error("Saved receipt not found.");
      const cardId = defaultReceiptCardId(row, response, today);
      if (cardId) { row.fields.cardId = cardId; row.defaultedCardId = cardId; row.updatedAt = now(); }
      return row;
    }),
    reviewCorrection: (localId, fields, evidenceIds) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row || row.action !== "receipt.correct" || row.sendOperation) throw new Error("Confirm the earlier submission outcome before reviewing a new request.");
      if (!Number.isInteger(fields.expectedReceiptVersion) || !fields.expectedRequestId) throw new Error("Refresh the current finance request before continuing.");
      row.previousCorrectionDrafts = [...(row.previousCorrectionDrafts || []), { fields: clone(row.fields), files: clone(row.files), existingEvidenceIds: [...row.existingEvidenceIds], reviewedAt: now() }];
      row.fields = clone(fields);
      row.existingEvidenceIds = [...new Set(evidenceIds || [])];
      row.files = row.files.filter((file) => !row.existingEvidenceIds.includes(file.evidenceId));
      Object.assign(row, { phase: "review", uploadRequested: false, sendAttempted: false, error: "", suggestions: null, extractionAttempted: false, updatedAt: now() });
      return row;
    }),
    addFile: (localId, file) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row) throw new Error("Saved receipt not found.");
      const captured = { ...clone(file), evidenceId: file.evidenceId || makeId(), intentOperationId: makeId(), finalizeOperationId: makeId(), storagePath: "", uploaded: false, finalized: false };
      // Capture can finish while the queue is uploading. Keep the original and
      // its reference even when this receipt cannot accept the page yet.
      if (row.sendOperation || (row.phase === "uploading" && workers.has(scope)) || row.files.length + row.existingEvidenceIds.length >= 20) {
        row.heldFiles = [...(row.heldFiles || []), captured];
      } else row.files.push(captured);
      row.extractionAttempted = false;
      row.updatedAt = now();
      return row;
    }),
    retryHeldFile: (localId, evidenceId) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row || row.sendOperation || (row.phase === "uploading" && workers.has(scope))) throw new Error("Wait for this upload to finish before attaching the saved file.");
      if (row.files.length + row.existingEvidenceIds.length >= 20) throw new Error("A receipt can include at most twenty pages/files.");
      const file = row.heldFiles?.find((item) => item.evidenceId === evidenceId);
      if (!file) throw new Error("Saved attachment not found.");
      row.files.push(file); row.heldFiles = row.heldFiles.filter((item) => item.evidenceId !== evidenceId);
      row.extractionAttempted = false; row.updatedAt = now();
      return row;
    }),
    requestUpload: (localId) => queue.patch(localId, { uploadRequested: true, extractionAttempted: false, suggestions: null, extractionWarning: "", error: "" }),
    renewExpiredUpload: (localId, evidenceId) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row || row.sendAttempted) throw new Error("This submission needs confirmation before its upload can change.");
      const file = row.files.find((entry) => entry.evidenceId === evidenceId);
      if (!file || file.finalized) throw new Error("The saved upload cannot be renewed.");
      file.previousUploads = [...(file.previousUploads || []), { evidenceId: file.evidenceId, intentOperationId: file.intentOperationId, finalizeOperationId: file.finalizeOperationId, storagePath: file.storagePath }];
      Object.assign(file, { evidenceId: makeId(), intentOperationId: makeId(), finalizeOperationId: makeId(), storagePath: "", uploaded: false, finalized: false });
      if (row.sendOperation) {
        row.abandonedOperations = [...(row.abandonedOperations || []), row.sendOperation];
        row.sendOperation = { operationId: makeId(), payload: { ...row.sendOperation.payload, evidenceIds: [...row.existingEvidenceIds, ...row.files.map((entry) => entry.evidenceId)] } };
      }
      row.uploadRequested = true; row.phase = "uploading"; row.error = "";
      return row;
    }),
    requestSend: (localId, validatedFields) => change((saved) => {
      const row = findRow(saved, localId);
      if (!row) throw new Error("Saved receipt not found.");
      if (!row.sendOperation) {
        row.fields = clone(validatedFields);
        row.sendAttempted = false;
        row.sendOperation = { operationId: makeId(), payload: { ...clone(validatedFields), ...(row.capturedPersonId ? { capturedPersonId: row.capturedPersonId } : {}), id: row.id, evidenceIds: [...row.existingEvidenceIds, ...row.files.map((file) => file.evidenceId)] } };
      }
      row.uploadRequested = true;
      row.error = "";
      row.updatedAt = now();
      return row;
    }),
  };
  return queue;
}

export function validateReceiptFields(fields, evidenceCount) {
  const result = {
    cardId: String(fields.cardId || ""), supplier: String(fields.supplier || "").trim(),
    purchaseDate: String(fields.purchaseDate || ""), currency: String(fields.currency || "GBP").trim().toUpperCase(),
    grossPence: Number(fields.grossPence), purpose: String(fields.purpose || "").trim(),
    jobId: String(fields.jobId || ""), requestedTransactionId: String(fields.requestedTransactionId || ""), missingReceiptReason: String(fields.missingReceiptReason || "").trim(),
    ...(Number.isInteger(fields.expectedReceiptVersion) ? { expectedReceiptVersion: fields.expectedReceiptVersion } : {}),
    ...(fields.expectedRequestId ? { expectedRequestId: String(fields.expectedRequestId) } : {}),
  };
  if (!result.cardId) throw new Error("Choose the company card used for this purchase.");
  if (!result.supplier) throw new Error("Enter the merchant shown on the receipt.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.purchaseDate) || !Number.isFinite(Date.parse(`${result.purchaseDate}T12:00:00Z`)) || new Date(`${result.purchaseDate}T12:00:00Z`).toISOString().slice(0, 10) !== result.purchaseDate) throw new Error("Choose a valid purchase date.");
  if (!/^[A-Z]{3}$/.test(result.currency)) throw new Error("Enter a three-letter currency code.");
  if (!Number.isSafeInteger(result.grossPence) || result.grossPence === 0) throw new Error("Enter a non-zero purchase or refund amount.");
  if (!result.purpose) throw new Error("Explain what the purchase was for.");
  if (!evidenceCount && !result.missingReceiptReason) throw new Error("Attach the receipt or explain why it is missing.");
  return result;
}

// Frozen operation IDs/payloads are persisted before network access. A crash or
// lost acknowledgement retries exactly the same logical command.
export function drainReceiptQueue(queue, dependencies) {
  if (workers.has(queue.scope)) return workers.get(queue.scope).then(() => drainReceiptQueue(queue, dependencies));
  let restartRequired = false;
  const work = (async () => {
    const { command, upload, extract, assertAccount = () => {}, onProgress = () => {} } = dependencies;
    const rows = await queue.list();
    for (const initial of rows) {
      if (initial.phase === "sent" || !initial.uploadRequested) continue;
      let row = initial;
      let processingEvidenceId = "";
      try {
        assertAccount();
        row = await queue.patch(row.localId, { error: "", phase: "uploading" });
        for (let index = 0; index < row.files.length; index += 1) {
          let file = row.files[index];
          processingEvidenceId = file.evidenceId;
          if (file.finalized) continue;
          assertAccount();
          if (file.storagePath && !file.uploaded) {
            // A completed staging object is create-only. Probe finalisation on
            // restart before trying to write it again after a lost upload ACK.
            try {
              const recovered = await command("upload.finalize", { evidenceId: file.evidenceId }, file.finalizeOperationId);
              if (!recovered?.ok) throw new Error("The attachment was not confirmed.");
              row.files[index] = { ...file, uploaded: true, finalized: true };
              await queue.patch(row.localId, { files: row.files });
              continue;
            } catch (error) { if (error.code !== "upload_pending") throw error; }
          }
          if (!file.storagePath) {
            const ack = await command("upload.intent", { receiptId: row.id, evidenceId: file.evidenceId, fileName: file.fileName, fileType: file.fileType, fileSize: file.fileSize }, file.intentOperationId);
            if (!ack?.result?.storagePath) throw new Error("The upload was not confirmed. Retry when connected.");
            file = { ...file, storagePath: ack.result.storagePath };
            row.files[index] = file;
            await queue.patch(row.localId, { files: row.files });
          }
          if (!file.uploaded) {
            assertAccount();
            await upload(file, (percent) => onProgress(row.localId, percent));
            file = { ...file, uploaded: true };
            row.files[index] = file;
            await queue.patch(row.localId, { files: row.files });
          }
          assertAccount();
          const ack = await command("upload.finalize", { evidenceId: file.evidenceId }, file.finalizeOperationId);
          if (!ack?.ok) throw new Error("The attachment was not confirmed. Retry when connected.");
          row.files[index] = { ...file, finalized: true };
          await queue.patch(row.localId, { files: row.files });
        }
        // Refresh form changes made while the upload was in progress.
        row = (await queue.list()).find((entry) => entry.localId === row.localId);
        if (row.sendOperation) {
          assertAccount();
          await queue.patch(row.localId, { phase: "sending", sendAttempted: true });
          const ack = await command(row.action, row.sendOperation.payload, row.sendOperation.operationId);
          if (!ack?.ok) throw new Error("The receipt was not confirmed. Retry sending.");
          await queue.patch(row.localId, { phase: "sent", acknowledgedAt: new Date().toISOString(), acknowledgement: ack.result || {}, error: "", uploadRequested: false });
        } else {
          if (!row.extractionAttempted && row.files.length && extract) {
            assertAccount();
            try {
              const result = await extract(row.id, [...row.existingEvidenceIds, ...row.files.map((file) => file.evidenceId)]);
              await queue.patch(row.localId, { suggestions: result.extraction || null, extractionAttempted: true, extractionWarning: result.extraction?.warning || "" });
            } catch {
              await queue.patch(row.localId, { extractionAttempted: true, extractionWarning: "Automatic reading is unavailable. Enter and check the receipt details yourself." });
            }
          }
          await queue.patch(row.localId, { phase: "review", uploadRequested: false });
        }
      } catch (error) {
        if (error.code === "upload_expired" && processingEvidenceId) {
          await queue.renewExpiredUpload(row.localId, processingEvidenceId);
          restartRequired = true;
          break;
        }
        const rejected = row.sendOperation && error.operationRejected;
        await queue.patch(row.localId, {
          phase: rejected ? "review" : row.sendOperation ? "sending" : "uploading",
          ...(rejected ? { rejectedOperation: row.sendOperation, sendOperation: null, sendAttempted: false, uploadRequested: false } : {}),
          error: error.message || "Waiting for a connection. Your receipt is saved on this device.",
        });
        // Avoid repeatedly failing all queued uploads during a network outage.
        break;
      }
    }
  })();
  workers.set(queue.scope, work);
  return work.finally(() => { if (workers.get(queue.scope) === work) workers.delete(queue.scope); }).then(() => restartRequired ? drainReceiptQueue(queue, dependencies) : undefined);
}
