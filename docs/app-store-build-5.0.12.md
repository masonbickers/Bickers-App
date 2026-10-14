# Bickers 5.0.12 release report — 13 September 2026

## Current result

The identified code and metadata repairs are complete. Version **5.0.12 (87)** built successfully, was uploaded to Apple, completed processing and was **submitted to App Review on 13 September 2026 at 14:54 WEST (13:54 UTC)**. Apple confirmed “1 Item Submitted”; the submission detail shows **Waiting for Review** and explicitly identifies **5.0.12 (87)**.

The user authorized replacement with “YES.” The prior 5.0.11 (84) submission was withdrawn and Apple showed it as Removed. The editable version was changed to 5.0.12, build 87 was selected and saved, and the final Submit for Review action succeeded. Manual release remains selected. App Review notes now accurately state that Unlisted distribution is configured.

- New submission ID: `ed093135-6b97-492e-a0d9-53d060f12a80`.
- [Confirmed Apple submission](https://appstoreconnect.apple.com/apps/6754837128/distribution/reviewsubmissions/details/ed093135-6b97-492e-a0d9-53d060f12a80).
- Current status: **Waiting for Review**; approval and release are pending.

The account holder completed the Digital Services Act declaration on 13 September. Their App Store Connect screenshot confirms all regulatory requirements are complete and DSA status is Active. The Free Apps Agreement is Active. With the user's confirmation that all employees use UK App Store accounts, availability was saved as United Kingdom only. App Store Connect shows 1 available country and 174 not available; automatic availability in future countries was disabled. Unlisted distribution and Waiting for Review remain in place.

## Build evidence

- Final EAS build: `1ab5c403-619c-448b-9818-32f0c6fec2c5`, version 5.0.12, build 87, completed 12 September at 13:50:48 UTC.
- [EAS build](https://expo.dev/accounts/masonbickers/projects/bickers-app/builds/1ab5c403-619c-448b-9818-32f0c6fec2c5).
- Apple upload: `69948e45-d5d8-49ee-a9b6-66b36fbd0de6`, successfully completed 13 September.
- Apple build ID: `826fa770-07ec-4b30-a0a6-62461f42c121`.
- [Apple build](https://appstoreconnect.apple.com/teams/564c5e52-3ccd-46d9-9062-2e5d784cf2da/apps/6754837128/testflight/ios/826fa770-07ec-4b30-a0a6-62461f42c121).
- Signed IPA verified with `codesign --verify --deep --strict`: valid on disk and satisfies its Designated Requirement; signing team `68ZCQ74L9G`.
- Packaged manifest: com.bickers.booking, Xcode 26.6 / iOS 26.5 SDK, runtime 5.0.12, production channel, no microphone usage key, receipt camera/photo descriptions.
- Packaged JavaScript contains the production API and privacy URL, with no localhost:3002 API marker.
- IPA SHA-256: `8239ce014732e6a4b6a2f4a1d5187dd74a23bc7ce2ae347c87589f9d9590ed63`.
- Source was captured in an isolated clean snapshot, commit `4c2592b`; source/config comparison matched the workspace at build time. The temporary snapshot was later cleared by the host; the cloud build and downloaded IPA are preserved.
- Candidate build 86 was cancelled to include the web accessibility fix. This did not withdraw Apple's queued build 84.

## Repairs and validation

Added privacy-policy links to sign-in and Settings, disabled the unused microphone permission, quarantined verified duplicate routes, corrected release packaging/environment configuration, applied compatible Expo/dependency security updates, and guarded an iOS-only accessibility API that crashed the web preview. No backend, Firebase-rule, or OTA deployment was made.

- 289 general tests passed, zero failed; the separately gated Firebase Auth emulator test also passed.
- Lint and TypeScript passed; Expo Doctor 20/20.
- npm audit: zero vulnerabilities. A clean npm ci applied the decoder compatibility patch and passed relevant security regressions.
- Production iOS/web exports and native iOS Simulator Release compilation passed.
- Dependency patch rationale and regression checks: [dependency-security-5.0.12.md](dependency-security-5.0.12.md).

## App checks

The saved App Review account signed in through the production-connected web app and the native iPad app. Web Home, Schedule, Jobs, Contacts, Me/Settings, existing signed Working Terms and receipt-entry controls opened. No terms were signed and no expense or other business record was created during QA.

The native iPhone Release app installed, launched, restored its session, loaded Home, Contacts, Me and Settings, and opened the public privacy policy in Safari. The native iPad Release app signed in, restored that session after a host restart, loaded the live employee Home, listed the technical library, and rendered the Air-Ride Combination Low-Loader PDF in the in-app viewer.

These are Simulator and web checks. Physical-device camera capture, production receipt upload and push delivery have not been acceptance-tested in this run. Mac/Vision Pro compatibility settings were observed but those platforms were not tested.

## App Store metadata and distribution

- Published all five missing privacy types: Other Financial Info, Emails or Text Messages, Photos or Videos, Other User Content, Purchase History. The label now contains 10 types, with additions used for App Functionality, linked to the user and not used for tracking. Apple displayed a fresh publication timestamp and no unfinished-setup warning.
- Corrected Messaging and Chat to Yes, saved, reopened and verified it persisted. Apple calculated global 4+ with regional exceptions including Brazil 12+. Other frequency answers were retained.
- Business category, review contact/sign-in fields, four iPhone screenshots, one iPad screenshot and manual release were present.
- Pricing and Availability explicitly shows **Unlisted App URL**: https://apps.apple.com/us/app/bickers/id6754837128. The separate Unlisted setup is therefore confirmed in the account. This does not establish that the app has been approved or is downloadable yet.
- Previous review submission: `aa28abcb-6b75-407d-aa44-abf192005eac`, originally submitted 7 September 2026 at 22:06 as displayed in Connect. It was withdrawn with user authorization on 13 September and replaced by `ed093135-6b97-492e-a0d9-53d060f12a80` for 5.0.12 (87). Apple did not reject the old version; the intermediate Developer Rejected status resulted from our authorized withdrawal.
- The Free Apps Agreement is Active; the unused Paid Apps Agreement is not signed. The account holder completed the DSA declaration on 13 September; their screenshot shows Active and all regulatory requirements complete. [Apple DSA requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/).
- Availability was restricted to United Kingdom only with user authorization on 13 September. The saved page shows United Kingdom = Available on App Release, all other 174 countries = Not Available. Automatic availability in future countries was disabled. The pricing page still shows the Unlisted App URL and 5.0.12 Waiting for Review. Unlisted distribution limits discovery; approved employee login controls access to company content.

Build completion, Apple upload/processing, App Review submission, approval, manual release and download availability are separate states. The current submission includes the verified build 87. Apple has not yet approved or released it. DSA completion and the UK-only availability change did not require another build or withdrawal of the submitted version.

Evidence, verification logs and the signed IPA are in `output/app-store-readiness-20260912/final-5.0.12/`. Reviewer credentials and private contact details are intentionally omitted.
