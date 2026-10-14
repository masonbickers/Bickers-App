const resetStrategy = 'reset_password_email_code';
const supportedFactors = ['totp', 'backup_code', 'phone_code', 'email_code'];
const verifiedReset = attempt => attempt?.firstFactorVerification?.strategy === resetStrategy && attempt.firstFactorVerification.status === 'verified';

export function createClerkResetClient({ publishableKey, loadClerk } = {}) {
  let loading;
  let attempt;
  let recoveredSessionId;
  const load = loadClerk || (() => {
    if (!loading) loading = (async () => {
      const { Clerk } = await import('@clerk/clerk-js/no-rhc');
      const clerk = new Clerk(publishableKey);
      await clerk.load({ standardBrowser: true, telemetry: { disabled: true } });
      return clerk;
    })().catch(error => { loading = undefined; throw error; });
    return loading;
  });
  function describe(value) {
    if (!verifiedReset(value)) return null;
    attempt = value;
    if (value.status === 'needs_new_password') return { stage: 'password', resetVerified: true };
    if (value.status === 'complete' && value.createdSessionId) {
      recoveredSessionId = value.createdSessionId;
      return { stage: 'complete', resetVerified: true, passwordSaved: true };
    }
    if (value.status === 'needs_second_factor') return { stage: 'challenge', resetVerified: true, passwordSaved: true,
      factors: [...new Set((value.supportedSecondFactors || []).map(factor => factor.strategy).filter(factor => supportedFactors.includes(factor)))] };
    throw new Error('unsupported-recovery-state');
  }
  function requireVerified() {
    if (!verifiedReset(attempt)) throw new Error('recovery-not-verified');
  }
  function factorFor(strategy) {
    requireVerified();
    if (attempt.status !== 'needs_second_factor' || !supportedFactors.includes(strategy)) throw new Error('unsupported-factor');
    const factor = attempt.supportedSecondFactors?.find(item => item.strategy === strategy);
    if (!factor) throw new Error('unsupported-factor');
    return factor;
  }
  return {
    async resume() { const clerk = await load(); return describe(clerk.client?.signIn); },
    async requestReset(email) {
      attempt = undefined; recoveredSessionId = undefined;
      const clerk = await load();
      attempt = await clerk.client.signIn.create({ strategy: resetStrategy, identifier: email });
    },
    async verifyResetCode(code) {
      const clerk = await load();
      const result = await (attempt || clerk.client.signIn).attemptFirstFactor({ strategy: resetStrategy, code });
      return describe(result);
    },
    async resetPassword(password) {
      requireVerified();
      if (attempt.status !== 'needs_new_password') throw new Error('recovery-not-ready');
      return describe(await attempt.resetPassword({ password, signOutOfOtherSessions: true }));
    },
    async prepareFactor(strategy) {
      const factor = factorFor(strategy);
      if (strategy === 'phone_code') await attempt.prepareSecondFactor({ strategy, phoneNumberId: factor.phoneNumberId });
      else if (strategy === 'email_code') await attempt.prepareSecondFactor({ strategy, emailAddressId: factor.emailAddressId });
    },
    async verifyFactor(strategy, code) { factorFor(strategy); return describe(await attempt.attemptSecondFactor({ strategy, code })); },
    async activate() {
      requireVerified();
      if (attempt.status !== 'complete' || !recoveredSessionId || attempt.createdSessionId !== recoveredSessionId) throw new Error('recovery-incomplete');
      const clerk = await load();
      await clerk.setActive({ session: recoveredSessionId, navigate: async ({ session }) => {
        if (!session || session.id !== recoveredSessionId || session.currentTask) throw new Error('required-session-task');
      } });
      if (clerk.session?.id !== recoveredSessionId || clerk.session.currentTask) throw new Error('session-changed');
      const token = await clerk.session.getToken({ skipCache: true });
      if (!token || clerk.session?.id !== recoveredSessionId) throw new Error('session-changed');
      return token;
    },
  };
}

export async function confirmClerkRecovery(token, fetchImpl = fetch) {
  if (!token) throw new Error('missing-recovery-session');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetchImpl('https://booking.bickers.co.uk/api/security/clerk-recovery', {
      method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('recovery-not-confirmed');
    const result = await response.json();
    if (result.completed !== true) throw new Error('recovery-not-confirmed');
    return { completed: true };
  } finally { clearTimeout(timer); }
}
