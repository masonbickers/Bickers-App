# One primary Clerk implementation and Firebase exit plan

Date: 16 October 2026, Europe/London. **Discovery and proposed design only.** No implementation, Git mutation, infrastructure provisioning, user export, live query, data migration, credential change or deployment is authorised by this document.

## 1. Current position

Clerk already handles end-user sign-in in the mobile Pilot and the related office application. It is **not yet independent of Firebase**. Clerk sessions are exchanged for Firebase custom tokens; Firebase Auth then supplies credentials for Firestore, Storage and several APIs. Removing that exchange today would break protected reads, writes, files, receipts, Working Terms, realtime updates and background processing.

Use the Pilot as the intended primary mobile foundation. Preserve its current uncommitted work and reconcile specific Main-only capabilities before declaring it the primary source. Keep the two repaired form-loading branches, their regression test, cache-first preview, canonical access checks, account isolation, sign-out tombstone and stale-response guards. Consolidation, authentication cutover, database/file migration, native rebuilds and service retirement are separate gates.

Recommended eventual stack: **Clerk for end-user authentication; existing Next/Express application APIs with shared server-side authorization; managed PostgreSQL for application records and durable jobs; private object storage for files; existing Expo/APNs notification behavior subject to the Android FCM decision below.** PostgreSQL and replacement object storage are proposals, not services found already connected. Clerk is not a replacement for a database, file store, queue or authorization policy.

### Source identities and verification boundaries

| Label | Verified local root / source identity | Position |
| --- | --- | --- |
| P — intended mobile primary | `/Users/masonbickers/.codex/worktrees/saved-home-live/bickers-app-launch`; detached HEAD `fca8742e3eeb551824a4943d0773da94e4eb0f8b` | Dirty tracked/untracked work; HEAD alone omits the Task 1 fixes and other current work. App config says 5.0.14 / iOS build 88, which is configuration, not installed-build evidence. |
| M — mobile reconciliation reference, read-only | `/Users/masonbickers/Desktop/Projects/bickers-app-launch`; `codex/release-candidate-stabilisation`, HEAD `72579e685d125d92e9d9c9cf3144b304e3dcf215` | Extensive tracked/untracked work. App config says 5.0.13 / iOS build 96. Different version/build labels cannot determine which source is newer or deployed. |
| O — primary office source, read-only | `/Users/masonbickers/Desktop/Projects/Bickers-Booking1`; `codex/restore-home-data`, HEAD `e87730f62a4f005f05aab57c6adf4eeeae158410` | Next 15 office/admin application. At inspection: 268 tracked status entries and 426 untracked status entries; directory entries can contain multiple files. Significant security/file-runtime work is not represented by HEAD. |
| W — shared-Clerk office source, read-only | `/private/tmp/bickers-clerk-web-worktree`; `codex/shared-clerk-auth`, HEAD `c74470dfa80e43dda3e12d3088dd5b10889943ee` | Contains shared mobile/web bridge, lifecycle and identity migration tools. Two tracked Project Control modifications and two untracked status entries were present. Temporary location must not become the sole durable source. |

Relative references are qualified by these labels. Exact working files, not historical audit lines, were inspected. Related repositories were identified from the mobile migration/audit documents and imports, not inferred from similar folder names. No unrelated project was investigated.

**Development serving:** P's `scripts/start-device-hub.cjs:1–27` pins its own root and the `clerk-pilot` configuration to localhost 8081. In this pass, `lsof -nP -iTCP:8081 -sTCP:LISTEN` returned no listener (exit 1). The earlier audit's PID/listener result is historical. No Metro instance was started or restarted.

**Installed/released state:** NOT VERIFIED. No connected binary, App Store/TestFlight/Play artifact, OTA identity, office deployment or worker deployment was matched to these source hashes. P's `docs/releases/cache-first-startup-2026-10-16.md` explicitly says its source changes were not established in the previously reported owner build 95. That is historical handoff evidence, not identification of the current phone. Package/config versions and a listening server cannot prove release contents.

Read instructions in P, M, O and W; read P's `docs/APP_STARTUP_FIX_01.md` and M's `docs/APP_STARTUP_AUDIT.md`. The requested single-report/read-only scope takes precedence over office instructions to update/publish Project Control after implementation. No such records or hosted page were changed in this design pass.

## 2. Protect and consolidate source before migration

### Meaningful differences to retain or reconcile

Comparison used actual current file contents. In selected code folders P versus M: 15 app files differ; Auth/DataCache providers differ; `hooks/useOperationalData.js` differs; eight shared lib files differ; five non-vendored server source files exist only in Main, and six shared server files differ. Counts describe those folders/extensions, not a complete release equivalence proof.

| Work / evidence | Consolidation decision and required check |
| --- | --- |
| P `app/(protected)/recce-form.js:552–556`, `vehicle-check.js:459–463`, `tests/formLoadingState.test.js` | Preserve exactly; verify the production loading branch through actual PageShell. M still has the malformed `state.loading` callsites; never overwrite the fixes from Main. |
| P `providers/ClerkFirebaseProvider.jsx`, `AuthProvider.tsx`, `StartupSnapshotProvider.jsx`, `lib/clerkSessionCoordinator.js`, `lib/mobileClerkAccess.js`, `lib/startup/*`, `providers/DataCacheProvider.tsx`, logout consumers | Retain Clerk identity binding, verification revision/generation, 24h display-only projection, rejection/logout invalidation, account-scoped resources and queues. A snapshot is never authorization. P is the baseline here, not M's legacy password provider. |
| P `hooks/useOperationalData.js:70–88`, `lib/privateHistoryClient.js`, `lib/holidayPresentation.js`, holiday/calendar hooks, Home/Profile/Schedule components and tests | Preserve balance-verification/completeness metadata and operational UI work. Do not turn withheld or unresolved ownership into a definitive zero balance. These are business semantics, not cosmetic conflicts. |
| M `lib/runtimeTarget.cjs`, `firebaseConfig.js`, `app.config.js`, `server/runtimeTarget.js`, `server/runtimeTargetPolicy.cjs`, isolated staging scripts | Carry forward reviewed environment-target assertions, explicit project/issuer/origin separation and no-external-effects test fixtures. Adapt to Clerk/SQL/storage targets; do not copy Firebase/password assumptions into P. |
| M `server/index.js:1–29`, `server/fileRoutes.js`, `server/canonicalAdapters/clerkReadProvider.js`, `server/vendor/bickers-files-runtime/`, `scripts/staging/build-file-runtime.mjs`; O `src/app/api/files/*` | Preserve the authenticated file service, exact reviewed ownership/object-version checks, deadline/cancellation, range/HEAD, memory admission limits and artifact verification. The vendored runtime is a duplicate distribution of office code, not an independent Firebase-free replacement. Reconcile via the canonical service/build process, not directory copying. `server/fileContentProxy.js` exists in M but is not the route mounted by the inspected `server/index.js`; do not confuse an unused helper with the active file runtime. |
| M `lib/notifications.js:241,529`, `lib/errorMonitoring.js:5–9`, `lib/sync/config.js:43` | Preserve intent of suppressing real push, Sentry and legacy sync side effects outside production. P lacks those exact environment guards. Test equivalent behavior with P's Clerk pilot/staging selectors rather than blindly adopting one variable check. |
| P `server/employeeAuthSession.js`, `server/identitySession.js`, `server/workshopSubmission.js`, `server/workingTermsIdentity.js` versus M counterparts | Preserve Clerk-compatible canonical authorization. M's workshop implementation requires password-provider credentials; its terms resolver also requires password sign-in. Copying those over P would reject valid Clerk users. Extract security invariants separately from provider assumptions. |
| M/O security rules, restricted-evidence tests, current-session authority adapters; W lease/lifecycle/recovery changes | Compare effective policies, acceptance requirements and tests. Do not pick whichever rule file is shorter/newer. H&S/training must be admin-only even when a legacy source rule grants broader access. Deployed policy parity is unverified. |
| M `lib/api.js`, `app/(protected)/receipts.js`, `app/(protected)/settings.js`; P profile/service/terms logout and settings counterparts | Retain the separately configurable private-history API origin and staging target checks, and prevent staging finance links from falling back to the production website. Reconcile harmless version-display additions independently. Preserve P's centralized sign-out-before-cleanup and Clerk recovery routing: M's Firebase-only logout/password handlers would regress shared sessions if copied over them. |
| P/O/W native, recovery, CI and build configuration; M custom launch animation/plugin | Preserve product identity and approved controls; do not silently introduce M's native splash changes into the current Clerk binary. Native configuration and SDK removal need a separately tested binary. Preserve standalone recovery compatibility until old clients retire. |

### Proposed checkpoint/branch procedure — NOT EXECUTED

1. Stop concurrent edits for a short agreed checkpoint window. Record all four roots' HEADs, tracked diffs, untracked/ignored source artifacts and dependency/config identities without including secrets or customer evidence. Preserve ignored build-source assets deliberately where needed; do not indiscriminately add ignored/private files to Git.
2. In P, create a named branch such as **`codex/clerk-primary-firebase-exit`** from the exact reviewed working state. Before any commit, review the tracked and untracked file list, retaining Task 1 plus all existing startup/Home/holiday work. Make focused checkpoint commits with explicit scopes; do not treat the old detached HEAD as the whole source. This requires a later authorised Git action; no branch/commit was created now.
3. Checkpoint M and the dirty office source independently in durable, reviewed branches/snapshots. Preserve W beyond `/private/tmp`. Record original state so a selective patch can be traced back. Do not discard or merge whole trees.
4. Create a reconciliation ledger with original hash, selected semantic behavior, destination, dependency, test and reviewer for each differing family above. Land small reviewed patches onto the named primary source. Keep W's authentication and O's new file/security services together through a shared tested policy layer, without reverting one to the other's old assumptions.
5. Only after parity and owner acceptance, set the default development/CI/release source to that named branch. Keep former sources read-only until required capabilities are reconciled. Retire duplicate development entry points last. A branch name/default change does not migrate users or data.

