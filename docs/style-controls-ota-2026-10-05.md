# Consistent filter controls — 5 October 2026

Corrected undersized Notification and Fleet/Equipment filter targets to the shared 44-point minimum height **and width**. Notification controls previously measured 34pt high; Fleet/Equipment controls measured 32pt. Equipment uses the Fleet owning style. Only two style files changed from the immediately preceding published workshop form hotfix:

- `lib/design/screenStyles/notifications-js.js`
- `lib/design/screenStyles/service-tabs-service-service-list-js.js`

Both now use `t.controls.buttonHeight`. The shared chip token is unchanged because noninteractive chips may intentionally be compact. Layout spacing outside the controls, typography, colours, callbacks, business data and native dependencies are unchanged.

## Verification

The existing full Chromium fixture suite initially reproduced **18 failures** in three screen families across 320/390/820px and both themes. With the fix: **152 passed, 0 failed**, including filter/search/collapse/navigation callback behavior, long content, contrast, loading/error/retry states, shared modal/checklist interaction and committed screenshot baselines. Baselines were not updated. Application suite: **529 passed, 1 skipped**. The two owning files pass lint normally. Screenshots were inspected; see `output/style-controls-20261005/notifications-after.png` and `fleet-after.png`.

Fixtures are local and deterministic, not authenticated users on physical phones. The complete legacy visual migration is still outstanding; the broader scope and remaining findings are in [the app audit](app-functional-and-ui-audit-2026-10-05.md).

## Production delivery

Published after the workshop form fixes, retaining those fixes and the earlier service-sheet/general-repair updates. Both target **runtime 5.0.12**, production:

| Platform | Group | Update | UTC publication |
| --- | --- | --- | --- |
| iOS | `d71a0ec9-0218-4cd9-955b-83293b629d44` | `01a10c62-d0a5-7436-a966-4b325142c56b` | 14:06:04 |
| Android | `a3609236-59db-4f57-bbea-b249f64add56` | `01a10c62-bbe2-79a1-a7d2-03fa06916f80` | 14:05:59 |

Production manifests returned these IDs, runtime and branch. The launch bundle SHA-256 values match the tested exports:

- iOS: `324a66693b54e6bca9d0b6e7ce00b692ca5acad8266522642586b8a583636203`
- Android: `17c64d6561fa3a25ef77cb113f3c7c2f6e218caa157b08288a17769a98dcf9ab`

Receipts, manifests, source delta/bundle verification, source archives, exports and visual logs are in `output/style-controls-20261005/`. No dependency or native configuration changed, and assets were reused. Individual-device installation remains unverified. Open version 5.0.12 online, allow the automatic update download, then fully close and reopen. Older app runtimes require a store update first.

Rollback of this styling-only change can republish the immediately preceding same-platform workshop groups: iOS `16f92c4b-a0b5-48c4-9e1c-a0e5f118fac7`, Android `9dce47a2-be45-4dfb-8d2f-ef10a4d7b4e4`. Keep the backend workshop fix deployed.
