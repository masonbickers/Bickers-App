// Provider identity is checked after Firebase verification. Global revocation and
// recovery proof remain enforced by the session service before business handlers.
export function trustedClerkSession(token, user = {}) {
  const stored = user.clerkUserId || '';
  const nested = user.auth?.clerkUserId || '';
  return token?.firebase?.sign_in_provider === 'custom' && token.authMethod === 'clerk'
    && token.verifiedClerkEmail === true && token.identityLinkVersion === 2
    && !!token.clerkUserId && !!token.clerkSessionId && token.uid === user.uid && !!user.uid
    && (!stored || stored === token.clerkUserId) && (!nested || nested === token.clerkUserId)
    && token.identityCompanyId === user.companyId
    && (!user.employeeId || token.identityEmployeeId === user.employeeId);
}

export function mobilePasswordAccessAllowed(token, user = {}) {
  if (user.isEnabled !== true || user.active === false || user.disabled === true
    || user.appDisabled === true || user.archived === true || user.isArchived === true) return false;
  const cutoff = user.sessionValidAfter ?? 0;
  if (typeof cutoff !== 'number' || cutoff < 0 || cutoff >= 10000000000
    || typeof token?.auth_time !== 'number' || token.auth_time <= cutoff
    || (user.sessionsRevokedAt != null && user.sessionValidAfter == null)) return false;
  if (trustedClerkSession(token, user)) return true;
  const appCutoff = user.appPasswordSessionAfter ?? 0;
  return token?.firebase?.sign_in_provider === 'password'
    && token.uid === user.uid && !!user.uid && !!user.companyId && !!user.employeeId
    && user.mobileAccessStatus === 'active' && user.appPasswordSetupRequired !== true
    && typeof appCutoff === 'number' && appCutoff >= 0 && appCutoff < 10000000000
    && token.auth_time > appCutoff;
}

export function createAppPasswordProxy({ origin = process.env.APP_PASSWORD_WEB_ORIGIN || process.env.RECEIPTS_WEB_ORIGIN, fetchImpl = globalThis.fetch } = {}) {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    const allowed = (req.method === "GET" && ["", "/"].includes(req.path)) || (req.method === "POST" && req.path === "/complete");
    if (!allowed) return res.status(404).json({ error: "Setup route not found." });
    const authorization = req.headers.authorization;
    if (!/^Bearer \S+$/.test(authorization || "")) return res.status(401).json({ error: "Sign in again." });
    let url;
    try {
      url = new URL(String(origin || ""));
      if (url.username || url.password || url.search || url.hash || !["http:", "https:"].includes(url.protocol) || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error();
      url.pathname = "/api/security/app-password-setup";
    } catch { return res.status(503).json({ error: "App password setup is not configured." }); }
    try {
      const response = await fetchImpl(url, { method: req.method, redirect: "error", signal: AbortSignal.timeout(45000),
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        ...(req.method === "POST" ? { body: JSON.stringify({ issuanceId: req.body?.issuanceId, operationId: req.body?.operationId, newPassword: req.body?.newPassword }) } : {}) });
      return res.status(response.status).json(await response.json());
    } catch { return res.status(503).json({ error: "Setup was not confirmed. Retry; if your password was saved, use the new password to sign in.", code: "SETUP_UNCONFIRMED" }); }
  };
}
