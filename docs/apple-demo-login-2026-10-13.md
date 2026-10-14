# Apple reviewer demo login — 13 October 2026

- App Store Connect version 5.0.12/build 90 remains Waiting for Review.
- Replaced the personal reviewer username with `demo@bickers.co.uk` and a dedicated generated password. Save completed; a page reload and visible screenshot confirmed the replacement persisted. The password is stored in App Store Connect and omitted from this document.
- Reused the existing Demo employee and Firebase identity. Password sign-in and the production `/auth/sync-employee-auth` endpoint both returned success. Mobile access is active with employee workspace access; no administrator or service access was added.
- Firebase email verification was false. After explicit user authorization, set it to true and confirmed it through the Admin SDK.
- Device Hub's Bickers App Store iPhone simulator signed in as Demo and reached Home. The Spec Sheets library was subsequently visible. This tests the local development build, not the exact submitted IPA or a physical-device installation.
- No Working Terms were signed or acceptance records created by this task. No production jobs, timesheets, expenses, or other business records were created.
- Local `.env.local` public API URL changed from `http://localhost:3002` to `https://bickers-mobile-api.onrender.com` so the simulator could use the production backend. Metro remains running on port 8081 to support the open app. The temporary local API process was stopped.
- Physical iPhone M could not prepare for development: Device Hub requested unlocking and reported that its developer disk image could not be mounted.
