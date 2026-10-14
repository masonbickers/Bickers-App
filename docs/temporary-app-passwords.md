# Temporary app passwords — implemented locally, issuance disabled

Bickers-Booking1 owns issuance and completion at `/api/security/app-password-setup`.
Render forwards `/auth/app-password-setup` and `/auth/app-password-setup/complete`
to that service using `APP_PASSWORD_WEB_ORIGIN` (fallback: `RECEIPTS_WEB_ORIGIN`).
Both production origins must use HTTPS. The website provides the public
`/app-password-setup` page with a separate memory-only Firebase Auth instance;
normal Clerk sign-in is unchanged.

`ENABLE_TEMPORARY_APP_PASSWORDS=true` on the web backend enables administrator
issuance. Leave it absent/false until compatible mobile/web releases, both sets
of rules, and controlled end-to-end tests are verified. Turning it off stops
new issuance, but status and completion continue working.

## Deployment order

1. Deploy web status/completion service, protected API gates and reviewed web
   Firestore/Storage rules with issuance disabled. Preserve unrelated existing
   rule changes. The mobile checkout also carries the password gate, but its
   broader rules are not a replacement for the authoritative web rules.
2. Deploy the Render proxy and API restriction; configure the web origin.
3. Release web UI and a compatible mobile client; verify approved test accounts
   on iPhone/Android and browser, with both themes and small-screen keyboards.
4. Enable issuance only after the integration and release checks pass. A new
   binary/OTA publication and rule deployment have not been performed here.

The change is opt-in per account: no bulk migration, password replacement or
email delivery occurs. Admins share the generated 16-character password directly.
It expires after seven days. Regeneration invalidates the previous credential.
Audit records contain identity/issuance metadata and never passwords.

## Recovery and concurrency

All issuance, completion and legacy invitation mutations share a Firestore
per-UID lock. Auth and Firestore are not one atomic transaction. Restrictions
are written first; failures keep the account restricted. A handled Auth or
database failure releases the lock after the awaited operation returns.
After a saved-password error, sign in with the new password and retry completion.

Locks deliberately have no automatic timeout: Firebase password writes cannot
be fenced by a Firestore lease, so stealing a timed-out lock could let an old
worker overwrite a newer password. If a process dies mid-operation, an operator
must confirm the original worker has stopped, inspect the issuance/audit state,
then reconcile the lock with Admin SDK access. Keep the account restricted and
regenerate for uncertain issuance; for uncertain completion, verify the saved
credential before retrying. Never clear the setup-required field manually to
restore access. This exceptional recovery is not a normal admin UI action.

The user record's setup-required flag, issuance ID and session cutoff are
server-only. Firestore denies even client-admin changes to these fields and
deletion of an enrolled user. `mobilePasswordSetups` is unreadable to clients,
including platform admins. Password-authenticated sessions must be newer than
the completion cutoff; trusted canonical Clerk bridge tokens keep web access.

## Verification commands

Mobile session restoration fetches the security profile from the server before
restoring cached employee access. If unavailable, it stays at the retry/sign-in
gate rather than trusting an offline profile.

The web unit suite and isolated Auth/Firestore/Storage emulator tests pass.
The public setup form renders in the local browser. Targeted lint is clean.
The mobile full suite retains two unrelated design-system inventory failures.

Issuance remains disabled. Authenticated browser and Device Hub end-to-end
screen checks, small-screen keyboard and both-theme checks still require an
authorised test employee and integrated test deployment. These checks are not
claimed complete. Do not enable production issuance before completing them.

Mobile: `node --experimental-default-type=module --test tests/appPasswordSetup.test.js tests/passwordTransition.test.js`.

Web: `node --test tests/appPasswordSetup.test.mjs`.

Web Auth/Firestore/Storage emulators:
`node scripts/run-with-jdk21.mjs -- node_modules/.bin/firebase emulators:exec --only auth,firestore,storage --project demo-bickers-password-setup --config firebase.password-setup.json 'node --test --test-concurrency=1 tests/appPasswordSetup.rules.test.mjs tests/appPasswordSetup.auth-emulator.test.mjs'`.

Production inbox delivery, physical-device behaviour and store availability
are separate release checks. No real employee credentials should be used as
test fixtures.
