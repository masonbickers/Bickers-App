# Shared Clerk Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give approved Bickers staff one production Clerk account for the mobile app and booking website, preserving Firebase identities, permissions and records.

**Architecture:** Clerk owns credentials and sign-in sessions. The website's verified identity bridge issues Firebase custom tokens for existing canonical UIDs; the mobile app uses the same bridge. Preserve the legacy Firebase login and recovery flow during a controlled transition, then retire its credential entry points for migrated accounts.

**Tech Stack:** Expo 55 / React Native, supported `@clerk/expo` and `expo-secure-store`, Next.js 15 / `@clerk/nextjs` 7, Firebase Auth/Firestore/Storage, Render Express API, Firebase Hosting for the existing branded account page.

**Spec:** `docs/superpowers/specs/2026-10-14-shared-clerk-auth-design.md` (owner approved 14 October 2026).

## Global Constraints

- “Use one Clerk production instance for staff sign-in to the mobile app and booking website.” Target `ins_3Kgwuos5Z3ZMV8djLa2oa7xoZPF`; application `app_3GUkXJpZP4zz4sa0hNeuuJEHau5`.
- “Keep Firebase as the data, storage and canonical user-ID system.” Never rename existing UIDs, employee IDs, company IDs or record owners.
- “A user who has mobile access but no office access must not gain office access through a shared credential.” Preserve independent channel/workspace approval checks.
- “Email is a reconciliation hint, never sufficient authority for an automatic live link.” Existing explicit links and reviewed manifests determine identity.
- “Do not mark an unverified email verified solely because it appears in an export, import temporary credentials as permanent credentials, or clear a required recovery flag during migration.”
- “No bulk password reset or staff notification is sent without a separately authorized communication step.”
- “Passkeys are optional and do not block this migration.” Preserve existing enrolled-factor evidence; do not silently delete factors or claim development passkeys transfer.
- “Development and preview builds retain development keys.” Production secret keys remain server-side and never enter reports, source control or browser bundles.
- Keep the existing `auth.bickers.co.uk` A/TXT records and Firebase Hosting for this recovery page. The already-approved five Clerk CNAME additions are saved and verified; certificates were issuing at last observation.
- Preserve the dirty working copies. Before implementation use the worktree skill to establish isolation with the needed current source; a clean remote checkout omitting existing auth fixes is not a suitable starting point. Obtain permitted write access to the web checkout before changing it.
- Web Project Control requires persistent issue IDs, distinct implementation/verification evidence and independently reviewed publication from current live source. Reuse PC-062 where applicable; do not close PC-073 merely for this migration.

## Review Focus

1. Import stops after Clerk creation but before UID-link updates: retry resumes the same account and refuses concurrent changes (Task 2).
2. A signed-in employee switches accounts while a bridge request is pending: the old response cannot restore the previous identity or replay its outbox (Task 5).
3. A Clerk session is revoked while its Firebase token still refreshes: APIs deny it and direct-data permission is bounded by an explicit short lease, with global cutoffs enforced (Tasks 3–4).
4. Production reset is used in a different browser or after reload: resume safely or restart recovery with clear instructions; do not reuse the Firebase OOB code (Task 6).
5. An older installed app uses a Firebase password after a Clerk reset: transitional credentials remain distinct; no claim of synchronization and no final cutover until supported-build enforcement is verified (Tasks 7–8).

## File and interface map

`MOBILE` means this repository. `WEB` means `/Users/masonbickers/Desktop/Projects/Bickers-Booking1`; all web changes require a permitted isolated checkout first.

