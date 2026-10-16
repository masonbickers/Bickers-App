# Cache-first Mobile Startup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Recommended execution: implement inline, then obtain one focused independent review of the completed session/cache change.

**Goal:** Show returning users saved operational content quickly while current authentication and independent startup reads complete in the background.

**Architecture:** Keep cached display eligibility separate from verified authentication. A small versioned snapshot store restores a read-only presentation; the existing Clerk/Firebase chain continues to control authenticated work. Preserve matching account caches, overlap independent reads and refresh individual resources without a global screen reset.

**Tech Stack:** React Native/Expo 55, React 19, Clerk Expo, Firebase JS, existing Expo SecureStore and AsyncStorage, Node test runner with existing Babel/VM component harnesses.

**Spec:** [Approved startup design](../specs/2026-10-16-cache-first-startup-design.md).

## Global Constraints

- Approved display eligibility limit: 24 hours since successful full verification.
- Approved initial scope: saved operational Home/Schedule/job summaries. HR details, private documents, admin screens, account/security settings and other unreviewed routes wait for current verification.
- Showing a previously downloaded record does not set `isAuthed` or start uploads, mutations, subscriptions or notification registration.
- A network timeout alone keeps an eligible saved view read-only and offers retry; it does not declare the account revoked.
- Keep the required chain: Clerk session token, server bridge verification, then Firebase authentication.
- Existing drafts/outbox ownership rules remain intact; do not delete user work as part of preview invalidation.
- Record no account identifiers, credentials or business data in timing logs. No remote analytics service is added.
- This design does not change Firebase/Storage rules, Clerk configuration, server lease durations, staff accounts or production deployments.
- Preserve existing pilot changes, particularly removal of the redundant Render sync. The unrelated local Me correction must not be overwritten or silently included in this feature's commit.
- Use existing shared UI primitives and semantic tokens. Read the design-system sources and global-ui-consistency skill before rendering changes. No dependency upgrade or global styling migration.

## Review Focus

1. Process death between logout intent and cache deletion: the next launch must not display the old account. Task 1 tests a durable tombstone and rejected delayed saves.
2. Matching Firebase UID but changed Clerk session/company/employee: stale data must not become eligible merely because one identifier matches. Tasks 2 and 3 test each mismatch.
3. Network failure versus explicit denial: offline users retain only the eligible preview; revoked users lose it. Tasks 2, 3 and 5 test both outcomes and ordering.
4. Partial resources, valid empty schedules and truncated snapshots: partial data must not imply that no work exists. Tasks 1, 4 and 5 test these distinctions.
5. Cache expiry while visible, clock rollback and late completion after an account switch: expiry or supersession must hide stale content and prevent resurrection. Tasks 1, 3 and 5 test these transitions.

## Source and execution preparation

The approved implementation baseline is the shared Clerk pilot at `76f76b6cd440b2f6f714dee69007aca240e58418`, plus the existing local provider startup fix and its `tests/clerkNativeStartup.test.js`. The inspected pilot is `/Users/masonbickers/.codex/worktrees/shared-clerk-auth/bickers-app-launch`; the current chat checkout contains older Firebase authentication. Recheck these identities and changes before execution. Do not implement against the older checkout just because it is writable.

Use native worktree/artifact tooling to inspect available ownership and isolation at execution time. Reuse the pilot only if suitable and not concurrently being changed. Otherwise create an isolated checkout from the verified pilot ref and carry the named startup patch and test explicitly, retaining their provenance. Preserve all other existing work. Do not copy `.firebase`, credentials, environment files or private migration evidence. Resolve write access through the normal sandbox mechanism; do not work around it.

The bundled compatible runtime observed in this chat is `/Users/masonbickers/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` (24.19.0). Set `BICKERS_NODE` to that executable for the commands below. It supports automatic ES-module detection; the package script's `--experimental-default-type=module` flag was rejected by this runtime. Do not alter `package.json` merely to suppress the resulting module-type warnings.

