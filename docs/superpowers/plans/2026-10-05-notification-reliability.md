# Notification Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make existing notifications visible to their intended users and deliver important alerts reliably while the app is closed.

**Architecture:** Normalize account ownership at authenticated boundaries and retain fail-closed inbox filtering. Add a separate durable notification queue using the existing receipt delivery pattern, without modifying receipt processing. Enable server delivery by notification type before replacing corresponding local alerts; publish bounded mobile changes from each platform's released source.

**Tech Stack:** React Native/Expo, Firebase Admin/Firestore, existing Node mobile API, existing Next.js hosted scheduler, Expo push tickets and receipts.

**Spec:** `docs/superpowers/plans/2026-10-05-notification-reliability-spec.md`

## Global Constraints

- Preserve notification preferences, maintenance reminders off by default, and existing timesheet reminder times: Sunday 18:00, Monday 08:00 and 12:00.
- Keep runtime 5.0.12 and current native configuration.
- Keep receipts' existing delivery implementation unchanged.
- Do not replay historical push notifications.
- Use independently reviewed changes based on each current production source, never the heavily modified working checkout.
- Use Europe/London for server business schedules, with daylight-saving tests; preserve existing device-local maintenance time until an explicit preference migration is implemented.
- Preserve the Booking project's Project Control records and release gates.

## Review Focus

- Account changes during an in-flight inbox response must never reveal the previous account's notifications (Task 1).
- Worker crashes after provider acceptance must not repeat already accepted pushes (Task 2).
- Monday rollover, British daylight-saving changes and submission immediately before dispatch must preserve correct reminder cancellation (Task 3).
- Old and updated phones must not receive duplicate local and server alerts during migration (Task 4).
- A disabled preference or revoked account must prevent dispatch even when a job was queued earlier (Task 2).

### Task 1: Account-safe inbox normalization

**Files:** Modify mobile `lib/remoteNotifications.js`, `hooks/useEmployeeNotifications.js`; mobile API `server/index.js` notification response; test `tests/notificationVisibility.test.js`, new `tests/remoteNotificationOwnership.test.js`.

**Interfaces:** Preserve `saveRemoteNotificationToInbox(notification, employeeId)` compatibility, extending with a validated account context. API envelopes expose canonical `recipientUid`, `recipientEmployeeId`, `companyId`, `type`, `category`; reject conflicting ownership rather than overwrite it. Existing `notificationVisibleToAccount(item, account)` remains fail-closed.

- [ ] Add failing tests: general and maintenance notifications from the authenticated account become visible; another account/company stays invisible; switching accounts during sync drops stale results; receipt ownership remains unchanged.
- [ ] Run `NODE_OPTIONS=--experimental-vm-modules npx jest tests/remoteNotificationOwnership.test.js tests/notificationVisibility.test.js --runInBand`; confirm the current generic visibility case fails.
- [ ] Preserve canonical ownership in API and listener envelopes; normalize trusted recipient metadata for all types and guard asynchronous sync against account changes.
- [ ] Run the same tests plus notification inbox stability tests; require all pass and API authorization regression tests remain green.
- [ ] Commit only this bounded delta in an isolated checkout: `fix: preserve notification recipient ownership`.

### Task 2: Durable background delivery

**Files:** Booking project `src/app/api/_notificationDelivery.js`; create `src/app/api/_notificationJobs.js`, `src/app/api/notifications/jobs/route.js`, `tests/notificationJobs.test.mjs`; modify `vercel.json` only after live scheduler verification. Leave `src/app/api/receipts/_v2Notifications.js` unchanged.

**Interfaces:** `enqueueNotificationDelivery({eventId, recipientUid, companyId, category, notificationId, data}, transaction)` writes a deterministic job alongside its inbox record. `processNotificationJobs({now, limit})` returns counts by `pending`, `accepted`, `confirmed`, `retry_wait`, `permanent_failure`, `no_active_device`; accepted ticket IDs are persisted before receipt polling. Per-device state uses canonical registered tokens.

- [ ] Verify current live Booking source, cron support, worker authentication and token ownership model. Record evidence without exposing secrets; if the host cannot support the worker, resolve hosting before enabling delivery.
- [ ] Add failing tests for atomic inbox/job creation, replay deduplication, concurrent leases, retryable transport failure, accepted-ticket crash recovery, receipt confirmation, invalid-token disabling, preference changes and revoked accounts.
- [ ] Run `node --test tests/notificationJobs.test.mjs`; require failures on absent delivery implementation.
- [ ] Implement leased due jobs, bounded exponential retries and receipt polling with deterministic event/device identities. Recheck eligibility at dispatch; never enqueue historical backfill. Secure the worker with the existing scheduler authentication pattern.
- [ ] Run worker tests and existing receipt notification tests, plus Firestore transaction integration tests; require no receipt behavior changes.
- [ ] Commit the isolated backend delta: `feat: add durable delivery for existing notifications`.

