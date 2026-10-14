# Safe global design-system migration — 13 October 2026

## Outcome

**Partial migration; the project-wide lint gate FAILS.** Six small batches removed **531 errors across 40 route files** without changing shared component implementations, tokens, branding, navigation destinations, business callbacks or API code. Existing unrelated changes were preserved. No ESLint rule, suppression, renderer registry or legacy allowlist was changed. No screenshot baseline was updated.

The previous report's cached Expo lint baseline was 2,065 errors. A fresh ESLint inventory found 2,069: four existing Document Viewer presentation errors were omitted by the cached Expo command. The final ordinary `npm run lint` reports 1,534 errors; **`npm run lint -- --no-cache` reports 1,538 errors**, agreeing with the independent JSON inventory. Use the uncached result for compliance. Warnings remain **71**, with no additional warnings after cleanup. This is a 531-error reduction under either matching baseline.

## Batches and verified replacements

| Batch | Change | Errors removed | Validation |
|---|---|---:|---|
| 1 | Frequent Home, Schedule, Me, Jobs and Contacts: semantic AppText tones; one equivalent default text/layout replacement | 117 | TypeScript pass; 554 unit passes, one skip; lint remains failing |
| 2 | Other routes: existing semantic text tones instead of final inline colour overrides | 279 | TypeScript pass; 554 unit passes, one skip; lint remains failing |
| 3 | Seven FormField/IconButton layout-only overrides use layoutStyle | 7 | TypeScript pass; 554 unit passes, one skip; lint remains failing |
| 4 | Ten text controls use bodyStrong, replacing eleven inline typography properties with identical effective metrics | 11 | TypeScript pass; 554 unit passes, one skip; lint remains failing |
| 5 | Text colours with unreachable palette fallbacks use shared semantic tones; required theme strings exist in both palettes | 114 | TypeScript pass; 554 unit passes, one skip; lint remains failing |
| 6 | Contacts drops three header colour overrides already supplied by PageHeaderCard; removes two unused aliases | 3 | TypeScript pass; 554 unit passes, one skip; final uncached lint fails with 1,538 errors / 71 warnings |

Shared components were inspected first: they had no design-rule errors in the initial inventory. There was no reason to redesign them. The colour migration checks referenced legacy styles for competing colour properties before replacement. Accent was excluded because accentText intentionally differs from artwork accent. Typography replacements compare effective metrics, including the default variant, existing static styles and inline overrides; custom sizes, weights and tracking remain untouched where they have no equivalent approved variant. Layout-only replacements retain the same style values and ordering in FormField/IconButton. Native materials, radii, pressed states, modal sizing, form values and asynchronous action handling were not modified.

## Automated checks actually run

- `npx tsc --noEmit`: passed after every batch and final cleanup. This does not provide strict type coverage of every JavaScript route.
- `npm test`: each batch and final run passed **554**, failed **0**, skipped **1**, total **555**. The existing Firebase authentication emulator-dependent test remains skipped.
- `npm run lint`: run after each batch; failed throughout. Final cached result **1,534 errors / 71 warnings**; final uncached full command **1,538 errors / 71 warnings**, exit 1.
- Independent `npx eslint app components --format json`: initial and final inventories retained; final counts agree with uncached Expo lint.
- Isolated visual web exports: passed. Shared dist was not replaced.
- Full existing Playwright suite: first run **156 passed**, then after final UI edits **156 passed**, **0 failed / 0 skipped**, default worker selection. Includes normal committed screenshot comparisons, responsive controls and concentric-radius checks in light/dark phone/tablet layouts. **No baseline differences detected by the existing suite.** This does not establish pixel equality for every authenticated route/state.
- Unchanged Issues tests with `--repeat-each=5`: **50 passed**, **0 failed / 0 skipped**, at default concurrency.
- `git diff --check`: flagged whitespace in the existing shared dirty working tree. The diagnostic log is retained; no blanket whitespace cleanup was applied to unrelated changes. A pre-migration whitespace baseline was not captured, so attribution is not claimed.

No dependency installation, native rebuild or native interaction verification was performed in this migration. The previously completed iOS/Android build results remain historical evidence.

## Issues timeout investigation

The preserved failing trace shows Resolve was found, visible, enabled and stable; the click began around 6.9 seconds. Its protocol call did not return until context teardown around 44.3 seconds, after the test deadline. Only then did the removal assertion report an undefined received value. This is not evidence that the application retained the resolved row for ten seconds. The fixture callback synchronously filters the advisory list and updates the action label, and the row stops event propagation. Two fresh full runs and fifty repeated Issues checks did not reproduce the stall. Browser/process contention or event dispatch remains a hypothesis, **not an established root cause**. No timeout, assertion, retry or worker setting was weakened or changed. Intermittent reliability remains unresolved; retain traces if it recurs in CI.

