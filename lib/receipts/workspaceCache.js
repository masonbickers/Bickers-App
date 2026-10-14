import { ownsReceipt } from "./navigation.js";

export function cachedReceiptWorkspace(response) {
  const { workspace = {}, actor = {} } = response || {};
  if (!actor.uid || !actor.personId || !workspace.companyId) throw new Error("Verified receipt account is required before caching.");
  const own = (row) => ownsReceipt(row, actor);
  const receipts = Object.fromEntries(Object.entries(workspace.receipts || {}).filter(([, row]) => own(row)));
  const evidence = Object.fromEntries(Object.entries(workspace.evidence || {}).filter(([, row]) => own(row)));
  const cards = Object.fromEntries(Object.entries(workspace.cards || {}).filter(([, card]) => card.assignments?.some((assignment) => assignment.personId === actor.personId)).map(([id, card]) => [id, { id, label: card.label, last4: card.last4, active: card.active, assignments: card.assignments.filter((assignment) => assignment.personId === actor.personId) }]));
  const transactions = Object.fromEntries(Object.entries(workspace.transactions || {}).filter(([, row]) => row.request?.personId === actor.personId).map(([id, row]) => [id, { id, cardId: row.cardId, amountPence: row.amountPence, postedDate: row.postedDate, description: row.description, currency: row.currency, request: row.request, receiptId: receipts[row.receiptId] ? row.receiptId : "", responseReceiptId: receipts[row.responseReceiptId] ? row.responseReceiptId : "", accountingState: row.accountingState }]));
  return { actor, bookingJobs: response.bookingJobs || [], cachedAt: new Date().toISOString(), workspace: { companyId: workspace.companyId, revision: workspace.revision, cards, receipts, evidence, transactions, settings: {}, statements: {}, batches: {}, jobs: {} } };
}
export function createReceiptWorkspaceCache(storage, { scope, companyId, uid }) {
  const key = `receipt-workspace-v2:${scope}`;
  return {
    async read(personId) {
      try {
        const cached = JSON.parse(await storage.getItem(key));
        if (cached?.actor?.uid !== uid || cached?.actor?.personId !== personId || cached?.workspace?.companyId !== companyId) return null;
        return cached;
      } catch { return null; }
    },
    async write(response) {
      if (response?.actor?.uid !== uid || response?.workspace?.companyId !== companyId) throw new Error("The receipt account changed before its snapshot could be saved.");
      await storage.setItem(key, JSON.stringify(cachedReceiptWorkspace(response)));
    },
  };
}
