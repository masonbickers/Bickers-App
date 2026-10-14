# Native UI readiness — 13 October 2026

The updated application was built, installed and run on both native targets. This is a partial native verification pass, not a production sign-off. The existing shared design system was reused; no duplicate screens or business/API changes were introduced. Read alongside `DESIGN_SYSTEM.md`, `docs/UI_CONSISTENCY_AUDIT.md` and `docs/CROSS_PLATFORM_DESIGN_SYSTEM_REPORT.md`.

## Actual targets and build evidence

| Platform | Build and run | Limits |
|---|---|---|
| iOS | Fresh Debug arm64 simulator build succeeded; installed on Bickers Apple Design QA, iPhone 17 Pro, iOS 26.5, UUID `7A7A9070-32F8-49D4-9E7E-0050FD608E58`. Authenticated Home, Contacts, Schedule and Settings ran. | Simulator only; no physical device, old-iOS runtime or signed Release build verified. |
| Android | Fresh Debug arm64-v8a APK built and installed on Pixel_9, Android 16/API 36, `emulator-5554`. User completed test-account sign-in; authenticated Home, Contacts, Schedule and Settings ran. | Other ABIs, physical devices and signed Release build unverified. Android touch automation could not attach through the available native UI tool. |

Build logs and captures are in `output/native-readiness-20261013/`. Both native apps use the current development bundle on Metro 8093. Fixture mode is enabled in this local test server; it must not be enabled for production. Native material capability diagnostics were temporarily added, captured, then removed.

The original App Store simulator's stuck display was recovered, and its app reconnected to the current Metro server. Its older installed binary is not the evidence for the fresh iOS build above. The unrelated Metro server on 8081 was preserved.

Local native build repair was necessary: duplicate Finder/iCloud-style “ 2” native/codegen files caused invalid generated names and duplicate declarations. Only duplicates with canonical originals were quarantined reversibly in `/private/tmp/bickers-codegen-quarantine-20261013`; manifests are saved with the evidence. The ignored iOS Podfile was pointed at the canonical Xcode project, and Pods were synced to installed dependencies. Android used the installed SDK and JDK 21. These local repairs do not establish that a clean CI checkout builds identically.

Generated native version metadata is stale: the fresh iOS binary reports 5.0.7, Android's generated project reports 5.0.12/code 2, while app configuration reports 5.0.13. Resolve this through the normal clean native-generation/release process before submission. Concurrent dependency/release work was preserved.

## Confirmed fixes in this pass

- Shared AppPressable now has the platform minimum width as well as height: 44pt iOS and 48dp Android. Interactive MediaThumbnail gets minimum targets, rounded ripple clipping and shared disabled/pressed opacity.
- SyncStatusControl uses Android ripple and shared iOS pressed opacity. Its derived semantic colour variable was renamed to avoid the local-palette lint false positive.
- Light warning text reuses the existing readable semantic warning colour; dark danger text reuses the existing readable semantic danger colour. Destructive buttons use the existing solid danger surface/on-surface pair. Brand red remains unchanged.
- Android notification channel setup omits the custom-sound field to select the system default. Installed native source proves that omission resolves to `Settings.System.DEFAULT_NOTIFICATION_URI`; a string is treated as a bundled filename. The previous literal `default` raised a red runtime warning after sign-in. Restarting the updated app removed that warning, and native channel inspection still shows `content://settings/system/notification_sound`, importance 5 and the existing vibration pattern. Scheduling, notification content, permissions, APIs and workflows were not changed.

## Native observations versus automated coverage

