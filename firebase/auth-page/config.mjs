// Firebase web API keys identify a project; they are public client configuration.
export const firebaseWebConfig = Object.freeze({
  apiKey: 'AIzaSyBiKz88kMEAB5C-oRn3qN6E7KooDcmYTWE',
  authDomain: 'bickers-booking.firebaseapp.com',
  projectId: 'bickers-booking',
});

// Public production client identifier, verified in the Clerk dashboard.
// Development/visual previews must not send recovery requests to this instance.
export const clerkPublishableKey = 'pk_live_Y2xlcmsuYmlja2Vycy5jby51ayQ';

// Enable the primary backend only with its reviewed website cutover.
export const clerkRecoveryConfig = Object.freeze({
  defaultDeployment: 'pilot', enabledDeployments: Object.freeze(['pilot']),
});
