# Staged password transition — local implementation, not deployed

This supersedes blanket revocation/password replacement for eligible existing
employees. It does not remove administrator approval or grant access based on a
four-digit code. The implementation is in the 5.0.10 release working tree; the
Render deployment source is the approved-access-mobile working tree. The dirty
original checkout's older server is not the release backend.

## Employee experience

- Existing valid password sessions continue normally; no forced new password.
- Existing custom-token sessions are retained while the app displays Secure your
  account instead of mounting business routes. An authoritative server enrolment
  is required. No approval is inferred from local storage or a token alone.
- Existing password holders see “Confirm your password” and confirm that
  password. Recognised employees without a password see “Set up your password”
  and an explicit explanation that their existing account needs a password.
  Numbered stages show “Send setup email” first, reveal the link field only
  after the request succeeds, then reveal password fields after a link is pasted.
  Employees request Firebase's built-in password reset/setup email, copy its
  complete link into the app, then choose and confirm their password inside the app. The code
  is verified against the approved email before use. Password/link are never
  stored in AsyncStorage, sent to the Bickers backend or logged by app code.
- If they already opened the link in a browser and set a password, “I have already set my
  password” lets them finish here. No DNS, template or email-provider changes
  were made. Automatic email-link-to-app handoff is NOT implemented in this
  first version; link paste is the supported in-app verification path.
- Email/saved confirmations and actionable errors use accessible banners.
  Resend remains subject to the server's 60-second throttle. The setup deadline
  and alternate sign-in remain available below the main action. This guidance
  applies only to recognised sessions; the normal Sign In screen is unchanged.
- Password sign-in replaces the session automatically without an explicit
  sign-out. Backend sync activates the same employee/UID and keeps existing
  Working Terms acceptances. A consumed link can be retried using the new
  password if networking fails afterward.
- Pending, disabled, expired/revoked or ambiguous identities are denied. A new
  code login minted after the audited prior sign-in cannot enrol itself.

## Server interfaces and security

- GET /auth/password-transition: bearer token, server-owned enrolment lookup,
  revocation check, enabled/approved employee and user, exact UID/email/company
  mapping, duplicate email/UID and linked-user checks. No mutation.
- POST /auth/password-transition/email: same checks, fixed approved recipient,
  persistent 60-second resend throttle. Requires Render FIREBASE_API_KEY for the
  same Firebase project. Sends PASSWORD_RESET, never generates a replacement
  password. Firebase accepted is not proof of inbox delivery.
- POST /auth/password-transition/complete: fresh password-authenticated token
  (within five minutes), secure sync, idempotent completed marker.
- mobilePasswordTransitions/{uid} is server-only. Records contain audited prior
  sign-in cutoff, identity, enrolment time, explicit deadline and completion time.
- Completed/expired custom sessions cannot use transition APIs. Enrolled
  employees cannot mint new employee-code logins or use legacy body-based sync.
- The reviewed WEB Firestore/Storage rules are mandatory at the staged cutover:
  custom mobile tokens cannot read business data even if their Firebase token
  still exists. Trusted web authentication remains supported. Do NOT deploy the
  older mobile checkout's unrelated rules.
- Completion deliberately does not call revokeRefreshTokens(uid), which would
  also revoke Bickers Booking web sessions sharing the UID. Old mobile access is
  retired by the provider checks and enrolment record. Firebase password RESET
  itself can invalidate other sessions on that UID; preserving every device's
  session after a password reset cannot be promised.

## Updated rollout (not executed)

1. Review/test both release worktrees. Configure backend FIREBASE_API_KEY. Deploy
   the transition endpoints while retaining compatibility mode and min 5.0.4.
2. Test controlled existing-password and passwordless accounts on real iPhone
   and Android, including kill/reopen, revoked sessions, wrong/used email links,
   offline/retry, deadline and admin disable. Do not use a real employee as a
   fixture without authorisation. Emulator proof is not inbox/native proof.
3. Submit/hold both 5.0.10 stores as agreed. No migration or hardened-rules
   deployment before both apps are publicly downloadable.
4. Fresh protected backup (now includes enrolments) and dry run from the web
   release. Resolve every conflict, including missing Firebase email. Choose an
   explicit UTC deadline within 30 days; no live deadline was chosen here.
5. At coordinated cutover: require 5.0.10, disable code-login compatibility,
   deploy reviewed hardened web rules, then apply the staged migration using
   --staged-deadline=<approved ISO timestamp>. The deadline is mandatory.
   This short cutover can temporarily show “ask admin” until enrolment completes.
6. Migration preserves eligible Auth credentials and refresh sessions; it sends
   no bulk emails. Users request the email in-app. Pending/disabled accounts
   remain blocked and their old sessions are revoked by the migration. Reruns
   never reopen completed enrolments or extend their deadline. The apply step
   checks the eligible employee/user documents have not changed since audit.
7. Test both native apps, existing signatures and web administrator access.
   Disable the reviewer after both reviews as previously planned.
8. At the deadline, uncompleted custom sessions fail closed on the server; rules
   already exclude them from business data. Approved users can still recover
   with email/password. Do not restore global employee-code login to extend an
   individual employee's deadline.

Before cutover, rollback backend/web and hold stores as before. After enrolment,
do not roll back to a migrator that replaces passwords or blanket-revokes eligible
users. Preserve enrolment records and completed password credentials.

## Verification

- Mobile unit suite, focused TypeScript and ESLint checks.
- Firebase Auth emulator: custom-token/no-password account receives a reset
  action, sets a password and signs in with the SAME UID; no production data.
- Web migration tests; Firestore and Storage emulator suites, including
  server-only enrolment and denied legacy/mobile business reads.
- iOS/Android JS bundle exports. These are not signed store builds or native QA.

Run the dedicated Auth test from the mobile release tree:

```sh
firebase emulators:exec --only auth --project demo-bickers-password-transition --config tests/firebase-auth-emulator.json "node --experimental-default-type=module --test tests/passwordTransition.auth-emulator.test.js"
```
