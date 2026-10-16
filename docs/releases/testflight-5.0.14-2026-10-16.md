# TestFlight 5.0.14 — 16 October 2026

Requested: push current reviewed app update, build and upload for TestFlight testing.

Release branch: codex/testflight-5.0.14-20261016. Base05f5cb249eea5b28e990d8e3f56afcb0f5c6fa26. Contains the live-reviewed Home data/preview handoff fix, SDK token-cache performance improvement, startup resource timing, and Settings version footer. Native Clerk pilot API/origin/key, secure storage, bundle ID and app-version runtime remain the tested configuration. Clerk pilot distribution is store; EAS remote numbering assigns the next iOS build. Separate default-off SQL/local emulator changes in the live working tree are not part of this native release. The production mobile behavior of those disabled paths is unchanged; fresh checks run against this exact snapshot.

Server pilot already deployed separately to dpl_ECho15d8rtqGnFcK4faMtg9Gw1s4 in fra1. Recent uncached native exchange1.6–1.9s, Home data fresh8.4–9.0s; sampled final native recording had no blank body frames (403samples20fps). Tests and signed binary acceptance are recorded below after running against this release snapshot.

This request authorizes Git push, signed iOS build and TestFlight upload. App Store review/public release is a separate step.

Pre-upload validation:919tests passed,1emulator-only skipped,0failed. TypeScript, changed-code lint and whitespace check pass. Independent reviewer found no material release blocker. Full iOS Hermes bundle12MB includes Bickers router/Home and exact pilot API/bridge/startup markers; SHA256 c6ec7961f62c48ac531417bedb740af189b9548f7d64e9362e355b4ccc05e4e7. Cloud compile, Apple upload and processing remain separate.

## Delivery status — observed 2026-10-16T15:19:12.583634+00:00

Source commit712d048cb7f7208fb05f919f594361b92d74c39e is pushed to codex/testflight-5.0.14-20261016 on masonbickers/Bickers-App. App5.0.14(96), runtime5.0.14, store distribution, Clerk pilot channel. No main merge or App Store review/public release was performed.

- EAS build7cfbbec6-4177-43f6-bd3d-a3a81a7e3955:FINISHED at2026-10-16T15:15:19.560Z. https://expo.dev/accounts/masonbickers/projects/bickers-app/builds/7cfbbec6-4177-43f6-bd3d-a3a81a7e3955
- EAS submission49d19794-061d-46f9-9a68-2b129b2ec611:FINISHED, linked to that exact build. https://expo.dev/accounts/masonbickers/projects/bickers-app/submissions/49d19794-061d-46f9-9a68-2b129b2ec611
- Signed IPA SHA256:cc247c76d9042a4e62d299a36085c3e986160e2774d0e3b282d3338bca8b58a3. codesign --verify --deep --strict passed. Packaged bundle7623084bytes includes exact pilot bridge/API/Home startup markers. Info.plist confirms com.bickers.booking,5.0.14(96); Expo.plist confirms enabled updates,runtime5.0.14,clerk-pilot.
- Initial automatic-submit scheduling with What-to-Test failed because changelog requires an Enterprise Expo plan. Retried the same build ID without that field; submission succeeded. No duplicate binary was built. Expo also reported elevated Apple API500 error rates; that did not prevent this successful upload.
- Apple TestFlight state at readback:{"appVersion": "5.0.14", "buildNumber": "96", "processingState": "VALID", "internalState": "IN_BETA_TESTING", "externalState": "READY_FOR_BETA_SUBMISSION", "uploadedDate": "2026-10-16T08:16:43-07:00", "expired": false, "easSubmissionId": "49d19794-061d-46f9-9a68-2b129b2ec611", "easBuildId": "7cfbbec6-4177-43f6-bd3d-a3a81a7e3955", "runtimeVersion": "5.0.14", "fingerprintHash": "324186226f6beca03e028b4d946e996c131cd876"}

Physical iPhone acceptance is for the requested TestFlight testing. Earlier Device Hub evidence is simulator/Metro evidence and does not replace signed-device acceptance.

Local canonical Project Control is updated with this delivery receipt. Hosted publication remains pending a separately reviewed current-live main-site snapshot; older pilot sources must not replace unrelated live main changes. No broader production-readiness gate credit.
