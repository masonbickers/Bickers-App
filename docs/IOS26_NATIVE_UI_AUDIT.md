# iOS 26 native UI compatibility assessment

Audit completed 13 October 2026 before dependency or product changes for this
integration request. Earlier screenshot-driven edits are part of the starting
working tree, not changes introduced by this integration.

## Architecture and compatibility

Inventory: 78 app route/layout modules, 45 components, 8 hooks, 6 providers,
195 library modules, 10 server files and 172 test/evidence files. Expo Router
owns auth and protected stacks; Firebase/session providers, data cache, offline
queues, notification preferences and sync stay outside presentation changes.
Employee and service workspaces already use iOS NativeTabs through one shared
NativeTabLayout. Android/web use the existing shared footer and Slot layouts.
Protected stacks hide native headers and use PageShell headers. Changing all
headers now would duplicate headers and alter safe-area ownership.

| Component | Installed | Recommendation |
| --- | --- | --- |
| Expo | 55.0.31 | Keep current SDK |
| React Native | 0.83.10 | Keep; matches Expo's bundled version map |
| React / React DOM | 19.2.0 | Keep |
| Expo Router | 55.0.18 | Keep existing native tabs; SDK 55 API remains beta |
| react-native-screens | 4.23.0 | Keep |
| React Navigation native / bottom-tabs / elements | 7.3.18 / 7.18.18 / 2.9.40 | Keep |
| expo-glass-effect | 55.0.11 | Keep; SDK 55 recommends ~55.0.11 |
| @expo/ui | Absent | SDK 55 recommends ~55.0.17; add only for the native pilot |
| Date/time picker | 8.6.0 | Already linked; no upgrade needed |

Version recommendations are taken from the installed Expo bundledNativeModules
map and [SDK 55 UI docs](https://docs.expo.dev/versions/v55.0.0/sdk/ui/swift-ui/button/).
Use SDK-specific APIs rather than current/latest examples from a different SDK.

Metro also reports the existing expo-updates 55.0.31 package against an expected
~55.0.33. This unrelated patch update is deferred; it was not required to build
or validate the pilot.

The shared AppleMaterialSurface uses genuine UIVisualEffectView glass, guarded
by both availability APIs and Reduce Transparency. It supplies native corner
geometry; its parent still owns React Native pressing. AppButton secondary and
IconButton already use this surface. Primary glass was added in earlier work,
but these controls are not native SwiftUI Buttons. The current AppModal sheet
uses React Native Animated and a transparent Modal, not SwiftUI sheet detents.
SelectField owns a custom option dialog. Those distinctions must be explicit.

Shared tokens cover density, spacing, corners, typography and contrast-aware
brand colours. Concentric radius helper includes border plus padding. Recent
grouped settings primitives exist in the working tree but have not completed
visual acceptance. Screen-owned palettes, typography, card treatments and
legacy control overrides remain widespread; this pilot will not migrate them.

## Build and deployment

Local Xcode: 27.0 (27A266a). Booted QA simulators include iOS 26.3 and 26.5.
Glass styles require iOS 26+ and an Xcode 26-or-newer build. iOS deployment target
is 15.1; keep older-device support and availability guards. New architecture
and Hermes are enabled; Android minimum SDK is 24. Existing glass and date-picker
pods are installed; ExpoUI is absent from Podfile.lock.

Adding @expo/ui requires native pod installation and a fresh iOS binary; OTA
JavaScript cannot supply a missing native module. The pilot must fall back in
older binaries. EAS currently uses `image: latest`, so build provenance must
record the actual Xcode image rather than assume a fixed version. No release,
deployment target, signing or app-version changes are needed for this pilot.
Duplicate native project copies exist (Bickers and Bickers 2); use the active
Bickers workspace and do not edit both or regenerate native projects broadly.

## Baseline captured before integration changes

- TypeScript: passed in the immediately preceding grouped-settings work.
- Uncached Expo lint: **1,078 errors, 68 warnings**.
- Unit suite: **565 passed, 1 failed, 1 skipped** (567 total).
- The failure is the unfinished previous EmptyState plain treatment's literal
  radius 0; correct it using the existing zero token, without relaxing the test.
- Simulator/ADB enumeration works with host access; sandbox-only commands cannot
  connect to CoreSimulator or the ADB listener. Two Android emulators are present.
- Existing visual baselines and native reports are historical evidence, not
  verification of this new pilot.

## Integration plan and pilot

Pilot: Timesheets > Autofill Settings. Business callbacks and persisted defaults
stay unchanged. Introduce opt-in shared native action buttons and native sheet
presentation, with platform-separated fallbacks. SwiftUI should own the native
button behaviour and sheet presentation; React Native can host unchanged form
content through RNHostView. Native-module absence, older iOS and Android/web must
retain the existing controls. Do not replace the global navigation structure.

1. Add the SDK-matched ExpoUI package, inspect its actual installed types and
   native module identifiers, then implement guarded platform abstractions.
2. Add tests for async locking, disabled/loading, dismissal and module/version
   fallback. Keep public screen callbacks and shared tokens intact.
3. Wire only Autofill actions and sheet to the abstraction; keep regular content
   solid and preserve brand tint. Build and validate before any further migration.
4. Run full unit, type and visual suites; compare new lint findings against this
   baseline. Verify light/dark runtime on iOS and Android without clearing data.
5. Stop broader rollout until native interactions and accessibility are accepted.

| UI area | Planned migration after pilot acceptance |
| --- | --- |
| Native tabs | Retain existing centralized integration; check theme/insets |
| Navigation headers | One selected detail route with native header, suppressing its PageShell header |
| Floating action buttons | Opt-in SwiftUI glass/glassProminent; existing async contract and fallbacks |
| Context menus | SwiftUI Menu where actions are equivalent; preserve destructive confirmations |
| Sheets/dialogs | Shared native sheet adapter; busy dismissal guard and RN content hosting |
| Pickers | Native controlled time/date or SwiftUI Picker where value contracts match |
| Cards and data grids | Solid shared surfaces; no blanket glass or rewrite |
| Typography/accessibility | Dynamic Type, wrapping, VoiceOver and Reduce Motion/Transparency acceptance |

References: [SwiftUI Host](https://docs.expo.dev/versions/v55.0.0/sdk/ui/swift-ui/host/),
[SwiftUI sheets](https://docs.expo.dev/versions/v55.0.0/sdk/ui/swift-ui/bottomsheet/),
[glass availability](https://docs.expo.dev/versions/v55.0.0/sdk/glass-effect/),
[native tabs](https://docs.expo.dev/versions/v55.0.0/sdk/router/native-tabs/).

## Risks and acceptance gates

Host measurement and React Native content in native sheets need device testing.
SDK 55 native tabs and ExpoUI are evolving APIs. Forced app themes, text scaling,
save errors, rapid taps, hardware back, gesture dismissal while saving and nested
pickers must be verified. Native effects cannot be proved by web screenshots.
Existing lint failures are a separate migration backlog; passing builds do not
mean store readiness or zero regressions.
