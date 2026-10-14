export function createReceiptTransport({ getBaseUrl, fetchImpl = globalThis.fetch, timeoutMs = 30000, assertSession = () => {} }) {
  const request = async (user, path = "", { method = "GET", body, companyId, signal, assertAccount = () => {} } = {}) => {
    if (!user?.uid || user.isAnonymous) throw new Error("Sign in with your company account to use receipts.");
    const guard = () => { assertSession(user, companyId || body?.companyId); assertAccount(); };
    guard();
    const token = await user.getIdToken();
    guard();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener?.("abort", abort);
    try {
      const url = `${getBaseUrl()}/receipts/v2${path}${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`;
      const response = await fetchImpl(url, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(result.error?.message || result.error || result.message || "The receipt service is unavailable. Your unsent receipt is still saved.");
        error.status = response.status;
        error.code = result.code || result.error?.code;
        throw error;
      }
      guard();
      return result;
    } finally { clearTimeout(timer); signal?.removeEventListener?.("abort", abort); }
  };
  return {
    workspace: (user, companyId, options = {}) => request(user, "", { ...options, companyId }),
    extract: (user, companyId, receiptId, evidenceIds, options = {}) => request(user, "/extract", { ...options, method: "POST", body: { companyId, receiptId, evidenceIds } }),
    command: async (user, companyId, action, payload, operationId, options = {}) => {
      if (!operationId) throw new Error("A saved operation reference is required.");
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const snapshot = await request(user, "", { ...options, companyId });
        options.assertWorkspace?.(snapshot);
        try {
          return await request(user, "/command", { ...options, method: "POST", body: { companyId, expectedRevision: snapshot.workspace.revision, expectedPersonId: snapshot.actor?.personId, operationId, action, payload } });
        } catch (error) {
          if (error.status !== 409 || error.code !== "revision_conflict" || attempt === 3) {
            const rejectedReceipt = ["receipt.submit", "receipt.correct"].includes(action) && ["card_assignment", "invalid_state", "stale_correction", "receipt_exists", "match_conflict", "match_mismatch", "statement_closed", "accounting_locked", "evidence_unverified", "not_found"].includes(error.code);
            // These typed domain responses are returned after the server checks
            // the operation ledger. Auth/connection/revision ambiguity stays frozen.
            error.operationRejected = [400, 422].includes(error.status) || rejectedReceipt;
            throw error;
          }
        }
      }
      throw new Error("Receipt changes are busy. Retry sending.");
    },
  };
}
