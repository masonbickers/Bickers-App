# Design-system compliance — Round 3

Date: 13 October 2026. Conclusion: **PARTIAL**. Uncached project lint still fails. This round resolved 15 confirmed architecture violations without detected visual regression; no existing rules, allowlists, screenshot baselines or thresholds were weakened.

## Baseline and final results

| Check | Revalidated initial | Verified final |
|---|---|---|
| `npm run lint -- --no-cache` | 1,122 errors, 71 warnings | **1,107 errors, 66 warnings — FAIL** |
| `npx tsc --noEmit` | PASS | **PASS** |
| `npm test` | 559 passed, 0 failed, 1 skipped | **561 passed, 0 failed, 1 skipped** (562 total) |
| Full Playwright / committed comparisons | Prior Round 2: 162 passed | **168 passed, 0 failed, 0 skipped**, final exact-source export |
| iOS Debug build | Prior successful baseline | **BUILD SUCCEEDED**, exit 0 |
| Android arm64 Debug build | Prior successful baseline | **BUILD SUCCESSFUL**, exit 0 |
| `git diff --check` | Existing whitespace findings | **FAIL**, 18 existing findings; zero new findings after ignoring shifted line numbers |

The requested baseline commands ran before product edits. The preserved Round 2 lint JSON matched that baseline and was copied for diagnostic comparison. Final direct ESLint JSON uses the same app/components scope as Expo's default command. Comparing file/rule/message multiplicities shows **15 removed errors, 0 new errors; 5 removed warnings, 0 new warnings**. No dependency changes were needed. The unrelated dirty working tree was retained; no reset, commit or deployment occurred.

## Shared patterns and controlled batches

All 1,122 baseline errors were grouped through the existing per-error inventory: 992 surface/colour/border/interaction treatments, 74 typography metrics, 50 palettes/alpha treatments, four legacy control overrides and two local generic components. The inventory now records risk group and required evidence for every remaining error.

| Batch | Consumers and change | Errors resolved | Evidence |
|---|---|---:|---|
| 1: placeholder branding | Daily Check and Tyre/Brake Check use existing theme accent for their unchanged icon red | 2 palette | Both theme accents and original primaryAction are exactly `#ED1C25`; affected lint clean |
| 2: record separators | Defect, resolved-defect and service-record screens use existing Divider with new `variant="record"` | 3 presentation | Legacy 1pt height, 0.6 opacity, border colour and 8pt margin retained; cross-platform unit test and exact before/after screenshots |
| 3: document frames | Document Viewer and vehicle File Viewer share DocumentSurface | 4 presentation + 1 presentation + 1 palette | Four document-frame diagnostics and two file-viewer diagnostics removed; exact frame comparisons and iOS actual error-state inspection |
| 4: equivalent palette references | Defect Form, Defects list, Repair Form and Service History remove legacy palette imports | 4 palette | 21 scoped replacements: guaranteed nonempty theme strings make old fallbacks unreachable, and primaryAction/accent/recceAction equal the existing brand accent |

Total resolved: **seven palette and eight presentation violations**. Five pre-existing unused-import warnings were removed in touched screens. Removing separator colour usage made two theme hooks newly unused; they were removed before final verification. No warnings were suppressed.

### Contracts and architectural justification

`Divider variant="record"` represents a repeated read-only record-section separator: full-point height, subdued opacity and semantic border colour. The default remains the existing full-width hairline and semantic divider colour. Margin/insets remain caller-owned layout. The legacy style API remains compatible; other Divider consumers are unchanged. Three actual record consumers support this extension; creating a separate competing separator was unnecessary.

`DocumentSurface` owns the frame around document content and loading/error views. The default page treatment uses the existing page background; embedded document treatment uses surfaceAlt and a top hairline border. Two existing document viewers have this shared purpose, including the main viewer's loading overlay. The component accepts layout-only geometry and children; it adds no accessibility grouping, event handlers, scroll container, clipping or renderer selection. Existing generic cards would introduce radius, padding and an enclosing border, so they are not equivalent. There is no arbitrary colour, radius or style-override API, and no new token. This is a document-specific shared contract, not relocation of arbitrary per-screen styles into an exempt module.

Document URL resolution, PDF caching and fallback, Google viewer selection, error/retry callbacks, WebView props and image rendering are unchanged. Record calculations and field formatting are unchanged. Fixed-white icons, custom status colours, forms and action geometry without proven equivalents remain untouched.

## Validation and visual evidence

Affected-file lint, TypeScript and unit suites ran per meaningful batch. The two new shared contract tests ran red before implementation and green after. Batch 2 full visual checks: **162 passed**. Batch 3 and final checks: **168 passed**. The final export was rebuilt after repairing a caller import; final Playwright completed with exit 0 in 27.6 seconds.