## 3. Firebase dependency inventory

Classification: **ACTIVE** = reachable current source runtime dependency, not proof of live deployment; **TRANSITIONAL** = required compatibility/bridge while other consumers remain; **UNUSED** = no runtime consumer established in the inspected scope, not permission to delete; **HISTORICAL** = earlier evidence/configuration; **NOT VERIFIED** = external state, reachability or code unavailable. The exact-file discovery index at the end complements these traced families; text matching alone does not determine a classification.

| ID / classification | Runtime, exact evidence and consumers | Function / identity or permission dependency | Replacement and proof required before removal |
| --- | --- | --- | --- |
| F01 TRANSITIONAL | P `providers/ClerkFirebaseProvider.jsx:56–64,93–128`, `lib/clerkBridgeClient.js`, `lib/clerkSessionCoordinator.js`; W `src/app/api/auth/firebase-token/route.js:160–165`, `sharedClerkRuntime.js:1–26`, `sharedClerkBridge.mjs:17–28` | Clerk session → live provider validation → canonical directory → short lease → Firebase custom token → `signInWithCustomToken`. Essential for every remaining Firebase consumer. | Direct Clerk API authentication plus SQL canonical access. Keep bridge/sign-in until the last client/API/rule consumer has moved; test revoked/disabled/mismatched identities, permissions and old clients first. |
| F02 ACTIVE; legacy sign-in TRANSITIONAL | P `firebaseConfig.js`, `lib/firebaseAuthPersistence.js`, `providers/AuthProvider.tsx:266–329,596–611`, `lib/mobileClerkAccess.js`; W/O `src/app/context/authContext.js:3–7,32–56`; P legacy path `app/(auth)/login.jsx` | Firebase Auth persistence/currentUser/token listeners and custom-token sessions; legacy password/recovery fallback when Clerk not enabled. Web Clerk UI still signs into Firebase and observes access documents. | Provider-neutral canonical actor context sourced from Clerk/session API; no `auth.currentUser` gate once all relevant consumers move. Recovery, revocation cutoffs, employee approval and office/mobile channel access must survive. |
| F03 ACTIVE | P `hooks/useOperationalData.js:1–39,96–120`, Home/Schedule/Profile/contacts consumers; direct screens listed in Appendix A | Company employees/vehicles/equipment/bookings; many form reads and writes in Firestore. UID, company, employee code/assignment, publication/lifecycle predicates; serverTimestamp/array transforms and batches. | Domain APIs/repositories backed by SQL. Prove record visibility, assignments, archived/cancelled filtering, field allowlists, atomicity, empty/error states and ownership on every operation; retain UI components. |
| F04 ACTIVE | P `hooks/useServiceData.js:1–17`, `lib/serviceLiveRegistry.js`, `hooks/useVehiclePrepResource.js`, `lib/vehiclePrepMutation.js`, service tabs/detail/forms; O/W `useDiaryVehiclePrep.js`, `vehiclePrepMutation.js` | Firestore `onSnapshot`, shared/ref-counted subscriptions, vehicle/prep/service collections, concurrent checklist/attribution changes and transactions. | Authorized cursor/revision change feed plus SQL transactions; preserve initial snapshot, ordered updates, reconnect/replay, deletes, refcounts/cancellation and atomic parent/child validation. Basic fetch-only replacement is insufficient. |
| F05 ACTIVE | P `lib/workingTermsApi.js:20–67` and signing below; `providers/AuthProvider.tsx`; P `server/workingTermsIdentity.js:28–100`, `/auth/working-terms-acceptance` in `server/index.js`; O/W `api/admin/working-terms/route.js` | Acceptance records under `workingTermsAcceptances/{uid}/versions/{version}`; owner signatures and authoritative resolution of legacy UID links. Direct read may fall back to API; both paths still use Firebase. | SQL acceptance repository with immutable provenance/version and same identity reconciliation; direct Clerk-authenticated status endpoint. Signing must remain blocked until its independent write migration is accepted. No manufactured re-signatures or email-only ownership inference. |
| F06 ACTIVE | P `lib/hrHistoryApi.js`, `lib/privateHistoryClient.js`, `server/hrHistoryProxy.js`; O/W `src/app/api/hr/_readSnapshot.js`, `_legacyService.js`, history/records handlers; `utils/hrHistory.js` | Private timesheet/holiday history, ownership completeness, immutable reviewer/owner links, CAS cancellation/approval. REST read transactions and writes use Firebase even behind the API. | SQL consistent snapshots, versioned mutations and explicit history-completeness projection. Preserve unknown/withheld results and role-specific approval. H&S is a separate admin-only domain, not an extension of self-history. |
| F07 ACTIVE | P `app/(protected)/spec-sheets.js`, `insurance.js`, `uploader.js`, Recce/Vehicle Check/service photo handlers, `lib/receipts/native.js:64–75`; O/W `utils/firebaseClient.js:1–8` and lazy Storage tools, uploader/upload-contract/evidence pages | Storage list/upload/resumable upload/download URL/delete; UID/company/object paths and persistent URL fields. Receipt uploads cancel on auth changes. | Private object provider behind file-intent/finalize/content APIs. Recheck canonical actor, parent ownership and object version; verify file size/type/hash, cancellation, progress, ranges/HEAD, direct URL denial and legacy references before retiring bucket. |
| F08 ACTIVE, with differing source implementations | O `src/app/api/files/fileService.js:6–45`, `fileTransportAdapter.js:4–8,50–79`, `handlers/*`; M embedded canonical runtime and `server/fileRoutes.js`; O/W receipts `_v2Evidence.js` | Server Storage/GCS requests using Firebase service-account OAuth, object generation/metageneration binding and reviewed authority in Firestore. Receipt evidence is pinned to original bytes/version. | Reuse pure file/evidence policies; replace transports with SQL metadata plus S3 object versions. Translate provider-specific version IDs explicitly. A new authenticated API that still calls `storage.googleapis.com` on the Firebase bucket is not completion. |
| F09 ACTIVE | P `lib/sync/firestoreQueue.js:1–60`, `lib/sync/outbox.js`, `lib/sync/engine.js:1–70`, `lib/sync/identity.js`; DataCache/Snapshot providers; receipt queue/cache files | Durable queued `target: firestore` mutations and transforms; original UID/company/employee ownership, account-change guards, cached identities and timestamps. Engine replays SDK operations and photo uploads. | Versioned domain commands with stable canonical IDs, operation IDs and base revision. Transform queued timestamps/array operations semantically; retain old format until safely replayed/converted by original owner. Never clear queues to simplify the migration or replay under a different Clerk subject. |
| F10 ACTIVE | P `server/index.js:49–85,98–115`, `server/workshopSubmission.js`, terms/device-token routes; O/W `src/app/api/_firebaseAuthAdmin.js`, `_firebaseAdminRest.js:7–28,71–95`, `admin/_lib.js` | Express and Next APIs initialize Admin SDK or mint service-account OAuth and call Firestore/Auth/Storage REST. Admin SDK bypasses client rules, making server checks essential. | Reuse hosting/HTTP/domain logic; replace both SDK and REST repositories and token-verification boundaries. Prove processes can start, serve and run jobs with Firebase network/credentials unavailable, not merely no Firebase import in mobile. |
| F11 ACTIVE | O/W `src/app/api/receipts/_v2Auth.js:13–45`, `_v2Repository.js:138–218`, `_v2Jobs.js`, `_v2Evidence.js`, v2 route tree; P `lib/receiptApi.js`, `server/receiptProxy.js` | Receipt workspace/parts/events/operation dedup, employee-person ownership, finance roles, evidence intake, lost-ACK retry, worker leases/extraction/digests. DB transactions + Storage remain essential. | Preserve existing domain engine and stable operation/person IDs; SQL repository/outbox and object adapter. Transaction replay, correction history, original evidence, reviewer transitions, retries and no duplicate delivery require end-to-end acceptance. |
| F12 ACTIVE | O/W `vercel.json` crons; routes for `dvla/mot-history/sync`, `statistics/daily-briefing/generate`, `compliance/hgv/sync`, `maintenance/alerts/digest`, `maintenance/integrity-audit`, `activity/retention`, `receipts/v2/jobs` | Scheduled maintenance/compliance, retention, AI/receipt jobs; worker records/claims live in Firestore. Sage50 claim/started/succeeded/failed/reconcile API routes also store state through Firebase helpers. | Reuse schedules/worker logic and external integrations, move leases/claims/events to SQL with worker auth and idempotency. Inventory any separately hosted Sage connector process before retirement; its executable/runtime is NOT VERIFIED here. |
| F13 ACTIVE | W `src/app/api/webhooks/clerk/route.js`, `auth/clerkLifecycleHandler.mjs`, `clerkSessionLease.mjs`, `clerkLeaseRepository.mjs`; O/W `api/stripe/webhook/route.js`, billing repository and storage usage | Signed Clerk session events deactivate Firestore leases. Stripe billing reconciliation/audit and storage usage also touch Firestore/Storage. Existing Clerk handler handles session ended/revoked/removed, not complete user-deletion/role synchronization. | SQL session/account status and idempotent event inbox; reuse signature checks, protect against reordered/replayed events. Design disabled/deleted users and admin role updates explicitly; never assume session webhooks cover every lifecycle event. Keep Stripe/Sage side effects single-dispatch. |
| F14 ACTIVE, broad office surface | O/W `src/app/utils/firebaseClient.js`, `firestoreAccess.js`, office CRUD/calendar/HR/finance/statistics/pages; common `api/_firebaseAdminRest.js` and `api/admin/_lib.js` | Browser SDK reads/listeners/writes plus server REST; business booking, quotes/invoice lifecycle, employees, vehicles, equipment, H&S, settings, audit/activity and support workflows. Office is not Firebase-free because it uses ClerkProvider. | Migrate by domain with the mobile readers/writers and workers, not mobile-only. See Appendix B exact direct-import/runtime helper candidates. Preserve all feature/role/approval checks and form/list behavior. |
| F15 ACTIVE / TRANSITIONAL | P `firebase.json` selects `firebase/mobile-compat/{firestore,storage}.rules`; M's current config selects the same relative family in M; O/W `firebase.json` select root rules/indexes. Rule tests and CLI deployment scripts reference additional candidate/rollback policies. | Rules enforce actor/company/workspace/owner/field/parent/immutable-evidence restrictions and Clerk leases for direct SDK clients. Some legacy H&S paths are broader than the owner policy. Indexes are part of query behavior. | Maintain explicit rule-to-API test matrix. Replace enforcement before revoking direct access; never delete rules while clients remain. Select actual deployed policy via separately authorised control-plane verification; filenames do not prove deployment. |
| F16 ACTIVE Android transport, owner decision pending | P installed `expo-notifications@55.0.27`, Android `build.gradle:42` declares `firebase-messaging:25.0.1`; P `lib/notifications.js:239–277`, `app/_layout.jsx`, server device-token routes; W `_v2Notifications.js:106,154` | Expo token registration → Expo Push → Android FCM / iOS APNs. Inbox/device ownership data currently in Firestore. Local scheduling is distinct from remote push. | Move token/inbox/job metadata to SQL, preserve transport until the FCM decision is approved. SDK removal/native rebuild and cross-platform delivery/taps/receipt handling are separate acceptance gates. |
| F17 ACTIVE native/build; TRANSITIONAL credentials/tooling | P `package.json`, `app.json`, `app.config.js`, `eas.json`, `plugins/withFirebaseModularHeaders`; `GoogleService-Info.plist`, `google-services.json` filenames; `@react-native-firebase/app@24.1.1`; M generated native projects; CI rules/emulator suites | Native Firebase initialization/config, JS `firebase@12.16.0`, Admin packages, Firebase targets and build inputs. P has no generated ios/android directories; do not infer installed manifests. | Remove application SDK/plugin/config only after dependencies are replaced; keep any explicitly approved FCM requirements. New native binaries, dependency-lock reconciliation, runtime/OTA compatibility and clean CI are required. No keys/config values were read from credential files. |
| F18 UNUSED in inspected application runtime / NOT VERIFIED outside it | Searches found no Firebase Realtime Database client API/import despite `databaseURL` in O's client config; no Firebase App Check, Analytics, Remote Config or Crashlytics runtime imports; no `firebase-functions` package/Functions deployment entrypoint in the inspected apps. | Config presence is not usage. P uses Sentry, not a Firebase crash SDK. `/app-config` is an Express/env response, not Firebase Remote Config, although its current process initializes Admin unconditionally. | Retain Sentry/privacy controls. Classify RTDB config-only here; verify cloud/worker/project inventories before asserting these services can retire. External Functions/triggers, extensions, exports and manual jobs remain NOT VERIFIED. |
| F19 TRANSITIONAL / HISTORICAL | W `scripts/clerkMigration*.mjs`, `migrate-firebase-users-to-clerk.mjs`, `clerkIdentityRepair*.mjs`, legacy transition commands; M Firebase auth-page/recovery adapters; old release docs/artifacts | Existing guarded user/password-link migration and repair tooling; older sign-in clients and recovery pages still need a retirement plan. Prior reports of builds/tests are historical. | Reuse reviewed mapping/inventory/dry-run/journal logic; do not rerun imports or read private manifests in discovery. Retire only after roster reconciliation, accepted recovery and old-client cutoff. Obsolete source helpers need import/call checks before deletion. |