- WEB `scripts/clerkMigrationModel.mjs` and existing migration/inventory scripts: reconciliation, resumable import and guarded changes; never runtime authorization.
- WEB `src/app/api/auth/clerkFirebaseBridge.mjs`: the existing canonical resolver extracted from the route; one authority for browser and native clients.
- WEB `src/app/api/auth/clerkRequestIdentity.js`: verified request/session identity, using Clerk server SDK.
- WEB `src/app/api/auth/firebase-token/route.js`: thin transport adapter for the shared bridge, no-store responses and controlled CORS.
- WEB `src/app/api/auth/clerkSessionLease.mjs`: short direct-data lease refreshed only after verified Clerk session checks.
- MOBILE `lib/identitySession.js`: pure predicate for verified Firebase claims/profile matching; consumes trusted server claims, never decodes unverified JWTs as proof.
- MOBILE `lib/clerkSessionCoordinator.js` and `providers/ClerkFirebaseProvider.jsx`: coordinate both sessions, bridge renewal and identity changes.
- MOBILE `firebase/auth-page/clerk-reset-flow.mjs`: testable recovery state machine; existing theme/style generation stays shared with the app.
- Existing API handlers, profile settings, rules and login screens change only where required to consume these interfaces.

### Task 1: Establish an accurate baseline and reconciliation report

**Files:** Read existing WEB `scripts/identity-access-inventory.mjs`, `scripts/migrate-firebase-users-to-clerk.mjs`, live deployment/configuration and rules. Create WEB `scripts/clerkMigrationModel.mjs`, `tests/clerkMigrationModel.test.mjs`; store private run evidence outside Git. Update the approved spec's factual status.

**Interfaces:** `reconcileAccounts({firebaseUsers, users, employees, developmentUsers, productionUsers}) -> {eligible, verificationRequired, recoveryRequired, blocked, conflicts}`. Input auth rows exclude password hashes for this task. Output maps canonical UID, employee/company IDs and old/new provider IDs with explicit-link evidence; email-only candidates are conflicts requiring reviewed resolution. A redacted `baseline` report records exact live release IDs and `rules.firestoreSource` / `rules.storageSource` paths for Task 4; no rule deployment proceeds without this provenance.

- [ ] Write `reconcileAccounts` tests: explicit UID stays unchanged; mismatched nested IDs, duplicate emails/UIDs, disabled staff and missing employee approval never become eligible; mobile-only approval does not imply office access.

  Fixture assertions include `assert.equal(result.eligible[0].canonicalUid, 'firebase_staff_1')` for the valid explicit link, `assert.equal(result.eligible.length, 0)` for an email-only candidate, and `assert.equal(result.conflicts.length, 1)` for conflicting stored provider IDs. Fixture identifiers are synthetic.
- [ ] Run `node --test tests/clerkMigrationModel.test.mjs` in WEB; confirm the new cases fail for the missing model.
- [ ] Implement the pure report model and read-only inventory adapter. Paginate both Clerk instances. Pin the target instance ID and classify all accounts, including the 18 additional canonical records mentioned in the earlier web inventory; re-read rather than assume those counts remain current.
- [ ] Run the tests; expect pass. Produce a restricted, hash-free fresh report and a redacted count-only review summary. Identify the actual deployed Firestore/Storage rule sources and current web/Render/mobile versions before planning any rule deployment.
- [ ] Commit only this task's source/tests. Report unresolved mappings; proceed with independent implementation but exclude conflicted identities from any apply manifest.

### Task 2: Make credential import and identity changes resumable

**Files:** Modify WEB `scripts/migrate-firebase-users-to-clerk.mjs`; extend `scripts/clerkMigrationModel.mjs`; create `tests/clerkMigrationApply.test.mjs`.

**Interfaces:** `applyMigrationEntry(entry, {clerk, directory, journal, instanceId, dryRun}) -> {status, canonicalUid, productionClerkId}`. CLI defaults to report-only; mutation requires `--apply --instance=ins_3Kgwuos5Z3ZMV8djLa2oa7xoZPF --manifest=/absolute/private/file`. Manifest entries include expected current links, including expected-absent values, plus approved canonical identity evidence. Journal is private and contains no credential digests.

