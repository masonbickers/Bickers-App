# TestFlight 5.0.11 (84)

Requested 7 September 2026: include all current mobile app changes, including the glass footer.

- Snapshot: `/private/tmp/bickers-testflight-all-20260907`
- Source commit: `b44b75b5206ef2819eeb1a6a8dedf96a8d58b3e1`
- Build: https://expo.dev/accounts/masonbickers/projects/bickers-app/builds/dcbd7857-ddc0-4ebd-9810-e683a6c00c0f
- Automatic Apple submission: https://expo.dev/accounts/masonbickers/projects/bickers-app/submissions/a769fd61-9cd4-4ca1-a429-e36dbef69ba3
- Version and runtime: 5.0.11; build number: 84; channel: testflight.
- Production API: https://bickers-mobile-api.onrender.com

The snapshot includes current app, components, providers, hooks, libraries, assets, plugins and dependency lockfile, including the native glass tabs and reorganised routes. Local duplicate files, previous binaries, temporary outputs, local environment files and generated native folders were excluded. No app source differences were found between the snapshot and workspace after the checks.

Validation: 283 tests passed, one Auth emulator-only test skipped; TypeScript and lint passed; production iOS export passed. Cloud compilation and Apple processing are separate from these checks.

The first build request consumed build 83 but failed during local fingerprint calculation because a duplicate dependency directory was missing a file. Build 84 was submitted with EAS's supported EAS_SKIP_AUTO_FINGERPRINT=1 option. Cloud dependencies are installed from the lockfile.

The native build and automatic Apple upload were verified FINISHED with no errors. Apple processing, TestFlight tester availability and real-iPhone acceptance testing remain unverified. This is not an App Store release or an Apple review submission.

## Dark-mode update

Published iOS update `01a07d66-6891-7890-b70c-ccd8215475fe`, group `daabe899-188d-4a76-91b6-db13c3084759`, on the testflight branch/channel for runtime 5.0.11 at 19:44 UTC on 7 September. Source commit `9cf819c86ee11db0858bab77e6f998cbddb5d65e` in `/private/tmp/bickers-glass-fix-20260907`.

The navigation theme now applies above all routes, each native tab has the app's explicit content background, and Schedule remounts the calendar on colour-scheme changes because react-native-calendars caches its initial styles. The viewed month remains in parent state. Production iOS export, targeted lint and 283 tests passed; one emulator test skipped. Native screenshot verification is still outstanding. The update applies to installed build 84 after its update download/relaunch cycle, not to build 82 or a simulator running Metro.

## Delivery correction at 20:02 UTC

Earlier OTA publications were incomplete: local Expo export logged a missing google-services.json configuration error and produced a 2.55 MB router bundle without Bickers routes, despite exiting successfully. Those publications are not evidence of a working device update. Build 84 itself was inspected: Expo.plist enables updates, ALWAYS checks on launch, uses runtime 5.0.11 and the testflight channel.

Re-exported with the existing public Firebase configuration restored to the isolated source and an explicit EXPO_ROUTER_APP_ROOT, clearing Metro cache. Verified the 8.06 MB bundle includes Bickers routes, theme preference, Work Diary and native appearance code. Published replacement update 01a07d77-6910-7aa9-af8e-72dbaef1cb19 (group 45dda187-bf11-497c-8472-c3132e09bf83). A request using build 84's actual platform/runtime/channel headers returned this update, and its launch-asset SHA-256 matches the verified full app bundle. Device download/application and tab-switch appearance still need user confirmation. Build 85 was cancelled at the user's request; no new native binary is needed for this correction.
