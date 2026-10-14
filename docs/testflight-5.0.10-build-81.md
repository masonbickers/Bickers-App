# TestFlight 5.0.10 (81) — uploaded 7 September 2026

Signed iOS build and EAS submission both reported FINISHED with no error at
2026-09-07T14:08:00Z. Apple may still need to process the build; tester-group
availability was not independently checked. No public App Store release or OTA.

- Source branch: codex/testflight-5.0.10-20260907
- Source commit: 9b5eff4c571960832aac4f250ab1248816f765d9
- Isolated source: /private/tmp/bickers-testflight-5.0.10-20260907
- Build: https://expo.dev/accounts/masonbickers/projects/bickers-app/builds/dc08525c-1b39-4ac7-8ce3-5cdff85618f3
- Submission: https://expo.dev/accounts/masonbickers/projects/bickers-app/submissions/4f0de602-bf45-40d4-a831-e97a9d3d8a35
- App Store Connect app: 6754837128
- Channel: testflight (production API/environment, isolated from production OTA)
- Checks: 278 unit tests passed; TypeScript, focused lint and Expo Doctor 20/20
  passed. Dedicated Auth emulator test was passed separately in implementation.

Start device testing with an approved existing email/password account. New
password transition and historical-signature lookup backend additions are NOT
deployed by the iOS upload. Controlled enrolment, migration, security rules and
minimum-version cutover remain outstanding; production employees were not changed.

GitHub source push was blocked by the approval system and was not retried.
The release source commit is saved locally. Explicit approval is needed before
pushing it to github.com/masonbickers/bickers-appv2.
