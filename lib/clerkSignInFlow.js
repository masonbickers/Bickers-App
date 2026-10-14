const factorsSupported = new Set(['totp', 'email_code', 'phone_code', 'backup_code']);
const check = result => { if (result?.error) throw result.error; };
const initial = () => ({ step: 'password', busy: false, factors: [], factor: null, error: null });

export function createClerkSignInFlow({ getSignIn, cancelSession, onChange = () => {} }) {
  let state = initial();
  let generation = 0;
  let tail = Promise.resolve();
  const publish = patch => { state = { ...state, ...patch }; onChange({ ...state }); };
  const current = id => id === generation;
  async function prepare(resource, factor, id) {
    if (factor === 'email_code') check(await resource.mfa.sendEmailCode());
    if (factor === 'phone_code') check(await resource.mfa.sendPhoneCode());
    if (current(id)) publish({ step: 'challenge', factor });
  }
  async function advance(resource, id) {
    if (!current(id)) return;
    if (resource.status === 'complete') {
      let hasTask = false;
      const sessionId = resource.createdSessionId;
      check(await resource.finalize({ navigate: ({ session }) => { hasTask = !!session?.currentTask; } }));
      if (!current(id) && sessionId) await cancelSession(sessionId);
      if (current(id)) publish({ step: hasTask ? 'browser' : 'complete' });
    } else if (['needs_second_factor', 'needs_client_trust'].includes(resource.status)) {
      const factors = [...new Set((resource.supportedSecondFactors || []).map(row => row.strategy).filter(value => factorsSupported.has(value)))];
      if (!factors.length) return publish({ step: 'browser' });
      publish({ step: 'challenge', factors });
      await prepare(resource, factors[0], id);
    } else publish({ step: resource.status === 'needs_new_password' ? 'recovery' : 'browser' });
  }
  function operate(action) {
    if (state.busy) return Promise.resolve();
    const id = generation;
    publish({ busy: true, error: null });
    const pending = tail.then(async () => {
      if (!current(id)) return;
      const resource = getSignIn();
      if (!resource) throw new Error('not-ready');
      await action(resource, id);
    }).catch(() => {
      if (current(id)) publish({ error: state.step === 'challenge' ? 'The code could not be verified. Check it and try again, or request a new code.' : 'Unable to sign in. Check your details and try again.' });
    }).finally(() => { if (current(id)) publish({ busy: false }); });
    tail = pending;
    return pending;
  }
  return {
    getState: () => ({ ...state, factors: [...state.factors] }),
    password: (emailAddress, password) => operate(async (resource, id) => {
      check(await resource.password({ emailAddress, password }));
      await advance(resource, id);
    }),
    selectFactor: factor => operate(async (resource, id) => {
      if (state.step !== 'challenge' || !state.factors.includes(factor)) throw new Error('unsupported-factor');
      await prepare(resource, factor, id);
    }),
    resend: () => operate((resource, id) => prepare(resource, state.factor, id)),
    verify: code => operate(async (resource, id) => {
      if (state.step !== 'challenge' || !String(code || '').trim()) throw new Error('missing-code');
      const methods = { email_code: 'verifyEmailCode', phone_code: 'verifyPhoneCode', totp: 'verifyTOTP', backup_code: 'verifyBackupCode' };
      const method = methods[state.factor];
      if (!method) throw new Error('unsupported-factor');
      check(await resource.mfa[method]({ code: String(code).trim() }));
      await advance(resource, id);
    }),
    cancel: () => {
      generation++;
      publish(initial());
      const pending = tail.then(() => getSignIn()?.reset()).catch(() => {});
      tail = pending;
      return pending;
    },
  };
}
