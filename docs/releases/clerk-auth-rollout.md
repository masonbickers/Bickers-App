# Shared Clerk authentication rollout

Status: implementation staged in isolated branches; production migration and client cutover have not run. Owner approved the design and inline implementation. This document records release gates, not a completed rollout.

## Current evidence

- Production Clerk instance: `ins_3Kgwuos5Z3ZMV8djLa2oa7xoZPF`, application `app_3GUkXJpZP4zz4sa0hNeuuJEHau5`.
- Production enrollment is now **Invite-only**, saved and verified in the dashboard. Native API is enabled. iOS/Android registrations and native redirect allowlist are currently empty.
- Clerk frontend/account-portal certificates are issued; all five existing Clerk CNAMEs are verified. `https://auth.bickers.co.uk/reset-password` loads the existing Firebase handler over HTTPS without a security warning.
- Hash-free reconciliation refreshed 14 October: 557 Firebase identities, 26 canonical profiles, 23 employees, eight development Clerk users. Eleven eligible, four disabled, 542 unresolved/conflicting (532 lack an unambiguous canonical link, ten canonical-email conflicts). No email-based linking or bulk import is allowed. Production was observed empty in the live Users UI; re-read it immediately before apply.
- Main Firestore ruleset remains `3ade6e04-e5c8-4994-8037-267c9221d7dc`. Main Storage changed during implementation to `ca69557c-d772-4a28-9f11-7e72e6d87936`; its existing-photo overwrite guard has been carried into the Clerk candidate. Backup Storage is outside this rollout. Exact sources/hashes are in `clerk-auth-baseline.json`; re-read them immediately before deployment.
- Website alias `booking.bickers.co.uk` resolves to ready production deployment `dpl_DzZ213vSNLYq3QcjxALSXSwnxcWN`, project `prj_WXLRcafflkIc2180LfwdUZ4l1uLV` (`bickers-software`), owner `team_Rcws5s2yZWIDGvCCAmsuvjml`. Source was a CLI deployment; no Git SHA was returned. Do not infer source provenance from the local branch.
- Render service `srv-d9qdrm7qj5pc7388j1i0` is pinned to manual deployment `dep-db1qo1gu01pc73fltla0`, commit `d60c01815de5f8f3d9adc0c9c0f7aff799ad8dab` in `masonbickers/Bickers-App`. This checkout's origin is `masonbickers/bickers-appv2`, and that live commit is not present locally. Reconcile the source target before deploying; keep auto-deploy disabled. The service is currently on Render Free and may cold-start slowly; no plan upgrade was made.
- Latest completed EAS builds observed: Android 5.0.12/21 (`d364ccc6-08b1-40fb-ac73-0b8ac8236bdd`), iOS 5.0.12/90 (`0964151d-4a4d-4c81-8e0f-bcfdf100614a`). Build completion does not prove App Store/Play rollout or installed-device versions.
- Source reserves **5.0.14**, runtime policy `appVersion`, and a separate internal `clerk-pilot` channel. Production sign-in remains flag-off in the ordinary build profile. No cloud build or OTA was submitted.
- Clerk Pro is $25/month before tax. Its upgrade checkout displayed $30 including tax. Other running costs and usage are not re-estimated by this release.

## Implemented protections

Browser/native requests use the official Clerk verifier, active provider session, explicit canonical UID and verified work email. Workspace/mobile approval is checked separately. A mobile-only account does not receive office access. Firebase custom sessions use the same UID and a server-owned lease lasting at most five minutes, renewed only after current provider and canonical checks. Signed lifecycle events invalidate the lease; global cutoffs still apply.

An explicit `users/{uid}.authMigrationState = 'clerk-only'` denies old Firebase passwords in mobile/API policy and Firestore/Storage. Website API checks also include migration state in their reread fingerprint. Retired accounts cannot receive Firebase temporary passwords or new Firebase setup invitations from the admin routes. A forced reset for a retired account uses the Clerk recovery boundary and revokes both providers without changing/emailing a Firebase password.

Public Firebase credential APIs are separate from Bickers data authorization. These policies do not claim to erase the old provider credential or prevent an old installed binary from making a public Firebase reset request. Its result must not grant Bickers API/data access. Test this on the installed old build before retirement. During transition, Firebase and Clerk passwords remain distinct.

The new branded handler uses Clerk email codes, provider-confirmed reset, configured MFA and server recovery confirmation. It does not show success after merely submitting a password. Interrupted confirmation can retry without replaying the password. It does not grant workspace access. `/legacy-reset-password` retains old Firebase links and explicitly labels the separate earlier-app password. Existing Firebase action URLs remain unchanged.

