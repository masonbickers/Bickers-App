const $ = id => document.getElementById(id);
let lastView = '';
const content = {
  checking: ['Checking your link', 'Please wait while we check your password reset link.'],
  request: ['Forgot your password?', 'Enter your work email and we’ll send you a link to choose a new password.'],
  expired: ['Let’s get a fresh link', 'This reset link has expired or has already been used. Enter your work email to request another.'],
  ready: ['Reset your password', 'Choose a new password for your Bickers account.'],
  success: ['Password updated', 'Your Bickers password has been changed successfully.'],
  sent: ['Check your email', 'If an approved account exists for this email, you’ll receive a password reset link. Check your junk folder too.'],
  retry: ['Unable to check your link', 'Check your internet connection, then try again.'],
  invalid: ['This link isn’t valid', 'Open the password reset link from your email, or request a new one from the Bickers app.'],
  fallback: ['Opening your account link', 'Taking you to the secure page to complete this account action.'],
};

export function render(state) {
  const [heading, description] = content[state.view];
  const changedView = state.view !== lastView;
  $('heading').textContent = heading;
  $('description').textContent = state.view === 'ready' ? `Choose a new password for ${state.email}.` : description;
  $('reset-form').hidden = state.view !== 'ready';
  $('request-form').hidden = !['request', 'expired'].includes(state.view);
  $('retry').hidden = state.view !== 'retry';
  $('success').hidden = state.view !== 'success';
  $('error').hidden = !state.error;
  $('error').textContent = state.error || '';
  $('status').textContent = state.busy && state.view !== 'checking' ? 'Please wait…' : '';
  $('reset-submit').textContent = state.busy ? 'Saving…' : 'Save new password →';
  $('request-submit').textContent = state.busy ? 'Sending…' : 'Send reset link →';
  for (const element of document.querySelectorAll('form input,form button,#retry')) element.disabled = state.busy;
  $('main').setAttribute('aria-busy', String(state.busy));
  for (const id of ['password', 'confirmation']) $(id).setAttribute('aria-invalid', String(Boolean(state.error) && state.view === 'ready'));
  if (changedView && ['success', 'expired', 'sent', 'invalid'].includes(state.view)) {
    $('password').value = '';
    $('confirmation').value = '';
  }
  if (changedView && state.view !== 'checking' && state.view !== 'fallback') {
    $('main').focus({ preventScroll: true });
  }
  lastView = state.view;
}

for (const button of document.querySelectorAll('.reveal')) button.addEventListener('click', () => {
  const input = $(button.getAttribute('aria-controls'));
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(visible));
  button.firstChild.textContent = visible ? 'Hide' : 'Show';
});

