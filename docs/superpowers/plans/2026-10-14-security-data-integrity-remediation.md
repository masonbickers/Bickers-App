# AUD-001–003 Security and Data Integrity Implementation Plan

> **For agentic workers:** After explicit user approval, use `superpowers:executing-plans` to implement this plan task by task. This document does not authorize implementation, migration or deployment.

**Goal:** Prevent employee-record tampering, cross-company file access and direct Firebase session/recovery bypass while preserving legitimate mobile and office workflows.

**Architecture:** Apply small, collection/path-specific changes to freshly captured **live** policies. Retain server-owned office approval/recovery services and narrowly verified legacy compatibility; do not replace either live policy with a complete local rule file.

**Tech stack:** Firebase Auth, Firestore/Storage Rules, Firebase Emulator Suite, Expo mobile clients, Next.js office services, Express mobile API.

**Spec:** [Professional Application Audit](../../audits/PROFESSIONAL_APP_AUDIT.md), AUD-001–003, and the user's seven planning requirements. Status: **plan only; awaiting approval**.

## Verified baseline

Read-only Firebase Rules release/source GETs at **12:26 and12:31 BST,14 October2026** gave identical release IDs and source hashes. Evidence: [initial parity receipt](../../audits/evidence/2026-10-14-security-plan/live-parity.json), [final recheck](../../audits/evidence/2026-10-14-security-plan/final-recheck/live-parity.json), retained immutable sources and [mobile-to-live diff](../../audits/evidence/2026-10-14-security-plan/mobile-to-live-firestore.diff).

| Target | Local selection | Live result |
|---|---|---|
| Mobile Firestore | `firebase.json` → `firebase/mobile-compat/firestore.rules` | **Different.** Live ruleset `5ee25047-09c8-4edf-99ec-2a41b4732ad2`, SHA256 `98b8d86c9acc61c92d5aa60efb6fba17a076ff383615ce193d42db723f833a1e`; local SHA256 `e7bdf3b4bdea04b7c814f1f7ada7e54642aa49ae6505173520c736ba19f9534b` |
| Primary Storage | `firebase.json` → `firebase/mobile-compat/storage.rules` | **Exact match.** Bucket `bickers-booking.firebasestorage.app`, ruleset `bf056989-e840-43a4-9400-8516a7eb9fa9`, SHA256 `a4901dbee651b7fa3792586472fd5066d76a61f79392dc5be8361e249beaf690` |
| Office/admin configuration | `/Users/masonbickers/Desktop/Projects/Bickers-Booking1/firebase.json` → its root `firestore.rules`/`storage.rules` | **Neither matches live.** Contains additional pending security/workflow changes; use as reviewed references only |
| Backup bucket | Separate release `firebase.storage/bickers-booking-backup` | Ruleset `e6e05f96-e5ef-4f11-8e97-f9f197b2e82f`, deny-all source. Preserve it; not a remediation deployment target |

Live Firestore adds vehicle legal-evidence/compliance protections absent from the mobile file. Preserve `legalMaintenanceCompletionFieldsUnchanged`, `safeInitialVehicleLegalEvidence`, existing VOR protections and all unrelated rules. The affected employee/session predicates remain permissive in live source. Existing audit reproductions against these captured policies passed **9/9** in isolated demo emulators, confirming the three defects plus one existing signed-MOT case; no production record was read or altered. [Baseline log](../../audits/evidence/2026-10-14-security-plan/live-baseline-emulator.log).

## Constraints and decisions

