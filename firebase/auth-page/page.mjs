import { render, bind } from './view.mjs';
import { createClerkResetFlow } from './clerk-reset-flow.mjs';
import { createClerkResetClient, confirmClerkRecovery } from './clerk-client.mjs';
import { clerkPublishableKey, clerkRecoveryConfig } from './config.mjs';
import { selectRecoveryDeployment } from './recovery-deployment.mjs';

const deployment = selectRecoveryDeployment(location.search, clerkRecoveryConfig);
const flow = createClerkResetFlow({ client: createClerkResetClient({ publishableKey: clerkPublishableKey }),
  deployment, finishRecovery: token => confirmClerkRecovery(token, fetch, deployment), redirect: url => location.assign(url), onState: render,
});
bind(flow);
const initial = await flow.open(location.search);
if (initial.view === 'legacy') location.replace(initial.url);