### Task 3: Reliable timesheet scheduling

**Files:** Booking project create `src/app/api/_timesheetNotificationSchedule.js`, `tests/timesheetNotificationSchedule.test.mjs`; integrate Task 2 worker; mobile `lib/timesheetReminders.js`, `hooks/useEmployeeNotifications.js`, `tests/timesheetReminderFlow.test.js`.

**Interfaces:** `getDueTimesheetReminderEvents({now, employee, timesheets, timezone})` returns deterministic employee/week/slot events using Europe/London. Dispatch rechecks submitted/approved state. Existing manual reminder route remains supported; automatic reminders share the delivery dedupe contract where applicable.

- [ ] Add failing tests for Sunday 18:00, Monday 08:00 and 12:00; preceding week's incomplete sheet; week rollover while app stays open; daylight-saving boundaries; submitted/approved cancellation; worker catch-up within the current slot without stale-week spam.
- [ ] Run `node --test tests/timesheetNotificationSchedule.test.mjs` and `NODE_OPTIONS=--experimental-vm-modules npx jest tests/timesheetReminderFlow.test.js --runInBand`; verify new cases fail before code changes.
- [ ] Implement server due-event scheduling and client foreground/week rollover reconciliation. Keep maintenance reminders local and opt-in in this release; moving them server-side requires an explicit preference migration and separate verification.
- [ ] Run schedule and reminder tests with a controlled clock; require exactly one eligible event per employee/week/slot and no reminder after submission.
- [ ] Commit: `fix: harden timesheet reminder scheduling`.

### Task 4: Safe client migration and delivery diagnostics

**Files:** Mobile `app/_layout.jsx`, `hooks/useEmployeeNotifications.js`, `lib/notifications.js`, `lib/mobileApi.js`; mobile API capability response in `server/index.js`; create `tests/notificationDeliveryMigration.test.js`.

**Interfaces:** Authenticated capability response advertises server delivery readiness per type and rollout eligibility. Client uses canonical event IDs for inbox dedupe, refreshes token registration on foreground when needed, and suppresses local alerts only for a confirmed server-owned type. A rollback disables server ownership without silently losing client fallback.

- [ ] Add failing tests for legacy clients, updated clients, offline startup, failed capability fetch, account switch, duplicate event reception, denied permission, token rotation and server rollback. Specify a transition cutoff so previously scheduled local reminders and new server reminders do not overlap.
- [ ] Run `NODE_OPTIONS=--experimental-vm-modules npx jest tests/notificationDeliveryMigration.test.js --runInBand`; confirm new migration cases fail.
- [ ] Implement capability-gated migration, foreground token refresh and safe notification navigation. Diagnostics distinguish queued, provider accepted, provider confirmed and failed; none of these claim the user read the notification.
- [ ] Run migration, visibility, transition and inbox stability tests; require no duplicate alerts and existing account/receipt filtering preserved.
- [ ] Commit: `fix: coordinate notification delivery migration`.

### Task 5: Verification and staged release

**Files:** Create `docs/notification-reliability-release-2026-10-05.md`, `output/notification-reliability-20261005/`; update Booking `project-control` records only with independently verified evidence.

**Interfaces:** Deploy backend and authenticated worker first with migrated types disabled. Verify health and queue behavior, then publish iOS and Android OTA from their respective current production snapshots. Enable types gradually after evidence and preserve rollback switches.

- [ ] Run full mobile suite using `NODE_OPTIONS=--experimental-vm-modules npm test`, type checking, notification visual checks, backend/worker suites and relevant permission/transaction emulator tests. Record failures and baseline-only limitations honestly.
- [ ] Obtain an independent code/security review focused on the five Review Focus cases; resolve material findings and rerun affected tests.
- [ ] Verify native config/dependency/runtime deltas are empty; deploy reviewed backend snapshots, verify authenticated worker and safe dry-run jobs without sending bulk staff alerts.
- [ ] Test one consenting staff test account on iPhone and Android: foreground, background, fully closed, permission denied, tap routing, submission cancellation and retry. If devices are unavailable, record the limitation and do not claim device delivery verified.
- [ ] Publish bounded OTA updates for both platforms, verify production manifest IDs and bundle hashes, then enable validated notification types. Do not activate overlapping timesheet delivery until transition tests pass.
- [ ] Save release receipts, rollback instructions and actual checks; publish Booking Project Control via its reviewed snapshot procedure. Report what is live and any remaining device-validation limits.

## Self-review

All specified outcomes map to tasks above. Ownership remains validated rather than globally relaxed; finance receipt delivery stays untouched; maintenance defaults stay unchanged; hosted worker readiness is a prerequisite; native changes are excluded. Physical-device validation remains distinct from automated and provider evidence.

## Plan review

Planning only: implementation and publication have not started. Recommended execution is native implementation in this chat with one independent final review, keeping tightly related interfaces together and avoiding concurrent edits to the same repositories.