- No implementation, dependency installation, production data/metadata changes, account revocation or deployment before approval. Candidate names below are proposed files, not implemented artifacts.
- Mobile root: `/Users/masonbickers/Desktop/Projects/bickers-app-launch` (**M**). Office root: `/Users/masonbickers/Desktop/Projects/Bickers-Booking1` (**W**). Every relative code path below is prefixed M or W.
- Preserve shared-company identity, current approved layouts, existing receipts/service/prep protections and server-only security/finance fields. No new company picker or cross-company workflow.
- Server Admin SDK bypasses client rules: approval/recovery APIs need their own tests and caller/tenant checks. [Firebase guidance](https://firebase.google.com/docs/firestore/security/rules-conditions).
- Rules cannot filter/redact returned documents. Do not make existing company-wide holiday queries owner-only without a replacement scheduling read contract. [Query guidance](https://firebase.google.com/docs/firestore/security/rules-query).
- No security exceptions based on an app version/header, display name, email-only match or client-supplied company stamp.

### Authorization requirements

| Resource/action | Employee / service-only employee | Manager / company admin | Platform admin / other company |
|---|---|---|---|
| Timesheets | User workspace: own draft/unapproved save and submit; no others' edits, approval, payroll fields or approved deletion. Service-only membership grants no payroll authority | Existing office reviewer is normalized `admin`; review another employee, edit permitted pending records, approve/reopen through HR API with concurrency check and audit history; no self-approval | Platform reviewer follows the same recorded tenant scope/self-approval constraints. Other-company direct access denied; no new global bypass |
| Holidays and shift changes | Own request/edit while pending. Preserve current **own pending holiday cancellation**. No approval/decline, approval-history edits or approved deletion | Existing reviewer API handles decisions and cancellation review; approved history retained | Tenant-bound; creator identity is not automatically the leave owner when admin creates on behalf of staff |
| Private HR/personnel/sick leave | No unrelated employee private data; own permitted absence request only. Retain directory/operational reads separately | Same-company authorized HR/admin through existing service; no client ability to fabricate personnel/history | No client-global access to employee private records without an explicit existing server policy |
| Query threads | Only own linked timesheet/query; append employee-role messages. Cannot pose as manager, change another author or delete history | Reviewer may create/respond to same-company employee queries using authenticated author/role | Parent tenant/record identity required; foreign thread access denied |
| H&S, training, PPE | Preserve explicitly permitted read/acknowledgment; no authority inferred to issue/replace another employee's evidence | Existing H&S evidence service validates admin/company and parent; preserve those actions | Same tenant and purpose; finance access alone is not HR/issuer authority |
| Quote/booking/attachment files | Same-company User workspace access to authorized job documents | Same company/workspace; administration does not bypass tenant ownership | Other-company get/list/create/replace/delete denied, including company-admin actors |
| Vehicle/maintenance files | Same-company Service workspace access; ordinary User membership alone is insufficient | Same company and service/admin contract | No blanket platform/foreign-company legacy grant |
| Contract/training/certificate files | Follow owner/admin audience from the existing HR evidence contract; do not expose all employee evidence to all User members | Same-company HR/admin; linked parent/employee must match | No company-admin access to another company's employee objects |
| Profile/recce photos | Same-company linked profile; own upload. Recce access/write must reference same-company booking and original uploader | Preserve legitimate same-company office viewing/administration | An unrelated UID/foreign booking must not establish authority |

**Established:** W `src/app/context/authContext.js`, `src/app/api/admin/_lib.js`, `src/app/utils/hrIntegrity.js` normalize admin aliases to `admin`/`platformAdmin`; `role:"manager"` is not an independent reviewer grant. The word manager in message/UI metadata must never authorize an action. Finance capability is separate. Current HR API explicitly prohibits self-approval and requires `expectedUpdateTime` for transitions/edits.

**Approval decisions before implementation:** confirm whether any non-admin managers need delegated authority; which holiday details are legitimately shared for scheduling; owner access to contracts/training records; and whether pending holiday cancellation should retain the current delete behavior or move to retained cancellation history. Recommend preserving own-pending cancellation in the first patch and prohibiting approved/foreign deletion. Changing its user-facing semantics requires a separate decision.

## Implementation tasks

### 1. Capture baseline and portable contract tests

**Proposed files:** M `firebase/security-remediation-2026-10-14/{firestore,storage}.rules`, `firebase.security-remediation-test.json`, `tests/securityEmployeeRecords.rules.test.cjs`, `tests/securityLegacyStorage.rules.test.cjs`, `tests/securitySessionRecovery.rules.test.cjs`; M `package.json`, `.github/workflows/design-system.yml`; preserve existing permission tests.

- [ ] Create candidates from a **fresh live capture**, with pinned project, default-database release, primary-bucket release and both hashes; keep deployment configuration unchanged initially.
- [ ] Add rejecting regression cases which fail against the captured baseline, plus positive actual-client contracts. Keep historical audit reproductions unchanged; their unsafe-success assertions are not candidate acceptance tests.
- [ ] Use explicit demo project/loopback ports and resolve tested policies through the candidate config. Avoid hardcoded sibling dependency imports or historical-output rules. Reuse the existing office test runtime initially; adding a mobile dev dependency requires approval, not an automatic install.
- [ ] Run with JDK21 and `firebase emulators:exec --only auth,firestore,storage --project demo-bickers-security-remediation --config firebase.security-remediation-test.json`; dedicated rules runner uses `node --test --test-concurrency=1 tests/security*.rules.test.cjs`. Pass criteria: no failures/skips in the required contract matrix, correct rule sources, and permitted cases do not fail from expression/access-call limits.

### 2. AUD-001: constrain employee mutations first, preserve office review

**Files:** M candidate Firestore policy; M `lib/holidayOwnership.js`, `app/(protected)/holiday-request.js`, `app/(protected)/holidaypage.js`, `app/(protected)/query/[id]/index.js`; verify M `lib/timesheetOwnership.js`, `app/(protected)/week/[id]/index.js`, `hooks/useOperationalData.js`. W reference/possible targeted adapters: `src/app/utils/hrIntegrity.js`, `src/app/utils/hrClient.js`, `src/app/api/hr/records/route.js`, `src/app/timesheet-id/[id]/page.js`, `src/app/hr/page.js`.

- [ ] Add per-collection ownership and field/state predicates to timesheets, holidays, shiftChangeRequests, sickLeave, private `hr`, timesheetQueries/messages and H&S/PPE/training matches. Do not change generic tenant helpers for every collection.
- [ ] Require canonical linked employee/company/UID; reject conflicting supplied IDs. Preserve deterministic `CODE_YYYY-MM-DD`, own missing-week get and narrowly mapped unstamped legacy records. A missing owner field may use an authoritative linked employee/code or reviewed ownership mapping, never a display-name fallback.
- [ ] Protect **both branches** of timesheet authorization. Employee saves cannot change identity, payroll/approval fields/history or modify an approved record, including `approved:true`/`approvedAt`/legacy approval aliases. Unchanged server fields in a merge payload remain allowed. Preserve submitted-but-unapproved editing and real screen fields such as jobSnapshot/turnaroundCredits; do not copy the office candidate's narrower generic HR allowlist blindly.
- [ ] Keep review/reopening through the existing HR API and its optimistic concurrency/audit history. Only retain a bounded admin direct-write exception if deployed office-source evidence proves a legitimate remaining caller; do not widen the employee branch to save that caller.
- [ ] Stamp new holiday owner UID/employee ID using verified session identity; retain safe legacy-code compatibility. Current mobile pending cancellation calls `deleteDoc`: constrain it to the owner of an unapproved pending request until an explicitly approved retained-history replacement is deployed. No approved/foreign delete.
- [ ] Restrict query messages to the authorized parent and server-verifiable author/role; current mobile messages lack author UID, so release that payload change first and preserve a bounded append-only employee compatibility shape if required. No mutable role impersonation.
- [ ] Restrict private HR reads/writes deliberately. Preserve current company-wide holiday scheduling reads for initial write containment; owner-only private leave reads require an agreed redacted scheduling projection/query migration first. Existing broad holiday visibility is not silently certified as privacy-safe.

**Risk:** old unowned/name-only records, account aliases, full-record merge writes, manager-on-behalf ownership, rejected older offline saves and company-wide query failures. Do not delete rejected drafts/outbox entries. AUD-006 queue migration is separate work; this policy must deny replay by the wrong actor even before that repair.

### 3. AUD-002: authenticate legacy object ownership, then retire unsafe writes

**Files:** M candidate Storage policy; M `app/(protected)/(main-tabs)/screens/homescreen.js` (recce writer). W `src/app/utils/storageAccess.js`, `src/app/edit-profile/page.js`, `src/app/uploader.js`, `src/app/u-crane-booking/page.js`, `src/app/u-crane-edit/[id]/page.js`, `src/app/job-numbers/[id]/page.js`, `src/app/review-queue/page.js`; preserve W `src/app/api/hr/evidence/route.js` and `src/app/utils/hrEvidencePolicy.js`.

- [ ] Inventory **metadata/references only**, with protected output: legacy object path, generation, verified parent/tenant, current reader/writer and saved URL/token references. No customer-file download or inferred tenant from a filename alone.
- [ ] For structured vehicle/job/employee paths, validate owning Firestore parent/company plus workspace/audience. For flat quotes/PDF names, use server-verified immutable object ownership metadata or a reviewed mapping; unknown/conflicting ownership fails closed. A client must not assign ownership to an existing object.
- [ ] Use the office `legacyObjectOwned` idea only after verifying existing metadata; copying it now would deny legitimate files with no stamps. Keep workspace/HR audience checks as well as company matching. Existing reviewed ownership leases may expire; do not invent a deadline or perform backfills in this planning task.
- [ ] Migrate new office writes to `companies/{companyId}/...`. Raw legacy writers still exist in u-crane quotes, job/review attachments, profile and recce paths despite the shared helper. Release these callers before disabling their unsupported legacy writes.
- [ ] Freeze legacy overwrite/delete and retain verified same-company legacy reads. Where a supported older client needs writes, retain only an immutable-ownership, parent-verifiable exception. **There is no safe broad compatibility grant for an unowned flat path.** Such clients need a compatible update before cutover.
- [ ] Review bearer download URLs and bucket IAM/public/signed links separately: SDK-rule tightening alone is not proof that all saved URL access is revoked. Rotate/migrate tokens only under separately approved data/URL change work; preserve historical references during migration.

**Risk:** broken historical PDFs, incorrect tenant attribution, raw writers, folder listing under mixed-tenant legacy roots, saved download links and expiry. Retain technical-library sharing (insurance/spec sheets), receipt staging/server-only evidence, upload size/MIME and create-only protections; do not touch the deny-all backup bucket.

### 4. AUD-003: unify the direct-data session boundary without breaking recovery

**Files:** M candidate Firestore `activeUserDocExists/mobilePasswordAccessAllowed` and Storage `isActiveUserData/mobilePasswordAccessAllowed/trustedClerkSession`; W `src/app/api/sessionSecurityService.mjs`, `src/app/api/_sessionSecurity.js`, `src/app/api/auth/firebase-token/route.js`, `src/app/api/security/session/route.js`; M `server/sessionGate.js`, `server/appPasswordSetup.js`, `providers/AuthProvider.tsx` only if required by contract tests.

- [ ] Business reads/writes require an enabled account, authorized workspace, valid provider and `auth_time` strictly newer than canonical numeric `sessionValidAfter`; preserve the separate mobile `appPasswordSessionAfter` check.
- [ ] Native password sessions must satisfy approved canonical mobile/employee linking and no pending reset/setup. Reject anonymous and unvetted custom mobile sessions. Preserve the full existing trusted Clerk claim/UID/company/employee checks; mobile setup-only restrictions must not accidentally expel legitimate office Clerk users, while global revocation/recovery still applies.
- [ ] Keep own restricted user/security-profile **get** available so setup/recovery can run; no business access or client clearing of security fields. Recovery completion remains provider-verified/server-owned, not dependent on regaining business-data reads.
- [ ] W already writes `sessionValidAfter` in seconds and `sessionsRevokedAt` as ISO; `firebasePasswordResetAfter` is provider milliseconds. Normalize any legacy ISO-only cutoff server-side before enforcement. Rules timestamps accept epoch milliseconds, not arbitrary ISO parsing. Invalid/contradictory security state must be held for reconciliation, not coerced to zero. [Timestamp reference](https://firebase.google.com/docs/reference/rules/rules.timestamp).
- [ ] Verify the deployed office session/Clerk bridge/reset services before relying on their local implementations. Preserve fresh provider validation, canonical links, session ID and recovery compare-and-set behavior. No bulk refresh-token revocation, password replacement or flag clearing to achieve compatibility. [Session guidance](https://firebase.google.com/docs/auth/admin/manage-sessions).

**Risk:** second-vs-millisecond errors, missing legacy security fields, users sharing mobile/Clerk identity, stale cached Firebase tokens, unavailable recovery service and setups that cannot read their own state. Existing old-session migration documentation identifies a separate release backend; do not infer its deployed endpoints from this dirty mobile server.

## Required regression matrix

| Group | Must remain permitted | Must be denied / retain integrity |
|---|---|---|
| Employee records | Canonical own stamped and deterministic unstamped week create/get/edit/submit; own pending holiday create/cancel; admin on-behalf requests | Other employee mutation/list of private records; forged/contradictory owner/company/code; self-approval; changed payroll/history; approved overwrite/delete; wrong-account replay |
| Office workflow | Genuine normalized admin review/decline/reopen-with-reason; office Clerk identity; permitted owner/admin queries | Service-only/finance-only/`manager` string gaining review rights; reviewer self-approval; foreign employee target; stale expectedUpdateTime; any direct/API bypass of protected fields |
| Query/evidence | Parent-authorized chat append, same-company H&S/HR evidence contract | Sender impersonation, message rewrite/delete, foreign parent, unauthorized certification/PPE issuance |
| Storage | Same-company supported new uploads and verified historical reads, authorized recce/profile and private HR audience | Cross-company get/list/create/replace/delete; unowned or expired legacy object; spoofed incoming metadata/ownership change; global-admin shortcut; forbidden MIME/size and destructive evidence replacement |
| Session | Fresh approved password, vetted current Clerk, own restricted security-profile get and provider-verified reset completion | Anonymous/unvetted custom, disabled/unapproved, auth_time before/equal cutoff, pending reset/setup, malformed units/fields, wrong Clerk claims, business access while recovery unavailable |
| Compatibility | Actual payloads/queries from oldest confirmed supported client and current office release; approved account retains pending work | Treating version strings as authority; an unsupported writer losing work silently; reintroducing broad grants just to make a test pass |

Run existing M timesheet/mobileOther/loader rules tests plus W `phase1Security.rules.test.mjs`, `phase1Storage.rules.test.mjs`, `storageAccess.rules.test.mjs`, `appPasswordSetup.rules.test.mjs`, `appPasswordSetup.auth-emulator.test.mjs`, `sessionSecurityService.test.mjs`, `hrIntegrity.test.mjs`, `hrRecordsApi.test.mjs`, `hrEvidence.test.mjs` against explicitly selected candidates where applicable. Existing tests that read different policies must be made explicit, not weakened. Exercise real screen-built payloads, real queries, the Admin SDK HR transaction/precondition and typed Auth claims; regex/string tests are insufficient. Existing emulator fixtures that omit real provider/auth_time/approval claims must be made faithful to legitimate sessions while adding explicit denial cases for the old unvetted fixture shape; do not retain insecure grants merely to keep those fixtures green.

## Rollout and rollback gates

1. **After implementation approval:** reconcile live sources again; produce minimal reviewed patches, candidate tests and protected legacy/account inventory. Preserve unrelated uncommitted work. No live release yet.
2. **Prepare compatibility first:** verify the deployed office HR/recovery/Clerk code and actual Render source; release necessary office writer/mobile owner/message adapters. Local minimum supported version is5.0.4, current config5.0.13, historical OTA evidence includes5.0.12; **current installed distribution and live minimum are unverified**. Public app-config could not be read by the web tool. Select a cutover floor only from verified client contracts/uptake. Do not trust that floor as an authorization control.
3. **Release hold:** all matrix cases pass, supported devices exercise own save/pending cancellation/office approval/history/legacy documents/setup, saved work survives denial/retry, legacy ownership is positively resolved, and an independent reviewer signs off. Global Firebase rules cannot be safely canaried by an untrusted app header. Use a separate staging/demo environment, then a controlled shared-project change window.
4. **Separate deployment approval:** create M `scripts/deploy-security-remediation.cjs` and explicit candidate deployment config after implementation approval; never reuse the October3 repair script's stale baseline. Pin exact project/release/bucket; compile/test both policies before publication; compare current release refs/hashes before each switch and abort on drift. Document sequential/intermediate states—Firestore/Storage publication is not one atomic transaction. Recommended order: paired session and employee predicates in Firestore, then Storage session/legacy access, with verification between them; both transition states must pass tests. Preserve backup rules and vehicle legal-evidence additions.
5. **Verify after approved cutover:** reread both release refs/full hashes, monitor permission failures, test agreed owned workflows and office/recovery access, record exact client/API versions and metadata-migration receipts. Rules are shared across older installed clients regardless of OTA channel. Update the office's existing Project Control security records only through its separately approved publication process; no governance deployment occurred here.
6. **Rollback:** retain pre-cutover ruleset IDs/full sources, candidate hashes and matching office/mobile/API releases. Prepare and emulator-test a **security-preserving fallback** that permits known legitimate paths while keeping wrong-owner/foreign-tenant/revoked-session denial. The captured old rules are vulnerable: restoring them is not a normal safe rollback. Any emergency restoration needs explicit approval and containment. Never undo recovered credentials/enrollment/security cutoffs, erase queued work, or roll clients back to a native-incompatible runtime. Stop a partially published pair and use the pretested compatible state; do not overwrite an intervening release.

**Approval requested:** approve scoped implementation of the candidate policies/tests and necessary compatibility adapters above, with deployment/migration held for a later explicit approval. Resolve the role/read-audience/cancellation decisions before their dependent changes. No application code, deployed policy, production metadata or account state has changed in this planning pass.
