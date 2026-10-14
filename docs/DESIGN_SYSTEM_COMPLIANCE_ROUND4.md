# Round 4 — targeted work, then input alignment completion

Date: 13 October 2026. Status: **PARTIAL migration; focused alignment fix completed**.
The user stopped further design-system migration and requested completion of the
original vertical-text alignment issue. No further complex-screen migrations or
unrelated lint investigations were performed after that instruction.

## Completed shared-control work

Week Editor's ordinary time and optional pre-call lists share `TimeChoiceRow`.
It retains the existing geometry, selected surface/separator/check and text
weights. Caller formatting, next-day offsets, filtering, scrolling, callbacks,
state updates and dismissal remain unchanged. These are two genuine matching
consumers, not a generic screen wrapper. Other Week editor controls are unchanged.

The original single-line iOS input fix is present in shared `FormField`: native
font metrics are used without an imposed paragraph line height. The remaining
Android adjustment removes extra font padding from centred single-line inputs.
Multiline note fields retain their spacing and top alignment. The change does
not affect input values, password visibility, submit/edit callbacks, APIs or
business logic. Existing shared action labels are already centred; their
geometry and functionality were preserved.

## Actual verification

| Check | Result |
|---|---|
| Revalidated uncached lint before targeted work | 1,107 errors, 66 warnings |
| Last uncached whole-project lint, before input-only adjustment | 1,097 errors, 66 warnings — FAIL |
| Diagnostic comparison | 10 Week Editor presentation errors removed; zero new errors/warnings |
| Affected shared component/fixture ESLint after input adjustment | PASS |
| TypeScript after input adjustment | PASS |
| Full unit tests after input adjustment | 563 passed, 0 failed, 1 skipped (564 total) |
| Full Playwright after input adjustment | 174 passed, 0 failed, 0 skipped |
| Native Debug builds during this round | iOS BUILD SUCCEEDED; Android BUILD SUCCESSFUL |
| Git whitespace check | FAIL: 18 pre-existing findings; zero new findings |

The six new time-row visual cases compare 24 exact pre-migration captures at
320/390/820 widths in light/dark, default/selected/disabled/focus states. The PNGs
are preserved under `tests/visual/time-choice-before/`. Existing snapshots and
thresholds were not changed. An intermediate attempt at simultaneous live
legacy/new comparison failed because their focus states differed; it was
replaced with the actual pre-edit captures. That failed run is not counted as a
pass. Unit checks preserve callback identities, password/submit props,
multiline alignment and platform geometry.

## Native observations and limits

The latest shared-input source ran in rebuilt Debug applications using the
current workspace Metro bundle. iPhone 17 Pro QA, iOS 26.5: populated Week
Editor was captured before/after; the input fixture shows centred email,
masked password, placeholder, disabled value and Sign In/Edit/Add/Turn off
labels in dark and light. These are shared-control observations with local
sample values, not authentication workflow tests.

A separate `Bickers_Round4_QA` Android emulator was created from installed SDK
configuration without wiping the original Pixel_9 or copying/deleting its
account data. The current APK initially installed and launched successfully;
light/dark time-row rendering was captured. Repeat installation later stalled;
a non-streaming install reported `Can't find service: package`, and a diagnostic
reported `Service package: not found`. Restarting only the QA emulator restored
the package service and allowed the current input fixture to launch. Android
dark input/button alignment was captured and inspected. The later light-mode
capture remained stale/dark, and a fresh light launch stalled; Android light
input alignment is therefore not marked verified. Guest service stability
remains an environment limitation, not a confirmed application/package conflict.
Original emulator storage was 89% used with 638 MB free; QA initially had 4.5 GB
free. Storage pressure is a lead, not a proven cause.

Native tap-through, keyboard/focus, secure/plain toggling, Back, ripple gestures,
enlarged text and screen-reader acceptance remain unverified. Device Hub
automation returned ScreenCaptureKit error -3811, preventing those interactions.
Rendered native screenshots do not prove them. Liquid Glass/fallback and radius
implementations were not changed. Time rows have no nested rounded geometry;
Week FlatList's existing nominal 42pt measurements versus shared target minima
need separate native scrolling acceptance before alteration.

## Deferred complex screens

All six requested screens were inspected in source; diagnostic/component/state
inventory is `output/design-compliance-round4/complex-screen-analysis.json`.
Week errors are 176 → 166. Work Diary (58), Schedule (58), Home (51), Service Form
(51), Add Timesheet (45) remain unchanged in this round. Their full populated,
empty, validation, selected/loading, keyboard and native interaction baselines
were not established. Calendar day/range markers, lifecycle-muted diary cards,
dashboard metadata/actions, wheel/checklist/photo states and legacy dropdown
ordering are distinct patterns requiring measured contracts. They were not
forced into one-off wrappers. Further migration was explicitly stopped by the
user. Whole-project lint remains failing; this report does not claim global
compliance or production readiness.

## Evidence

Logs, native screenshots, original Week source, inventories and diagnostic/
whitespace comparisons are in `output/design-compliance-round4/`.
Input evidence: `ios-control-alignment-dark.png`,
`ios-control-alignment-light.png`, `android-control-alignment-dark.png`;
`android-control-alignment-light-attempt-stale.png` is a failed/stale theme attempt.
Final checks: `input-alignment-tests.log`, `input-alignment-typescript.log`,
`input-alignment-lint.log`, `input-alignment-visual.log`.

Product files touched in this round: Week route, `TimeChoiceRow.js`,
`AppPrimitives.js`. Development/test files: time-choice and control-alignment
fixtures, service showcase route, shared-control tests, time-choice visual test
and its new original PNG baselines, Playwright test discovery. Design-system
contract and audit documentation updated. All unrelated working-tree changes
were preserved; no reset, commit, deployment, rule suppression or allowlist
expansion occurred.
