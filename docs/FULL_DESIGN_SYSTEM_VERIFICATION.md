# Fresh full design-system verification — 13 October 2026

## Overall result

| Area | Status | Evidence and limit |
|---|---|---|
| iOS readiness | **PARTIAL** | Fresh Debug simulator build installed and ran on Bickers Apple Design QA, iPhone 17 Pro, iOS 26.5. Real Home, Schedule, Contacts, Me and Settings observed. Physical-device, older-iOS and full screen/state coverage remain outstanding. |
| Android readiness | **PARTIAL** | Fresh Debug build installed and ran on Pixel_9, Android 16/API 36 (`emulator-5554`). Settings, Me, Schedule and light/dark component fixtures observed. The native UI tool cannot attach to the qemu emulator; ripple, Back, keyboard resizing and TalkBack interactions remain unverified. |
| Liquid Glass implementation | Implemented; native observations partial | Existing runtime guards, native shape forwarding, supported-iOS GlassView, earlier-iOS blur and opaque reduced-transparency/Android fallbacks remain present. Fresh iOS materials/native tabs rendered; turning Reduce Transparency on visibly changed controls to opaque surfaces. Capability/fallback adapter tests pass. Earlier runtime diagnostics are historical evidence, not newly instrumented in this run. |
| Corner geometry | Shared measured cases pass; whole app partial | Radius utility and web measurements pass. Me outer radius 28 minus padding 12 and border 1 gives tile radius 15; inspected on both platforms. Asymmetric content, images and role/data-dependent grids still require native state coverage. |
| Global styling compliance | **PARTIAL; lint gate FAILS** | 226 source files, including all 78 routes, scanned. Shared tokens/controls remain present. Legacy presentation/palette/component violations remain; source scanning does not establish every rendered state. |

## Fresh automated results

| Check | Actual final result | Requested earlier baseline |
|---|---|---|
| `npx tsc --noEmit` | PASS | PASS; included TS sources, not strict checking of all JSX |
| `npm test` | 555 total: **554 passed, 0 failed, 1 skipped** | 547 passed, 1 skipped: seven additional passes |
| `npm run lint` | **FAIL: 2,065 errors, 71 warnings** | 2,070 errors: five fewer; this run started with 2,069 and safely removed four |
| `npx expo install --check` | Exit 0; dependencies up to date against the local bundled map | Network disabled; offline compatibility only, not online security/deprecation validation |
| Fresh isolated web export | PASS | No shared `dist` replacement used |
| All existing Playwright screenshot/responsive/radius tests | Final **156 passed, 0 failed, 0 skipped** with two workers and screenshot comparisons enabled | 42 passed: current suite has 114 more checks; coverage is broader, not a like-for-like timing comparison |

No test was disabled, no snapshot was updated, no lint rule was suppressed, and no
legacy allowlist was expanded. The Firebase passwordless/custom-UID password-reset
auth-emulator test remains skipped because its required emulator environment is
not configured.

Intermediate results are preserved: calendar contrast regression initially failed
(6 shared-control cases passed, one failed), then all seven passed after the fix.
After the final calendar edit, one default-concurrency full Playwright run produced
155 passes and one 30-second timeout in `restored issues · 320 · light`, waiting
for `issue-single` removal after Resolve. The unchanged Issues subset passed all
10 cases with one worker, and the unchanged full suite passed all 156 with two
workers. Its intermittent cause is not established; the trace and error context
are retained, and test reliability needs investigation before CI sign-off.

Lint categories: 2,009 `no-screen-presentation`, 50 `no-screen-palette`, six
`no-local-generic-component` errors. Warnings: 44 unused variables, 24 import
ordering, two hook dependency and one unused-expression warning. These remaining
categories existed at the start of this run. The four removed errors were
Contacts lookups for undefined semantic names. Comparison is against this run's
saved working-tree baseline, not a hypothetical clean branch.

## Repository and native configuration

Read `DESIGN_SYSTEM.md`, `docs/UI_CONSISTENCY_AUDIT.md`, the implementation report
and latest native follow-up. Shared radius/platform utilities, glass adapter,
minimum targets/ripple, reduced motion/transparency, theme contrast variants,
native switches and live iOS text remeasurement are present. Business logic and
screens remain shared; no duplicated platform screen implementation was added.

