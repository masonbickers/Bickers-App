# TestFlight 5.0.14 — 16 October 2026

Requested: push current reviewed app update, build and upload for TestFlight testing.

Release branch: codex/testflight-5.0.14-20261016. Base05f5cb249eea5b28e990d8e3f56afcb0f5c6fa26. Contains the live-reviewed Home data/preview handoff fix, SDK token-cache performance improvement, startup resource timing, and Settings version footer. Native Clerk pilot API/origin/key, secure storage, bundle ID and app-version runtime remain the tested configuration. Clerk pilot distribution is store; EAS remote numbering assigns the next iOS build. Separate default-off SQL/local emulator changes in the live working tree are not part of this native release. The production mobile behavior of those disabled paths is unchanged; fresh checks run against this exact snapshot.

Server pilot already deployed separately to dpl_ECho15d8rtqGnFcK4faMtg9Gw1s4 in fra1. Recent uncached native exchange1.6–1.9s, Home data fresh8.4–9.0s; sampled final native recording had no blank body frames (403samples20fps). Tests and signed binary acceptance are recorded below after running against this release snapshot.

This request authorizes Git push, signed iOS build and TestFlight upload. App Store review/public release is a separate step.

Pre-upload validation:919tests passed,1emulator-only skipped,0failed. TypeScript, changed-code lint and whitespace check pass. Independent reviewer found no material release blocker. Full iOS Hermes bundle12MB includes Bickers router/Home and exact pilot API/bridge/startup markers; SHA256 c6ec7961f62c48ac531417bedb740af189b9548f7d64e9362e355b4ccc05e4e7. Cloud compile, Apple upload and processing remain separate.