- [ ] Add tests: wrong instance refuses writes; dry run does zero mutations; existing email with a different external ID blocks; interrupted create reuses the same external ID; repeated apply is idempotent; changed expected fields refuse updates; temporary passwords/unverified emails/recovery flags retain their restrictions.
- [ ] Run `node --test tests/clerkMigrationModel.test.mjs tests/clerkMigrationApply.test.mjs`; confirm the new apply cases fail.
- [ ] Replace email-only skip logic with explicit identity reconciliation and guarded compare-and-set changes. Preserve absence of stored aliases when `externalId` alone suffices; update top-level/nested IDs together only when necessary and their expected state still matches. Retain a field-scoped inverse journal that cannot overwrite concurrent changes.
- [ ] Support `scrypt_firebase` only for eligible reviewed password accounts. Require all six digest components, never print them, use restricted temporary files and bounded 429/5xx retries. Exclude unverified emails from any import API that implicitly marks email addresses verified; route them through proof-based onboarding instead. Never import an administrator-issued temporary credential as permanent. Handle the rest through reviewed verified recovery/onboarding, without automatically sending messages.
- [ ] Run tests; expect pass. Exercise crash/retry and inverse operations on fixtures or an isolated test instance. Do not export production password hashes or run production apply yet. Commit task-owned files.

### Task 3: Serve one verified bridge to browser and native clients

**Files:** Create WEB `src/app/api/auth/clerkFirebaseBridge.mjs`, `clerkRequestIdentity.js`, `clerkSessionLease.mjs`, `tests/clerkFirebaseBridge.test.mjs`, `tests/clerkRequestIdentity.test.mjs`; modify `src/app/api/auth/firebase-token/route.js`, `src/app/api/sessionSecurityService.mjs`, `src/app/context/authContext.js` and their tests. Add WEB `src/app/api/webhooks/clerk/route.js` and `tests/clerkSessionLease.test.mjs` for verified lifecycle-event invalidation if no existing handler owns it.

**Interfaces:** `resolveClerkBridge({clerkUser, clerkSession, channel}, deps) -> {uid,email,employeeId,companyId,claims}`; `authenticateClerkRequest(req) -> {clerkUser,clerkSession}` or typed 401/403; bridge POST returns existing `{customToken,uid,email}` plus `{leaseExpiresAt}`. `renewClerkLease({uid,clerkUserId,clerkSessionId}, deps)` writes server-only `clerkSessionLeases/{sessionId}` with UID, company, status and `validUntil` timestamp, at most 300 seconds ahead and never beyond Clerk expiry.

- [ ] Add denial tests for missing/expired/wrong-instance token, bad signature, wrong authorized party when `azp` is present, inactive/mismatched session, unverified primary work email, duplicate/conflicting explicit links, disabled staff and missing channel/workspace approval. A verified native bearer token without browser `azp` is accepted only through the explicit bearer path and the configured instance's active session lookup; it does not bypass identity checks.
- [ ] Run `node --test tests/clerkFirebaseBridge.test.mjs tests/clerkRequestIdentity.test.mjs tests/clerkSessionLease.test.mjs`; confirm new cases fail.
- [ ] Extract the current resolver without broadening its decisions. Authenticate browser cookie and native bearer requests using the supported Clerk server SDK, fetch user/session by verified IDs, and enforce issuer/session/security cutoffs. Allow only `https://booking.bickers.co.uk` and `https://auth.bickers.co.uk` as browser origins; native requests may omit Origin but require bearer authentication. Reject conflicting cookie/bearer identities. Return no-store and never cache custom tokens.
- [ ] Issue existing identity-link-version-2 claims, including `clerkSessionId`; keep current company/employee/UID constraints. Require current Clerk session checks on API access and each lease renewal. Use signed Clerk session-ended/revoked lifecycle events to mark only the matching lease inactive; reject replay/invalid signatures. Unknown session IDs must not create authorized lease records.
- [ ] Update the website auth context to renew the same lease before 240 seconds and on foreground while signed in, and stop protected data access when renewal fails. Do not create a mobile-only lease requirement that silently locks out existing browser clients. Tests assert one renewal per active identity generation and no renewal after sign-out.
- [ ] Prove revoked sessions cannot renew leases or pass APIs; missing webhooks cannot extend direct access past 300 seconds. Run existing `tests/sessionSecurityService.test.mjs`, `tests/sessionSecurity.test.mjs`, `tests/identityBootstrap.test.mjs` alongside the new tests; expect no weakened recovery or revocation checks. Commit task-owned files.

### Task 4: Recognize Clerk identities consistently in mobile APIs and data rules