Installed dependencies/configuration remain Expo 55.0.31, RN 0.83.10, React 19.2.0,
expo-glass-effect 55.0.11, native iOS tabs and Android `adjustResize`. Current local
Expo map accepts expo-updates 55.0.31 against ~55.0.30; the earlier ~55.0.33 report
is not reproduced by this run. No dependency upgrade was performed. Version
metadata still differs: app config 5.0.13/build 88, generated iOS 5.0.7/build 88,
generated Android 5.0.12/code 2. Clean native generation and signed Release builds
remain release requirements.

Xcode Debug arm64 simulator rebuild succeeded with Xcode 27 SDK. Android's full
configured-ABI Debug build succeeded, but its 214MB APK installation failed with
`INSTALL_FAILED_INSUFFICIENT_STORAGE`; `/data` had 532MB available. An ARM64-only
Debug rebuild succeeded and installed without deleting emulator data or losing
the signed-in account. This resolves this QA installation, not storage qualification
for every production ABI. Both running Debug apps load current JavaScript from
Metro 8093; local fixture mode must be disabled in production.

Native build warnings remain: upstream RN Geometry.h deprecation, no-symbol
static archive entries and build-script phase warnings on iOS; deprecated Gradle
features incompatible with future Gradle 10 on Android. Complete logs are retained.
A Fast Refresh transform toast appeared during the calendar edit; current export
compiled and restarting the apps removed the toast. The first diagnostic Schedule
link used `/schedule` and returned Not Found; the actual `/screens/schedule` route
then rendered correctly. These intermediate observations are not hidden or used
as evidence of a successful screen check.

## Confirmed issues fixed in this run

1. Contacts referenced four nonexistent theme members. Removed the dead optional
   lookups and retained their existing fallbacks (`textMuted`, `surface`, `border`).
   Four lint errors removed; rendered colours unchanged.
2. Change Password modal's non-scrollable body overlapped its footer when the
   iOS software keyboard opened. Enabled the existing shared `AppModal` scrollable
   option. On the rebuilt native app/current bundle, the body now scrolls to the
   final action while the keyboard remains open and the footer remains separate.
   No credential entry, password change or forgotten-password action was performed.
3. Calendar today/date text and white selected-day/count labels still used brand
   red with insufficient normal-text contrast. Shared AppCalendar and Schedule
   now reuse `accentText`/`accentFill`. Brand/artwork and job/leave colours remain
   unchanged. Added a failing-then-passing contrast regression check. Updated
   calendars were inspected on both native targets after restart.

The previously discussed Reminder Time rectangle remains a functioning shared
variant with concentric geometry; making it a capsule is an optional visual
consistency change, not a verified geometry defect. No additional redesign was made.

## Native observations and limits

- iOS: light/dark Settings switching; native switch/capsule surfaces; opaque
  Reduce Transparency transition; live size 2 → maximum 11 → size 2 text reflow;
  Me card geometry; real native Home tab press and Schedule quick action;
  Month/Agenda selection; Contacts software-keyboard opening with tab clearance;
  password modal scrolling/footer while keyboard stays open. Original System
  theme, size 2 and Reduce Transparency off were restored.
- Android: dark Settings, Me and Schedule rendered with the current installed
  build; light/dark component fixtures rendered opaque tonal surfaces, typography,
  buttons and segmented controls. Shared 48dp targets/ripple configuration pass
  automated adapter tests. No actual ripple animation, IME resizing, Back gesture,
  TalkBack or Android text-scale interaction is claimed.
- Portrait safe-area placement was visually inspected on these screens. Landscape,
  small phones/tablets, physical haptics, enlarged form/grid text, VoiceOver/TalkBack
  traversal and dynamic glass background contrast are still manual checks.
- Fixed screen palettes, legacy typography, contextual image/record-grid geometry
  and all data-dependent modal states remain source leads/manual coverage gaps.
  The source scan and web fixtures do not establish full global visual compliance.

## Fresh screen-by-screen native coverage

All rows were automatically source-scanned. `Rendered` refers only to the named
state in this run. Other rows retain **manual pending** status even when historical
or representative web-fixture coverage exists. This is not 78-screen native sign-off.

