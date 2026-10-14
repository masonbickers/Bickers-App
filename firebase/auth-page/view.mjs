const $ = id => document.getElementById(id);
let lastView = '';
const content = {
  request: ['Forgot your password?', 'Enter your work email and we’ll send a code to reset your Bickers password.'],
  loading: ['Opening secure recovery', 'Please wait while we connect to your account service.'],
  'load-error': ['Unable to connect', 'Check your connection, then try again.'],
  code: ['Check your email', 'If an eligible Bickers account exists, a reset code will arrive shortly. Check your junk folder too.'],
  password: ['Choose a new password', 'Your email is verified. Choose a strong, unique password for your Bickers account.'],
  challenge: ['One more security check', 'Your password has been saved. Complete your account’s additional verification to finish.'],
  'challenge-unavailable': ['Additional verification needed', 'Your password has been saved, but this verification method needs the secure account portal. Contact your Bickers administrator for help.'],
  finishing: ['Confirming your recovery', 'Your password has been saved. Please wait while we confirm account recovery.'],
  'finish-error': ['Password saved — confirmation needed', 'Your password has changed, but recovery confirmation could not finish. Retry confirmation; you do not need to enter your password again.'],
  uncertain: ['Check the recovery status', 'The connection was interrupted. Check the status before trying again. You may need to request a fresh code.'],
  success: ['Password updated', 'Your Bickers password has been changed and recovery is complete.'],
  legacy: ['Opening your reset link', 'Taking you to the secure page for your existing reset link.'],
};
const factorNames = { totp: 'Authenticator app', backup_code: 'Backup code', phone_code: 'Text message', email_code: 'Email code' };

export function render(state) {
  const changed = lastView !== state.view;
  const [heading, description] = content[state.view] || content['load-error'];
  $('heading').textContent = heading;
  $('description').textContent = description;
  for (const [id, view] of [['request-form', 'request'], ['code-form', 'code'], ['reset-form', 'password'], ['challenge-form', 'challenge'], ['success', 'success']]) $(id).hidden = state.view !== view;
  $('retry').hidden = !['load-error', 'finish-error', 'uncertain'].includes(state.view);
  $('retry').textContent = state.view === 'finish-error' ? 'Retry confirmation ↻' : state.view === 'uncertain' ? 'Check recovery status ↻' : 'Try again ↻';
  $('error').hidden = !state.error;
  $('error').textContent = state.error || '';
  $('status').textContent = state.busy ? 'Please wait…' : '';
  for (const element of document.querySelectorAll('form input,form select,form button,#retry')) element.disabled = state.busy;
  $('main').setAttribute('aria-busy', String(state.busy));
  for (const id of ['password', 'confirmation', 'code', 'factor-code', 'email']) $(id).setAttribute('aria-invalid', String(Boolean(state.error) && !$(id).closest('form').hidden));
  const factors = state.factors || [];
  if ([...$('factor').options].map(item => item.value).join(',') !== factors.join(',')) {
    $('factor').replaceChildren(...factors.map(value => { const option = document.createElement('option'); option.value = value; option.textContent = factorNames[value]; return option; }));
  }
  $('factor').value = state.factor || '';
  if (changed) {
    for (const id of ['password', 'confirmation', 'code', 'factor-code']) $(id).value = '';
    for (const button of document.querySelectorAll('.reveal')) { $(button.getAttribute('aria-controls')).type = 'password'; button.setAttribute('aria-pressed', 'false'); button.firstChild.textContent = 'Show'; }
    if (!['loading', 'legacy'].includes(state.view)) $('main').focus({ preventScroll: true });
  }
  lastView = state.view;
}

export function bind(flow) {
  const form = (id, action) => $(id).addEventListener('submit', event => { event.preventDefault(); void action(); });
  form('request-form', () => flow.request($('email').value));
  form('code-form', () => flow.verify($('code').value));
  form('reset-form', () => { const password = $('password').value; const confirmation = $('confirmation').value; $('password').value = ''; $('confirmation').value = ''; return flow.reset(password, confirmation); });
  form('challenge-form', () => { const code = $('factor-code').value; $('factor-code').value = ''; return flow.verifyFactor(code); });
  $('factor').addEventListener('change', () => { void flow.selectFactor($('factor').value); });
  $('prepare-factor').addEventListener('click', () => { void flow.selectFactor($('factor').value); });
  $('restart').addEventListener('click', () => { void flow.open(''); });
  $('retry').addEventListener('click', () => { void flow.retry(); });
  $('open-app').addEventListener('click', () => flow.go('app'));
  $('open-web').addEventListener('click', () => flow.go('web'));
  for (const button of document.querySelectorAll('.reveal')) button.addEventListener('click', () => {
    const input = $(button.getAttribute('aria-controls')); const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password'; button.setAttribute('aria-pressed', String(visible)); button.firstChild.textContent = visible ? 'Hide' : 'Show';
  });
}