## Remaining violations and risk decisions

| Root cause | Remaining errors |
|---|---:|
| Local fixed/general palette or screen alpha treatment | 50 |
| Screen-owned surface, colour, border or interaction treatment | 1403 |
| Legacy visual override of shared control | 5 |
| Local control/display component without proven equivalent primitive | 6 |
| Screen-owned font metrics without identical approved variant | 74 |

Remaining rule counts: **1,482 no-screen-presentation**, **50 no-screen-palette**, **6 no-local-generic-component**. All are from the initial inventory; no new error category was introduced. Remaining warnings are 44 unused variables, 24 import ordering, two hook dependency and one unused-expression warning.

Every remaining diagnostic is recorded with file, owning component, element where available, line, exact source, rule, root cause and disposition in [classification.json](../output/design-compliance-migration/classification.json). The per-file summary is [REMAINING_VIOLATIONS.md](../output/design-compliance-migration/REMAINING_VIOLATIONS.md).

These cases are left unchanged because exact visual/interaction equivalence has not been established. In particular, the week editor's dense grids and state treatments, custom Recce action colour, 36pt legacy Clear control, alpha card/header treatments, workshop fixed palettes, display-only Field wrappers and local diary cards require their own populated/disabled/focused/native state comparisons or a design decision. Renaming wrappers, moving styling into an unlinted module, adding semantic APIs for every arbitrary value, or broadening exceptions would only conceal the architecture problem. No such workaround was used.

## Manual verification / release limits

- Authenticated iOS and Android verification of all 40 changed routes and their role/data-dependent states remains outstanding. Colours and metrics were checked by source equivalence and covered fixtures, not a new native build.
- Review long-content/accessibility text, disabled/error/selected states, custom coloured controls and dense editor grids before migrating the deferred cases.
- Reproduce and diagnose the intermittent Issues click stall if it returns under CI load.
- The lint gate remains a release/compliance blocker. Full migration is **not complete**.

## Files changed in this migration

- `app/(protected)/(main-tabs)/contacts.js`
- `app/(protected)/(main-tabs)/job.js`
- `app/(protected)/(main-tabs)/me.js`
- `app/(protected)/(main-tabs)/screens/homescreen.js`
- `app/(protected)/(main-tabs)/screens/schedule.js`
- `app/(protected)/(service-tabs)/service/book-work.js`
- `app/(protected)/(service-tabs)/service/home.js`
- `app/(protected)/(service-tabs)/service/issues.jsx`
- `app/(protected)/(service-tabs)/service/service-list.js`
- `app/(protected)/add-timesheet.js`
- `app/(protected)/expenses.js`
- `app/(protected)/holiday-request.js`
- `app/(protected)/holidaypage.js`
- `app/(protected)/notification/[id].js`
- `app/(protected)/notifications.js`
- `app/(protected)/query/[id]/index.js`
- `app/(protected)/recce-form.js`
- `app/(protected)/receipts.js`
- `app/(protected)/service/activity-history.jsx`
- `app/(protected)/service/advisories.jsx`
- `app/(protected)/service/defect-form.jsx`
- `app/(protected)/service/defects.js`
- `app/(protected)/service/equipment-list.js`
- `app/(protected)/service/index.js`
- `app/(protected)/service/inspections/index.js`
- `app/(protected)/service/inspections/inspection-form/[id].jsx`
- `app/(protected)/service/repair-form.jsx`
- `app/(protected)/service/service-form/[id].jsx`
- `app/(protected)/service/service-record/[id].jsx`
- `app/(protected)/service/service.js`
- `app/(protected)/service/settings.js`
- `app/(protected)/service/vehicle-timeline/[id].jsx`
- `app/(protected)/service/vehicles/[id].jsx`
- `app/(protected)/spec-sheets.js`
- `app/(protected)/timesheet.js`
- `app/(protected)/vehicle-check.js`
- `app/(protected)/vehicle-prep/[id].jsx`
- `app/(protected)/week/[id]/index.js`
- `app/(protected)/work-diary-board.js`
- `app/(protected)/work-diary.js`

Reports and diagnostic evidence are under `output/design-compliance-migration`; this document and the audit follow-up are also added. No other application files were changed by this migration.