- [ ] Record the execution checkout/ref and the existing patch identities; read its applicable instructions. Reuse installed dependencies if intact.
- [ ] Run the focused baseline: `"$BICKERS_NODE" --experimental-vm-modules --test tests/clerkNativeStartup.test.js tests/clerkSessionCoordinator.test.js tests/mobileClerkAccess.test.js tests/clerkBridgeClient.test.js tests/workingTermsLookup.test.js tests/authRestorationLoading.test.js tests/sessionRestorationShell.test.js tests/sessionCache.test.js tests/accountSessionCache.test.js tests/offlineSync.test.js`. Retain failures as baseline evidence rather than weakening tests.

## Shared contracts

Define JSDoc/TypeScript-compatible types in `lib/startup/snapshot.js`:

- `StartupIdentity = { clerkUserId, clerkSessionId, uid, companyId, employeeId }`, all exact nonempty strings. Do not lowercase or lossy-sanitize identifiers. Encode the tuple reversibly for storage keys.
- `StartupJob = { id, dateISO, title, jobNumber, callTime, location }`, bounded strings projected from currently verified visible jobs. No raw booking spreads, notes, contacts, costs, attachments or HR fields.
- `StartupSnapshot = { version: 1, identity, generation, verifiedAt, savedAt, route: 'home' | 'schedule', selectedDateISO, selectedJobId: string | null, jobs, completeDates, truncated }`. A selected job is a local preview selection; normal handoff uses the existing Home/Schedule routes and date parameter.
- `StartupDisplayState = { restored, status: 'loading' | 'empty' | 'available' | 'unavailable' | 'invalidated', snapshot: StartupSnapshot | null }`.
- Native snapshot persistence is enabled only for the shared Clerk flow. Legacy Firebase and web startup retain their existing behaviour; web may use the ordinary existing authenticated cache, with no new secure-store assumption.

## Task 1: Bounded, crash-safe snapshot persistence

**Files:** create `lib/startup/snapshot.js`, `lib/startup/snapshotStore.js`, `lib/startup/nativeSnapshotStorage.js`, `tests/startupSnapshot.test.js`, `tests/startupSnapshotStore.test.js`.

**Interfaces:** `validateSnapshot(value, { identity?, now }) -> StartupSnapshot | null`; `projectStartupSnapshot(input) -> StartupSnapshot | null`; `createStartupSnapshotStore({ secureStorage, dataStorage, now }) -> { restore(), activate(identity, verifiedAt), save(view, generation), invalidate(reason), getState(), subscribe(listener) }`. `activate` returns the current generation; all methods except `getState`/`subscribe` return promises. Invalidation increments the in-memory generation synchronously before asynchronous persistence.

- [ ] Write failing behaviour tests: a snapshot is eligible at `24 * 60 * 60 * 1000 - 1` milliseconds and ineligible at the exact 24-hour boundary; future timestamps, unknown versions, malformed identities and foreign scopes return null. Fields such as `notes`, `email` and `signature` never survive projection.
- [ ] Write crash/race tests with deferred storage: logout persists an invalidated secure envelope before deletion/provider sign-out; an older pending save cannot reactivate it; failed secure reads produce no preview. If durable invalidation fails, hide the current preview, keep invalidation retryable and do not report logout as completed or activate a successor account. Test the next restoration after each completed write boundary.
- [ ] Run `"$BICKERS_NODE" --test tests/startupSnapshot.test.js tests/startupSnapshotStore.test.js`; confirm new assertions fail for the intended missing behaviour.
- [ ] Implement a single versioned secure envelope and account-scoped JSON payload. Commit payload first and active envelope last, checking generation within a serialized persistence queue. Existing Expo SecureStore stores only the small envelope; AsyncStorage stores the bounded display projection. Persist no credentials. Cap payloads at 256 KiB UTF-8 and 200 job summaries; set `truncated` and avoid false empty/complete claims when a projection cannot cover a requested date. Failed/corrupt snapshots fall back to the normal skeleton.
- [ ] Add visible-expiry/clock checks to store eligibility and refresh them on restoration and foreground. Do not treat the 24-hour display allowance as a provider authorization lease.
- [ ] Re-run the two tests to PASS, then commit only this task's files as `feat: add scoped startup display snapshots`.

