import { validateServiceUrl } from "../serviceUrl.js";

const one = (value) => Array.isArray(value) ? value[0] : value;
const id = (value) => /^[A-Za-z0-9_-]{1,160}$/.test(String(one(value) || "")) ? String(one(value)) : "";

export function isReceiptNotification(data = {}) {
  data ||= {};
  return Boolean(data.receiptId || data.transactionId || data.source === "receipts-v2" || /^receipt[_-]/.test(data.type || "") || /^\/(?:\(protected\)\/)?receipts(?:[?\/]|$)/.test(data.deepLink || ""));
}
export function receiptNotificationVisible(data = {}, account = {}) {
  data ||= {};
  if (!isReceiptNotification(data)) return true;
  if (!account.uid || !account.personId || !account.companyId || data.companyId !== account.companyId) return false;
  // Historical unscoped receipt alerts stay hidden until authoritative inbox sync replaces them.
  if (data.recipientPersonId) return data.recipientPersonId === account.personId && (!data.recipientUid || data.recipientUid === account.uid);
  return Boolean(data.recipientUid && data.recipientUid === account.uid);
}
export function receiptNotificationIdentity(data = {}, fallbackId = "") {
  return isReceiptNotification(data) ? [String(data.companyId || ""), String(data.recipientPersonId || data.recipientUid || ""), String(data.receiptId || ""), String(data.transactionId || ""), String(data.notificationId || fallbackId)] : [];
}
export function receiptRouteParams(params = {}) {
  return { receiptId: id(params.receiptId), transactionId: id(params.transactionId), companyId: id(params.companyId), notificationId: id(params.notificationId), receiptVersion: /^\d+$/.test(String(one(params.receiptVersion) || "")) ? Number(one(params.receiptVersion)) : 0, workspace: one(params.workspace) === "finance" ? "finance" : "" };
}
export function getReceiptNotificationHref(data, account) {
  if (!isReceiptNotification(data) || !receiptNotificationVisible(data, account)) return null;
  const query = String(data.deepLink || "").split("?")[1] || "";
  const params = receiptRouteParams({ ...Object.fromEntries(new URLSearchParams(query)), ...data });
  return { pathname: "/(protected)/receipts", params: Object.fromEntries(Object.entries(params).filter(([, value]) => value)) };
}
export function ownsReceipt(receipt = {}, actor = {}) {
  const canonical = receipt.ownerPersonId || receipt.personId;
  return canonical ? Boolean(actor.personId && canonical === actor.personId) : Boolean(actor.uid && (receipt.ownerUid || receipt.submitterUid) === actor.uid);
}
export function actionableReceiptRequest(row = {}, personId) {
  return Boolean(personId && row.request?.personId === personId && !row.receiptId && !row.responseReceiptId && !row.request.respondedAt && !row.request.resolvedAt && !["recorded", "manual_recorded"].includes(row.accountingState));
}
export function correctionNeedsReview(draft, receipt) {
  return Boolean(draft?.action === "receipt.correct" && (!receipt || receipt.reviewState !== "needs_action" || draft.fields?.expectedReceiptVersion !== receipt.version || draft.fields?.expectedRequestId !== (receipt.request?.id || receipt.request?.createdAt)));
}
export function resolveReceiptNavigation(params, response, localRows = []) {
  const target = receiptRouteParams(params), { workspace = {}, actor = {} } = response || {};
  if (!response || !actor.personId) return { kind: "waiting" };
  if (target.companyId && target.companyId !== workspace.companyId) return { kind: "unavailable", message: "This receipt belongs to another company account." };
  if (target.workspace === "finance") return { kind: actor.finance ? "finance" : "unavailable", message: "Finance access is required for this notification." };
  const transaction = workspace.transactions?.[target.transactionId];
  const receiptId = target.receiptId || transaction?.responseReceiptId || transaction?.receiptId;
  if (receiptId) {
    const receipt = workspace.receipts?.[receiptId];
    if (!receipt || !ownsReceipt(receipt, actor)) return { kind: "unavailable", message: "This receipt is unavailable for the signed-in employee. Refresh to check its current status." };
    if (target.receiptVersion && target.receiptVersion !== receipt.version) {
      const version = receipt.versions?.find((row) => row.version === target.receiptVersion);
      return version ? { kind: "receipt", receipt: { ...receipt, ...version, reviewState: "version", historicalVersion: true } } : { kind: "unavailable", message: "This receipt version is unavailable." };
    }
    const draft = localRows.find((row) => row.id === receiptId && row.phase !== "sent" && !row.identityHold);
    return draft ? { kind: "draft", draft } : { kind: "receipt", receipt };
  }
  if (target.transactionId) {
    if (!actionableReceiptRequest(transaction, actor.personId)) return { kind: "unavailable", message: "This request has already been answered or is no longer assigned to you." };
    const draft = localRows.find((row) => (row.requestedTransactionId || row.fields?.requestedTransactionId) === transaction.id && row.phase !== "sent" && !row.identityHold);
    return draft ? { kind: "draft", draft } : { kind: "request", transaction };
  }
  return { kind: "list" };
}
export function receiptAttachments(selected, receipt, evidence = {}, localRows = []) {
  const receiptId = selected?.id || receipt?.id;
  const saved = localRows.filter((row) => row.id === receiptId).flatMap((row) => [...(row.files || []), ...(row.previousCorrectionDrafts || []).flatMap((draft) => draft.files || [])]);
  const local = new Map(saved.map((file) => [file.evidenceId, file]));
  const attached = [...(selected?.files || []), ...(selected?.existingEvidenceIds || receipt?.evidenceIds || []).map((evidenceId) => ({ id: evidenceId, fileName: "Submitted attachment", fileType: "application/pdf", ...evidence[evidenceId], ...local.get(evidenceId) }))];
  return [...new Map(attached.map((file) => [file.evidenceId || file.id, file])).values()];
}
export function receiptFinanceUrl(params, configuredOrigin) {
  const origin = new URL(validateServiceUrl(configuredOrigin, "production", "Finance website"));
  const url = new URL("/receipts", origin.origin);
  const target = receiptRouteParams(params);
  for (const key of ["companyId", "receiptId", "transactionId", "receiptVersion"]) if (target[key]) url.searchParams.set(key, target[key]);
  url.searchParams.set("workspace", "finance");
  return url.href;
}

