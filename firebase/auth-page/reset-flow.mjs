import { firebaseWebConfig } from './config.mjs';

const expiredCodes = new Set(['auth/expired-action-code', 'auth/invalid-action-code', 'auth/user-disabled', 'auth/user-not-found']);
const fallbackModes = new Set(['verifyEmail', 'recoverEmail', 'verifyAndChangeEmail', 'revertSecondFactorAddition']);

function failureMessage(error) {
  if (error?.code === 'auth/too-many-requests') return 'Too many attempts. Please wait a little before trying again.';
  if (error?.code === 'auth/weak-password' || error?.code === 'auth/password-does-not-meet-requirements') return 'Choose a stronger password and try again.';
  return 'We couldn’t connect securely. Check your connection and try again.';
}

function policyMessage(status) {
  const missing = [
    ['containsLowercaseLetter', 'a lowercase letter'], ['containsUppercaseLetter', 'an uppercase letter'],
    ['containsNumericCharacter', 'a number'], ['containsNonAlphanumericCharacter', 'a symbol'],
  ].filter(([key]) => status[key] === false).map(([, label]) => label);
  return missing.length ? `Include ${missing.join(', ')} in your password.` : 'Choose a longer, stronger password that meets your account’s password requirements.';
}

export function createResetFlow({ verifyCode, confirmReset, sendReset, validatePassword, onState = () => {} }) {
  let state = { view: 'checking', busy: false, error: '', email: '' };
  let actionCode = '';
  const update = patch => { state = { ...state, error: '', ...patch }; onState({ ...state }); return { ...state }; };
  return {
    get state() { return { ...state }; },
    async open(search) {
      actionCode = '';
      const params = new URLSearchParams(search);
      const mode = params.get('mode');
      const code = params.get('oobCode');
      if (mode && mode !== 'resetPassword') {
        if (!fallbackModes.has(mode) || !code) return update({ view: 'invalid', busy: false });
        const url = new URL('https://bickers-booking.firebaseapp.com/__/auth/action');
        url.searchParams.set('apiKey', firebaseWebConfig.apiKey);
        for (const key of ['mode', 'oobCode', 'lang']) if (params.has(key)) url.searchParams.set(key, params.get(key));
        return update({ view: 'fallback', url: url.href, busy: false });
      }
      if (!code || mode !== 'resetPassword') return update({ view: 'request', busy: false, email: '' });
      update({ view: 'checking', busy: true, email: '' });
      try {
        const email = await verifyCode(code);
        actionCode = code;
        return update({ view: 'ready', busy: false, email });
      } catch (error) {
        return update({ view: expiredCodes.has(error?.code) ? 'expired' : 'retry', busy: false });
      }
    },
    async submit(password, confirmation) {
      if (state.busy || state.view !== 'ready' || !actionCode) return { ...state };
      if (password.length < 8 || password.length > 128) return update({ error: 'Use between 8 and 128 characters.' });
      if (password !== confirmation) return update({ error: 'The passwords don’t match. Please try again.' });
      update({ busy: true });
      try {
        const policy = await validatePassword(password);
        if (!policy.isValid) return update({ busy: false, error: policyMessage(policy) });
        await confirmReset(actionCode, password);
        actionCode = '';
        return update({ view: 'success', busy: false });
      } catch (error) {
        if (expiredCodes.has(error?.code)) { actionCode = ''; return update({ view: 'expired', busy: false }); }
        return update({ busy: false, error: failureMessage(error) });
      }
    },
    async request(value) {
      if (state.busy) return { ...state };
      const email = String(value || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return update({ error: 'Enter your work email address.' });
      update({ busy: true });
      try {
        await sendReset(email);
      } catch (error) {
        if (!['auth/user-not-found', 'auth/user-disabled'].includes(error?.code)) return update({ view: 'request', busy: false, error: failureMessage(error) });
      }
      return update({ view: 'sent', busy: false, email: '' });
    },
  };
}
