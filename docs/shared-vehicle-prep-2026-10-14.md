# Shared vehicle preparation — implementation and evidence

> Later authorized deployment: the compatible read/status release is now published. See [release evidence](shared-vehicle-prep-release-2026-10-14.md). This document records the earlier local implementation; guarded production writes remain disabled.

14 October 2026. Local implementation only; no deployment, rule publication, production test writes, deletion, or backfill.

## Starting evidence

Mobile base `3b0db05b6995d2292eb6af486a187ccb29664ae8`, branch `codex/release-candidate-stabilisation`; web base `e87730f62a4f005f05aab57c6adf4eeeae158410`, branch `codex/restore-home-data`. Both contained extensive unrelated uncommitted work; scoped before-copies and status inventory are in `output/shared-vehicle-prep-20261014/before` and `audit.json`. Changes were made in place and left uncommitted to preserve that work.

Deployed web bundle: `9033-8e249d67dec64882`, deployment identifier `dpl_9bSrvtvkdbpBpPHsMW3SFtVXYcet`. It already subscribed to app prep records. The orange minus prep icon means vehicle needs preparation; booking status, availability and compliance are separate. Production OTA runtime 5.0.12 groups: iOS `d71a0ec9-0218-4cd9-955b-83293b629d44`, Android `a3609236-59db-4f57-bbea-b249f64add56`. Actual installed device update is unverified.

Live Pool Van LM17 WFG: booking `k2BgddOs2ZI7oOK2yeVd`, job 9354, vehicle `HDAwUIQNlQNDr7VkITOu`, outing 15 October. The shared record completed at `2026-10-14T08:02:01.518Z`, attributed to Mason 2Bickers, and showed prepped in the deployed diary before and after refresh. This is an existing observed completion, not a newly performed production save.

Active rules: `5ee25047-09c8-4edf-99ec-2a41b4732ad2`, published 5 October; SHA256 `98b8d86c9acc61c92d5aa60efb6fba17a076ff383615ce193d42db723f833a1e`. Active snapshot retained for local tests. Mobile's existing rule file differs; neither existing rule file nor firebase deployment configuration was changed.

## Implementation and contracts

- Canonical status identity is explicit company + original booking + canonical vehicle. IDs remain `job_<encodedBooking>__vehicle_<encodedVehicle>`. Matching ignores date changes and stored array position for exact IDs, and rejects contradictory aliases/stamps, ambiguous labels, service-only records and equipment records.
- Diary resource states are loading/ready/cached/pending/error. Subscriptions include metadata, reset with account/company access keys, ignore closed callbacks and retry errors. Shared false overrides legacy true. Only uniquely matched, company-stamped server legacy sections are labelled **Legacy web preparation**. Browser-local data is not presented as confirmed by the new reader.
- Diary completion tooltips include employee attribution and available completion timestamp. Layout, controls, brand, booking status, availability and compliance remain distinct.
- Conditional transitions accept explicit desired state, expected revision, mutation ID, actor and employee attribution. Missing revision defaults to zero. Transactions patch status fields, increment revision and append immutable status events. Reopening clears current attribution but preserves its previous values in history.
- Completion retries read immutable event witnesses and remain idempotent even after a subsequent reopening. Checklist-only saves omit status/attribution and use guarded transactions. Mobile draft revision and updatedAt basis remain pinned until explicit reload so a live subscription cannot silently upgrade a stale draft.
- Offline completion and checklist operations retain original authors, revisions and draft versions. Replay uses the same guarded transactions. Conflicts remain actionable; successful reviewed replacement supersedes only conflicts in its own operation type. Acknowledging a flush preserves operations enqueued while sync was in flight; outbox writes are serialized.
- Existing legacy production writers remain available while the new write gate is closed. Candidate rules reject revisionless status updates; older clients/outboxes must be reviewed before any future paired rollout. This task does not make stale legacy writers safe on currently deployed rules.

## Flags and local runtime

`NEXT_PUBLIC_SHARED_VEHICLE_PREP_READ` defaults enabled; setting it to `false` disables the new diary resource/render path and uses the existing read path. Focused identity fixes remain, and scoped before-copies support a full code rollback.

`EXPO_PUBLIC_SHARED_VEHICLE_PREP_WRITE` and `NEXT_PUBLIC_SHARED_VEHICLE_PREP_WRITE` default off. They additionally require development, a `demo-*` Firebase project and explicit emulator configuration. Merely enabling a flag on production does not authorize a write. Web emulator mode (`NEXT_PUBLIC_PREP_LOCAL_DEMO=true`) refuses production builds and uses fixed loopback Auth9195/Firestore8185. Mobile reuses the existing receipt-local-demo boundary; it does not enable production background/bridge sync.

Candidate rules live at `firebase/prep-candidate/firestore.rules` in both repositories; no firebase.json points to them. They preserve workspace, company, parent and current-employee checks, add revision/event constraints, and prohibit prep/history deletion. Recompletion initially exceeded the rule-expression limit; focused predicates now check equivalent authorization once and all candidate permission tests pass.

