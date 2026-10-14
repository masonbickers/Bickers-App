# Standalone workshop form save fixes — 5 October 2026

The standalone Defect Report, Interim / Minor Service and MOT Pre-Check forms now use the authenticated workshop submission service. Before this release, they omitted company ownership and attempted direct writes that the deployed Firebase rules deny. Record creation, linked vehicle changes and request completion now commit atomically. The company ID remains an internal field derived from the approved account; users do not enter or select it.

## Scope

- New endpoint submission kinds: `minor`, `mot`, `defect`. The default service-sheet/general-repair path and its existing submission hash are preserved.
- Company, account/session, selected vehicle and request/work-type checks remain enforced. Signed/submitted records remain immutable; replay of the same request succeeds without duplicate history or embedded defects.
- Minor services accept the form's actual `Interim / minor service` option and append service history.
- MOT pre-checks change pre-check fields only. They do not change actual MOT results, MOT history, VOR state or service history. Older dates/lower mileage do not regress current markers; an empty vehicle patch does not block saving the record.
- Defects retain Immediate/General severity, manual asset details, off-road flag and photos. The server stamps company/reporter identity and open status, linking the embedded vehicle defect by report ID.
- Minor/defect photos use permitted company-scoped paths. A per-form upload cache retains successful URLs, allows failed uploads to retry and allocates unique paths before concurrent uploads start.
- Only the three form files and `lib/workshopPhotoUpload.js` differ in each mobile snapshot from the previous published workshop OTA. Native settings, dependency manifests and assets are unchanged. No shared Firebase rules or account permissions were changed.

## Deployed releases

Backend: `d60c01815de5f8f3d9adc0c9c0f7aff799ad8dab` in `masonbickers/Bickers-App`; Render deployment `dep-db1qo1gu01pc73fltla0`, succeeded/live at 14:54 BST. [PR 4](https://github.com/masonbickers/Bickers-App/pull/4) is merged; merge commit `791f256aaf8b540bc92df1916327c97cda7603f9`. The actual live source remains the reviewed deployment commit. `/health` returns healthy and an unauthenticated submission returns 401 without a write.

Both production OTA groups target runtime **5.0.12**:

| Platform | Update group | Update ID | Published UTC |
| --- | --- | --- | --- |
| iOS | `16f92c4b-a0b5-48c4-9e1c-a0e5f118fac7` | `01a10c59-d6f7-7a27-8d32-abc776c04aa7` | 13:56:16 |
| Android | `9dce47a2-be45-4dfb-8d2f-ef10a4d7b4e4` | `01a10c59-d8f3-748b-addb-71bface92b85` | 13:56:17 |

EAS groups were reread, and the production manifests returned these IDs with launch bundle hashes matching the tested local exports. Receipts, manifests, hashes, source archives and backend patch are in `output/workshop-auxiliary-hotfix-20261005/`. Later styling-only updates retain these form fixes.

## Verification

- Root application suite and both platform release snapshots: **529 passed, 1 skipped, 0 failed**.
- Exact deployed-rule permission tests and actual Admin SDK transaction tests in local Firestore/Storage emulators: **25 passed, 0 failed**. Includes all three new forms, retry behavior, atomic request completion, tenant rejection and a backdated MOT pre-check with no vehicle changes.
- Focused backend tests: **21 passed**. Photo uploader tests: **3 passed**, including fixed-clock concurrent destination collision regression.
- Scoped ESLint: passed with existing screen-presentation/palette migration rules disabled for the three legacy forms; other rules stayed enabled.
- Independent read-only code review: no remaining Critical or Important blockers. Review caught a photo path collision; it was reproduced, fixed and regression-tested before publication.

## Device and rollback limits

Open version 5.0.12 online, allow the automatic download, then fully close and reopen. Older runtimes do not receive these updates and require an app-store update first. No staff credential was used and no business form was submitted on a production device; actual device application and successful staff submission remain unverified.

New local photos still require connectivity before the submission can enter the outbox. Upload failure keeps the form open; minor-service/MOT drafts are retained. This release does not add offline binary photo uploads or migrate existing failed Firestore outbox entries automatically.

For an urgent rollback, restore the previous platform-specific production groups: iOS `c8c3dc9a-5070-4fa4-bbe8-a632f6bedfd2`, Android `2d19e0c6-9e4c-4e36-a9c5-f538df402f17`, both runtime 5.0.12. The additive endpoint can remain deployed; if necessary revert the backend to `4cce096281fc51348c77f85300b23ac6cfc677d7`. Do not use an older runtime's OTA group.