| Route source | iOS this run | Android this run |
|---|---|---|
| `app/(auth)/_layout.tsx` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/(auth)/login.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/(main-tabs)/_layout.jsx` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/(protected)/(main-tabs)/contacts.js` | Rendered: dark; search focus/keyboard clearance inspected; no call/message sent | Manual pending; source scanned |
| `app/(protected)/(main-tabs)/job.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/(main-tabs)/me.js` | Rendered: dark; Edit/Add capsules and nested expense-card geometry inspected | Rendered: dark; nested cards and capsules inspected |
| `app/(protected)/(main-tabs)/screens/homescreen.js` | Rendered: dark; reached through a real native tab press | Manual pending; source scanned |
| `app/(protected)/(main-tabs)/screens/schedule.js` | Rendered: dark Month/Agenda; actual navigation/selection checked; contrast fix inspected after restart | Rendered: dark Month; corrected date colour and safe-area placement inspected |
| `app/(protected)/(service-tabs)/_layout.jsx` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/(protected)/(service-tabs)/service/book-work.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/(service-tabs)/service/home.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/(service-tabs)/service/issues.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/(service-tabs)/service/service-list.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/(service-tabs)/service/work.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/_layout.jsx` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/(protected)/about.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/add-timesheet.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/bookings/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/design-system.jsx` | Web fixture tests pass; native fixture not revisited in this run | Light/dark components fixture rendered |
| `app/(protected)/document-viewer.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/edit-profile.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/expenses.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/fix.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/help.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/holiday-request.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/holidaypage.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/index.js` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/(protected)/insurance.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/maintenance.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/notification/[id].js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/notifications.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/query/[id]/index.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/recce-form.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/receipts.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/activity-history.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/advisories.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/daily-check.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/defect-form.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/defects/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/defects.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/design-system.jsx` | Web fixture tests pass; native fixture not revisited in this run | Manual pending; web fixture tests pass |
| `app/(protected)/service/equipment-list.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/index.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/inspections/index.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/inspections/inspection-form/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/minor-service/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/mot-precheck/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/repair-form.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/resolved-defects/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/service-form/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/service-form.js` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/(protected)/service/service-history/[vehicleId].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/service-history.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/service-record/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/service.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/settings.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/tyre-brake-check.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/vehicle-check-form/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/vehicle-prep/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/vehicle-timeline/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/vehicles/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/service/vehicles/file-viewer.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/settings.js` | Rendered: light/dark, live maximum text, reduced transparency; password modal keyboard/scroll checked | Rendered: dark; native switch and capsule styling inspected |
| `app/(protected)/spec-sheets.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/timesheet.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/uploader.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/vehicle-check.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/vehicle-prep/[id].jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/vehicles.jsx` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/(protected)/week/[id]/index.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/work/index.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/work-diary-board.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/work-diary.js` | Manual pending; source scanned | Manual pending; source scanned |
| `app/(protected)/working-terms.jsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/+html.tsx` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/+not-found.tsx` | Manual pending; source scanned | Manual pending; source scanned |
| `app/_layout.jsx` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |
| `app/index.js` | Infrastructure/alias; source scanned, route matrix pending | Infrastructure/alias; source scanned, route matrix pending |

## Outstanding blockers before production

1. Resolve the 2,065-error whole-project lint gate through a reviewed migration;
   no broad cleanup or suppression was performed here.
2. Investigate the retained intermittent Issues visual timeout and run the skipped
   Firebase auth-emulator test in its supported environment.
3. Complete manual-pending native screen/role/data/state coverage, Android touch,
   ripple/keyboard/Back, VoiceOver/TalkBack, enlarged text and contrast over native
   glass/selected navigation backgrounds. Older-iOS and physical devices remain
   untested; performance/GPU profiling remains outstanding.
4. Reconcile generated native release metadata and prove clean CI/prebuild and
   signed Release builds on supported targets. Local duplicate native projects/
   generated-file history and successful repaired Debug builds are not CI proof.
5. Perform online dependency/security validation, resolve relevant native build
   warnings and ensure development fixture mode is absent from release builds.

Evidence: `output/full-design-verification-20261013/` contains build/check logs,
source scan, lint categories, saved intermediate failure trace and inspected native
captures. Only scoped UI fixes/tests/reports were made; unrelated dirty/concurrent
work was preserved. No backend, API, navigation destination, branding artwork,
production deployment, commit or business-data mutation was changed.