## Task 2: Preserve matching cache and invalidate rejected identities

**Files:** create `providers/StartupSnapshotProvider.jsx`; modify `providers/ClerkFirebaseProvider.jsx`, `lib/clerkSessionCoordinator.js`, `lib/accountSessionCache.js`, `providers/DataCacheProvider.tsx`; extend `tests/clerkSessionCoordinator.test.js`, `tests/accountSessionCache.test.js`; create `tests/startupCacheLifecycle.test.js`.

**Interfaces:** `useStartupSnapshot() -> store operations + StartupDisplayState`; provider wraps `ClerkFirebaseProvider` and has no dependency on `AuthProvider`. Add a coordinator dependency `prepareAccountCache({ clerkIdentity, uid }) -> Promise<void>` with existing full-clear behaviour as its fallback. Keep explicit `clearAccountCache()` for logout/rejection. Add structured context outcome `sessionStatus: 'restoring' | 'verified' | 'signed-out' | 'denied' | 'unavailable'` without deriving it from translated error text.

- [ ] Add failing tests proving that an exact persisted Clerk-session/UID match preserves cache during cold reconnection, while explicit logout, a different session/user/UID, or missing/corrupt envelope clears it. A temporary Firebase-null render during reconnection must not erase the confirmed scope. Unknown company/employee data cannot make a new cache scope eligible before current verification.
- [ ] Test 401/403 denial versus timeout/503: denial invalidates the preview before provider logout; unavailability never enables protected readiness and preserves only the eligible display snapshot. Test delayed cache writes after scope change and simultaneous foreground requests.
- [ ] Run `"$BICKERS_NODE" --experimental-vm-modules --test tests/startupCacheLifecycle.test.js tests/clerkSessionCoordinator.test.js tests/accountSessionCache.test.js tests/sessionCache.test.js tests/securityOfflineIdentity.test.js tests/offlineSync.test.js` and capture RED.
- [ ] Integrate the store with Clerk lifecycle callbacks. Always invalidate display eligibility before account replacement or explicit logout. Preserve the existing Firebase custom-token exchange and mutation serialization; do not add persisted authorization reuse. Defer `DataCacheProvider` destructive scope cleanup through provisional restoration, then clear the previous scope on a confirmed identity change. Make asynchronous writes recheck their captured scope generation before updating memory or persistence. Preserve draft/outbox storage.
- [ ] Re-run lifecycle, coordinator, account-cache, session-cache and offline-identity tests to PASS. Commit `fix: preserve returning account cache during restoration`.

## Task 3: Parallel verification reads with explicit outcomes

**Files:** modify `providers/AuthProvider.tsx`, `lib/mobileClerkAccess.js`; create `lib/startup/loadVerifiedSession.js`, `tests/startupParallelSession.test.js`; extend `tests/authRestorationLoading.test.js`, `tests/mobileClerkAccess.test.js`.

**Interfaces:** `loadVerifiedSession({ readPreferences, resolveAccess, readTerms, isCurrent }) -> Promise<{ preferences, access, terms, termsError } | null>`. Start the three independent operations after authenticated Firebase identity is established. Collect failures without unhandled rejections or partial publication. `resolveMobileClerkAccess` uses an explicit `code: 'MOBILE_ACCESS_DENIED'` for local identity/approval rejection while preserving network errors. Auth context adds `startupAccessStatus: 'restoring' | 'verified' | 'signed-out' | 'denied' | 'unavailable' | 'terms-required'`; `isAuthed` is never set from a snapshot.

