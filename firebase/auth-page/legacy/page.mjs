import { render } from './view.mjs';
import { createResetFlow } from '../reset-flow.mjs';
import { firebaseWebConfig } from '../config.mjs';

const $ = id => document.getElementById(id);
const originalSearch = location.search;
// Referrer-Policy protects the code while the user can still refresh/retry.
// Remove it from browser history only after Firebase consumes it successfully.

try {
  const [{ initializeApp }, { initializeAuth, inMemoryPersistence, verifyPasswordResetCode, confirmPasswordReset, sendPasswordResetEmail, validatePassword }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js'),
  ]);
  // Public Firebase web configuration; never take a project/API key from a link.
  const auth = initializeAuth(initializeApp(firebaseWebConfig), { persistence: inMemoryPersistence });
  const flow = createResetFlow({
    verifyCode: code => verifyPasswordResetCode(auth, code),
    confirmReset: (code, password) => confirmPasswordReset(auth, code, password),
    sendReset: email => sendPasswordResetEmail(auth, email),
    validatePassword: password => validatePassword(auth, password),
    onState: state => {
      if (state.view === 'success') history.replaceState(null, '', location.pathname);
      render(state);
    },
  });
  $('reset-form').addEventListener('submit', event => { event.preventDefault(); void flow.submit($('password').value, $('confirmation').value); });
  $('request-form').addEventListener('submit', event => { event.preventDefault(); void flow.request($('email').value); });
  $('retry').addEventListener('click', () => { void flow.open(originalSearch); });
  const initial = await flow.open(originalSearch);
  if (initial.view === 'fallback') location.replace(initial.url);
} catch {
  render({ view: 'retry', busy: false, error: 'The secure reset page couldn’t load. Please reload this page or open the original email link again.' });
  $('retry').textContent = 'Reload page ↻';
  $('retry').addEventListener('click', () => { location.search = originalSearch; });
}
