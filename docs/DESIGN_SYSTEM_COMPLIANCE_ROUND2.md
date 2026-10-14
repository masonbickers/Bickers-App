# Safe design-system migration — second round, 13 October 2026

Status: **PARTIAL. The project lint gate still fails.** This round removes 416 of the verified 1,538 errors, leaving **1,122 errors and 71 warnings**. No new error diagnostics or warnings were introduced, comparing multiplicities by file/rule/message rather than shifted line numbers. Backend, API, navigation destinations and branding were not changed. Existing unrelated working-tree changes were retained.

## Changes and batch validation

| Batch | Change | Errors removed | Validation |
|---|---|---:|---|
| Workshop text | 73 semantic colour overrides replaced with explicit AppText tones | 73 | Affected lint, TypeScript, unit suite, 156 visual checks |
| Other text | 242 equivalent semantic colour overrides replaced | 242 | Affected lint, TypeScript, unit suite, 156 visual checks |
| State tones | Seven state-dependent text controls retain primary/muted selection | 14 | TypeScript and unit suite; subsequent full visual suite |
| Read-only rows | Three identical Field implementations replaced with RecordDetailRow; existing service-record formatting retained | 3 | Component test, 6 exact before/after pixel comparisons, TypeScript, full visual suite |
| Schedule Today | Supported small/pill API replaces legacy button override; flexShrink retained | 1 | Complete flattened-style equivalence test on iOS/Android/web including disabled, pressed and focus states |
| Cards | 41 plain cards in 21 routes use SectionCard, with a shared subtle surface tone; 21 style modules retain only layout/insets | 82 | Component tests, TypeScript, affected lint, 162 visual checks, native builds and representative inspection |
| Home inputs | Ten local adapter usages replaced directly with six FormFields and four TextAreas | 1 | TypeScript, affected lint, full unit and visual suites |

AppText now gives an explicitly supplied semantic tone precedence over legacy style colours. Omitting tone preserves existing compatibility precedence. Existing explicit-tone consumers were audited before this contract change. No typography values changed. SectionCard retains its existing 28-point radius and border, while tone="subtle" selects existing surfaceAlt. Padding and margins of migrated cards remain identical, including explicit zero padding where the original had none. Other consumers of three shared legacy card style groups prevent safely removing their chrome; those groups were deferred.

RecordDetailRow has three genuine consumers, preserving the original 12-point text, body line height, wrapping, row geometry, raw value handling and ungrouped accessibility. The vehicle-detail Field is intentionally retained because its typography, padding and accessibility differ. Home input callbacks, labels, values and placeholders are unchanged; the removed adapter only selected existing shared inputs.

## Final automated results

- `npm run lint -- --no-cache`: **FAIL**, 1,122 errors, 71 warnings (initial 1,538 / 71). Independent JSON lint of Expo's app/components scope confirms counts. Remaining rules: 1,070 no-screen-presentation, 50 no-screen-palette, 2 no-local-generic-component.
- `npx tsc --noEmit`: **PASS**. Repeated after batches; final source passed in batch 6.
- `npm test`: **559 passed, 0 failed, 1 skipped**, 560 total. The Firebase emulator-dependent authentication test remains skipped.
- Full Playwright suite from the final isolated Expo export: **162 passed, 0 failed, 0 skipped**. Existing 156 tests plus six exact record-row comparisons. Committed screenshots were compared, not regenerated. Light/dark phone and tablet layouts, responsive controls, concentric controls, restored layouts/contacts/notifications/issues/landing/workshop/settings/dashboard and checklist fixtures passed. No detected screenshot differences within existing committed comparison thresholds; record-row screenshots were exactly equal.
- Issues checks passed in each full run. The prior intermittent protocol click stall did not recur. This does not establish its root cause; prior investigation and 50 repeated checks are retained in the first migration report. No timeout, assertion, retry, worker or snapshot tolerance was weakened.
- `git diff --check`: **FAIL** due to existing dirty-tree whitespace findings; no new whitespace categories/findings were introduced. The comparison ignores moved line numbers. Findings remain in unrelated/pre-existing changes.
- Rules, suppression policy, enforcement allowlists and legacy baseline were not changed in this round. New tests strengthen explicit tone, platform button equivalence, card geometry and row equivalence. The service-card test parser was repaired to read exact AST properties instead of incorrectly consuming an adjacent style's radius; existing radius requirements remain intact.

Intermediate failures are retained: intended red tests before shared changes; one full unit run failed due to that radius-test regex (557 passed, 1 failed, 1 skipped), then passed after the parser fix. An early visual run was stopped before export completed and then rerun successfully. Direct broad `npx eslint .` did not finish and was stopped; the requested uncached Expo lint and direct app/components JSON scan completed. An attempted Expo JSON flag invocation was rejected by the CLI; the independent ESLint scan supplied the inventory. None of these attempts is counted as a pass.

## Actual native verification

Both current native projects rebuilt successfully: iOS Debug simulator via Xcode and Android arm64 Debug via Gradle. Updated binaries were installed without clearing account data. The iPhone 17 Pro QA simulator runs iOS 26.5; Pixel_9 runs Android 16 / API 36.

The initial iOS Debug launch showed "No script URL provided" because the build uses the default 8081 Metro port while only a previous 8093 server was running. Starting current-source Metro on 8081 and relaunching resolved it. Both apps then ran the current record-details and service-checklist fixtures. Screenshots confirm light/dark record wrapping, empty and zero values, checklist cards and nested form geometry. Screenshots are in the round2 evidence directory. These are representative fixture observations, not a screen-by-screen native acceptance pass or native pixel-equivalence proof against old binaries.

Liquid Glass and Android fallback implementations were preserved. This round did not modify their native APIs. Fresh builds and limited fixture observations do not establish complete Liquid Glass interaction, ripple, keyboard resizing, native back navigation, VoiceOver/TalkBack, enlarged text, reduced transparency or reduced motion acceptance. Native tablets, older iOS fallbacks, physical devices and authenticated data-dependent states still require manual verification. In particular, full/minor/MOT form state changes, Home Recce keyboard flows, real record screens and all 41 migrated card instances need native acceptance in their actual workflows.

## Remaining work and release blockers

The migration is not complete and the lint gate blocks a compliant release. [The remaining inventory](../output/design-compliance-round2/REMAINING_VIOLATIONS.md) links all 1,122 individual diagnostics, with the required visual evidence, design decision, native verification and/or genuinely shared component work. Existing fixed palettes, alpha surfaces, custom modal/control treatments and font metrics were not forced into approximately similar primitives. No additional safe equivalence was established for those cases.

Additional release blockers carried forward: incomplete native accessibility and workflow acceptance, unresolved intermittent Issues reliability if it returns under CI load, and pre-existing native release metadata discrepancies requiring release-owner reconciliation. Debug builds do not prove signing, production configuration or store readiness.

## Files and evidence

The exact 70-file implementation/test/config/document list is [files-updated.json](../output/design-compliance-round2/files-updated.json). It identifies this round's changes rather than the entire pre-existing dirty working tree. Detailed batch edit inventories, baseline source copies, test logs, native build logs, screenshots, diagnostic and whitespace comparisons are under `output/design-compliance-round2/`.
