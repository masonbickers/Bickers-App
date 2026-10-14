import * as Sentry from '@sentry/react-native';
import { sanitizeErrorEvent } from './errorMonitoringPrivacy';

export const SENTRY_DSN = 'https://8525202b2dabf2e53a933ef3a9723789@o4512248901402624.ingest.de.sentry.io/4512249010782288';

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !__DEV__,
  environment: process.env.EXPO_PUBLIC_APP_ENV || 'production',
  sendDefaultPii: false,
  maxBreadcrumbs: 0,
  attachScreenshot: false,
  attachViewHierarchy: false,
  attachThreads: false,
  enableAutoSessionTracking: false,
  enableLogs: false,
  tracesSampleRate: 0,
  profilesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  enableAutoPerformanceTracing: false,
  enableUserInteractionTracing: false,
  enableCaptureFailedRequests: false,
  beforeBreadcrumb: () => null,
  beforeSend: sanitizeErrorEvent,
});

export const withErrorMonitoring = Sentry.wrap;
