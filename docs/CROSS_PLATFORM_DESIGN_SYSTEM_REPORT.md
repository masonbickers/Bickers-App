# Cross-platform design system implementation — 13 October 2026

The pre-change findings are in [UI_CONSISTENCY_AUDIT.md](UI_CONSISTENCY_AUDIT.md); the complete source scan is [design-system-source-inventory.json](design-system-source-inventory.json). The implementation reuses the existing Bickers system and adds platform presentation policy. Business logic, API integrations, data models, labels, navigation destinations and screen layouts stay shared. Android's native minimum targets may make compact controls slightly larger.

## Resolved code findings

| Change | Result | Verification |
|---|---|---|
| Uniform corner geometry | Typed utility subtracts actual inset (including border), clamps capsules to measured bounds and rejects invalid inputs. Segmented controls now use 7pt children / 6pt selected material within a 12pt container, 4pt padding and 1pt borders. | Unit tests, mocked native control trees on iOS/Android, rendered browser geometry. |
| iOS material shape | GlassView now receives radius/curve properties directly, including asymmetric corner overrides, without inheriting wrapper offsets. Both runtime guards remain. | Native adapter component tests; actual refraction unverified. |
| Fallback surfaces | Reduced-transparency iOS and Android receive opaque elevated semantic surfaces; older iOS still uses native chrome blur when allowed; web retains its existing fallback. | Capability/accessibility matrix in component tests. |
| Android interaction | Shared compact/icon controls use 48dp targets; critical actions, selection controls and tabs get native ripple. Tonal selection, solid surfaces and existing elevation express Material principles without a new framework. | Platform/control tests; native ripple rendering unverified. |
| Shared accessibility | Bottom bar reuses ThemeProvider transparency state and useReducedMotion instead of duplicate listeners. Protected/auth stacks honour reduced motion; Android details use native default transition. | Source guard tests, unit suite; native gestures unverified. |
| Token/documentation consistency | Blur, sheet/tab durations, spring settings and key interaction opacities use shared tokens. Guide now matches capsule fields, multiline radii and Android dimensions. | TypeScript and changed-file lint. |
| Keyboard configuration | Explicit Android resize configuration matches checked-in adjustResize manifest; PageShell continues owning keyboard and safe areas. | Source/configuration inspection; native keyboard unverified. |

No screen copies or new `.ios.tsx`/`.android.tsx` files were needed: existing platform branches are small and confined to shared presentation. No dependency was introduced or upgraded by this design-system work. Separate concurrent repository work changed release configuration/dependencies during verification; those changes were preserved, not attributed to this audit.

## Files changed by this pass

Shared implementation:

- `lib/design/radius.ts` (new): typed uniform-inset geometry and dimension validation.
- `lib/design/platform.ts` (new): 44pt iOS/web versus 48dp Android policy and ripple support.
- `lib/design/tokens.ts`: platform control dimensions, motion and interaction opacity tokens.
- `components/ui/AppleMaterialSurface.js`: native shape forwarding and opaque native fallbacks.
- `components/ui/AppPrimitives.js`: Android ripple, minimum target dimensions, segmented geometry, tokenised sheet motion/opacity.
- `components/app/BottomNavigationBar.js`: shared accessibility preferences, theme-aware GlassView, opaque Android/reduced-transparency fallback, ripple and motion/blur tokens.
- `app/(protected)/_layout.jsx`, `app/(auth)/_layout.tsx`: reduced-motion stack policy; Android default detail transitions.
- `app.json`: explicit Android keyboard resize. Release version changes in this file belong to concurrent work.

Tests and guidance:

- New `tests/radius.test.js`, `tests/platformDesign.test.js`, `tests/materialSurface.test.js`, `tests/sharedControls.test.js`, `tests/visual/concentric-controls.spec.js`.
- Updated `tests/designSystemAdoption.test.js`, `tests/appChrome.test.js`, `playwright.config.js` to reflect the corrected shared policies and include rendered geometry tests.
- Updated `DESIGN_SYSTEM.md`; added audit, scan inventory, implementation plan and this report; appended a follow-up link to `docs/UI_CONSISTENCY_REPORT.md` without replacing its earlier findings.
- `output/design-system-audit-20261013/`: isolated Playwright configuration and four current fixture screenshots. No committed screenshot baselines were changed.

## Before and after examples

Native shape:

```jsx
// Before: only wrapper clips; native effect has no corner configuration.
<GlassView style={StyleSheet.absoluteFill} />
// After: native material receives shape properties, excluding layout offsets.
<GlassView style={[StyleSheet.absoluteFill, shape]} />
```

Uniform inset geometry:

```jsx
// Before: fixed semantic radius doesn't include the container's border.
borderRadius: t.componentRadius.nestedControl // 8
// After: radius follows the actual uniform inset.
borderRadius: getConcentricRadius(t.componentRadius.control, t.spacing.xxs + 1) // 7
// The selected material sits inside the segment's own 1pt border.
borderRadius: getConcentricRadius(t.componentRadius.control, t.spacing.xxs + 2) // 6
```

Platform targets:

```ts
// Before: compact controlHeight: 44 on every platform.
// After: shared spacing/typography, platform-specific native minimum.
const platformControls = getPlatformControlMetrics(Platform.OS);
controlHeight: platformControls.minimumTouchTarget // Android 48, iOS/web 44
```

Fallback:

```jsx
// Before: rgba glassSurface still blends underlying content with transparency reduced.
const solidColor = fallbackColor || colors.glassSurface;
// After: opaque surfaceElevated on Android and reduced-transparency iOS;
// web's existing glassSurface fallback remains unchanged.
```

## Automated checks and evidence