### Existing environment/build contracts to account for

Read variable **names in source**, not live values or dotenv contents: `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`, `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`, alternative `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`, `FIREBASE_ADMIN_ENV_PATH`, public Firebase config names, and `GOOGLE_SERVICES_JSON`/native file references. Clerk uses publishable/secret keys, deployment-role/shared-auth flags, issuer/origin checks, lifecycle signing secret and recovery URLs. Mobile forwards to `AUTH_WEB_ORIGIN`, `HR_WEB_ORIGIN`, `RECEIPTS_WEB_ORIGIN`; Main's file runtime adds file-service origin/authority requirements.

Replace application Firebase configuration with explicit SQL/object/Clerk environment contracts only when the relevant runtime has moved. Preserve issuer and canonical identity separation between pilot/staging/production; do not point test SQL identities at production Clerk. P's design-system CI and O/W's CI include Firebase emulator/rule dependencies. Keep them while the old path exists; add replacement policy/contract gates before retiring them. Vercel schedules, EAS settings, Next image/CSP allowlists and duplicate vendored service artifacts must also move. No hosting configuration proves a SQL database is available.

## 4. Target architecture and choices

```text
Mobile Pilot / office UI
  → Clerk session token (native Bearer; same-origin web session)
  → server validates signature, issuer, expiry, session subject and request origin/party
  → current canonical account ↔ employee ↔ company mapping and channel/role/feature approval
  → current revocation/recovery/Working Terms checks
  → domain API with field-level policy and concurrency preconditions
  → PostgreSQL records + immutable audit/outbox/job state
  → private object service with object-version/parent/owner authorization
  → authorised change feed / worker notification transport
```

The token's Clerk subject identifies a login identity, not authority to inspect a record. Request body company/employee/role fields, email matches, UI checks and cached display data are never the authorization source. Preserve W's request verification/party/issuer protections (`auth/clerkRequestIdentity.js:25–57`), including its special handling of native tokens that omit browser `azp`; do not weaken browser-party validation globally. Preserve current-session validation and recovery cutoffs. Signature validation alone does not establish that a previously issued token's session remains active. The replacement must implement bounded fresh session checks/revocation propagation at least as strict as the current accepted contract. [Clerk session-token validation](https://clerk.com/docs/guides/sessions/manual-jwt-verification), [authenticateRequest](https://clerk.com/docs/reference/backend/authenticate-request).

### Reuse versus build

| Capability | Exists and can be reused | Still needs replacement work |
| --- | --- | --- |
| Identity UI/provider and security predicates | P Clerk Expo provider/sign-in, W Clerk web middleware/recovery, canonical resolver, request verification, guarded migration tools | Firebase-independent canonical repository, session-status/revocation storage, backend composition and all consumer token adapters. Shared policy must not import Firebase runtime. |
| API and hosting surfaces | Existing Express server and Next route handlers, current authenticated service boundaries and proxies | Replace Firebase-backed repositories and unconditional Admin bootstrap. Avoid maintaining divergent authorization implementations in both servers; use a shared tested policy/domain library with per-host composition roots. |
| Data/business logic | Booking visibility, HR ownership, receipt engine, prep/status reducers, version/CAS policies, finance/approval code | SQL schema/repositories, migrations and completeness checks; no runtime PostgreSQL/Supabase/Prisma/Neon/database connection dependency was found in the inspected code. Cloud account inventories were not queried. |
| Files | O/M pure file policies, streaming/deadline/admission logic, receipt evidence model | SQL authority metadata + new private-object transport; no existing S3/R2/Blob client integration was found in these source roots. Current Storage/GCS APIs are not replacements. |
| Offline/realtime/jobs | Account-scoped queues/snapshots, service subscription registry, worker lease/retry policies and cron routes | Command-version adapters, SQL idempotency/revisions/outbox and authenticated change feed. Preserve behavior instead of substituting uncoordinated fetches. |
| Styling | ThemeProvider, tokens/radius, PageShell, AppPrimitives and existing loaded/error/preview layouts | No new UI system. Any changed data transport must satisfy existing screen state contracts. |

