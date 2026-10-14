const destinations = Object.freeze({ web: 'https://booking.bickers.co.uk', app: 'bickersapp://login' });
const errorCode = error => error?.errors?.[0]?.code || error?.code || '';
const unknownAccount = new Set(['form_identifier_not_found', 'resource_not_found', 'form_identifier_not_exists', 'user_locked', 'user_banned']);
const initial = () => ({ view: 'request', busy: false, error: '', email: '', factors: [], factor: '' });

export function createClerkResetFlow({ client, finishRecovery, redirect = () => {}, onState = () => {} }) {
  let state = initial();
  let canVerify = false;
  let resetVerified = false;
  let passwordSaved = false;
  const update = patch => { state = { ...state, error: '', ...patch }; onState({ ...state }); return { ...state }; };
  async function finish() {
    update({ view: 'finishing', busy: true });
    try {
      const proof = await client.activate();
      if (!proof || (await finishRecovery(proof))?.completed !== true) throw new Error('proof-not-confirmed');
      return update({ view: 'success', busy: false });
    } catch { return update({ view: 'finish-error', busy: false }); }
  }
  async function advance(result) {
    if (result?.resetVerified !== true || result.passwordSaved !== true) throw new Error('reset-not-confirmed');
    passwordSaved = true;
    if (result.stage === 'complete') return finish();
    if (result.stage === 'challenge') {
      const factors = (result.factors || []).filter(value => ['totp', 'backup_code', 'email_code', 'phone_code'].includes(value));
      if (!factors.length) return update({ view: 'challenge-unavailable', busy: false });
      update({ view: 'challenge', busy: true, factors, factor: factors[0] });
      try { await client.prepareFactor(factors[0]); return update({ busy: false }); }
      catch { return update({ busy: false, error: 'Verification could not be prepared. Select the method again to retry.' }); }
    }
    throw new Error('unsupported-reset-state');
  }
  const flow = {
    get state() { return { ...state, factors: [...state.factors] }; },
    async open(search = '') {
      if (state.busy) return { ...state };
      const params = new URLSearchParams(search);
      if (params.has('oobCode') && params.has('mode')) {
        const safe = new URLSearchParams();
        for (const key of ['mode', 'oobCode', 'lang']) if (params.has(key)) safe.set(key, params.get(key));
        return update({ view: 'legacy', url: `/legacy-reset-password?${safe}`, busy: false });
      }
      update({ view: 'loading', busy: true });
      try {
        const result = await client.resume();
        if (result?.resetVerified === true && result.stage === 'password') {
          resetVerified = true;
          return update({ view: 'password', busy: false });
        }
        if (result?.resetVerified === true && result.passwordSaved === true) return await advance(result);
        canVerify = false; resetVerified = false; passwordSaved = false;
        return update(initial());
      } catch { return update({ view: 'load-error', busy: false }); }
    },
    async request(value) {
      if (state.busy) return { ...state };
      const email = String(value || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return update({ error: 'Enter your work email address.' });
      canVerify = false; resetVerified = false; passwordSaved = false;
      update({ view: 'request', busy: true, email, factors: [], factor: '' });
      try { await client.requestReset(email); canVerify = true; }
      catch (error) {
        if (!unknownAccount.has(errorCode(error))) return update({ view: 'request', busy: false,
          error: errorCode(error) === 'too_many_requests' ? 'Too many attempts. Please wait before trying again.' : 'The secure account service could not be reached. Check your connection and retry.' });
      }
      return update({ view: 'code', busy: false });
    },
    async verify(code) {
      if (state.busy || state.view !== 'code') return { ...state };
      if (!String(code || '').trim()) return update({ error: 'Enter the code from your email.' });
      update({ busy: true });
      try {
        if (!canVerify) throw new Error('invalid-code');
        const result = await client.verifyResetCode(String(code).trim());
        if (result?.stage !== 'password' || result.resetVerified !== true) throw new Error('unverified-reset');
        resetVerified = true;
        return update({ view: 'password', busy: false });
      } catch { return update({ view: 'code', busy: false, error: 'The code could not be verified. Check it or request a new code in this browser.' }); }
    },
    async reset(password, confirmation) {
      if (state.busy || state.view !== 'password' || !resetVerified) return { ...state };
      if (typeof password !== 'string' || password.length < 8 || password.length > 128) return update({ error: 'Use between 8 and 128 characters.' });
      if (password !== confirmation) return update({ error: 'The passwords do not match. Please try again.' });
      update({ busy: true });
      try { return await advance(await client.resetPassword(password)); }
      catch (error) {
        if (errorCode(error).startsWith('form_password_')) return update({ view: 'password', busy: false, error: 'Choose a stronger, unique password that meets your account requirements.' });
        return update({ view: passwordSaved ? 'finish-error' : 'uncertain', busy: false });
      }
    },
    async selectFactor(factor) {
      if (state.busy || state.view !== 'challenge' || !state.factors.includes(factor)) return { ...state };
      update({ busy: true });
      try { await client.prepareFactor(factor); return update({ factor, busy: false }); }
      catch { return update({ busy: false, error: 'Verification could not be prepared. Please retry.' }); }
    },
    async verifyFactor(code) {
      if (state.busy || state.view !== 'challenge' || !passwordSaved) return { ...state };
      if (!String(code || '').trim()) return update({ error: 'Enter your verification code.' });
      update({ busy: true });
      try { return await advance(await client.verifyFactor(state.factor, String(code).trim())); }
      catch { return update({ view: 'challenge', busy: false, error: 'The code could not be verified. Check it and try again.' }); }
    },
    async retry() {
      if (state.busy) return { ...state };
      return passwordSaved ? finish() : flow.open('');
    },
    go(destination) { if (state.view === 'success' && Object.hasOwn(destinations, destination)) redirect(destinations[destination]); },
  };
  return flow;
}