| Check | Actual result | What it proves |
|---|---|---|
| `npm test` | 548 tests: 547 passed, 1 skipped, 0 failed | Unit/source/adapter behavior, including 12 new geometry/platform/material/control cases. Firebase password-transition emulator case remains skipped. |
| `npx tsc --noEmit` | Passed | Included TypeScript compiles; this project's tsconfig does not strictly type-check every JSX screen. |
| ESLint on changed source/tests/config | Passed after correcting a screenshot-path lint issue | This pass adds no changed-file lint violations. |
| `npm run lint` | Failed: 2,070 errors, 71 warnings, same counts as before changes | Whole-project lint is still blocked by legacy presentation violations. No rule suppression or allowlist expansion. |
| `npx expo install --check` | Local bundled map reports dependencies up to date; network unavailable | Offline compatibility check only; not a full online dependency/deprecation/security audit. |
| Visual web export | Passed, including a fresh isolated fixture export | Web bundling and static export work. |
| Playwright screenshot/responsive/geometry subset | 42 passed | 20 existing screenshots, 18 interaction/layout/contrast cases, 4 new measured-geometry cases. Chromium only; no native rendering assertion. |
| Existing snapshot baselines | Unchanged | No baseline updates were used to hide visual changes. |

The initial shared-dist visual attempt hit the login page after the fixture bundle was replaced. It was stopped after 11 failed fixture-gate checks and one interrupted check, with 26 not run. The replacement run used `/private/tmp/bickers-design-visual-export`, a separate port and `output/design-system-audit-20261013/playwright.config.cjs`; all 42 checks then passed. A subsequent four-case geometry rerun confirms the corrected screenshot path. An intermediate unit run saw a concurrent release-version/test mismatch; the final suite has zero failures. Neither intermediate failure was resolved by disabling a security gate or reverting unrelated user work.

Logs are in `/private/tmp/bickers-design-*.log`. Current visual evidence:

- [Light phone](../output/design-system-audit-20261013/components-light-390.png)
- [Dark phone](../output/design-system-audit-20261013/components-dark-390.png)
- [Light tablet](../output/design-system-audit-20261013/components-light-820.png)
- [Dark tablet](../output/design-system-audit-20261013/components-dark-820.png)

Dark-phone and light-tablet screenshots were inspected directly: action layout, segmented selection, cards, status banners and navigation retain their existing organisation. Web fixture verification does not verify authenticated screens. Full source inventory remains distinct from rendered coverage.

## Native verification still required

An iOS 26.3 simulator is booted and an app is installed, but that binary was not rebuilt from these changes. No Android device/emulator is connected (`adb devices -l` returned an empty list). No fresh native build, native GPU profile or signed-in device verification is claimed.

Test the following with a current native build, in light/dark and default/enlarged text:

| Screens / family | iOS checks | Android checks |
|---|---|---|
| Login and account/password forms | Native text/password centring, autofill, keyboard and secure-entry eye button | Font padding/centering, resize, keyboard dismissal and 48dp eye action |
| Main and workshop navigation | iOS 26+ glass, older-iOS fallback, badges/accessories, app/system theme transitions | Ripple, tonal selection, elevation, Back, gesture and three-button navigation insets |
| Home/header actions, contacts, profile/settings | Circular native glass, VoiceOver labels/focus and reduced transparency | Ripple clipping/contrast, TalkBack labels/focus and local action target sizes |
| Employee forms, workshop inspection/defect/service forms | Safe areas, larger text, scrolling and keyboard overlap | Resize/edge-to-edge, bottom action/accessory clearance and scroll reachability |
| Select/date dialogs, adaptive sheets, media viewer | Reduce Motion, native transitions, focus containment and dismissal | Hardware Back, keyboard, focus containment and reduced animation settings |
| Service record grids, nested cards/images | Measured corner alignment including asymmetric/grid cases | Same geometry review; avoid deriving radii from unrelated containers |

## Deferred improvements and limits

- Legacy lint migration and all locally overridden targets/styles remain outstanding. Shared 48dp policy does not prove every legacy action meets Android touch-target guidance.
- Uniform inset radii are corrected where verified. Grid cards, asymmetric layouts, buttons in modal footers and contextual image nesting still need measured, shape-specific review. No universal concentricity claim.
- Native SwiftUI ConcentricRectangle would require a justified native adapter; the current RN library does not expose it. No dependency is needed for numeric uniform-inset geometry.
- A full Material 3 component replacement, expressive shape morphing, wallpaper-driven colours or typography redesign would change the identity/layout and is deferred. Current Android improvements adopt appropriate surface, feedback, target and motion principles only.
- Primary white-on-brand-red small text contrast, increased contrast behavior and live-content glass contrast still need a brand-preserving accessibility decision. Existing contrast tests do not establish universal WCAG AA.
- Native Switch migration, per-family icon-package migration and EAS image pinning require native validation before changes. The current beta NativeTabs API is retained.
- Blur/glass overdraw, frame timing and GPU cost require real-device profiling, particularly on dense toolbars. No performance benchmark was run.
- No production deployment, dependency upgrade, native build, commit or release was performed by this pass.


## Native verification follow-up — 13 October 2026

See [Native UI readiness](NATIVE_UI_READINESS_REPORT.md) for the updated iOS/Android build evidence, confirmed shared fixes, automated results, screen-by-screen coverage and remaining release gates. Earlier native-unverified statements above describe the implementation-stage baseline.


## Fresh comprehensive verification follow-up

See [Full design-system verification](FULL_DESIGN_SYSTEM_VERIFICATION.md) for the
13 October 2026 fresh checks, native rebuilds, confirmed fixes, preserved failures
and current production blockers. Earlier results above remain historical evidence.