| Area | Native observation | Outstanding verification |
|---|---|---|
| Liquid Glass | iOS 26.5 components/navigation rendered; runtime diagnostics confirmed supported native glass branch. Reduced Transparency switched that branch off and rendered opaque surfaces. | Older iOS blur fallback is unit-tested, not run on an older runtime. Physical-device background contrast/performance and tinted glass need checks. |
| Android surfaces | Components, forms, service list and authenticated screens rendered opaque tonal/elevated surfaces. Diagnostics confirmed no native glass branch on Android. | Ripple animation and pressed-state rendering need actual touch checks; static screenshots do not prove them. |
| Geometry | Shared segmented controls, capsule fields, list cards and calendar boundaries rendered; measured web geometry and radius unit cases pass. | Asymmetric accents, modal footer edges, image clipping and record grids need the remaining native data/state matrix below. |
| Typography/forms | iOS employee/service form fixtures rendered. Android form fixture and real Contacts search field rendered with centred text. User successfully signed in on Android. | Native multiline editing, validation, secure-text toggles and completed signed-in form workflows are not fully verified. Fixture inputs have controlled no-op callbacks; focus is not proof of editing. |
| Keyboard | iOS software keyboard opened on the service form. Dragging dismissed it; form actions then became reachable. | Keyboard-stays-open action visibility was not established. Android keyboard, IME actions, hardware keyboard, modal keyboard and landscape remain manual. |
| Navigation | Authenticated routes ran on both platforms. iOS Month/Agenda selection worked and accessibility state changed. iOS Contacts was opened through a real control. | Android back gestures, native tab presses, nested stacks, modal dismissal and complete workflow return paths remain manual. Deep-link launches are not equivalent to gesture checks. |
| Safe areas | Visible top/bottom placement inspected in portrait captures of native fixtures and authenticated screens. | Landscape, small phones, tablets, Android navigation modes and every modal/footer need checks. |
| Accessibility | iOS accessibility tree exposed labelled fields/buttons, calendar dates and selected segmented state. Reduced-transparency fallback checked. | Full VoiceOver/TalkBack traversal, focus after errors/modals, Increase Contrast, every legacy target and physical haptics remain unverified. |
| Enlarged text | Maximum iOS simulator Text Size produced large wrapped text after app restart. Live override changes initially left clipping/stale measurements. | Investigate live Dynamic Type reflow and reproduce through normal device Settings; do not call enlarged-text support complete. Android font/display scaling unverified. |
| Motion/shadows | Shared reduced-motion policy and opaque/elevation branches pass automated checks; native static appearance inspected. | Reduced Motion animation timing, transitions, GPU cost and physical-device performance not signed off. Metro also logged animated-value/no-listener warnings during accessibility changes. |

## Corner review

Uniform inset controls use the existing `getConcentricRadius`: outer radius 12 minus padding 4 and border 1 gives segment radius 7; the material inset includes another border and resolves to 6. No new radius system was introduced.

The route source inventory covers all 78 application source files and records shared UI adoption, explicit radius/image leads and lint findings. This is a source inventory plus targeted family review, not a claim that every line or state was visually verified. Relevant shared primitives, screenStyles and representative forms/navigation were inspected against global tokens.

- Home quick-action grid/cards render on both platforms. Child icons are independent controls within asymmetric content, so a uniform parent-minus-padding rule does not apply to every corner. Left-only job accents require their own aligned-edge check with a populated job.
- AppModal has radius 18, separate padded body/footer and wrapping actions; a sheet deliberately has square bottom corners. Footer buttons are not a uniform inset copy of the dialog. Keep layouts until native modal states can be measured.
- Workshop wheel/record cards are independent grid cells under flat sections. Fixed 18pt cell radii are review candidates, not confirmed geometric defects. Populated form/record grids remain manual.
- Vehicle-check photo tiles and removal actions need photo-present native checks. Shared minimum pressable width now protects compact removal targets; image crop/overflow needs visual confirmation.
- Message bubbles, calendar day cells, avatar circles and image frames are independently shaped elements. No blanket subtraction or unrelated screen redesign was applied.

## Contrast

Calculated token pairs: light warning on warningSoft improves from 3.777 to 5.489; dark danger on dangerSoft improves from 3.742 to 5.378; destructive button label contrast is 5.055. Normal text on background is 16.492 light / 19.262 dark; muted text on surfaceAlt is 4.828 / 7.116. These calculations are not a complete screen contrast audit.

White on unchanged brand red `#ED1C25` remains 4.381: below 4.5 for normal-size text, including the existing 14pt primary button label. An accessible brand-preserving fill/text treatment needs resolution before claiming normal-text AA. Borders, focus indicators, dynamic glass backgrounds and every local semantic colour still need state-level review.

