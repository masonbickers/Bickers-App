# Shared Clerk authentication for Bickers

Date: 14 October 2026
Status: Owner approved the written design on 14 October 2026. Production and approved DNS preparation are complete; application implementation and live cutover have not started.

## Outcome and agreed scope

Use one Clerk production instance for staff sign-in to the mobile app and booking website. Keep Firebase as the data, storage and canonical user-ID system. Preserve employee approval, workspace permissions, company IDs, records and ownership. Use Bickers branding and account recovery at `auth.bickers.co.uk/reset-password`. Keep development separate for testing. The user has requested a Pro upgrade; monthly billing is preferred to an annual commitment. Passkeys are optional and do not block this migration.

Success means an approved employee can use the same account on both clients, reset its password through the branded page, and retain existing records and access. Revoked, disabled, unapproved or incorrectly linked identities must remain blocked. A user who has mobile access but no office access must not gain office access through a shared credential.

## Current evidence

- Mobile login uses Firebase email/password, followed by `/auth/sync-employee-auth` on the Render API.
- `providers/AuthProvider.tsx` routes all non-password Firebase providers into a legacy password transition. This currently blocks Clerk custom sessions.
- The booking website uses Clerk and already has `/api/auth/firebase-token`, which requires a verified work email, explicit canonical UID linking, approval checks and session security before issuing a Firebase custom token.
- That endpoint obtains its identity through Clerk's request authentication and `currentUser()`. Native bearer-token support must be verified and covered explicitly before reuse; its current browser flow alone is insufficient evidence of native compatibility.
- Firebase rules and `server/appPasswordSetup.js` already recognize a constrained Clerk custom-session identity. Other server paths, including working terms and workshop submissions, still contain password-provider restrictions.
- The user created the Bickers Booking System production instance `ins_3Kgwuos5Z3ZMV8djLa2oa7xoZPF`, with application URL `https://booking.bickers.co.uk` and primary authentication domain `bickers.co.uk`. Development remains separate with eight staff accounts; those accounts do not automatically carry over.
- Firebase recovery hosting is published on the default Firebase host. The `auth.bickers.co.uk` domain has existing A/TXT email and hosting records and has not yet been confirmed ready for custom HTTPS. Firebase email action links have not been switched to it.
- The user completed the Pro checkout. The live billing page confirms Pro Monthly, $25/month before tax, for 14 October–14 November 2026, with no paid add-ons enabled. Checkout displayed $5 tax and a $30 total.

## Chosen approach and alternatives

Use Clerk for credentials and session lifecycle, with a server-verified bridge to Firebase under each person's existing UID. This reuses the website's existing integration and keeps data permissions in their established system.

Moving the website to Firebase would retain the current mobile credential system but undo the user's selected Clerk direction. Keeping separate providers would require duplicate recovery and account management and would not deliver shared credentials. Replacing Firebase record IDs with Clerk IDs would create an unnecessary data and permissions migration and is excluded.

## Production and domains

Production has been created within the existing Bickers Booking System application. Retain Development for testing. Production configuration must be reviewed independently: sign-in methods, verified email policy, invite-only enrollment, session settings, redirects, webhooks, native app registration and authorized parties.

Production is associated with `https://booking.bickers.co.uk`; use `auth.bickers.co.uk` for the branded recovery experience. Following the user's explicit DNS approval, the five Clerk-generated CNAME records below were saved in LCN on 14 October. Existing nonempty record values were compared before saving and all existing A/CNAME/TXT record pairs were found in the saved form. Clerk subsequently confirmed Frontend API Verified, Account portal Verified and Email 3/3 Verified. SSL certificates are issuing; readiness must be confirmed separately. This does not establish successful email delivery or application cutover.

| Name under bickers.co.uk | CNAME target |
| --- | --- |
| clerk | frontend-api.clerk.services |
| accounts | accounts.clerk.services |
| clkmail | mail.b1c2brn3m6v2.clerk.services |
| clk._domainkey | dkim1.b1c2brn3m6v2.clerk.services |
| clk2._domainkey | dkim2.b1c2brn3m6v2.clerk.services |

Preserve the existing `auth` A/TXT records. Host the custom recovery route through the existing web application infrastructure, with Clerk handling its credential changes. Its hosting and routing changes remain part of the implementation plan.

Use production publishable keys in release clients and production secret keys only on servers. Development and preview builds retain development keys. Do not log keys, password digests, reset codes or session tokens.

## Identity reconciliation and credential migration

Before writing live accounts, produce a restricted reconciliation report covering Firebase auth users, canonical `users/{uid}` profiles, approved employees and development Clerk accounts. The report must classify unique matches, missing records, disabled accounts and conflicting identifiers. Email is a reconciliation hint, never sufficient authority for an automatic live link.

Maintain a mapping from old development Clerk ID to canonical Firebase UID to new production Clerk ID. Preserve each canonical Firebase UID as Clerk's `externalId` and server-controlled metadata. Update stored Clerk links consistently in top-level and nested auth fields, including all discovered references. Quarantine ambiguous or conflicting mappings for explicit resolution; never select the first matching email or overwrite a conflicting ID.

