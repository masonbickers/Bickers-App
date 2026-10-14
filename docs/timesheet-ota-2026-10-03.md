# Timesheet OTA — 3 October 2026

The user explicitly requested an over-the-air update so staff do not need a store update. This follow-up packages the ownership, legacy-week loading, recce and vehicle-check client repairs described in `firebase-mobile-permission-repair-2026-10-03.md`.

## iOS

The final production iOS update is `01a10347-5b77-7f1d-b1b3-617e97256d08`, group `2a84296c-cc37-455b-9a31-97730b471e4b`, runtime **5.0.12**, published at 20:39 BST. It supersedes the initial same-day timesheet update, group `8662ec32-252c-42b9-a97f-e5d65182d8fc`.

The build metadata confirms iOS store builds 87–90 use app version/runtime 5.0.12 and production channel; the latest build's native dependency log includes the file picker. The final bundle nevertheless loads receipt file picking lazily so missing native picker modules in older binaries do not prevent route loading. Those binaries retain camera/photo attachments; selecting an unavailable file picker produces a clear message.

The update was exported with production API, no dotenv files, an explicit app route root, a cleared Metro cache and locked dependencies installed in an isolated snapshot. Bundle verification confirmed full app routes, ownership and hydration code, the optional-picker safeguard, production Firebase/API markers and no localhost API marker. Final iOS SHA-256: `c14ec92f95fbbb11f3f8b63d6321a1c7d02b792702b1defd352bd98b6355b24b`.

EAS confirms publication and the group was re-read remotely. Direct CDN bundle fetching returned HTTP 403 from this execution environment; that is not device download verification. Two later attempts to verify manifest hashes were blocked by automatic approval-review timeouts. Do not claim CDN/device byte verification from the CLI publication result alone. The user independently reported that the app is working during this turn.

## Android preparation

The latest shipped Android build is runtime **5.0.6**, production channel, Expo SDK 55. Its native dependency versions were recovered from its build log. The isolated Android OTA snapshot pins those exact Expo module versions, including expo-modules-core 55.0.25 and expo-updates 55.0.27, and keeps React Native 0.83.10/Reanimated 4.2.1/Worklets 0.7.4. This avoids relabeling an incompatible modern bundle as an older runtime.

The 5.0.6 binary does not include ExpoDocumentPicker, so the lazy picker safeguard is required. No native feature or native module is added by the OTA. Android bundle SHA-256: `01efcfb31fea5f7e32595ac7384677fd44fac7b181d244e1423b6a7889986a0d`.

**Android was not published.** Three upload attempts failed with Expo's `Asset processing timed out` error, including a final IPv4 attempt. The CLI refused publication because the Android launch asset did not finish processing. No successful update group or Android publication receipt exists. Earlier Android production updates remain in effect. This is an external upload/processing blocker, not a request for a new store binary.

The verified native-compatible source snapshot is saved at `output/timesheet-ota-20261003/android-release-source.tar.gz`, and the exported bundle/assets are in `output/timesheet-ota-20261003/android-ota-dist/`. When Expo processing recovers, extract the source snapshot and publish its existing export with `eas update --channel production --platform android --environment production --skip-bundler --input-dir ota-dist --message 'Restore timesheet saving and employee forms for Android 5.0.6' --json --non-interactive`. Confirm runtime 5.0.6 and a successful update group before recording publication. No automation or unattended retry was created.

## Verification and evidence

- Main application suite after the picker change: **503 passed, 1 skipped, 0 failed**.
- Native-pinned Android snapshot: **502 passed, 1 skipped, 1 expected release-metadata assertion failed**. `release candidate uses a new app runtime` expects 5.0.12 and appVersion policy for a new store binary; this OTA intentionally targets the existing 5.0.6 runtime. The runtime and exact native modules were checked separately. Two initial decoder tests raced with patch-package; after patching completed, both passed on the full rerun.
- Production exports succeeded for both platforms. Decoder and expo-router compatibility patches applied successfully.
- Evidence files are under `output/timesheet-ota-20261003/`; no new store binary was built or submitted.

Automatic download depends on network access and the installed binary's matching runtime/channel. With check-on-launch enabled and zero launch wait, staff may need to open the app to download, then close and reopen to apply. Earlier runtimes are not covered merely because a later runtime update was published.
