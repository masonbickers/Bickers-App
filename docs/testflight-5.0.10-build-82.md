# TestFlight 5.0.10 (82)

Release status checked 7 September 2026.

## Build and upload

- EAS build: `37aa8a4c-3d3b-412a-8b19-c8c7cfec58d3`, FINISHED.
- Apple submission: `1b4cd0df-c445-49e3-b19d-268aa29e69ec`, FINISHED, no submission error.
- Apple processing and tester availability remain unverified.
- Source commit: `42ced79a` in `/private/tmp/bickers-testflight-5.0.10-latest-20260907`.
- Production API: `https://bickers-mobile-api.onrender.com`.
- Includes sign-in completion handling, in-app login feedback and Work Diary route guards. It excludes concurrent, unrelated workspace navigation changes.

## Validation

- Release TypeScript and lint checks passed.
- Release tests: 286 passed, one emulator-dependent test skipped in the general run.
- The dedicated password-transition Auth emulator test then passed separately.
- Backend candidate repository tests: 77 passed.
- Production invitation delivery, password setup and sustained sign-in still require end-to-end verification with an approved account.

## Production dependency

Backend PR: https://github.com/masonbickers/bickers-appv2/pull/1

The candidate adds compatibility for the new client's Bearer-token sign-in and guarded recovery endpoints while preserving the older login path. The user explicitly authorised deployment and PR #1 was merged on 7 September 2026 at 19:12 UTC as `d8d92f60737203759d56846890e734c25df45f89`. A subsequent production GET to `/auth/password-transition` still returned 404, so deployment is not yet verified. Render inspection and Apple actions are blocked by the Chrome extension popup. Build upload and the Git merge alone do not resolve this dependency.

## Apple configuration

The user selected unlisted App Store distribution with administrator-approved sign-in. The App Store draft was saved as 5.0.10 with description, keywords, review notes and manual release. No App Review submission or unlisted distribution request has been made.

The user supplied `mason@bickers.co.uk` for the reviewer email. Saving this replacement for the old `mbickers` username remains unverified because a Chrome extension popup blocked automation. Reviewer password, contact details, screenshots and remaining App Store metadata must be completed and checked before submission.

## Real iPhone acceptance checks

After the backend is deployed and Apple makes build 82 available, install it from TestFlight and verify:

1. An administrator-approved invitation delivers a working password-setup link; the resulting work-email login succeeds.
2. Login stays active through backgrounding, reopening and refresh. A wrong password gives the in-app credential message.
3. An ordinary approved user can submit a maintenance report and save a vehicle check without Service access.
4. A user outside the Work Diary allowlist cannot open either Diary route directly. An allowed user can use both routes.
5. An unapproved account cannot access the app. Sign-out returns to login.

Record device, iOS version, build number and each result before declaring release readiness.
