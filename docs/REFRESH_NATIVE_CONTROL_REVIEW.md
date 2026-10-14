# Timesheets Refresh native control review

The shared NativeActionButton audit found two paths: SwiftUI glass on supported
iOS 26 binaries, and AppButton when the native module is absent. The latter
retained the ordinary control radius and decorative border. The SwiftUI path
always selected large sizing and omitted system images.

The shared adapter now forwards `systemImage`, supports compact `size="small"`
through native regular sizing, and uses a capsule `glassSecondary` material
fallback without a decorative outline. Secondary native text uses semantic
foreground colour rather than tinting the control. Existing AppButton secondary
defaults remain unchanged. Native minimum touch targets, async action locking,
loading indicators and accessible labels remain shared.

Timesheets requests `arrow.clockwise` for native SF Symbols and `refresh-ccw`
for the fallback. Android uses its solid shared semantic surface and ripple;
older iOS uses the existing availability-aware material implementation. The
adapter never loads SwiftUI on Android. A binary without ExpoUI cannot display
the SwiftUI Button, even when running iOS 26.

Validation: TypeScript and shared-component ESLint passed; 25 relevant tests
passed, including native symbol/size/loading and fallback capsule geometry checks.
On the rebuilt iOS 26.5 QA simulator, Refresh displayed a compact native capsule
with SF Symbol, entered progress after an accessibility click and returned to
the normal control. Evidence: `output/ios26-native-pilot/refresh-native-ios-dark.png`.

Android QA device discovery succeeded, but activity launch and screenshot commands
stalled. The first Android capture showed the prior fixture/bundle, so it is not
acceptance evidence for this change. Android runtime validation remains pending;
do not claim it passed. No records were edited, dependencies upgraded or native
projects regenerated for this correction. Light-mode device verification and
full assistive-technology checks remain pending.
