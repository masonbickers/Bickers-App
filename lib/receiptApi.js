import { getApiBaseUrl } from "./api";
import { auth } from "../firebaseConfig";
import { createReceiptTransport } from "./receipts/transport";

const api = createReceiptTransport({
  getBaseUrl: () => getApiBaseUrl("Receipt service"),
  assertSession: (user) => {
    if (auth.currentUser?.uid !== user?.uid) throw new Error("The signed-in account changed. Open receipts again to continue.");
  },
});
export const getReceiptWorkspace = api.workspace;
export const sendReceiptCommand = api.command;
export const extractReceipt = api.extract;
export const receiptEvidenceUrl = (evidenceId, companyId) => `${getApiBaseUrl("Receipt service")}/receipts/v2/evidence/${encodeURIComponent(evidenceId)}?companyId=${encodeURIComponent(companyId)}`;

// Older callers cannot mutate a separate receipt lifecycle.
export async function transitionReceiptGroup() { throw new Error("Update the app to use company-card receipts."); }
export async function resubmitReceipt() { throw new Error("Update the app to use company-card receipts."); }