Existing screenshot comparisons cover light/dark phone/tablet fixtures, responsive controls, concentric controls, layouts, contacts, notifications, Issues, landing, workshop/settings/dashboard and service checklists. Existing baselines and comparison tolerances were retained. Record-row tests now also compare the original separator with the new record Divider. Six new document-frame tests cover widths 320/390/820 in both themes, both frame variants, and long-content/loading/error-copy samples. Every paired frame and separator screenshot is exactly equal. These samples establish frame presentation equivalence; they do **not** prove WebView loading, PDF content or error/retry workflows in production.

No visual differences were detected in the tested states. More complex states without baseline evidence remain unverified. The Issues checks passed without changing their assertions, timeouts or worker settings; its prior intermittent click stall did not recur, and its root cause remains unproven.

Intermediate failures were preserved and fixed: the full unit suite caught two literal spacing values in the new fixture (559 passed, 1 failed, 1 skipped); using the existing spacing token repaired it. Later uncached lint caught a missing Divider import in the service-record caller; it was repaired before the final export and checks. An edit helper initially failed to derive a bracketed style filename; the partial edit was inspected and completed without overwriting the original-source evidence. None of these intermediate attempts is counted as a pass.

## Native verification — limited, actual observations

Both native builds completed after the shared presentation APIs changed. iOS Debug uses the current-source Metro bundle; the installed app ran on the iPhone 17 Pro QA simulator, iOS 26.5. Actual Document Viewer with no URL rendered its existing unavailable-document state, including the header/back material, top frame border, error copy and safe-area layout. The document-frame fixture was inspected in light and dark, and the record-divider fixture in dark. Captures:

- `output/design-compliance-round3/ios-document-empty.png`
- `output/design-compliance-round3/ios-document-frame-light.png`
- `output/design-compliance-round3/ios-document-frame-dark.png`
- `output/design-compliance-round3/ios-record-divider-dark.png`

These observations confirm limited current rendering, not exact native pixel equivalence against an old binary, nor native Back interaction or complete Liquid Glass acceptance. Liquid Glass availability checks, fallback components and concentric-radius logic were not modified. Frame surfaces have no rounded geometry; the new Divider has no corners.

**Android runtime verification is BLOCKED in this round.** Gradle built successfully, but ADB streamed installation and screenshot commands stalled even though emulator-5554 was listed as a connected device. Reconnecting that emulator transport ended the first installation with `no devices/emulators found`; the subsequent installation still stalled and was stopped. No emulator/account reset was performed. An empty Android screenshot is not valid evidence, and the updated Android application is not claimed as successfully installed or run. Earlier Round 2 Android observations are not substituted for fresh verification.

Native PDF/image loading, failure/retry, record workflows, phone/tablet variations, keyboard avoidance, accessible text enlargement, VoiceOver/TalkBack, native Back, ripple interaction, reduced motion/transparency and older-iOS fallback acceptance remain outstanding. Shared tests check child identity, absence of added accessibility roles/grouping, and geometry on iOS/Android/web mocks; those are automated contract checks, not device accessibility testing.

## Deferred work and remaining gate

The final inventory contains **1,062 no-screen-presentation, 43 no-screen-palette and two no-local-generic-component errors** across 50 files. Per-error evidence and design requirements are in [classification.json](../output/design-compliance-round3/classification.json) and [REMAINING_VIOLATIONS.md](../output/design-compliance-round3/REMAINING_VIOLATIONS.md).

Group A: Document Viewer, vehicle File Viewer, Daily Check and Tyre/Brake Check now lint clean. Service History retains its status-dependent accent rail and bespoke history action. Vehicle Timeline retains a fixed-white icon whose substitution would change light mode. Service-history vertical dividers have different opacity and geometry; forcing them into the record separator would not be equivalent.

Group B: status surfaces, selected states, alpha backgrounds, asymmetric nested cards and modal footers need genuine common contracts and measured before/after states. New typography variants need semantic hierarchy justification and text-scaling evidence. Distinct control overrides must preserve focus, disabled/loading, pressed feedback and native behaviour. Neither the vehicle Field nor DiaryCard has a demonstrated identical shared replacement.

Group C remains unchanged: Week editor (176), Schedule (58), Work Diary (58), Home (51), Service Form (51), Add Timesheet (45). Dedicated populated/empty, selected, validation, disabled, keyboard, scroll and responsive baselines are required. Week's dense editable grid must remain its own controlled workstream. This run did not establish sufficient native interaction evidence to migrate those screens safely, so no bulk replacements were made.

A fully compliant release is blocked by the failing lint gate and outstanding native/manual acceptance. Debug build success is not release signing or store readiness. **Round 3 is PARTIAL; the global migration is not complete.**

## Files and audit trail

The exact **24-file** implementation/test/document inventory is [files-updated.json](../output/design-compliance-round3/files-updated.json). Original changed route/component/style sources, batch inventories, lint JSON, test/build/export logs, screenshots and diagnostic/whitespace comparisons are preserved in `output/design-compliance-round3/`. This list describes this round, not the entire pre-existing working-tree diff.