**Database recommendation:** managed PostgreSQL, with **Neon as the proposed default managed option**, subject to owner region, retention, capacity, recovery and cost approval. This is not a provisioned integration. Reuse an already approved managed PostgreSQL service instead if a genuine existing service is later identified. Self-managed PostgreSQL is the other practical option, with greater backup/operations responsibility; neither introduces another identity provider. Use ordinary server-side SQL access and scoped application roles, not client DB credentials. [Neon overview](https://neon.com/docs/introduction).

**File recommendation:** private versioned Amazon S3 behind the existing file-service contract. Retaining the current Firebase-managed bucket would reduce transfer work but would not meet the requested service exit without a separately accepted Google Cloud storage boundary and removal of Firebase policy/credential dependencies. S3 gives a clear new boundary; exact region, encryption, retention and recovery settings remain owner decisions. Do not provision a second database for files. Retention/immutability settings need an approved policy; do not enable irreversible retention modes casually. [S3 versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html), [Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).

### Transactions, realtime, offline and jobs

- Use SQL uniqueness/foreign keys and transactions for canonical links, Working Terms versions, operation IDs, immutable audit events, prep completion, HR review and receipt revisions. Translate Firestore read/write preconditions, transaction retries, create-if-absent, serverTimestamp and arrayUnion semantics deliberately. Serializability requires whole-transaction retry on a serialization conflict; do not retry an externally dispatched side effect as part of that retry. [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).
- Store a durable per-domain/company revision/change log and transactional outbox. Publish an authorized SSE/WebSocket feed from an appropriate long-lived host, retaining Next APIs for ordinary requests. Initial snapshot + cursor, scoped events, resume/delete semantics, catch-up after reconnect and revalidation after account/role changes are required. If hosting cannot support a persistent feed, design and test bounded revision polling as an explicit behavior/cost tradeoff before replacing listeners. PostgreSQL LISTEN/NOTIFY can wake a dispatcher; it is not the durable event history or offline recovery mechanism. [PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.htm).
- Keep existing mobile queue records and files scoped to their original canonical account/company/person. Submit domain commands with operation IDs and expected revisions, reauthorize each replay server-side and return canonical acknowledgements. Persist conflict/error states and retain work for the original user; logout must not transfer or delete queued records. Keep snapshot eligibility, freshness and revocation distinctions; never use cached grants for write authorization.
- Reuse cron/worker logic with SQL job rows, lease ownership/expiry, bounded retry and idempotency. Transactionally record intent before external work. For ambiguous push/email/Stripe/Sage/OCR outcomes, reconcile using provider/business operation IDs rather than assuming failure and repeating. Restore missed schedules without sending historical notification floods.

### Startup checks that remain

Provider restoration, exact account mapping, account enablement, mobile/service/office approval, company/role changes, session/recovery cutoffs, current Working Terms and compatible app version remain necessary. Keep locally safe display restoration independent of optional content, but authorization must finish before protected actions. Preserve denied versus unavailable outcomes. The unresolved recovery deadline and splash/theme handoff issues from the audit remain follow-up acceptance items; no startup redesign is part of this pass, and deleting Firebase is not evidence that those issues are fixed.

## 5. Identity, data and security migration

### Identity: preserve business identifiers

W already has `scripts/clerkMigrationModel.mjs:26–116`, `clerkMigrationApply.mjs`, `clerkMigrationRuntime.mjs`, `clerkEmployeeIdentity.mjs` and guarded repair/journal modules. The model checks Firebase UID, user/employee/company links, provider identity, disabled status, channels and conflicts; it preserves existing production Clerk credentials when a correct provider user exists. Existing verified-email rules do not justify a new email-only linking process. This pass read code/tests only: no roster, password export, private migration manifest or real account was opened, and no current migrated-user count is claimed.

Proposed SQL keys:

- `accounts.id`: retain the existing canonical UID as an application identifier even when the Firebase service is gone. Its historical name/value is not a reason to rewrite every foreign key.
- `identity_links`: unique `(provider_instance, clerk_user_id)` → canonical account; explicit provenance and verification state. Retain development/production provider identities separately. Existing `externalId` / private Firebase-UID metadata are cross-checks, not client-authoritative writes.
- `employees.id` and `companies.id`: preserve current IDs and all validated employee UID aliases (`authUid`, `uid`, `auth.uid`, `userId`). Conflicting or duplicate nonempty claims are quarantined for reviewed repair. Preserve historical aliases for lookup/audit rather than silently rewriting source records.
- Approval/capability fields and role normalization remain server owned. A new Clerk user, new email, recovered password or successful token validation must not auto-enable an employee or grant an office/service workspace. Disabled/deleted accounts remain denied while their records/audit remain referentially valid.

Reuse a reviewed current mapping manifest and existing idempotent journals; reconcile expected-before/after links and roster counts through a separately authorised dry run. If an unlinked person truly needs credential transfer, use the existing guarded migration process with explicit instance/UID/journal approval. Do not export passwords or import users again just to simplify the database migration. Keep Clerk as the sole final end-user authentication provider, without moving business permissions into unchecked user-editable metadata.

### Authorization replacement matrix

| Invariant now spread across rules/server code | Required replacement evidence |
| --- | --- |
| Enabled canonical account, current Clerk session, correct instance/company/employee and recovery boundary | 401 for invalid/expired/revoked credentials; 403 for confirmed disabled/unapproved/scope denial; unavailable response for DB/provider outage. No partial grant when one dependency fails. Test stale/contradictory mappings and reordered lifecycle events. |
| User/service/office features and administrator/manager approval boundaries | Explicit capability predicates and field allowlists; cross-company, self-promotion, changed reviewer and stale role denied. Manager is not administrator; single-company UI is preserved without adding tenant selection. |
| H&S and training data **and files** | **Admin-only, including an employee's own records. Employees and managers cannot list/read/download/preview/export them.** Test direct IDs, bulk/list endpoints, search, URLs, content ranges/HEAD, thumbnails, old references, cached responses and changed role during transfer. Owner approval would be required to change this policy. |
| Timesheet/holiday/shift/receipt ownership and approval | Canonical owner/person relations, immutable identities, review-only fields, status transition rules, completeness/withheld semantics and optimistic concurrency must remain enforced server-side, not just filtered by UI. |
| File review/parent/object integrity | Approved exact audience, same company and canonical parent; version/content hash/type/size match; immutable original evidence and append-only review history. Guard access again as needed during long streaming/finalize operations. |
| Terms | Preserve exact document version, original UID/employee provenance, signing time, signature/evidence and earliest validated historical acceptance. Missing acceptance and failed lookup are different states. Signature history cannot be mutated or invented by import. |
| Offline/replay/concurrent operations | Original owner/company/person, command hash + operation ID, expected revision, no duplicates on lost ACK, no stale response applied after account switch, stable cancellation/retry. |

**Source-policy discrepancy:** P `firebase/mobile-compat/firestore.rules:1318–1330` gives H&S register/check paths general user-tenant predicates; Storage `:383–394` gives legacy training-policy/certificate paths `hasUserAccess()`. These source paths are broader than the required admin-only boundary. O's newer `src/app/api/files/fileService.js:6–24` and `utils/hrEvidencePolicy.js:15,86–88` enforce administrator checks for restricted evidence. Do not preserve the broad legacy grants as target behavior. Actual deployed rules were not fetched, so this is a consolidation/acceptance discrepancy, not a claim of observed live disclosure. It must block production migration acceptance until the approved policy is proven across all clients/paths.

Client rules do not protect Admin SDK calls. Port the intended protections into reusable server policy plus SQL constraints/optional row-level security as defence in depth. Use least-privilege service DB roles; never expose an all-access generic document/path write endpoint. Policy tests must exercise real route/service/repository enforcement, not merely mirror predicate functions.

### Data/file migration, cutover and rollback

1. **Schema/contract dry run:** synthetic data first, including subcollections, references, timestamps/timezones, null-versus-missing fields, arrays, numeric precision, revisions, legacy owner aliases and deleted/archived records. Maintain source document paths and original IDs as provenance. Prefer domain schemas with JSON payload fields where needed for lossless transition; do not convert every Firestore document into an unrestricted generic API.
2. **Authorised backup and rehearsal:** later, with explicit production scope, take consistent source exports and a versioned object manifest; encrypt and limit access/retention. Include user/employee links, terms, audit, jobs, queues/checkpoints and object versions/ownership metadata. Restore into isolated SQL/object targets and prove restore—not just export success. None was executed here.
3. **Reconcile:** per-domain/company totals, identifiers, foreign-key edges, statuses, money/dates, signatures, ownership/completeness, revisions and content checksums. Compare object bytes/version mappings plus dangling/duplicate/private/public references; quarantine unresolved records instead of assigning by display name/email. Do not mark an incompletely mapped HR history as complete.
4. **One writer per domain:** recommend a brief scheduled write freeze for each bounded domain cutover, with backup → final delta → reconciliation → writer switch → controlled resume. Avoid ad hoc client dual writes. A larger zero-downtime path would require an implemented durable change-capture/outbox mechanism and its own design; none was found or assumed available.
5. **Old writers:** route version-aware old APIs to the new domain writer only when an equivalent compatibility adapter exists, or enforce a controlled minimum-client upgrade. Direct Firestore writers must be upgraded/fenced at rules before that domain's SQL writer becomes authoritative. Offline old queues may reconnect much later: retain a supported replay/version adapter or offer a safe pending-work recovery path. Do not silently drop them or let the old DB fork.
6. **Files:** retain original IDs/paths as lookup aliases but serve through the authenticated API, with new object/version mapping. Replacing database URL strings does not revoke old Firebase download tokens. After reconciliation and compatible-client rollout, explicitly retire old tokenized/public download access and verify direct requests fail under approved policy. New restricted downloads should use an authenticated stream/proxy with current authorization. Presigned URLs are bearer capabilities and may be reused during validity; they are not immediate session-revocation enforcement. [S3 presigned URL behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).
7. **Rollback before writes:** revert a route/feature selector to the original writer if the source remains current and no new authoritative writes occurred; retain stricter protections. Rollback data access must never restore permissive H&S rules or expired sessions.
8. **Rollback after writes:** first fence writers/workers; preserve the new SQL audit/outbox/object versions and all post-cutover operations. Reconcile/replay those operations through an approved reverse adapter into the old store, maintaining IDs, ordering, operation hashes, approvals and evidence; verify counts/relations before re-enabling old writers. If safe reverse replay is unavailable, prefer roll-forward/recovery on the new store. **Restoring old code or an old backup alone would lose post-cutover writes.** Already delivered emails/push/finance side effects cannot simply be undone or re-sent.
9. **Retain then retire:** keep encrypted backups and source/object read-only retention through an owner-approved recovery window. Do not delete Firebase users/projects/buckets/rules/secrets until every consumer and rollback obligation is accounted for. Distinguish ordinary source cleanup from irreversible service retirement.

## 6. Explicit FCM finding

Installed P versions inspected: Expo **55.0.31**, Expo Notifications **55.0.27**, Firebase JS **12.16.0**, React Native Firebase App **24.1.1**, Clerk Expo **4.11.0**. Expo Notifications' actual Android Gradle dependency is **`com.google.firebase:firebase-messaging:25.0.1`**. No `@react-native-firebase/messaging` JS module is needed for this dependency to exist.

P `lib/notifications.js:239–277` requests an Expo push token, not a direct APNs token. Its root registers that token after approved authentication/terms. The office receipt worker sends to Expo and polls push receipts (`W src/app/api/receipts/_v2Notifications.js:106,154`); Firebase-backed device/inbox/job ownership is separate from transport.

Official documentation checked in this pass: [Expo SDK 55 Notifications](https://docs.expo.dev/versions/v55.0.0/sdk/notifications/) matches the installed ~55.0.27 family. [Expo sending guide](https://docs.expo.dev/push-notifications/sending-notifications/) describes Expo delivery through Android FCM and iOS APNs. The [direct-send guide](https://docs.expo.dev/push-notifications/sending-notifications-custom/) uses native device tokens with FCM/APNs; bypassing Expo does not bypass Android FCM. [Google's Android FCM setup](https://firebase.google.com/docs/cloud-messaging/android/get-started) requires its client integration and compatible device services. These are transport facts, not evidence that current Bickers delivery works on a device.

Owner choices:

- **Recommended practical option, only if explicitly approved:** remove Firebase application Auth/Firestore/Storage/Admin usage but retain an **Android FCM-only exception**, potentially keeping Expo Push. Report the final system accurately as “Clerk + SQL/private files, with Android FCM transport”; it is **not fully Firebase-free**. Separate the remaining messaging credentials/project/IAM from application data. Do not delete the required Google configuration with the application SDK cleanup.
- **Literal zero Firebase:** current Android remote push cannot remain unchanged with the installed notification implementation. Commission a separate native feasibility/design/acceptance effort for a non-FCM transport and supported device coverage, reliability, OS background/battery behavior and delivery/tap semantics. Another push vendor is not sufficient proof because it may also use FCM. No equivalent drop-in replacement is established here.
- An alternative owner decision would be to accept loss/reduction of Android remote notifications while retaining in-app/local behavior. That changes workflows and is **not authorised or recommended as a silent migration shortcut**. iOS can continue through APNs, directly or via Expo, without Firebase application services.

No notification setting, credential or permission was changed. This decision need not block local schema/API migration, but it must be resolved before native cleanup and any claim of literal Firebase retirement.

## 7. Ordered migration stages

Each stage is independently reviewable. The future named primary mobile branch is P; related office work needs its own durable reviewed branch based on reconciliation of O/W. Paths marked **new** are proposed, not existing implementations. No stage below was executed.

| Stage / one outcome | Exact component boundary | Firebase removed / remaining | Identity/data/rollback implications and acceptance | Environment / approval |
| --- | --- | --- | --- | --- |
| 0. Protected primary-source checkpoint | P/M diff families in §2; P `docs/APP_STARTUP_FIX_01.md`, fixed forms/test; O/W source-policy ledger | Removes no runtime dependency | Review dirty/untracked work, named branch/checkpoints, no secret inclusion, mapped security and business parity. Roll back selected patches/checkpoint, not working-directory cleanup. Keep source-specific native settings. | Source only; separate Git mutation authorisation. |
| 1. One Firebase-independent Working Terms status read | Existing P `lib/workingTermsApi.js:38–67`, AuthProvider terms read; new `lib/workingTermsStatusApi.js`; new injectable Express `server/clerkApi.js`, `server/clerkAccountAccess.js`, `server/repositories/workingTermsPostgres.js`; proposed SQL migration/test files | Removes Firebase **execution from the new status-read flow**; bridge, signing, old read path and all other domains remain | Canonical links + current approval/session + acceptance provenance in local SQL; test missing vs unavailable vs denied and account switching. Local selector rollback to old path; no real records changed. Do not import P `server/index.js` into the new fixture composition: it initializes Admin unconditionally. | Local synthetic SQL and mocked/synthetic Clerk verification first; no cloud provisioning or live cutover. See §8. |
| 2. Accepted canonical actor and authority administration | P `providers/AuthProvider.tsx`, Clerk provider, `lib/mobileClerkAccess.js`, sync identity; O/W `_clerkAccess.js`, `admin/_lib.js`, `_sessionSecurity.js`, lifecycle/session/recovery handlers; new shared SQL authorization/session repositories | Replaces Firestore authority reads for accepted SQL-backed APIs; Firebase bridge leases still required by unmoved clients | Migrate canonical mapping/role/status administration through one authority and propagation contract. Signed webhook inbox + current session checks, revocation cutoffs, role changes/disabled/deleted users; no email auto-link. Controlled authority cutover with read parity and write fence; roll back only after post-switch admin changes reconcile. | Isolated environment; separate approved identity/authority data migration and later production cutover. |
| 3. Readonly operational domain + change feed | P `hooks/useOperationalData.js`, `hooks/useServiceData.js`, `useVehiclePrepResource.js`, corresponding O/W browser collections/listeners; new SQL domain repositories/feed | Retires selected Firestore reads/listeners after corresponding writers/deltas are authoritative; direct reads elsewhere remain | Begin one booking/vehicle or reference-data family. Snapshot/cursor authorization, published/assigned/archived rules, reconnect/deletion tests and derived counts must match. Do not switch a SQL reader to an unmaintained copy while Firestore writers remain; use rehearsed snapshot/delta or defer authoritative reads until stage 4 fence. | Local then synthetic environment; production data/realtime cutover approval separate. |
| 4. One operational command writer, then repeat by domain | P Recce/Vehicle Check/timesheet/holiday/prep/service command owners, `lib/vehiclePrepMutation.js`, `server/workshopSubmission.js`; O/W booking/maintenance/HR writer services; `lib/sync/engine.js` | Removes corresponding Firestore transactions/batches/writes and replay targets domain by domain | Atomic invariants, command versioning, original-owner queue conversion and operation dedup. Enforce field/approval restrictions in actual API+SQL. Fence old direct writers before SQL authority; capture/replay post-cutover writes for rollback. No multi-domain big-bang. | Isolated concurrency/failure testing; separately approved domain data/write cutovers. |
| 5. Protected files/evidence on private object storage | O `api/files/*`, M canonical vendored runtime, P upload/photo/receipt consumers; new SQL object authority and S3 adapter | Removes selected Storage SDK and server bucket calls only after all references/versions move; legacy files remain until reconciled | Admin-only H&S/training across metadata and bytes, immutable evidence/parent/version, stream cancellation/ranges/HEAD, no leaked token URL. Reconcile copied bytes and reviewed authority; rollback preserves new uploads and mappings. | Isolated object service; owner storage/retention approval, separately approved transfer/cutover. |
| 6. Receipt/finance worker domain and remaining scheduled/integration jobs | O/W receipts `_v2Repository/_v2Jobs/_v2Evidence/_v2Notifications`, billing repo/webhook, Sage50 job routes, seven cron routes; P receipt queue | Removes remaining domain Firestore/Storage jobs/repositories after each cutover; unmoved office/UI still remain | Preserve full receipt revision/event/operation/person contract, extraction/finance approval, provider ACK reconciliation, lease concurrency, digest schedules, Stripe/Sage idempotency. Exactly one old/new dispatcher owns a job. Replay rather than resend on rollback. | Synthetic provider stubs/SQL/object tests; explicit later production worker/finance cutover. |
| 7. Complete mobile+office Firebase consumer exit | P all Appendix A consumers; O/W Appendix B families; general user/security/settings APIs; any newly discovered external worker | Removes remaining application SDK/REST reads/writes/listeners and Firebase token use | Authenticated API contract/access tests for every role/domain; no Firebase network in exercised paths; no background bootstrap/service account token fetch. Legacy clients receive supported compatibility or explicit upgrade. Rollback retains one writer and pending queue ownership. | Full isolated release acceptance; separate compatibility/rollout approval. |
| 8. Sole Clerk end-user auth; remove bridge | P `ClerkFirebaseProvider.jsx`, `firebaseConfig.js`, legacy login/recovery; O/W Firebase-token route, Firebase access listeners, `_firebaseAuthAdmin`, `_firebaseAdminRest`, legacy transition helpers | Removes Firebase Auth/custom-token mint/sign-in/lease glue once consumer ledger is empty; FCM may remain only by decision | Reconcile users/recovery/disabled status, keep canonical IDs and immutable acceptance/audit history. Old client policy and post-cutover password/session behavior accepted. Rollback to Firebase-backed clients would require still-valid compatibility authority; not just restoring obsolete passwords. | Isolated session/recovery and old-client tests; explicit production auth cutoff approval. |
| 9. Native/build/release change | P app config/plugins/dependencies/lockfiles, native project generation, Expo Updates runtime; O/W Firebase build/CLI/config/index/rule CI remnants | Removes application native Firebase initialization/packages/config; possible FCM-only dependency explicitly retained | New signed binaries for iOS/Android, compiled dependency tree, notification/deep-link/foreground/cold launch and two-theme rendering. OTA cannot remove native SDKs. Match source, binary, runtime, deployment and rollback-compatible API versions. | Separately approved native builds/charges and release rollout; no build in discovery. |
| 10. Final service retirement | All runtime/deployment credential inventories, Firebase projects/buckets/rules/Auth, worker schedulers and operational runbooks | Retires only services proven unused; approved FCM project/credentials stay outside “fully Firebase-free” claim | Reconciliation complete, old clients handled, data/queue recovery rehearsed, write audit/reverse replay proven, retention window met, controlled Firebase-blocked traffic observation clean. Archive source/policy evidence; revoke service credentials last. | Irreversible operations require explicit owner approval for exact services and retention. |

Stages 3–6 are repeated small domain slices, not instructions to migrate those whole families in one commit. Database/file cutover readiness can depend on completing the relevant writer, authority and worker substage even when a reader is implemented first. H&S/training policy reconciliation is a prerequisite to any production record/file slice that could expose those records.

### Exit criteria beyond text searches

- Runtime consumer ledger has no unapproved Firebase app usage across mobile, office, Express/Next, scheduled jobs, webhooks, connector workers, build/recovery hosts and old-client adapters. Source scanners, bundler/import graphs, compiled native manifests/dependencies and authorised deny-network tests agree.
- Auth/session/role/field/record/file tests pass at actual route/repository boundaries, including admin-only H&S/training and own-record denial for employees/managers. Cached display never authorizes work; revocation and unavailability remain distinct.
- User links, domain records, relations, revisions, acceptance/signature/audit history, original evidence and object hashes/versions reconcile; unresolved data is explicitly quarantined. No silent reimport/re-ID or ownership guess occurred.
- Direct legacy URLs, SDK writes and expired compatibility endpoints cannot bypass the new backend. Old installed versions and offline queued commands have an accepted upgrade/recovery path.
- Both native release artifacts and office/worker deployments are identified and accepted. Real device push, taps/deep links, background/resume, offline switching, theme/Dynamic Type and startup recovery are measured separately from JS test timing.
- Backups have been restored; a failed deployment and a post-write rollback/roll-forward have been rehearsed without losing data or duplicating external side effects.
- No Firebase credential/SDK/tooling remains without a named requirement. If Android FCM remains, the exception is explicit, approved, minimal and accurately reflected in the final system description. Literal zero-Firebase exit cannot pass with that exception.

## 8. ONE recommended first implementation task

**Implement the existing read-only Working Terms status flow on a direct Clerk + PostgreSQL path in an isolated local environment.** First carry out the separately approved checkpoint from stage 0; then implement only this slice. Do not start by rewriting providers, deleting the bridge, removing a package or importing users.

Why this flow: P already has the client function, required startup call, endpoint and exact acceptance semantics. It is bounded and readonly, but exercises authentication → canonical account/employee/company approval → database → mobile consumer. It reduces a real Firebase dependency and supports the eventual startup design without changing the policy requiring Working Terms. A `/health` or public app-config endpoint would not prove that chain.

Proposed files/boundaries:

- Keep `lib/workingTermsApi.js` signing and legacy resolution unchanged. Add a Firebase-free `lib/workingTermsStatusApi.js` client using a short-lived Clerk session Bearer token obtained through a narrow provider request method; never store tokens in UI/cache/snapshot.
- P `providers/ClerkFirebaseProvider.jsx` exposes that narrow request/token getter; `providers/AuthProvider.tsx` chooses the new status reader only under an explicit local/test migration configuration. Existing bridge/readiness checks remain for all unmoved consumers. This is not permission to make a locally seeded SQL copy a production authority.
- New injectable `server/clerkApi.js` composition/route and `server/clerkAccountAccess.js` enforce the existing issuer/session/identity/channel/recovery contract against SQL. Share/adapt the reviewed pure W identity predicates rather than inventing looser email matching. Do not initialize Admin or read Firebase as a hidden fallback for this endpoint.
- New `server/repositories/workingTermsPostgres.js` and a small versioned schema for canonical accounts, identity links, employees/current approval and immutable acceptance versions/provenance. Start with synthetic fixtures, not a production directory import. No signature blob is sent to the mobile status consumer; return only the existing consumer-required acceptance projection or explicit null/error.
- Add actual HTTP + local PostgreSQL integration tests, client/real-provider-boundary tests with synthetic Clerk verification/JWKS or injected provider fixtures, and existing Working Terms gate/regression tests. Use a separate test composition that can run with Firebase credentials absent and outbound Firebase traffic prohibited. No live Clerk account operation or cloud database provisioning is included.

Acceptance: accepted current record preserves the required fields/version/provenance; absent acceptance routes to required terms; DB/token/service failure produces unavailable, never false acceptance; disabled/revoked/wrong-company/wrong-employee/mismatched-instance and stale-account responses deny without data exposure. Current required authentication and terms remain in force. The new read path performs no Firebase SDK/REST work; normal app/signature/other-domain Firebase dependencies remain accurately reported. Test rollback to the original isolated status path and no new writes/data migration.

Native rendering of the status/gate remains a separate check when a known isolated build exists. Do not claim a faster launch or Firebase-free app from this slice. Production authority/data cutover, user migration and provider removal require later staged approval.

## 9. Decisions/access genuinely required later

No further access was required to write this report. Before implementation/release, resolve:

1. **Android definition:** explicit FCM-only exception versus a funded literal-zero transport redesign. No exception is assumed.
2. **Infrastructure:** approve PostgreSQL/object provider, region, recovery/backup retention, operating budget and deployment ownership; confirm whether any already approved SQL/private storage service exists outside this inspected code. No provider was provisioned or billed.
3. **Safe test environment:** identify test Clerk instance/issuer and synthetic mobile/admin/manager/service accounts, isolated PostgreSQL/object endpoints, and a known native test build. No production roster or credentials should be pasted into chat.
4. **Cutover ownership:** approve checkpoint branch actions, reconciliation of M/O security/file work with P/W Clerk work, maintenance windows/old-client minimum version, domain write fences, backup retention and who can authorize final credential/service retirement.
5. **Coverage:** separately identify deployed office/API/worker sources, Firebase project services/Functions/extensions/RTDB if any, external Sage connector runtime, actual deployed rules, object/record volume and client versions. These could not be established from local source alone. An authorised later inventory can use service metadata and sanitised manifests; discovery did not access customer records.

## 10. Checks actually run and preservation

Historical Task 1 evidence (39/39) was not assumed current. Fresh in this pass:

- **P:** `N --experimental-vm-modules --test tests/formLoadingState.test.js tests/vehicleCheckLoading.test.js tests/pageShellRefresh.test.js tests/pageShellSpacing.test.js tests/asyncState.test.js` → **39 passed, 0 failed/skipped/cancelled**. Production loading callsite diffs were re-read; the fixes and regression test remain present.
- **W:** `N --test tests/clerkMigrationModel.test.mjs tests/clerkRequestIdentity.test.mjs tests/sharedClerkBridge.test.mjs tests/clerkSessionLease.test.mjs tests/clerkLifecycleHandler.test.mjs` → **70 passed, 0 failed/skipped/cancelled**. Imports were inspected first: pure/injected synthetic identity/lease/handler tests; no live inventory, password import or provider initialization. They prove tested local behavior, not deployed mapping completion.
- `N` is `/Users/masonbickers/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` (working bundled Node 24.19). Package scripts were inspected; direct commands omit the unsupported old default-module flag. Existing module-type detection warnings were not “fixed” by altering package configuration.
- Read-only `git status`, `rev-parse`, branch/worktree lists and focused diffs; file-content comparisons; pruned Python source/import/config scans; package/Gradle/version inspection; `lsof` listener check; current official documentation lookup. No app/server/build/deploy/migration script or emulator was started. No test generated cloud activity or accessed real accounts.
- No whole-repository lint/build/rules suite was run. This pass changed no implementation; existing lint debt from Task 1 is historical, not freshly reverified or cleaned up. Native, release, cloud runtime and data reconciliation are NOT VERIFIED.

Only `P/docs/CLERK_FIREBASE_EXIT_PLAN.md` was created. Pre-write content fingerprints (selected Git-tracked/untracked existing source/config/document extensions, excluding this report and generated output/tmp caches) were recorded in the tool transcript: P 745 files, digest `884e9ae0cac78760a82a5608cb6a6e6903ca0f2ca6072bfb9dce0195b46b8024`; M 1,863 files, digest `a4a7546eeac38808c7701bb58c7fd4066998699332e123dcd3acd80a5907322c`. The same inventory is checked again at completion. No extra evidence/log files were created in either checkout, and no Main application work was edited. O/W were read only.

**Stop:** this report proposes migration stages. It does not approve or execute them.

## Appendix A. Exact mobile runtime discovery index

These P paths identify the direct SDK consumers and adapter references behind F01–F11. Conditional legacy branches are TRANSITIONAL as described in §3; import presence alone is not proof of live invocation. `P:firebaseConfig.js` is the root initializer, in addition to this folder scan. Firebase-like queue/path terminology can persist as historical data after runtime migration. This is an implementation checklist, not authorisation to edit all listed files.

### P — direct SDK import (52 files)

- `P:app/(auth)/login.jsx`
- `P:app/(protected)/(main-tabs)/me.js`
- `P:app/(protected)/(main-tabs)/screens/homescreen.js`
- `P:app/(protected)/(service-tabs)/service/issues.jsx`
- `P:app/(protected)/add-timesheet.js`
- `P:app/(protected)/bookings/[id].jsx`
- `P:app/(protected)/edit-profile.js`
- `P:app/(protected)/expenses.js`
- `P:app/(protected)/fix.js`
- `P:app/(protected)/help.js`
- `P:app/(protected)/holiday-request.js`
- `P:app/(protected)/holidaypage.js`
- `P:app/(protected)/insurance.js`
- `P:app/(protected)/maintenance.js`
- `P:app/(protected)/notification/[id].js`
- `P:app/(protected)/query/[id]/index.js`
- `P:app/(protected)/recce-form.js`
- `P:app/(protected)/service/advisories.jsx`
- `P:app/(protected)/service/defect-form.jsx`
- `P:app/(protected)/service/defects/[id].jsx`
- `P:app/(protected)/service/inspections/inspection-form/[id].jsx`
- `P:app/(protected)/service/minor-service/[id].jsx`
- `P:app/(protected)/service/mot-precheck/[id].jsx`
- `P:app/(protected)/service/repair-form.jsx`
- `P:app/(protected)/service/resolved-defects/[id].jsx`
- `P:app/(protected)/service/service-form/[id].jsx`
- `P:app/(protected)/service/service-record/[id].jsx`
- `P:app/(protected)/service/settings.js`
- `P:app/(protected)/service/vehicle-check-form/[id].jsx`
- `P:app/(protected)/service/vehicle-prep/[id].jsx`
- `P:app/(protected)/service/vehicles/[id].jsx`
- `P:app/(protected)/settings.js`
- `P:app/(protected)/spec-sheets.js`
- `P:app/(protected)/timesheet.js`
- `P:app/(protected)/uploader.js`
- `P:app/(protected)/vehicle-check.js`
- `P:app/(protected)/vehicle-prep/[id].jsx`
- `P:app/(protected)/week/[id]/index.js`
- `P:app/(protected)/work-diary-board.js`
- `P:hooks/useEmployeeNotifications.js`
- `P:hooks/useOperationalData.js`
- `P:hooks/useServiceData.js`
- `P:hooks/useVehiclePrepResource.js`
- `P:lib/firebase.js`
- `P:lib/receipts/native.js`
- `P:lib/sync/engine.js`
- `P:lib/vehiclePrepMutation.js`
- `P:lib/workingTermsApi.js`
- `P:lib/workshopRequestSync.js`
- `P:providers/AuthProvider.tsx`
- `P:providers/ClerkFirebaseProvider.jsx`
- `P:server/index.js`
### P — Firebase client/admin/REST adapter reference (5 files)

- `P:lib/hrHistoryApi.js`
- `P:lib/receiptApi.js`
- `P:lib/sync/firestoreQueue.js`
- `P:lib/sync/outbox.js`
- `P:lib/workshopSubmissionApi.js`

## Appendix B. Office runtime discovery index and additional source

W and O share a large runtime surface. The list below identifies exact W source candidates behind F10–F14; the additional O-only candidates follow. Core adapters/routes/jobs were traced in §3. Utility/UI imports indicate remaining migration consumers; alternate backup filenames, manual scripts and fixtures are not assumed production routes. Installed/deployed reachability is NOT VERIFIED, and unused duplicate pages must be classified with router/import analysis before deletion. Scripts are inventoried separately in §3 rather than executed.

### W — direct SDK import (143 files)

- `W:src/app/add-employee/page.js`
- `W:src/app/add-equipment/page.js`
- `W:src/app/add-vehicle/page.js`
- `W:src/app/admin/page.js`
- `W:src/app/admin/security-audit/page.js`
- `W:src/app/api/_firebaseAuthAdmin.js`
- `W:src/app/api/_sessionSecurity.js`
- `W:src/app/api/auth/sharedClerkRuntime.js`
- `W:src/app/api/billing/_server.js`
- `W:src/app/api/billing/storageUsage.js`
- `W:src/app/api/mfa/_lib.js`
- `W:src/app/api/receipts/_v2Auth.js`
- `W:src/app/api/security/app-password-setup/runtime.js`
- `W:src/app/app-password-setup/page.jsx`
- `W:src/app/assistant/page.js`
- `W:src/app/backup-jobnumber.js`
- `W:src/app/book-work/[id]/page.js`
- `W:src/app/client-emails/page.js`
- `W:src/app/client-info/page.js`
- `W:src/app/completed-quotes/page.js`
- `W:src/app/components/DashboardMaintenanceModal.jsx`
- `W:src/app/components/EditHolidayForm.jsx`
- `W:src/app/components/EditMaintenanceBookingForm.jsx`
- `W:src/app/components/EditNoteModal.jsx`
- `W:src/app/components/EmployeePayGuide.jsx`
- `W:src/app/components/HeaderSidebarLayout.jsx`
- `W:src/app/components/MaintenanceBookingForm.jsx`
- `W:src/app/components/NotificationCenter.jsx`
- `W:src/app/components/PageUsageTracker.jsx`
- `W:src/app/components/VehicleCategorySettingsModal.jsx`
- `W:src/app/components/ViewBookingModal.jsx`
- `W:src/app/components/ViewMaintenanceModal.jsx`
- `W:src/app/components/ViewUCraneBooking.jsx`
- `W:src/app/components/create-note.jsx`
- `W:src/app/components/holidayform.jsx`
- `W:src/app/components/useTomorrowReadiness.js`
- `W:src/app/context/authContext.js`
- `W:src/app/create-booking/page.js`
- `W:src/app/create-enquiry/page.js`
- `W:src/app/dashboard/DashboardPageImpl.js`
- `W:src/app/defects/declined/page.js`
- `W:src/app/defects/general/page.js`
- `W:src/app/defects/immediate/page.js`
- `W:src/app/deleted-bookings/page.js`
- `W:src/app/edit-booking/[id]/page.js`
- `W:src/app/edit-employee/[id]/page.js`
- `W:src/app/edit-equipment/[id]/page.js`
- `W:src/app/edit-holiday/[id]/page.js`
- `W:src/app/edit-note/[id]/page.js`
- `W:src/app/edit-profile/page.js`
- `W:src/app/employee-home/[employeeKey]/page.js`
- `W:src/app/employee-home/page.js`
- `W:src/app/employees/page.js`
- `W:src/app/enquiry/page.js`
- `W:src/app/equipment/page.js`
- `W:src/app/finance-home/page.js`
- `W:src/app/finance-queue/page.js`
- `W:src/app/general/page.js`
- `W:src/app/h-and-s/[id]/page.js`
- `W:src/app/h-and-s/page.js`
- `W:src/app/h-and-s/training-policy/page.js`
- `W:src/app/hgv-compliance/page.js`
- `W:src/app/holiday-allowance/page.js`
- `W:src/app/holiday-usage/page.js`
- `W:src/app/home/page.js`
- `W:src/app/hr/page.js`
- `W:src/app/immediate/page.js`
- `W:src/app/invoice-view/[id]/page.js`
- `W:src/app/invoice/[id]/page.js`
- `W:src/app/invoiced/page.js`
- `W:src/app/job-home/page.js`
- `W:src/app/job-numbers/[id]/page.js`
- `W:src/app/job-sheet/page.js`
- `W:src/app/job-summary/[id]/page.js`
- `W:src/app/lorry-home/page.js`
- `W:src/app/maintenance-jobs/page.js`
- `W:src/app/mot-history-sync/page.js`
- `W:src/app/mot-overview/page.js`
- `W:src/app/note-edit/[id]/page.js`
- `W:src/app/note-form/page.js`
- `W:src/app/note/[id]/page.js`
- `W:src/app/operations-calendar/OperationsCalendarPage.jsx`
- `W:src/app/pages/api/verify-mfa.js`
- `W:src/app/paid/page.js`
- `W:src/app/platform-admin/_components/PlatformAdminSectionPage.jsx`
- `W:src/app/platform-admin/companies/[companyId]/CompanySettings.jsx`
- `W:src/app/platform-admin/project-control/ProjectControlClient.jsx`
- `W:src/app/platform-admin/record-review/RecordReviewClient.jsx`
- `W:src/app/preplist-dashboard/page.js`
- `W:src/app/preplist/page.js`
- `W:src/app/profile/page.js`
- `W:src/app/quote-insights/page.js`
- `W:src/app/quote-templates/page.js`
- `W:src/app/quote/[id]/page.js`
- `W:src/app/ready-invoice/page.js`
- `W:src/app/recce-form/[id]/page.js`
- `W:src/app/receipts/components/ReceiptLocalDemo.js`
- `W:src/app/review-queue/page.js`
- `W:src/app/saved-contacts/page.js`
- `W:src/app/service-overview/page.js`
- `W:src/app/settings/_components/PersonalSettings.jsx`
- `W:src/app/settings/ai-business-rules/page.js`
- `W:src/app/shared-prep-e2e/Harness.jsx`
- `W:src/app/shift-change/page.js`
- `W:src/app/sick-leave/page.js`
- `W:src/app/statistics/DailyBriefingPanel.jsx`
- `W:src/app/statistics/page.js`
- `W:src/app/stunt-prep/page.js`
- `W:src/app/timesheet-id/[id]/page.js`
- `W:src/app/timesheets/page.js`
- `W:src/app/u-crane-booking/page.js`
- `W:src/app/u-crane-crew/page.js`
- `W:src/app/u-crane-edit/[id]/page.js`
- `W:src/app/upload-contract/page.js`
- `W:src/app/upload/page.js`
- `W:src/app/uploader.js`
- `W:src/app/usage-overview/page.js`
- `W:src/app/utils/accessControl.js`
- `W:src/app/utils/bookingAvailability.js`
- `W:src/app/utils/bookingFormReferenceData.js`
- `W:src/app/utils/firebaseClient.js`
- `W:src/app/utils/firestoreAccess.js`
- `W:src/app/utils/inspectionRollover.js`
- `W:src/app/utils/maintenanceBookingService.js`
- `W:src/app/utils/prepFirebaseDemo.js`
- `W:src/app/utils/useDiaryVehiclePrep.js`
- `W:src/app/utils/useFirstPencilData.js`
- `W:src/app/utils/vehicleCategorySettings.js`
- `W:src/app/utils/vehiclePrepMutation.js`
- `W:src/app/vehicle-activity/page.js`
- `W:src/app/vehicle-check/VehicleCheckCapture.jsx`
- `W:src/app/vehicle-checkid/[id]/page.js`
- `W:src/app/vehicle-checks/page.js`
- `W:src/app/vehicle-edit/[id]/maintenance-history/[type]/page.js`
- `W:src/app/vehicle-edit/[id]/mot-history/page.js`
- `W:src/app/vehicle-edit/[id]/page.js`
- `W:src/app/vehicle-edit/[id]/service-history/[serviceId]/page.js`
- `W:src/app/vehicle-edit/[id]/service-history/page.js`
- `W:src/app/vehicle-edit/[id]/timeline/page.js`
- `W:src/app/vehicle-home/page.js`
- `W:src/app/vehicle-home/requests/page.js`
- `W:src/app/vehicles/page.js`
- `W:src/app/workshop/page.js`
### W — Firebase client/admin/REST adapter reference (100 files)

- `W:src/app/api/_appearance.js`
- `W:src/app/api/_firebaseAdminRest.js`
- `W:src/app/api/_notificationDelivery.js`
- `W:src/app/api/_releaseNotification.js`
- `W:src/app/api/_tenantRecords.js`
- `W:src/app/api/activity/heartbeat/route.js`
- `W:src/app/api/activity/notice/route.js`
- `W:src/app/api/activity/page-usage/_store.js`
- `W:src/app/api/activity/page-usage/route.js`
- `W:src/app/api/activity/retention/route.js`
- `W:src/app/api/admin/_lib.js`
- `W:src/app/api/admin/activity-tracking/route.js`
- `W:src/app/api/admin/activity-tracking/settings/route.js`
- `W:src/app/api/admin/appearance/migrate/route.js`
- `W:src/app/api/admin/appearance/route.js`
- `W:src/app/api/admin/dashboard-data/route.js`
- `W:src/app/api/admin/employees/[employeeId]/mobile-access/route.js`
- `W:src/app/api/admin/employees/[employeeId]/personnel/route.js`
- `W:src/app/api/admin/employees/route.js`
- `W:src/app/api/admin/migrate-mfa-secrets/route.js`
- `W:src/app/api/admin/overview/route.js`
- `W:src/app/api/admin/security-audit/route.js`
- `W:src/app/api/admin/users/[userId]/finance-access/route.js`
- `W:src/app/api/admin/users/[userId]/route.js`
- `W:src/app/api/admin/working-terms/route.js`
- `W:src/app/api/appearance/route.js`
- `W:src/app/api/auth/_clerkAccess.js`
- `W:src/app/api/auth/firebase-token/route.js`
- `W:src/app/api/auth/user-code-login/route.js`
- `W:src/app/api/compliance/hgv/sync/route.js`
- `W:src/app/api/device-tokens/route.js`
- `W:src/app/api/dvla/mot-history/sync/route.js`
- `W:src/app/api/finance/contact-profiles/[contactId]/route.js`
- `W:src/app/api/finance/contact-profiles/route.js`
- `W:src/app/api/hr/_legacyService.js`
- `W:src/app/api/hr/_readSnapshot.js`
- `W:src/app/api/hr/records/route.js`
- `W:src/app/api/integrations/sage50/connectors/_lib.js`
- `W:src/app/api/integrations/sage50/connectors/heartbeat/route.js`
- `W:src/app/api/integrations/sage50/connectors/route.js`
- `W:src/app/api/integrations/sage50/customer-lookups/[lookupJobId]/confirm/route.js`
- `W:src/app/api/integrations/sage50/customer-lookups/_lib.js`
- `W:src/app/api/integrations/sage50/customer-lookups/claim/route.js`
- `W:src/app/api/integrations/sage50/customer-lookups/route.js`
- `W:src/app/api/integrations/sage50/export-jobs/[jobId]/reconcile/route.js`
- `W:src/app/api/integrations/sage50/export-jobs/_lib.js`
- `W:src/app/api/integrations/sage50/export-jobs/claim/route.js`
- `W:src/app/api/integrations/sage50/export-jobs/route.js`
- `W:src/app/api/invoices/[id]/delivery/route.js`
- `W:src/app/api/invoices/[id]/issued-document/route.js`
- `W:src/app/api/invoices/[id]/lifecycle/route.js`
- `W:src/app/api/issue-reports/route.js`
- `W:src/app/api/maintenance/alerts/_notificationTransaction.js`
- `W:src/app/api/maintenance/alerts/digest/route.js`
- `W:src/app/api/maintenance/alerts/route.js`
- `W:src/app/api/maintenance/alerts/settings/route.js`
- `W:src/app/api/maintenance/bookings/_service.js`
- `W:src/app/api/maintenance/integrity-audit/route.js`
- `W:src/app/api/maintenance/legacy-jobs/_service.js`
- `W:src/app/api/maintenance/reconciliation/route.js`
- `W:src/app/api/mfa/setup/route.js`
- `W:src/app/api/mfa/verify/route.js`
- `W:src/app/api/notifications/route.js`
- `W:src/app/api/passkeys/_lib.js`
- `W:src/app/api/passkeys/login/options/route.js`
- `W:src/app/api/passkeys/login/verify/route.js`
- `W:src/app/api/passkeys/register/options/route.js`
- `W:src/app/api/passkeys/register/verify/route.js`
- `W:src/app/api/platform-admin/record-review/destinations/route.js`
- `W:src/app/api/platform-admin/record-review/route.js`
- `W:src/app/api/platform-admin/route.js`
- `W:src/app/api/platform/_lib.js`
- `W:src/app/api/platform/companies/update/route.js`
- `W:src/app/api/platform/employee-linking/link/route.js`
- `W:src/app/api/platform/users/force-mfa-reset/route.js`
- `W:src/app/api/platform/users/update/route.js`
- `W:src/app/api/quote-insights/route.js`
- `W:src/app/api/receipts/_lib.js`
- `W:src/app/api/security/bootstrap-access/route.js`
- `W:src/app/api/security/clerk-recovery/route.js`
- `W:src/app/api/security/login-attempt/route.js`
- `W:src/app/api/security/login-notification/route.js`
- `W:src/app/api/statistics/_briefingService.js`
- `W:src/app/api/statistics/business-rules/route.js`
- `W:src/app/api/statistics/daily-briefing/feedback/route.js`
- `W:src/app/api/statistics/daily-briefing/generate/route.js`
- `W:src/app/api/statistics/daily-briefing/route.js`
- `W:src/app/api/tenant/legacy/route.js`
- `W:src/app/api/timesheets/reminders/route.js`
- `W:src/app/api/vehicle-checks/capture/route.js`
- `W:src/app/api/vehicles/[vehicleId]/delete/route.js`
- `W:src/app/components/TemporaryAppPassword.jsx`
- `W:src/app/platform-admin/_components/platformAdminData.js`
- `W:src/app/utils/hrEvidenceClient.js`
- `W:src/app/utils/hrEvidencePolicy.js`
- `W:src/app/utils/issuedInvoiceDocumentService.js`
- `W:src/app/utils/legacyMaintenanceMutationClient.js`
- `W:src/app/utils/maintenanceMutationClient.js`
- `W:src/app/utils/vehicleCheckPhotos.mjs`
- `W:src/app/utils/vehicleMutationClient.js`

### Additional O candidates absent from the W candidate index

These include newer protected-file/security adapters and duplicate legacy source filenames. They require selective reconciliation; presence is not proof of execution.

- `O:src/app/api/admin/appearance/route-MacBook Pro (2).js`
- `O:src/app/api/appearance/route-MacBook Pro (2).js`
- `O:src/app/api/auth/webClerkLease.js`
- `O:src/app/api/files/fileTransportAdapter.js`
- `O:src/app/api/statistics/_auth-MacBook Pro (2).js`
- `O:src/app/api/statistics/_briefingService-MacBook Pro (2).js`
- `O:src/app/api/statistics/business-rules/route-MacBook Pro (2).js`
- `O:src/app/api/statistics/daily-briefing/route-MacBook Pro (2).js`
- `O:src/app/components/AuthenticatedEvidenceLink.jsx`
- `O:src/app/config/fileConnectPolicy.mjs`
- `O:src/app/edit-booking/[id]/page 2.js`
- `O:src/app/invoice/[id]/page 2.js`
- `O:src/app/platform-admin/project-control/AppControlClient.jsx`
- `O:src/app/settings/ai-business-rules/page-MacBook Pro (2).js`
- `O:src/app/utils/authenticatedEvidenceBrowser.js`
- `O:src/app/utils/authenticatedEvidenceClient.js`

No source path in these appendices was changed by this report. Final retirement requires the runtime and deployment exit checks in §7, including consumers outside these source roots.
