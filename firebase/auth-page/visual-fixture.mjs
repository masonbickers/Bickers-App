// Build-only renderer fixture. Never copied to the production Hosting output.
import { render, bind } from './view.mjs';
import { createClerkResetFlow } from './clerk-reset-flow.mjs';
const scenario = new URLSearchParams(location.search).get('scenario') || 'request';
document.documentElement.dataset.previewTheme = new URLSearchParams(location.search).get('theme') === 'dark' ? 'dark' : 'light';
const saved = stage => ({ stage, resetVerified: true, passwordSaved: true, factors: ['totp', 'backup_code'] });
const client = {
  resume: async () => scenario === 'password' ? { stage: 'password', resetVerified: true } : scenario === 'challenge' ? saved('challenge') : scenario === 'success' || scenario === 'finish-error' ? saved('complete') : null,
  requestReset: async () => {}, verifyResetCode: async () => ({ stage: 'password', resetVerified: true }), resetPassword: async () => saved('complete'),
  activate: async () => 'visual-fixture', prepareFactor: async () => {}, verifyFactor: async () => saved('complete'),
};
const flow = createClerkResetFlow({ client, finishRecovery: async () => { if (scenario === 'finish-error') throw new Error('fixture'); return { completed: true }; }, onState: render });
bind(flow);
await flow.open('');
if (scenario === 'code') await flow.request('preview@bickers.co.uk');
if (scenario === 'error') { await flow.request('preview@bickers.co.uk'); await flow.verify(''); }