- [ ] Use deferred dependencies to assert all three reads start before any finishes, but verified state and snapshot activation wait for every required check and accepted Working Terms. Keep canonical user-to-employee lookup ordered inside `resolveAccess`.
- [ ] Test revoked/disabled/mismatched identity, absent terms, terms service unavailable, superseded generation/revision and account switching during each pending read. An unavailable result cannot update `verifiedAt`, and stale completion cannot activate or invalidate the new account.
- [ ] Run `"$BICKERS_NODE" --experimental-vm-modules --test tests/startupParallelSession.test.js tests/authRestorationLoading.test.js tests/mobileClerkAccess.test.js tests/workingTermsLookup.test.js tests/workingTermsGate.test.js tests/identitySession.test.js tests/clerkNativeStartup.test.js` to capture RED.
- [ ] Implement the parallel orchestration and wire outcomes into snapshot activation/invalidation. Confirm current company/employee matches before preserving the old scope. Keep legacy sign-in behaviour, backend lease enforcement and existing terms routing intact. Do not shorten timeouts or remove checks merely to produce a faster test.
- [ ] Run `"$BICKERS_NODE" --experimental-vm-modules --test tests/startupParallelSession.test.js tests/authRestorationLoading.test.js tests/mobileClerkAccess.test.js tests/workingTermsLookup.test.js tests/workingTermsGate.test.js tests/identitySession.test.js tests/clerkNativeStartup.test.js`; require PASS. Commit `perf: overlap independent startup verification reads`.

## Task 4: Save minimal visible operational data and coalesce refreshes

**Files:** create `hooks/useStartupSnapshotCapture.js`; modify `hooks/useOperationalData.js`, `providers/DataCacheProvider.tsx`, `app/(protected)/(main-tabs)/screens/homescreen.js`, `app/(protected)/(main-tabs)/screens/schedule.js`; create `tests/startupSnapshotCapture.test.js`, `tests/startupRefresh.test.js`.

**Interfaces:** `useStartupSnapshotCapture({ route, selectedDateISO, selectedJobId, jobs, completeDates, currentIdentity, verifiedAt, enabled })`. `jobs` is the screen's already-filtered current-user view model, projected to Task 1's field allowlist. `enabled` requires current verified access and terms acceptance. Continue using `createRequestDeduper().run(scopedKey, fetcher)` rather than creating another request registry.

- [ ] Add failing tests for current-user-only projection, valid empty dates, partial/failed resources, selected-job restoration and denied HR/document fields. An unrelated holiday-history error must neither erase a valid jobs snapshot nor label missing work complete. Validate selected job/date against the bounded payload.
- [ ] Add tests showing multiple screens share one concurrent fetch for the same scoped resource, two foreground/reconnect signals within 250 ms produce one refresh pass, and an invalidated collection refreshes without blanking other sections. Account changes cancel pending coalesced work. Explicit user refresh stays responsive and still deduplicates an existing request.
- [ ] Run `"$BICKERS_NODE" --experimental-vm-modules --test tests/startupSnapshotCapture.test.js tests/startupRefresh.test.js` to capture RED.
- [ ] Capture snapshots after eligible successful data updates, not on every render. Use a bounded 250 ms coalescing window for automatic refresh signals and retain existing resource TTLs and prefix invalidation. Keep current data while refreshing; load missing sections independently. Do not add speculative whole-app prefetch, change Firestore queries/indexes or rewrite page business logic in this task.
- [ ] Run `"$BICKERS_NODE" --experimental-vm-modules --test tests/startupSnapshotCapture.test.js tests/startupRefresh.test.js tests/bookingVisibility.test.js tests/linkedBookingDays.test.js tests/sessionCache.test.js tests/homeLayout.test.js tests/scheduleLayout.test.js`. Require PASS and check changed consumers before committing `perf: persist operational previews and coalesce refreshes`.

## Task 5: Render cached previews without mounting protected behaviour

**Files:** create `components/startup/StartupPreview.jsx`, `tests/startupPreview.test.js`; modify `app/_layout.jsx`; extend `tests/sessionRestorationShell.test.js`.

**Interfaces:** `StartupPreview({ snapshot, status, onRetry, onSelectDate, onSelectJob })`. Selections affect only the saved preview; no mutation/upload/navigation callback is available. Use existing `AppText`, cards and layout tokens. Mount the snapshot provider outside Clerk so disk hydration and SDK restoration begin together.

