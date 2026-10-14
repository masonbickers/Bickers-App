# App functionality and UI audit — 5 October 2026

The audit reproduced save failures in three workshop forms and undersized filter buttons in Notifications and Fleet/Equipment. The form and control fixes are deployed to iOS and Android production runtime 5.0.12; the complete existing visual suite now passes. This is evidence for the tested flows and fixtures, not certification of every user's phone or every production action.

## Basis and coverage

The source inventory uses the published 5.0.12 workshop release snapshots, rather than the unrelated changes in the shared checkout. It contains 77 route/source files (37 employee, 33 service, 1 auth, 6 structural) and 340 `onPress` sites. Automated inventory/lint/pattern scans cover all source files. Individual manual review focused on submissions, navigation, controls and their owning styles; the inventory does not claim every callback was individually exercised.

Shared standards are `DESIGN_SYSTEM.md`, `lib/design/tokens.ts`, ThemeProvider, PageShell and AppPrimitives. Employee/service density is intentional; both have a 44-point minimum interactive target. The existing design system is not fully adopted by legacy routes.

| Area | Verified coverage | Remaining limits |
| --- | --- | --- |
| Shared controls and shell | Rendered narrow/phone/tablet fixtures in both themes; modal open/close, checkbox state, text entry, reduced motion, last-action clearance, contrast, containment and screenshot baselines | Native keyboard, safe area and text scaling on physical devices were not exercised |
| Contacts | Search, empty/disabled states, button dimensions and fixture call/message callbacks | Actual telephone/WhatsApp handoff untested |
| Notifications | Filters, read transition, retry, empty/loading/error states and long content | Live push delivery/device permissions untested |
| Fleet and equipment | Search/status filters, section expand/collapse, fixture destination callbacks, equipment/vehicle switching, retry, content containment and contrast | Navigation callbacks are captured by fixtures, not authenticated live destinations |
| Workshop forms and lists | Form-card destinations, drafts, full/minor/MOT/inspection checklist controls, notes and N/A; transaction/permission tests for save paths | No staff credentials or production business submission used; camera/library/physical device flows untested |
| Dashboard, landing, settings and issues | Existing deterministic views/actions/state/contrast tests | Backend data and role-specific end-to-end states untested |
| Other employee/auth/detail routes | Source inventory, route uniqueness, full app test suite, TypeScript and lint analysis | Individually signed-in rendered routes not all checked |

All visual checks use Chromium against a **local development-only fixture export** built from the release snapshot. They are not screenshots of a live user's account and do not mutate production. Fixtures render actual screen view components where available, but intercept external navigation/business actions.

## Findings and status

| Priority | Finding and impact | Evidence | Status |
| --- | --- | --- | --- |
| High | Standalone defect, minor-service and MOT pre-check saves denied by deployed rules; ownership omitted and completion attempted directly | Current form payloads plus exact-rule emulator reproduction; new actual transaction checks | Fixed and deployed through the existing authenticated workshop endpoint; see auxiliary hotfix report |
| Medium | Notification filter targets were 34 points high | `lib/design/screenStyles/notifications-js.js`, measured in all six width/theme combinations | Corrected to shared 44-point minimum height/width; six cases now pass |
| Medium | Fleet and equipment filter targets were 32 points high | `service-tabs-service-service-list-js.js` used `chipMinHeight`; EquipmentListView consumes the same owning style; twelve width/theme cases failed | Corrected to shared button minimum height/width; twelve cases now pass |
| Medium | Legacy styling enforcement is not clean | Released-source ESLint: 2,074 errors and 71 warnings across 314 files, mainly screen-presentation/palette rules | Unresolved adoption backlog. This is not 2,074 reproduced runtime crashes; migrate owners and verify screens rather than disabling the rules globally |
| High | Deployed backend dependency scan reports 14 affected packages: 3 high, 11 moderate | Current registry audit of the clean deployed backend; high packages axios, @grpc/grpc-js and @fastify/busboy | Unresolved dependency maintenance; no dependency changes bundled into this form/control hotfix |
| Operational | Latest previously recorded registrations include older app versions; some staff approval/terms incomplete | Earlier same-day account audit | Historical evidence, not reread in this pass. See the account audit; installation/update/login on each phone still needs confirming |
| Security | Earlier account audit found six enabled historical anonymous identities with Firestore access | Earlier same-day account and exact-rule audit | Previously verified finding remains separately tracked; shared account/rules were not changed in this rollout |

