# App Store readiness — 12 September 2026

> **Follow-up completed 13 September 2026:** This is the initial audit snapshot. See [the current build and submission report](app-store-build-5.0.12.md) for the completed 5.0.12 (87) build/upload, zero-vulnerability audit, native QA and published metadata corrections.

**Verdict: Apple confirms 5.0.11 (84) is already submitted and Waiting for Review. Local fixes are prepared as 5.0.12 and are not part of that submission.** No build, upload, OTA update, Apple submission, backend deployment, or security-rule deployment was made during this check.

## Versions checked

- App Store Connect app: `6754837128`; bundle ID: `com.bickers.booking`.
- EAS confirms 5.0.11 (84), build `dcbd7857-ddc0-4ebd-9810-e683a6c00c0f`, is the latest completed iOS store build. Build 85 was cancelled.
- Downloaded build 84 was inspected: Xcode 26.6, iOS 26.5 SDK, minimum iOS 15.1, iPhone and iPad support, runtime 5.0.11, channel `testflight`, and 15 privacy manifests including an aggregate app manifest. This meets the SDK minimum documented by [Apple](https://developer.apple.com/news/upcoming-requirements/). It does not establish approval or current review status.
- After the user confirmed sign-in, their authenticated Chrome session showed **5.0.11 — Waiting for Review**, with build **84** selected. Four 6.5-inch iPhone screenshots and one 13-inch iPad screenshot are present. Reviewer username/password and contact details are filled in; their values are deliberately omitted from this report. The account was not used to perform an app login.
- Listing description, keywords, support/marketing URLs and copyright are populated. Review notes describe approved-workforce access and the intended Unlisted distribution. **Manually release this version** is selected.
- Apple states that submitting a new build requires removing this version from review. No withdrawal or submission change was made.
- App Privacy navigation stalled, and browser automation repeatedly timed out, including through the native Chrome interface. The current privacy label, age rating/content rights, pricing/distribution settings, review messages and actual Unlisted-request status remain unverified. The filled review notes do not prove the Unlisted request was submitted or approved.

## Local repairs

- Added the existing, publicly accessible [privacy policy](https://bickers-v2.vercel.app/privacy-policy) to sign-in and Settings. Apple requires the link in both metadata and the app: [review guideline 5.1.1](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage).
- Removed duplicate Contacts, Jobs and Me routes after confirming their contents match the current tab routes apart from import depth. Also moved the obsolete duplicate login and duplicate test out of route/test discovery. Originals and SHA-256 hashes are preserved in `tmp/app-store-readiness-backup-20260912/manifest.json`.
- Excluded backups, temporary outputs, duplicate files, environment files and signing-key files from EAS packaging.
- Corrected the working-terms scroll-ref assertion to allow other ScrollView props between the forwarded props and ref. No working-terms behavior changed.
- Set version/runtime policy to prepare a new 5.0.12 candidate, retaining the existing minimum supported version.
- Applied Expo SDK 55's recommended patch versions and compatible dependency security updates; corrected npm's failing safe-area override reference while preserving its version constraint.
- Disabled the unused microphone permission in the image-picker plugin. Expo native-config introspection confirms no microphone usage key is generated, while camera and photo permissions remain.

## Validation

| Check | Result |
| --- | --- |
| Automated tests | 286 passed, 0 failed; 1 Firebase Auth emulator-only test skipped |
| ESLint | Passed, zero errors |
| TypeScript | Passed |
| Expo Doctor | 20/20 passed after dependency changes |
| Production export | iOS and web exported with explicit production API and a cleared Metro cache; bundle verification recorded separately |
| Manifest/lockfile consistency | Dependency specifications match |
| Native configuration | 5.0.12 and correct bundle ID; camera/photos retained; microphone permission absent |
| Production backend | `/health` returned HTTP 200 and `service: bickers-api` |
| Live version policy | `/app-config` returned HTTP 200 with minimum app version 5.0.4 |
| EAS production environment | `EXPO_PUBLIC_API_URL=https://bickers-mobile-api.onrender.com` verified |
| Privacy page | HTTP 200 without authentication; app button opened the correct policy |
| Browser sign-in check | Form and privacy control render; empty email validation works |
| Apple submission | 5.0.11 (84), Waiting for Review, verified in authenticated Chrome |
| Store screenshots | Four 6.5-inch iPhone images and one 13-inch iPad image present |
| Reviewer details | Sign-in credentials and contact fields visibly populated; login validity not tested |
| Release setting | Manual release selected |

The local `.env.local` points to `http://localhost:3002` for development. Metro initially reused this address from its transform cache even after an environment override. A production export must explicitly use the verified production environment **and clear the cache**. Do not use an export based on that development URL as a release artifact.

Verified export command:

```sh
CI=1 EXPO_PUBLIC_APP_ENV=production \
EXPO_PUBLIC_API_URL=https://bickers-mobile-api.onrender.com \
EXPO_ROUTER_APP_ROOT=app \
npx expo export --clear --platform ios --platform web \
  --output-dir /tmp/bickers-readiness-store-export-verified
```

The browser preview emitted a React web hydration warning/error (#418) and an unsupported-web push-listener warning; the form recovered and remained interactive. This check is not native-device acceptance and does not establish an error-free web release. The installed Bickers Simulator app is 5.0.7, so it cannot validate the 5.0.12 candidate.

Evidence logs and the sanitized build inspection are in `output/app-store-readiness-20260912/`.

## Remaining release gates

1. Finish the [App Store Connect](https://appstoreconnect.apple.com/apps/6754837128/distribution) checks once its stalled pages can be inspected: review messages, age rating/content rights, published privacy declarations and distribution settings. Confirm actual Unlisted-request submission/approval if direct-link staff distribution remains the intended route. The current version is already queued for review; approval and release are not established.
2. Build the new native 5.0.12 candidate and verify it on iPhone and iPad using an approved reviewer/test account. Exercise sign-in, working-terms access, primary tabs, document opening, receipt camera/upload, permissions, sign-out and cold relaunch. The local repairs are not part of build 84 or an already-submitted review.
3. Review the remaining dependency advisories before release. After compatible fixes, npm reports **25 affected package entries: 4 high and 21 moderate, zero critical**. The four high entries are the `image-size`/Metro build-tool chain. Moderate entries include `decode-uri-component@0.2.2` through `query-string@7.1.3` in navigation: malformed URL input can cause excessive CPU use ([maintainer advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)). npm has no compatible automatic fix for that navigation chain. The patched decoder is an ES module and must not be forced into the current CommonJS dependency without compatibility work. Other moderate entries include build-tool `uuid`. No major framework downgrades, forced upgrades, or custom navigation patches were applied. Exploitability in this app was not established.

Apple also requires a working review account and device stability checks: [App Review guidance](https://developer.apple.com/app-store/review/guidelines/#app-completeness).