For eligible Firebase password users, use Clerk's supported `scrypt_firebase` import so existing passwords can continue where hashes and parameters are available. Export credential material only when ready to import, keep it outside the repository with restricted permissions, and remove temporary copies after verification. Do not mark an unverified email verified solely because it appears in an export, import temporary credentials as permanent credentials, or clear a required recovery flag during migration. Users with unusable credentials must follow Clerk's verified recovery/onboarding process.

Development Clerk passwords are not assumed exportable. Existing website users with different development-only passwords may need production recovery; do not promise that both historic passwords can be preserved. Reconcile this group before announcing the transition. No bulk password reset or staff notification is sent without a separately authorized communication step.

## Mobile and server session flow

1. The branded mobile login uses Clerk's supported Expo SDK and secure token storage. Handle loading, MFA challenges when configured, recovery and cancellation explicitly. Public enrollment remains disabled.
2. The client obtains a Clerk session token and sends it over HTTPS to a server bridge. The server verifies issuer, signature, expiry, intended audience/authorized party as applicable, active Clerk session and production instance. Client-supplied email, UID, roles or approval flags are never trusted.
3. Resolve the explicit server-controlled canonical UID link. Enforce current employee approval, email identity, company and workspace rights, plus existing recovery/revocation requirements. Reject conflicting links and disabled users.
4. Issue a Firebase custom token for that UID with the existing versioned identity claims, including Clerk user/session IDs and employee/company IDs. Reuse the website bridge's security logic rather than introduce a less restrictive second resolver.
5. The mobile client establishes its Firebase session, performs the existing employee sync and only then opens protected screens. Change the provider gate to recognize the fully verified Clerk identity while preserving legacy password handling during rollout.
6. Firebase custom-session refresh must not extend access beyond an expired or revoked Clerk session. Reconcile on foreground, token changes and authenticated API use; enforce current Clerk session and global recovery checks server-side. Sign out and identity changes clear both providers and all account-specific cached session state.

Consolidate provider trust checks only where needed to keep the client, server and Firebase rules consistent. Preserve checks for token/profile UID, company, employee, version, verified email and conflicting stored Clerk IDs. Never broadly allow every Firebase `custom` provider or treat client-stored session metadata as authority.

## Recovery, account settings and optional passkeys

The new branded reset page uses Clerk's supported password recovery flow, matching the mobile app design. It handles invalid/expired challenges, retries, completion and return to app or website. Recovery must meet current session revocation and recovery-proof rules. Use generic request responses that do not disclose account existence, prevent duplicate submissions and avoid open redirects.

Update mobile password change/recovery settings to the same Clerk authority. Retain the already-published Firebase handler for legacy links during transition; previously issued Firebase reset links cannot reset the new Clerk credential. After cutover, label and route any legacy recovery path clearly and stop issuing new Firebase recovery emails for migrated accounts.

Passkey enrollment can be added after verified sign-in or completed recovery, rather than from possession of an unvalidated reset URL. Sharing passkeys across web and native requires separately verified domain/app associations, physical device checks and production configuration. Defer it until the shared password and recovery flows pass.

## Rollout and rollback

Prepare production infrastructure without changing the live website keys or existing app login. Test integration using synthetic accounts with separate development credentials and data first. Reconcile production identities and migrate a controlled pilot before broad rollout. Verify a pilot on the website and signed mobile builds before deploying shared authentication to all staff.

Inventory the minimum supported mobile build and installed older versions before credential cutover. Legacy Firebase password clients may coexist only for the explicit transition period while existing approval and revocation gates remain enforced. Do not represent their passwords as synchronized with Clerk. Before ending the transition, require the supported Clerk-enabled build and make recovery/change-password paths use Clerk consistently.

Record the exact configuration, account mappings, active clients and recovery flags before live changes. Roll back client deployment through the supported feature/config path if needed; do not blindly restore old Clerk IDs after production sign-ins, clear revocation markers, restore outdated passwords or erase newly established production credentials. Resolve mapping conflicts before access is resumed.

## Verification and release conditions

Automated checks must cover native bearer verification, wrong issuer/instance, expired or revoked sessions, missing/unverified work email, ambiguous links, conflicting nested IDs, disabled/unapproved staff, incorrect company/employee ownership, stale recovery proof and fresh sign-in after revocation. Test working terms, workshop submissions, data/storage access and offline account switching under both supported transition providers.

Verify actual rendered login and recovery states, successful reset with a controlled account, cancellation/retry, both-provider sign-out and website/mobile sign-in against the same production account. Device verification includes signed iOS and Android builds; simulator or source checks alone do not establish release readiness. Passkeys are excluded from the initial release gate.

The website's Project Control records require separate implementation and independent verification evidence, plus a reviewed live publication after relevant changes. Its checkout is outside this task's writable roots, so authorized write access must be established before implementation there. Keep unrelated work in both repositories intact.

Live cutover is blocked until domain HTTPS, production configuration, identity reconciliation, session security checks, controlled recovery and device tests are verified. Any blocked condition is reported specifically; a successful build or paid-plan upgrade alone is not evidence that authentication is migrated.

## Sources

- [Clerk production deployment](https://clerk.com/docs/guides/development/deployment/production)
- [Clerk environments](https://clerk.com/docs/guides/development/managing-environments)
- [Firebase to Clerk migration](https://clerk.com/docs/guides/development/migrating/firebase)
- [Clerk Expo SDK](https://clerk.com/docs/reference/expo/overview)