The earlier statement about defects referred to defects created through service sheets. This new rollout also fixes the **standalone Defect Report**. Actual signed-in staff submissions remain to be verified.

Daily-check, tyre/brake and MOT-result placeholder routes are behind disabled form flags. They are planned features and not counted as a broken currently enabled button.

## Checks

- Before the additional form work: 519 application tests passed, 1 skipped.
- After form fixes and styling: **529 passed, 1 skipped, 0 failed**. Both form-release platform snapshots ran the same full suite successfully.
- Local exact-live-rule permission and real Firestore transaction suite: **25 passed, 0 failed**.
- Initial full rendered suite: **134 passed, 18 failed**, all failures were filter target height checks. Fixed-control full rendered suite: **152 passed, 0 failed**. No baselines were updated.
- Released snapshot TypeScript: passed. New form/helper scoped ESLint: passed with the two existing screen presentation/palette migration rules disabled only for that scoped check. The two changed owning style files pass lint normally.
- Production backend health/auth denial and EAS production manifests verified; bundle hashes match local tested exports. Real-device OTA installation was not verified.

Final styling release and production delivery receipts: [consistent filter control OTA](style-controls-ota-2026-10-05.md).

## Files and future consistency work

Evidence: `output/app-audit-20261005/` (route inventory, original visual failures, lint, registry audit, permission logs), `output/workshop-auxiliary-hotfix-20261005/` (form release), and `output/style-controls-20261005/` (control fix, screenshots and final visual results).

A broader migration should use the existing shared primitives and tokens, preserve each workflow's layout and permissions, and remove legacy exceptions by screen family. Run the existing design lint, full tests and rendered checks for every migrated family. Native dependency or configuration changes require a store build; compatible JavaScript/layout changes can use OTA.

The current work fixes verified defects; it does not claim complete visual migration, no possible errors anywhere, or every employee's successful end-to-end access.

## Full source inventory