## Legacy-path inventory

| Path | Transition / retirement handling |
| --- | --- |
| Mobile login and recovery | Clerk when the build flag is enabled; legacy Firebase remains for older builds. Server/rules retirement is authoritative. |
| Common account settings | Clerk recovery when enabled; old Firebase change/reset is guarded behind legacy mode. Service settings render this same screen; their retained old handlers are unreachable. |
| SecureAccount / TemporaryPasswordSetup | Existing legacy onboarding retained; retired identities cannot obtain protected access or another temporary password. |
| Website app-password setup | Server rejects `clerk-only` profiles before credential mutation. |
| Admin employee approve/resend/temporary password | Retired profiles return a Clerk-recovery instruction instead of issuing Firebase credentials/email. Email invalidation still removes mobile access. |
| Admin forced reset | Clerk-only branch leaves Firebase password/email unchanged, sets provider recovery proof, revokes sessions. |
| Firebase public SDK / previously issued OOB links | Can still operate on a separate old credential. Explicit legacy messaging; no Bickers access after retirement. |
| Emulator-only receipt/prep fixtures | Synthetic credentials in existing non-production harnesses; not production enrollment. |

## Remaining release gates

1. Identify the owner-authorized pilot account and email destination, and verify its explicit UID/credential/factor classification in a fresh private manifest. Keep password hashes outside Git in owner-only temporary files, export only the reviewed eligible entries at import time, and delete them after verification.
2. Establish a production pilot deployment topology that does not switch every existing website user prematurely. The current website uses one development Clerk instance; changing its keys or replacing a pilot's stored aliases affects that user's existing website login. A production-domain pilot needs explicit trusted origins and matching bridge/recovery/API configuration. Do not place production credentials in Vercel preview environments or assume a feature flag alone isolates a production pilot.
3. Independently review the whole implementation before live import/deployment. Both original repositories contain substantial pre-existing changes; deploy a reviewed source revision and preserve the exact release rollback target. Do not push isolation snapshot commits wholesale as an authentication-only change.
4. Complete native registrations using the real Apple App ID prefix and Android signing SHA-256 fingerprints. Verify the SDK's canonical callbacks (`com.bickers.booking://callback`, `clerk://com.bickers.bickersapp.hosted-callback`) and the generated native intent filters. New registrations/redirect access require the action-time browser confirmation policy where applicable.
5. Verify required email verification, production social-provider state, authorized parties, session settings and signed webhook delivery. Disable any inherited development-only social option in the portal unless production credentials are configured. New branded login itself offers no social sign-in or enrollment.
6. Deploy the reviewed compatible bridge, recovery endpoint and lifecycle handler with pinned production server credentials in their actual secret destinations. Coordinate Render's central session-check target and current website authentication. Re-read deployed Firebase rules immediately before applying the rebased candidates; existing development website sessions need a compatible lease path before rules require it globally.
7. Produce signed 5.0.14 iOS/Android pilot builds and test them on physical devices. Verify mobile/web same-account sign-in, existing records, mobile-only office denial, reset email/code/MFA, owner-entered new password, fresh sign-in after reset, refresh, both-provider sign-out, revocation, disabled account and account-switch/outbox behavior. No new password is entered by the agent.
8. Verify the existing remote minimum-version screen on an actual old installed app, then enforce the supported Clerk build before broad `clerk-only` retirement. Keep public onboarding/legacy delivery explicitly classified; do not migrate disabled, ambiguous or temporary-credential accounts as permanent credentials.
9. Apply reviewed eligible batches resumably. Stop on identity conflict or failed proof; never repair by email. Publish and independently verify current-live Project Control evidence (PC-062); do not self-close PC-073 from email setup work.

## Recovery and email wording

Publish the new page only with its working server confirmation endpoint and the tested pilot. Clerk's reset email must retain its provider code variable and describe **code entry**, with a fixed link to `https://auth.bickers.co.uk/reset-password`. Suggested copy: “Use this code in the browser where you requested a Bickers password reset. If you did not request it, ignore this email. Never share your code.” The static page link is not recovery proof. Preserve provider-required variables/expiry text when applying the template; inspect its preview before saving and test delivery only to the named pilot mailbox.

## Rollback limits

Retain old release IDs/configuration and the private field-scoped import journal. Before any production sign-in, guarded inverse changes can restore only links that still exactly match this run's writes. After production credentials are used, do not blindly restore old provider IDs, passwords or user documents. Never clear global cutoffs/recovery markers, overwrite new production links or re-enable a retired old credential as a shortcut. Stop expansion and reconcile the individual account under its canonical UID.

No staff announcement is authorized by this rollout document.