## Automated results after changes

| Check | Result | Scope |
|---|---|---|
| TypeScript `npx tsc --noEmit` | Passed | Included TS sources; does not strictly type-check all JSX screens. |
| `npm test` | 552 total: 551 passed, 1 skipped, 0 failed | Includes new control target/contrast and Android channel regression cases. Firebase emulator-dependent case still skipped. |
| Changed-file ESLint | Passed | AppPrimitives, SyncStatusControl, ThemeProvider, notifications and the two regression test files. |
| Whole-project `npm run lint` | Failed: 2,069 errors, 71 warnings | Existing presentation migration debt; no suppressions/allowlist expansion. |
| Web export + Playwright | 156 passed | Chromium screenshots, responsive/layout/interaction/geometry checks. Existing baselines unchanged. Not native rendering tests. |
| Whole-workspace whitespace check | Failed on pre-existing unrelated dirty route changes | No broad cleanup of concurrent/user work. |

Scoped JSON lint categorisation (app, components, lib/design and ThemeProvider; its file coverage differs slightly from Expo CLI): 2,013 no-screen-presentation, 50 no-screen-palette, 6 no-local-generic-component and 4 semantic-colours/typography errors. Largest clusters remain legacy screen style/layout declarations. A safe derived-colour naming violation was fixed; mass migration would be a separate reviewed project. The existing dependency check also reports expo-updates 55.0.31 versus expected ~55.0.33; compatibility remains to be reconciled by release/dependency work.

## Screen-by-screen readiness

`Rendered` means the named native screen/state was actually observed on the updated build. It does not mean all interactions or accessibility states passed. `Fixture` means representative presentation, not that route's real signed-in business workflow. `Manual pending` means no native sign-off. Infrastructure files are listed for complete route-source coverage.

