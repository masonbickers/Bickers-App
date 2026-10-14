// The web service owns revocation/reset boundaries; never use cached approval.
export function createSessionGate({ origin = process.env.AUTH_WEB_ORIGIN || process.env.RECEIPTS_WEB_ORIGIN, fetchImpl = globalThis.fetch, production = process.env.NODE_ENV === 'production' } = {}) {
  return async (req, res, next) => {
    const authorization = req.headers.authorization || '';
    if (!authorization) return next();
    let base;
    try {
      base = new URL(origin || '');
      if (base.username || base.password || base.pathname !== '/' || base.search || base.hash || !['http:', 'https:'].includes(base.protocol) || production && base.protocol !== 'https:') throw new Error();
    } catch { return res.status(503).json({ error: 'Session verification is not configured.', code: 'SESSION_SERVICE_UNAVAILABLE' }); }
    try {
      const response = await fetchImpl(new URL('/api/security/session', base).href, { headers: { Authorization: authorization }, redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        const status = response.status === 401 || response.status === 403 ? response.status : 503;
        return res.status(status).json({ error: status === 503 ? 'Session verification is temporarily unavailable.' : 'Sign in again and complete required password recovery.', code: status === 503 ? 'SESSION_SERVICE_UNAVAILABLE' : 'SIGN_IN_REQUIRED' });
      }
      return next();
    } catch { return res.status(503).json({ error: 'Session verification is temporarily unavailable.', code: 'SESSION_SERVICE_UNAVAILABLE' }); }
  };
}