Development-only fixtures render the real RN `VehiclePrepForm` through Expo Web and the real diary `CalendarEvent` through Next. The web route is inaccessible unless the development harness and emulator flags are explicitly enabled. The mobile fixture refuses production Firebase. Fixture connectivity simulation enters the durable outbox at the OS-connectivity boundary; real replay/SDK transactions are exercised. Firestore disableNetwork alone was not a faithful simulation of device radio connectivity. Receipt-local-demo disables background sync, so the fixture explicitly flushes the existing outbox without enabling bridges.

## Verification

- Mobile focused tests:21 passed; whole suite:601 passed,1 skipped. Mobile TypeScript passed.
- Web focused tests:47 passed. Whole suite:1917 passed,52 skipped,1 pre-existing failure.
- Active-rules SDK listener/save/resubscribe and ordinary account/company isolation:2 passed. Candidate permission/transaction tests:7 passed, including guarded checklist conflict handling and actual Firebase 12 mobile SDK completion read by Firebase 11 web SDK.
- Web focused lint passed. Mobile focused lint has the same 58 existing styling errors, no new errors or warnings. Existing design lint rules and thresholds were not weakened.
- Full web TypeScript remains blocked by 12 existing errors in duplicate generated `.next/types/* 3.ts` files. Separate source-only TypeScript check passed with a temporary config; project config was not changed.
- Actual browser runtime:8 check completions and notes saved from the RN-Web form; matching diary changed live; refresh/reopen retained status; web reopening propagated while preserving checks/notes; pending completion remained absent from the diary, survived fixture reopening, and replay reported 1 confirmed/0 pending. Server confirmation appeared in both renderers.
- Mobile form and diary were inspected at 320px in dark appearance, with desktop/light checks and screenshots. Viewport dimensions/overflow were measured and temporary overrides reset.

Pre-existing web test failure: `DVSA recurrence confirmation cannot overwrite a concurrent vehicle completion` in `maintenanceBackgroundConcurrency.test.mjs`; expected `FAILED_PRECONDITION`, observed `Vehicle or MOT recurrence changed during synchronization. Refresh and retry.` It reproduces in that unchanged subsystem alone. The initial TomorrowReadiness date test conflicted with the approved booking/vehicle identity contract; it now explicitly verifies that date changes retain exact completion and passes.

**Limits:** no native iOS/Android renderer/device or OS-radio offline checks, no confirmation of installed OTA, and no full authenticated navigation or rendered web prep-list/booking-modal control round trips. The real form/diary fixture, SDK 12/11 boundary, transactions, rules and pure status/identity tests were exercised; these do not substitute for those remaining checks. Production write integration remains disabled. Independent review identified five issues; the author fixed them with regression evidence. No second independent sign-off or deployment-readiness claim is made.

## Exact reconciliation — no changes applied

{'manual': 7, 'missing-identity': 365, 'exact': 577, 'duplicate': 11, 'conflict': 2}. 962 legacy sections were inspected. Exact matches 577, duplicate sections 11, completion conflicts 2, manual entries 7, unresolved identities 365. The JSON report contains every original key, explicit company/booking/vehicle mapping or null target, completion, raw attribution/timestamp, checklist count, shared status and matching evidence. Legacy attribution is never inferred into an employee ID. Manual entries, notes, checklists, archival/removal markers and all source records remain untouched.

| Legacy key | Proposed shared document | Legacy complete | Shared complete |
| --- | --- | --- | --- |
| `etUUJt9LpXXWKalIhLup::0::Trojan 2 (CD)::2026-08-31` | `vehiclePrepRecords/job_etUUJt9LpXXWKalIhLup__vehicle_FtFFQQg8Oll3gDd7GZ5Z` | False | True |
| `iC2vFusaQoTVPYrLIwBa::0::Low Loader 01::2026-08-23` | `vehiclePrepRecords/job_iC2vFusaQoTVPYrLIwBa__vehicle_l6M0bWlIfW1UgNRTP1BI` | False | True |

The full mapping is `output/shared-vehicle-prep-20261014/reconciliation.json`. Duplicates/conflicts/missing identities require explicit resolution before any historical import. No import is authorized or implemented here. A repeatable read-only CLI is available:

```sh
node scripts/audit-shared-vehicle-prep.mjs --live-read-only /absolute/local/report.json
```

Local Project Control records mark this implementation pending native/runtime coverage; publication is explicitly pending because deployment is excluded. Existing release gates and verified system records are not changed.

An update to an already-completed preparation keeps its original completion time and employee. The status event records the updater separately; both pure and emulator tests cover this. The source-only web type check passed; whole-project generated-cache errors remain as recorded. Scoped deltas and hashes are retained in `scoped-existing-files.patch` and `scoped-manifest.json`; late-added before-copies for outbox/config/fixture-route files were reconstructed from the initial read and exact inverse of this task's edits.