- [ ] Write actual-component tests for cached Home/Schedule/job summaries, normal Login, expired/no cache, unsupported previous route and the transition to verified content. Confirm a preview can render while bridge/terms promises remain unresolved, without setting `isAuthed` or releasing sync. Sensitive routes never render through the preview.
- [ ] Test denial during an on-screen preview, timer expiry, clock rollback, account switch and late old responses. Old content must disappear from both display and accessibility in the next state update. Cached dates show the saved timestamp; incomplete/truncated data never says “no jobs” as a definitive result.
- [ ] Run `"$BICKERS_NODE" --experimental-vm-modules --test tests/startupPreview.test.js tests/sessionRestorationShell.test.js tests/authRestorationLoading.test.js` and capture RED. Implement the display state in the shell. Hide the native splash once local restoration chooses a preview or neutral loading state; do not make first paint wait for network verification. Retain Router Slot lifecycle requirements and hide protected content/accessibility during pending verification. On success, hand off to the allowed Home/Schedule route with existing date parameters and no Login flash. Compatibility/security recovery states take precedence.
- [ ] Re-run that command to PASS; inspect light/dark and enlarged-text renders when a supported renderer is available. Report any missing native coverage. Commit `feat: show saved operational content during startup`.

## Task 6: Measure and verify the whole startup path

**Files:** create `lib/startup/timings.js`, `tests/startupTimings.test.js`, `tests/startupFlow.test.js`; instrument the startup provider, Clerk provider/coordinator, Auth provider and root layout; update only the relevant release notes and this plan's checkboxes.

**Interfaces:** `createStartupTimings({ now, emit }) -> { mark(phase, outcome?), measure(phase, operation), reset() }`. Allow only fixed phase/outcome enums and elapsed milliseconds, with at most 32 entries per launch. No raw errors, IDs, credentials, URLs or business values. Default output is local pilot/development diagnostics only, never remote telemetry.

- [ ] Add failing tests for log redaction, monotonic timing, bounded output, cold versus warm starts and cancellation. Integrated tests must exercise cache read -> preview -> concurrent verification -> fresh data, and offline/denied/account-switch branches with deferred promises. Run `"$BICKERS_NODE" --experimental-vm-modules --test tests/startupTimings.test.js tests/startupFlow.test.js` and capture RED.
- [ ] Implement timings for local restore, first saved render, Clerk restore/token, bridge, Firebase sign-in, access, terms and first fresh render. Use actual layout/render callbacks where applicable; don't label a state assignment as proof that content has painted.
- [ ] Run focused suites once, then the ordinary full unit suite with the compatible runtime: `"$BICKERS_NODE" --experimental-vm-modules --test tests/*.test.js`. Run scoped ESLint for changed files and the applicable UI/TypeScript checks. Preserve baseline lint debt, rules and thresholds. Repeat broader checks only for subsequent changes or unresolved failures.
- [ ] Obtain one focused independent review of the final diff, especially display-versus-authorization boundaries, logout persistence and stale writes. Resolve actionable findings and rerun affected tests. Confirm no production/auth policy/account mutations occurred.
- [ ] Prepare the owner pilot source/artifact handoff using existing approved signing and distribution constraints. Any new cloud build or distribution action follows the user's existing authorization and the action's actual cost/access requirements; this plan does not authorize a wider release. Do not claim the phone has the new code merely because local tests pass.
- [ ] On the exact installed artifact, measure at least five cold starts and five foreground returns under ordinary connectivity, plus offline and slow-network cases. Compare first saved content separately from first fresh content; preserve source/build/device/network context. The approximately one-second saved-content goal is a target, not a result. Confirm no Login flash, unexpected logout or cross-account data display.
- [ ] Report implementation, tests, measured device results and any remaining gap. Commit the final instrumentation/evidence separately from unrelated pilot work.

## Self-review outcome

Every spec requirement maps to Tasks 1–6. The five Review Focus conditions have explicit owners and tests. Existing request deduplication is reused; targeted refresh does not claim server-side delta fetching. New display state cannot substitute for backend authentication, and the approved 24-hour policy does not extend access leases. No implementation has started under this plan.