**Files:** Create MOBILE `lib/identitySession.js`, `tests/identitySession.test.js`, `tests/clerkSessionAccess.rules.test.cjs`; modify `server/appPasswordSetup.js`, `server/workingTermsIdentity.js`, `server/workshopSubmission.js`, relevant `server/index.js` auth sync, and their existing tests. Update the actual current deployed Firestore/Storage rule source established by Task 1; mirror only necessary shared semantics into `firebase/mobile-compat/` if it is still maintained. WEB security-rule changes use WEB's review/publication workflow.

**Interfaces:** `isTrustedClerkIdentity(token, profile) -> boolean`; `classifyIdentitySession(token,profile) -> 'clerk'|'firebase-password'|'denied'`. Require exact UID, both stored link fields if present, verified email claim, identity version 2, nonempty Clerk user/session IDs and matching employee/company. Authorization remains separate from this identity predicate.

- [ ] Add tests rejecting a token when only one of two conflicting stored IDs matches; arbitrary custom tokens, malformed cutoffs and wrong company/employee deny access. Verify valid Clerk working-terms/workshop requests preserve every existing ownership/immutability check; valid legacy password requests still work during transition.
- [ ] Run `node --experimental-default-type=module --test tests/identitySession.test.js tests/appPasswordSetup.test.js tests/workingTermsIdentity.test.js tests/workshopSubmission.test.js`; confirm new Clerk cases fail first.
- [ ] Implement the shared mobile predicate and replace only provider-specific password assumptions. Never clear reset flags merely because the provider is Clerk; the central session service must establish recovery proof. Correct sync metadata so it does not claim a Firebase password is configured solely because Clerk sign-in succeeded.
- [ ] Add rules requiring global revocation cutoffs and, for Clerk, an active server-written lease belonging to the exact UID/company/session with `request.time < validUntil`. Deny client writes to leases. Require both stored Clerk-ID fields to agree when present. Ensure old password clients do not gain a lease exemption from global disable/revocation checks.
- [ ] Run the targeted Node tests and the existing security-recovery/permission rule suites plus the new lease cases in Firebase emulators against a `demo-` project. Prove lease expiry, revocation, missing lease, wrong session, mixed link IDs and direct refresh cannot bypass permission checks. Expect pass before any live rule deployment; commit scoped changes. Existing broad permissive rule baselines must never be deployed just to make Clerk work.

### Task 5: Add branded mobile Clerk login and coordinated session lifecycle

**Files:** Modify MOBILE `package.json`, lockfile, `app.json`, `app/_layout.jsx`, `app/(auth)/login.jsx`, `providers/AuthProvider.tsx`, `lib/authApi.js`, `app/(protected)/settings.js`, `components/ChangePasswordModal.js`; create `providers/ClerkFirebaseProvider.jsx`, `lib/clerkSessionCoordinator.js`, `tests/clerkSessionCoordinator.test.js`.

**Interfaces:** `createClerkSessionCoordinator({getClerkToken,exchangeToken,signInFirebase,signOutFirebase,signOutClerk,clearAccountCache,clock}) -> {reconcile(),signOut(),dispose()}`. Generation changes invalidate in-flight work. `exchangeClerkSession({clerkToken})` calls Task 3's bridge; lease renewal occurs before 240 seconds and on foreground. Successful authorization still requires employee sync and server-backed profile checks.

- [ ] Add tests for cold start, delayed bridge, network failure, sign-out while bridging, identity switch while bridging, revoked/expired Clerk session, lease renewal failure, app background/foreground and outbox ownership. Assert stale responses cannot restore the old UID or reuse cached permissions.
- [ ] Run `node --experimental-default-type=module --test tests/clerkSessionCoordinator.test.js`; confirm failure for the absent coordinator.
- [ ] Install compatible supported `@clerk/expo` and `expo-secure-store` using current official Expo guidance; pin the lockfile and keep Expo 55. Configure ClerkProvider/tokenCache and native registration identifiers `com.bickers.booking` (iOS), `com.bickers.bickersapp` (Android). Use development keys for test builds; never add a server secret to Expo configuration.
- [ ] Preserve the app's custom login styling and implement Clerk password sign-in, configured challenge/MFA states, cancellation and verified recovery routing. Keep enrollment closed. Firebase custom sign-in, session sync and provider gate consume Tasks 3–4. On denial clear both providers and account-specific caches; offline cached data never creates new authorization. Retain guarded legacy login behind the transition policy until Task 8.
- [ ] Route migrated-user password change/recovery to Clerk; old Firebase paths are available only to unmigrated accounts. Maintain both-provider sign-out and wipe old account queues safely without submitting them under a new UID.
- [ ] Run coordinator, login-feedback, password-transition, session-gate, offline-identity and outbox tests, `npx tsc --noEmit`, scoped lint and `npx expo install --check`; expect no new failures. Inspect login/challenge/error/settings states using the global UI consistency skill. Produce signed development builds and record missing device coverage honestly. Commit scoped files.