| File | Family | onPress sites | Individual signed-in device test |
| --- | --- | ---: | --- |
| `app/(auth)/_layout.tsx` | structure | 0 | Not checked |
| `app/(auth)/login.jsx` | auth | 3 | Not checked |
| `app/(protected)/(main-tabs)/_layout.jsx` | structure | 0 | Not checked |
| `app/(protected)/(main-tabs)/contacts.js` | employee | 2 | Not checked |
| `app/(protected)/(main-tabs)/job.js` | employee | 7 | Not checked |
| `app/(protected)/(main-tabs)/me.js` | employee | 14 | Not checked |
| `app/(protected)/(main-tabs)/screens/homescreen.js` | employee | 18 | Not checked |
| `app/(protected)/(main-tabs)/screens/schedule.js` | employee | 6 | Not checked |
| `app/(protected)/(service-tabs)/_layout.jsx` | structure | 0 | Not checked |
| `app/(protected)/(service-tabs)/service/book-work.js` | service | 6 | Not checked |
| `app/(protected)/(service-tabs)/service/home.js` | service | 9 | Not checked |
| `app/(protected)/(service-tabs)/service/issues.jsx` | service | 4 | Not checked |
| `app/(protected)/(service-tabs)/service/service-list.js` | service | 4 | Not checked |
| `app/(protected)/(service-tabs)/service/work.js` | service | 13 | Not checked |
| `app/(protected)/_layout.jsx` | structure | 0 | Not checked |
| `app/(protected)/about.js` | employee | 0 | Not checked |
| `app/(protected)/add-timesheet.js` | employee | 3 | Not checked |
| `app/(protected)/bookings/[id].jsx` | employee | 1 | Not checked |
| `app/(protected)/design-system.jsx` | employee | 0 | Not checked |
| `app/(protected)/document-viewer.jsx` | employee | 0 | Not checked |
| `app/(protected)/edit-profile.js` | employee | 2 | Not checked |
| `app/(protected)/expenses.js` | employee | 9 | Not checked |
| `app/(protected)/fix.js` | employee | 0 | Not checked |
| `app/(protected)/help.js` | employee | 5 | Not checked |
| `app/(protected)/holiday-request.js` | employee | 1 | Not checked |
| `app/(protected)/holidaypage.js` | employee | 2 | Not checked |
| `app/(protected)/index.js` | employee | 0 | Not checked |
| `app/(protected)/insurance.js` | employee | 1 | Not checked |
| `app/(protected)/maintenance.js` | employee | 4 | Not checked |
| `app/(protected)/notification/[id].js` | employee | 1 | Not checked |
| `app/(protected)/notifications.js` | employee | 3 | Not checked |
| `app/(protected)/query/[id]/index.js` | employee | 2 | Not checked |
| `app/(protected)/recce-form.js` | employee | 6 | Not checked |
| `app/(protected)/receipts.js` | employee | 18 | Not checked |
| `app/(protected)/service/activity-history.jsx` | service | 2 | Not checked |
| `app/(protected)/service/advisories.jsx` | service | 3 | Not checked |
| `app/(protected)/service/daily-check.jsx` | service | 0 | Not checked |
| `app/(protected)/service/defect-form.jsx` | service | 6 | Not checked |
| `app/(protected)/service/defects/[id].jsx` | service | 3 | Not checked |
| `app/(protected)/service/defects.js` | service | 3 | Not checked |
| `app/(protected)/service/design-system.jsx` | service | 0 | Not checked |
| `app/(protected)/service/equipment-list.js` | service | 4 | Not checked |
| `app/(protected)/service/index.js` | service | 6 | Not checked |
| `app/(protected)/service/inspections/index.js` | service | 2 | Not checked |
| `app/(protected)/service/inspections/inspection-form/[id].jsx` | service | 13 | Not checked |
| `app/(protected)/service/minor-service/[id].jsx` | service | 11 | Not checked |
| `app/(protected)/service/mot-precheck/[id].jsx` | service | 8 | Not checked |
| `app/(protected)/service/repair-form.jsx` | service | 4 | Not checked |
| `app/(protected)/service/resolved-defects/[id].jsx` | service | 3 | Not checked |
| `app/(protected)/service/service-form/[id].jsx` | service | 15 | Not checked |
| `app/(protected)/service/service-form.js` | service | 0 | Not checked |
| `app/(protected)/service/service-history/[vehicleId].jsx` | service | 1 | Not checked |
| `app/(protected)/service/service-history.js` | service | 1 | Not checked |
| `app/(protected)/service/service-record/[id].jsx` | service | 1 | Not checked |
| `app/(protected)/service/service.js` | service | 2 | Not checked |
| `app/(protected)/service/settings.js` | service | 5 | Not checked |
| `app/(protected)/service/tyre-brake-check.jsx` | service | 0 | Not checked |
| `app/(protected)/service/vehicle-check-form/[id].jsx` | service | 3 | Not checked |
| `app/(protected)/service/vehicle-prep/[id].jsx` | service | 4 | Not checked |
| `app/(protected)/service/vehicle-timeline/[id].jsx` | service | 1 | Not checked |
| `app/(protected)/service/vehicles/[id].jsx` | service | 7 | Not checked |
| `app/(protected)/service/vehicles/file-viewer.jsx` | service | 0 | Not checked |
| `app/(protected)/settings.js` | employee | 4 | Not checked |
| `app/(protected)/spec-sheets.js` | employee | 1 | Not checked |
| `app/(protected)/timesheet.js` | employee | 6 | Not checked |
| `app/(protected)/uploader.js` | employee | 4 | Not checked |
| `app/(protected)/vehicle-check.js` | employee | 9 | Not checked |
| `app/(protected)/vehicle-prep/[id].jsx` | employee | 4 | Not checked |
| `app/(protected)/vehicles.jsx` | employee | 0 | Not checked |
| `app/(protected)/week/[id]/index.js` | employee | 43 | Not checked |
| `app/(protected)/work/index.js` | employee | 0 | Not checked |
| `app/(protected)/work-diary-board.js` | employee | 6 | Not checked |
| `app/(protected)/work-diary.js` | employee | 7 | Not checked |
| `app/(protected)/working-terms.jsx` | employee | 4 | Not checked |
| `app/+not-found.tsx` | structure | 0 | Not checked |
| `app/_layout.jsx` | structure | 0 | Not checked |
| `app/index.js` | employee | 0 | Not checked |
