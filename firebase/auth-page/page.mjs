import { render, bind } from './view.mjs';
import { createClerkResetFlow } from './clerk-reset-flow.mjs';
import { createClerkResetClient, confirmClerkRecovery } from './clerk-client.mjs';
import { clerkPublishableKey } from './config.mjs';

const flow = createClerkResetFlow({ client: createClerkResetClient({ publishableKey: clerkPublishableKey }),
  finishRecovery: confirmClerkRecovery, redirect: url => location.assign(url), onState: render,
});
bind(flow);
const initial = await flow.open(location.search);
if (initial.view === 'legacy') location.replace(initial.url);