### Task 6: Connect the branded recovery page to Clerk

**Files:** Modify MOBILE `firebase/auth-page/index.html`, `page.mjs`, `view.mjs`, `config.mjs`, `scripts/build-auth-page.mjs`, `firebase.auth-page.json`, `tests/authResetPage.test.js`; create `firebase/auth-page/clerk-reset-flow.mjs`, `clerk-client.mjs`, `legacy/index.html`, `tests/clerkResetFlow.test.js`. Add a pinned supported Clerk browser SDK and build dependency only if required to bundle its client; no secret key enters this page.

**Interfaces:** `createClerkResetFlow({client,finishRecovery,redirect})` exposes request(email), verify(code), reset(password), retry(), with request/code/password/challenge/success/error states. `finishRecovery` activates the recovered session as required by Clerk and calls the same verified session-security bridge, never clears Firestore flags directly. Publish `/reset-password` for Clerk and `/legacy-reset-password` for original Firebase OOB links.

- [ ] Add tests for unknown-account generic response, invalid/expired code, duplicate submit, mismatch/password-policy feedback, MFA requirement, failed proof completion, reload/different-browser restart, SDK outage and redirect tampering. Firebase OOB codes must never be submitted to Clerk. Reset success is shown only after provider-confirmed change and required recovery completion.
- [ ] Run `node --experimental-default-type=module --test tests/authResetPage.test.js tests/clerkResetFlow.test.js`; confirm new cases fail first.
- [ ] Keep the existing Firebase Hosting domain and shared generated app tokens. Bundle the supported Clerk browser client, allow only the actual Clerk frontend/script endpoints needed in CSP, and keep no-referrer/no-store headers. The browser uses Clerk's supported email-code recovery flow; any new password entry in live browser testing is completed by the owner under the browser policy.
- [ ] Preserve the old Firebase handler and fixed trusted redirects at `/legacy-reset-password`. Update email wording to describe code entry accurately, with a link to the branded page; do not imply that a static link itself proves recovery. Do not switch existing Firebase action URLs to a Clerk handler.
- [ ] Run the focused tests, `node scripts/build-auth-page.mjs` and a local hosting preview; inspect request, code, password, error and success states at 320px/mobile/desktop in light/dark with keyboard focus. Test live delivery only to an owner-authorized named mailbox. Confirm `auth.bickers.co.uk` HTTPS before publishing the Clerk flow; commit scoped files.

### Task 7: Verify production configuration and stage a pilot

**Files:** Environment/hosting settings, MOBILE `eas.json` and release config tests, WEB deployment config validation, private pilot manifest, WEB Project Control records and a redacted runbook at MOBILE `docs/releases/clerk-auth-rollout.md`.

**Interfaces:** `legacyFirebaseLoginAllowed(profile,build) -> boolean` respects an explicit per-user migration state and supported-build policy; it never relies only on a UI switch. Pilot manifest identifies exact canonical UIDs and expected links but no passwords. Cutover checks are explicit pass/fail evidence, not inferred from build success.

