// Explicit synthetic ingestion check; never reads employee or application data.
import { randomUUID } from 'node:crypto';
import { sanitizeErrorEvent } from '../../lib/errorMonitoringPrivacy.js';
const dsn = new URL('https://8525202b2dabf2e53a933ef3a9723789@o4512248901402624.ingest.de.sentry.io/4512249010782288');
const event = sanitizeErrorEvent({
  event_id: randomUUID().replaceAll('-', ''),
  timestamp: Date.now() / 1000,
  platform: 'javascript', level: 'error', environment: 'setup-test',
  exception: { values: [{ type: 'BickersMonitoringSetup', value: 'Synthetic error: no employee data', stacktrace: { frames: [{ filename: 'sentry-smoke-test.mjs', function: 'verifySentryIngestion', lineno: 1, in_app: true }] } }] },
});
const envelope = [JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString(), dsn: dsn.href }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
const response = await fetch(`${dsn.protocol}//${dsn.host}/api${dsn.pathname}/envelope/`, { method: 'POST', headers: { 'Content-Type': 'application/x-sentry-envelope', 'X-Sentry-Auth': `Sentry sentry_version=7,sentry_key=${dsn.username},sentry_client=bickers-setup/1.0` }, body: envelope });
if (!response.ok) throw new Error(`Sentry rejected synthetic event: ${response.status}`);
console.info(JSON.stringify({ status: response.status, eventId: event.event_id, result: await response.json() }));