| Source / screen | iOS | Android | Remaining checks |
|---|---|---|---|
| `app/(auth)/_layout.tsx` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Full route/guard/transition matrix |
| `app/(auth)/login.jsx` | Shared form exercised; earlier login alignment fix retained | Rendered; user completed sign-in | Validation, secure toggle, keyboard and enlarged text |
| `app/(protected)/(main-tabs)/_layout.jsx` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Full route/guard/transition matrix |
| `app/(protected)/(main-tabs)/contacts.js` | Rendered; labelled contact actions observed | Rendered, authenticated | Search editing, keyboard, scaling; external call/message actions untested |
| `app/(protected)/(main-tabs)/job.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/(main-tabs)/me.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/(main-tabs)/screens/homescreen.js` | Rendered, authenticated | Rendered, authenticated | Populated job accents, quick actions, scaling, full scroll |
| `app/(protected)/(main-tabs)/screens/schedule.js` | Rendered; Month/Agenda interaction checked | Rendered, authenticated Month | Day details, gestures, scaling and event states |
| `app/(protected)/(service-tabs)/_layout.jsx` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Full route/guard/transition matrix |
| `app/(protected)/(service-tabs)/service/book-work.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/(service-tabs)/service/home.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/(service-tabs)/service/issues.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/(service-tabs)/service/service-list.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/(service-tabs)/service/work.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/_layout.jsx` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Full route/guard/transition matrix |
| `app/(protected)/about.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/add-timesheet.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/bookings/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/design-system.jsx` | Fixture components/forms and accessibility states checked | Fixture components rendered | Native interactive states, modal/media matrix |
| `app/(protected)/document-viewer.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Document loading, zoom/scroll, native viewer/share behaviour and accessibility |
| `app/(protected)/edit-profile.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/expenses.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/fix.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/help.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/holiday-request.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/holidaypage.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/index.js` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Full route/guard/transition matrix |
| `app/(protected)/insurance.js` | Manual pending; source inventoried | Manual pending; source inventoried | Document loading, zoom/scroll, native viewer/share behaviour and accessibility |
| `app/(protected)/maintenance.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/notification/[id].js` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/notifications.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/query/[id]/index.js` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/recce-form.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/receipts.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/service/activity-history.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/advisories.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/daily-check.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/defect-form.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/service/defects/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/defects.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/design-system.jsx` | Fixture service form/list; software keyboard focus and drag dismissal | Fixture service form/list rendered | Actual workshop workflows, Android keyboard, modal/media/grid states |
| `app/(protected)/service/equipment-list.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/index.js` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Full route/guard/transition matrix |
| `app/(protected)/service/inspections/index.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/inspections/inspection-form/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/minor-service/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/mot-precheck/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/repair-form.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/service/resolved-defects/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/service-form/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/service-form.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/service/service-history/[vehicleId].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/service-history.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/service-record/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/service.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/settings.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/tyre-brake-check.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/service/vehicle-check-form/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/vehicle-prep/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/vehicle-timeline/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/vehicles/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/service/vehicles/file-viewer.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Document loading, zoom/scroll, native viewer/share behaviour and accessibility |
| `app/(protected)/settings.js` | Rendered, authenticated | Rendered, authenticated | Theme persistence, switches, dialogs and accessibility focus |
| `app/(protected)/spec-sheets.js` | Manual pending; source inventoried | Manual pending; source inventoried | Document loading, zoom/scroll, native viewer/share behaviour and accessibility |
| `app/(protected)/timesheet.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/uploader.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/vehicle-check.js` | Manual pending; source inventoried | Manual pending; source inventoried | Editing, validation, keyboard, modal/footer, media and completion on both platforms |
| `app/(protected)/vehicle-prep/[id].jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/vehicles.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/week/[id]/index.js` | Manual pending; source inventoried | Manual pending; source inventoried | Valid test record/role required; populated/empty/error states, scaling, keyboard/media as applicable |
| `app/(protected)/work/index.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/work-diary-board.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/work-diary.js` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/(protected)/working-terms.jsx` | Manual pending; source inventoried | Manual pending; source inventoried | Document loading, zoom/scroll, native viewer/share behaviour and accessibility |
| `app/+html.tsx` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Route/guard/transition matrix; web-only +html has no native view |
| `app/+not-found.tsx` | Manual pending; source inventoried | Manual pending; source inventoried | Real data, empty/error/loading states, navigation, scaling and screen-reader traversal |
| `app/_layout.jsx` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Full route/guard/transition matrix |
| `app/index.js` | Infrastructure source reviewed; no standalone screen | Infrastructure source reviewed; no standalone screen | Full route/guard/transition matrix |


## Production release gates

1. Complete native coverage of the manual-pending rows, including valid workshop records/roles, modal footers, photos, grids, keyboard, VoiceOver/TalkBack and Android touch feedback. The available Android UI automation could not attach; no adb input substitute was used. Older-iOS fallback and physical-device verification remain outstanding.
2. Finish full-screen enlarged-text and screen-reader verification. The shared-text reflow and shared accent-control contrast gaps were corrected in the focused follow-up below; custom screen-level text and variable native glass backgrounds still need coverage.
3. Reconcile stale generated native version/build metadata, validate clean CI native generation without local duplicate files, run signed Release builds and verify all supported ABIs/device targets. Local Debug builds alone are not release qualification.
4. Resolve the existing whole-project lint gate through a bounded migration or an explicitly agreed release policy; this pass does not make the project lint-clean. Run the skipped Firebase emulator test in its supported environment.
5. Reconcile dependency compatibility (expo-updates), and inspect repeated animated-value warnings/performance on devices. Confirm fixture mode is off in production.

No production deployment, submission, account changes or business-data mutation was performed. Both development apps remain available for continued manual verification.


## Focused iOS geometry follow-up — 13 October 2026

After the compact capsule changes to Settings Theme/Device Notifications and Me Edit/Add, a fresh source/native check found:

| Finding | Evidence | Status |
|---|---|---|
| Me Expenses/Receipts aligned outer corners are not concentric | `lib/design/screenStyles/main-tabs-me-js.js`: sectionPanel radius 28, padding 12 and border 1; actionTile radius 18. The aligned child corners should resolve to 28 - 13 = 15. Actual Me portrait screen inspected on iOS 26.5; two tiles share the outer top/bottom edges. Internal grid corners remain independent. | Confirmed geometry mismatch; not fixed in this check. |
| Settings Maintenance Reminders uses a custom native switch | Shared ToggleRow renders Pressable + View track/thumb on iOS, rather than RN Switch. Its text starts at the section edge instead of the icon-led text column. | Confirmed platform styling/alignment inconsistency; functioning behaviour not assessed as broken. |
| Normal-size accent text can fail contrast on dark control surfaces | Calculated red #ED1C25 on #1C1C1E = 3.884, on #181818 = 4.053. Theme selected label still uses accent tone; native glass background varies and needs sampling. White on brand red remains 4.381. | Confirmed token-pair failures; not a claim of exact native glass pixel contrast. |
| Other secondary actions retain rectangular corners | Me Manage Holidays, receipt/photo actions, retry controls and modal actions still use the shared default rectangular variant. | Styling candidates, not automatically Apple design defects. |
| Live Dynamic Type and remaining modal/image/workshop states | Prior evidence and outstanding matrix above. | Still unresolved/unverified; not signed off by this focused check. |

The newly applied capsules and default rectangular segmented inset formula are consistent. Pill geometry is dimension-clamped: an inset capsule naturally gets a smaller effective radius from its smaller height. No blind global radius replacement is warranted. Home planning arrows inherit AppPressable minimum targets despite smaller explicit width/height styles; the 32pt style alone is not evidence of a 32pt hit target.

Fresh targeted radius/material/control suite: 12 passed, zero failed; TypeScript passed. Capture `/private/tmp/bickers-ios-me-geometry-check.png`. This check made no additional visual implementation changes.


## Confirmed issue fixes — 13 October 2026, 15:29

The earlier geometry follow-up table records findings before this fix. Its first
three confirmed issues are now corrected; optional rectangular secondary actions
were not redesigned.

- Me Expenses/Receipts tiles now derive a 15pt radius from the 28pt parent,
  including its 12pt padding and 1pt border. The updated Me view was inspected
  in the running iOS 26.5 QA build.
- Settings Maintenance Reminders now uses the shared native Switch on iOS and
  Android, and an icon-led row aligns its text with the other settings. Native
  rendering was inspected on both platforms; the actual preference was not
  changed by this verification. Unit checks cover callback/disabled semantics.
- Shared accent text uses #FF6B72 in dark appearance and #B31920 in light
  appearance; filled primary controls use #D91D26 with white labels. Tests
  assert at least 4.5:1 on the actual configured opaque surfaces and fills.
  Brand accent/artwork remains #ED1C25. This does not prove pixel contrast
  over every changing native glass background or custom screen-level colour.
- Shared AppText, section headings, form labels and button labels refresh their
  native iOS text view when font scale changes. Settings was changed live from
  text-size 10 to maximum 11 without rebuilding or refreshing the app: headings
  and list copy reflowed instead of clipping. Returning live to size 2 also
  rendered correctly. This verifies Settings/shared-text behaviour, not every
  form, modal or data-grid layout at maximum size. Form values are not remounted.
- Normal-size Settings was inspected on iOS and Android. Android's notification
  button briefly showed stale clipped text during Fast Refresh; restarting the
  QA app restored the full “Turn off” label. Startup rendering is verified;
  Android font-scale changes and interactive feedback remain manual checks.

Validation after the fixes: TypeScript passed; scoped ESLint passed; 554 tests
ran with 553 passing, one existing environment-dependent skip and no failures.
The web export succeeded. Whole-project lint remains the previously documented
legacy release gate. No business workflow, backend or API change was made.

Final browser run: 156 checks passed against the fresh web export. Screenshot
comparisons were explicitly disabled (`--ignore-snapshots`) because accessible
colour changes intentionally alter pixels; this is layout/interaction coverage,
not approved visual-baseline parity. Native screenshots were inspected separately.
Logs and the three inspected normal-size native captures are saved in
`output/native-readiness-20261013/focused-fixes/`.


## Fresh comprehensive verification follow-up

See [Full design-system verification](FULL_DESIGN_SYSTEM_VERIFICATION.md) for the
13 October 2026 fresh checks, native rebuilds, confirmed fixes, preserved failures
and current production blockers. Earlier results above remain historical evidence.
