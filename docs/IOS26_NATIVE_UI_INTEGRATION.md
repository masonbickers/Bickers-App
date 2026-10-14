# Apple iOS 26 native UI integration — controlled pilot

13 October 2026. **Pilot implemented; broader rollout remains gated on native
accessibility and interaction acceptance.** The audit was completed before
installing packages or modifying product files for this integration request.
See [the audit](IOS26_NATIVE_UI_AUDIT.md) for architecture, baseline and sources.
The workspace already contained substantial unrelated changes; they were
preserved and are not attributed to this pilot.

## Compatibility and package recommendation

Keep Expo **55.0.31**, React Native **0.83.10**, React **19.2.0**, Expo Router
**55.0.18**, react-native-screens **4.23.0**, expo-glass-effect **55.0.11** and
the existing date/time picker **8.6.0**. Added only **@expo/ui 55.0.17**, matching
Expo SDK 55's recommended `~55.0.17`. No SDK or existing dependency upgrade.

Local builds use Xcode **27.0 (27A266a)**. iOS deployment target **15.1** and
Android minimum SDK **24** remain unchanged. ExpoUI was linked with CocoaPods;
both native platforms were rebuilt. No signing, release-version, deployment or
navigation-structure changes were made. A newly built native binary is required
to activate ExpoUI; OTA JavaScript alone cannot add its native module.

## Implemented pilot

**Timesheets → Autofill Settings** is the sole production opt-in pilot. Existing
type-change and save callbacks, default values and persistence paths remain in
place. The development fixture uses local state and does not save real records.

| Shared abstraction | Supported iOS 26 behaviour | Fallback |
| --- | --- | --- |
| NativeSettingsSheet | SwiftUI sheet with medium/large detents, native gestures and busy dismissal protection | Existing AppModal on older iOS, missing modules, Android/web and dialog presentation |
| NativeActionButton | SwiftUI Button with glass/glassProminent styles and existing async lock/loading/disabled contract | Existing AppButton; bordered native styles when glass is unavailable or Reduce Transparency is enabled |
| NativeSegmentedControl | Controlled SwiftUI segmented Picker with brand tint | Existing shared segmented control |
| NativeTimeSelect | Already-linked UIKit compact time picker, local HH:mm and quarter-hour values | Shared settings-row SelectField on Android/web |

`nativeUI.ios.js` centralizes OS/module checks and lazy loading; Android/web do
not import SwiftUI. Glass checks both availability APIs. Unknown or disabled
picker selections are rejected. Native action labels can wrap; footer actions
stack on narrow screens and when text scaling exceeds 1.3. SwiftUI owns native
sheet geometry and button interaction rather than a custom glass imitation.

## Global design-system integration

[DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) records the native adapter contract and
settings language. Shared semantic grouped colours support light/dark appearance;
settings typography uses 17/22 row text and 15/20 detail/section text. Solid
SettingsGroup and full-row SettingsRow controls share token spacing and radius.
Brand red remains the accent. These foundations originated in the preceding
screenshot work and were incorporated rather than duplicated.

Glass is reserved for appropriate navigation/floating controls and native
actions. Content groups, forms and dense data stay solid. A prior EmptyState
literal zero radius was corrected to the existing zero token, fixing the baseline
unit failure without weakening enforcement. Existing component defaults remain
available; native integration is opt-in.

## Component migration sequence

| Area | Current status / next action after pilot acceptance |
| --- | --- |
| Native tabs | Existing centralized NativeTabLayout retained; review theme and safe-area behaviour |
| Navigation headers | Deferred; pilot one detail route and remove its duplicate PageShell header together |
| Floating controls/buttons | NativeActionButton available; migrate individual suitable actions after interaction checks |
| Contextual menus | Deferred; use native Menu where action and confirmation contracts can be preserved |
| Sheets/dialogs | Native sheet pilot implemented; retain tablet dialog fallback until separately verified |
| Time/date/value pickers | Time and segmented pilot implemented; migrate other value contracts individually |
| Alerts and confirmations | Retain current behaviour; assess native presentation per workflow |
| Cards, records and complex editors | No blanket migration or glass treatment |

## Validation evidence

Logs and labelled screenshots are in
[output/ios26-native-pilot](../output/ios26-native-pilot/).

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Shared-component ESLint | Passed |
| Whole-project ESLint | 1,078 errors, 68 warnings; same counts as pre-integration baseline, gate still fails |
| Unit suite | 570 passed, 0 failed, 1 skipped; baseline was 565 passed, 1 failed, 1 skipped |
| Browser interaction / visual suite | 180 passed, including six new phone/tablet light/dark pilot cases; existing baselines and thresholds unchanged |
| iOS native build | Succeeded with ExpoUI linked |
| Android native build | Succeeded; first attempt lacked SDK path, resolved by setting ANDROID_HOME without changing project configuration |
| iOS 26.5 runtime | Native pilot visually inspected in light/dark; Save dismissed and updated fixture result; UIKit time picker opened and dismissed |
| Android runtime | Fresh APK installed on QA emulator; light/dark fallback inspected; no ReactNativeJS/AndroidRuntime error output observed |
| Code review | Initial enlarged-text footer overflow concern addressed; follow-up found no remaining concrete bug |

Browser checks verify fallback layouts and local interactions, not SwiftUI
rendering. Native iOS observations are recorded from Device Hub in the chat;
the saved `ios-first-launch-prompt.png` and `ios-existing-timesheets-dark.png`
are contextual captures, **not pilot acceptance screenshots**. Android captures
and web captures are labelled by platform/theme. Existing unrelated whitespace
still prevents a clean whole-workspace `git diff --check`.

## Remaining acceptance and risks

- Verify native enlarged-text rendering, VoiceOver/TalkBack, Reduce Transparency
  and Reduce Motion settings on devices. Responsive code and policy tests do
  not substitute for these checks.
- Verify time-wheel changes, rapid/repeated taps, save errors, keyboard focus,
  Android hardware back and gesture dismissal during a real save. Automation
  opened/dismissed the native picker but could not reliably change its wheel.
- Verify an older iOS runtime, iPad dialog presentation and physical devices.
- Exercise real persisted Autofill save/reopen; the new fixture intentionally
  verifies local state without writing operational records.
- Capture dedicated native pilot comparison images and approve appearance before
  migrating further screens. SDK 55 ExpoUI/NativeTabs APIs remain evolving;
  native hosting and text measurement deserve explicit device acceptance.
- Resolve the existing lint backlog separately. Unchanged aggregate counts do
  not prove every individual diagnostic is unchanged.

QA binaries and an isolated Metro instance on port 8098 were used without
clearing app data. No release was deployed. Builds, browser tests and observed
native interactions support a working pilot; they do not establish complete
accessibility acceptance, store readiness or zero regressions across the app.
