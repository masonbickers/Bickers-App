# Workshop submission hotfix — 5 October 2026

Deployed the service-sheet and general-repair repair to the live API and published production OTA updates for iOS and Android runtime **5.0.12**. This runtime covers the current iOS 5.0.12 builds and Android 5.0.12 (21). Older installed runtimes do not receive these updates; those installations must update to 5.0.12.

## Scope and behavior

Only five client files differ from each prior platform release snapshot: the two forms, workshop API/transport helpers and a workshop outbox branch in the sync engine. The snapshots retain their previous dependencies, routes, assets and native configuration. No native module was added and no new store binary was submitted.

Both forms supply authenticated company ownership and use `POST /workshop/submissions` instead of sequential direct Firestore writes. One server transaction checks the enabled account, service workspace, tenant, vehicle and optional open workshop request, then saves the signed record, defects, vehicle history and request completion together. Retries use a stable record ID and content hash, so a response lost after commit cannot append duplicate history. Existing signed records remain immutable; unsigned company drafts can be submitted. Backdated service records and lower odometers preserve newer service-date and mileage mirrors. Repair submissions preserve vehicle service/MOT/VOR state.

The endpoint verifies Firebase tokens with revocation checking and requires the same password-authenticated UID. It enforces stored account disabling/archive flags, service module access, app password setup/session cutoff and saved session-revocation/password-recovery boundaries inside the transaction. The presumed web `/api/security/session` endpoint returned 404 in production, so this endpoint does not depend on that unpublished route. Unresolved recovery flags fail closed.

Service photos use the existing allowed `companies/{companyId}/vehicles/{vehicleId}/service/{recordId}/...` upload path. Shared Firestore/Storage rules and account permissions were unchanged.

Offline workshop record submissions use their own durable outbox target and retain the submitting UID. Existing Firestore and Storage outbox paths are preserved. The existing photo-upload-before-submit limitation remains: a service sheet with new local photos needs connectivity; failed uploads retain the draft. Cache-write errors after a successful commit cannot turn a saved record into an apparent submission failure.

## Live backend

Render was verified to be running commit `f1835bb59cc86468e5c61f5f45035d573c21dc28` from `masonbickers/Bickers-App`. The repair was made in a clean checkout of that exact commit; unrelated dirty local backend changes were not deployed.

Reviewed commit: `4cce096281fc51348c77f85300b23ac6cfc677d7`, branch `codex/workshop-submission-hotfix`. It adds only the new endpoint handler/module and its tests. Render deployment `dep-db1mvv60tbcc73bkdrhg` reached **Deploy succeeded | Live** at 10:38 BST. Public `/health` returned 200; unauthenticated workshop submission returned 401 without creating records. Existing routes and dependencies were preserved. The live source patch is `output/workshop-hotfix-20261005/backend.patch`. PR #3 was merged into main to retain the fix for future deployments: https://github.com/masonbickers/Bickers-App/pull/3.

## Published updates

- iOS: update `01a10b6f-0696-7377-be85-bd76990acd4d`, group `c8c3dc9a-5070-4fa4-bbe8-a632f6bedfd2`, published 10:39:47 BST.
- Android: update `01a10b6f-1367-7ddc-b9b5-3bbdcfd68d60`, group `2d19e0c6-9e4c-4e36-a9c5-f538df402f17`, published 10:39:51 BST.

Both groups were reread from EAS. Production-channel requests for each platform/runtime returned 200 and the expected update ID; each manifest launch-asset hash matched its tested local export. Direct CDN bundle retrieval returned HTTP 403 from this execution environment, so device download/install is not independently verified. Delivery evidence, bundle hashes, publication receipts and source-delta checks are under `output/workshop-hotfix-20261005/`.

Staff on 5.0.12 should open the app with connectivity, allow the update to download, then fully close and reopen it to apply. Publication/manifest verification does not prove installation on an individual device.

## Verification

- Final application suite: **519 passed, 1 skipped, 0 failed**.
- Both platform source snapshots: **519 passed, 1 skipped, 0 failed**.
- Exact-live-rule matrix plus actual Admin SDK transaction integration: **23 passed, 0 failed**, covering existing timesheets, profile, vehicle-check/issue and upload permissions as well as workshop transaction atomicity and retry.
- Independent code review identified an alias-date/mileage regression; a failing regression test reproduced it before correction. Final review found no remaining concrete blockers.
- Scoped lint passed with the existing screen palette/presentation restriction rules disabled. The broad lint attempt reports 95 pre-existing screen-style violations; no layout/style changes were included in this repair.
- No real employee credentials were used and no production service sheet/repair was submitted as a test. An authenticated device smoke test remains unverified.

## Rollback

The backend can be returned to the recorded prior live commit `f1835bb59cc86468e5c61f5f45035d573c21dc28`, after checking later deployments. For iOS, the previous 5.0.12 group is `2a84296c-cc37-455b-9a31-97730b471e4b`. Record the Android prior update from the saved production channel listing before choosing its rollback target; do not roll back to a different runtime or overwrite later updates. The new backend endpoint is additive and can remain deployed if only the OTA needs rollback.