- [ ] Add tests for development keys in production, production keys in previews, absent native identifiers, mobile-only staff getting office access, and migrated accounts using legacy password APIs after final retirement. Inventory every legacy bypass, including direct Firebase SDK paths; do not claim server flags disable Firebase credentials by themselves.
- [ ] Run release/deployment configuration tests and confirm new configuration mistakes are detected. Implement only the needed configuration checks and server/rules policies. Keep production key changes staged until the pilot manifest and recoverability checks are reviewed.
- [ ] Confirm issued Clerk/API/account-portal certificates, recovery HTTPS, invite-only enrollment, required email verification, authorized browser parties, native registrations, redirect allowlists, session settings and signed lifecycle webhook delivery. Google sign-in is offered only once own production credentials are configured; never display a broken inherited development option.
- [ ] Review the complete production manifest, credential/factor classification and guarded inverse changes. Obtain action-time confirmation for credential-data transfer/new access if required; have the owner perform any live password/passkey entry. Export only eligible password hashes at this point, with mode-0600 temporary storage outside Git.
- [ ] Apply Task 2 to the explicitly reviewed pilot, deploy required compatible security/bridge pieces, then switch only pilot client configuration using the actual production secret destination controls. Verify same-account mobile/web login, record access, reset completion, fresh login after reset, refresh, sign-out, revoke, disabled-user denial and mobile-only denial on signed iOS/Android builds.
- [ ] Record actual installed old-build behavior and whether pilot recovery leaves a separate Firebase password usable. Do not claim synchronized credentials. If a critical check fails, stop expansion and use the tested field-scoped recovery path. Clean up temporary hashes after confirmed import; commit only safe runbook/config files and publish independently reviewed Project Control evidence.

### Task 8: Complete migration and retire split credentials

**Files:** Private apply manifests/journals, MOBILE/WEB migration policy and release configuration, `docs/releases/clerk-auth-rollout.md`, relevant WEB Project Control records.

**Interfaces:** A batch is complete only when every entry is migrated-and-verified, explicitly blocked or intentionally excluded with a reason. Final `clerk-only` state disables legacy credential entry and legacy direct-data access for that account, while permitting the required Clerk Firebase custom token.

- [ ] Add tests demonstrating an old Firebase password cannot access APIs, Firestore or Storage for a `clerk-only` account, while the valid Clerk-derived Firebase session retains that same account's data. Test rollback cannot clear global security cutoffs or overwrite new production links.
- [ ] Run targeted API/rules/release tests; confirm retirement cases fail first, then implement the per-account server/rules enforcement. Re-run and expect pass. Verify the supported-build update experience on an old installed mobile build before enabling `clerk-only` broadly.
- [ ] Apply remaining reviewed eligible entries in small resumable batches. Stop a batch on identity conflict or failed recovery; do not attempt an email-based repair. Keep blocked/unverified/temporary-credential users on their explicitly classified onboarding path.
- [ ] After verified supported builds and account readiness, enable Clerk for normal live website/mobile sign-in and branded recovery; set migrated users to `clerk-only`. Stop issuing Firebase recovery/change-password emails for them. Preserve legacy handler behavior only where still required for earlier links, with clear provider messaging.
- [ ] Complete proportionate unit/integration/rules checks, scoped lint/typecheck and web/mobile builds once for the final changes. Verify user-facing mobile/web flows against the exact releases. Use independent security/code review before final rollout; report any unmet physical-device or owner-recovery checks as release blockers.
- [ ] Publish reviewed current-live Project Control snapshots and verify the hosted page. Record deployment IDs, batch totals, remaining excluded users, rollback limits and annual/monthly running-cost changes. No staff announcement is sent without explicit recipients/purpose authorization.

## Execution and approval boundary

Plan creation does not run migration scripts, export password material, change production keys, send account emails or switch users. Complete each task's checks before advancing and stage live changes for final review at the point of consequence. The owner has approved the design and the five DNS additions; written plan review and execution-method selection are the next required workflow step.

Recommended execution: **Native** in this chat, keeping one implementer responsible for the linked mobile/web/security contracts, followed by an independent review before rollout. **Subagent-driven** is the alternative, with a separate implementer/reviewer per task and higher context overhead. No implementation starts until the owner reviews this plan and chooses the method.

References: [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart), [Clerk recovery](https://clerk.com/docs/guides/development/custom-flows/authentication/forgot-password), [Firebase import](https://clerk.com/docs/guides/development/migrating/firebase), [production deployment](https://clerk.com/docs/guides/development/deployment/production).
