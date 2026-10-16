# Cache-first mobile startup

Date: 16 October 2026
Status: User approved this design and its cache limits on 16 October 2026. Implementation-plan review remains pending; no release approval claimed.
Implementation target: the shared Clerk pilot, including its existing uncommitted startup fix. The main checkout still contains the older Firebase login flow.

## Requested outcome

Returning users should see saved app content quickly instead of waiting at the splash screen. Independent startup operations should overlap. Current sign-in and access checks should finish in the background, refreshing the content or removing access when necessary. First-time users and users who explicitly signed out must still sign in.

The visible saved view and permission to perform authenticated operations are separate states. Showing a previously downloaded record does not set `isAuthed` or start uploads, mutations, subscriptions or notification registration.

## Findings in the current pilot

- `lib/clerkSessionCoordinator.js` starts with no completed identity. Its first successful bridge exchange clears account caches and replaces Firebase authentication even when the returning account is the same.
- `lib/accountSessionCache.js` removes both stored session fields and persistent application data caches. Drafts and outbox rows are deliberately retained under their original identities.
- `providers/DataCacheProvider.tsx` already supports persistent account/company/employee-scoped data and rendering cached results before a fetch. Scope transitions can clear the previous cache, so preserving it requires coordination with restoration.
- `app/_layout.jsx` hides routed content throughout session restoration. `AuthProvider` waits for live identity/employee verification, local session values and Working Terms before declaring loading complete.
- The local `ClerkFirebaseProvider.jsx` change already removes a forced token refresh and the extra Render employee-sync call. It must be retained. The last recorded pilot build 95 does not include it.
- These observations identify avoidable work and display delays. They are not measurements of the current phone's startup bottleneck.

## Proposed visible behaviour

1. On launch, restore theme, last safe route and a minimal saved display snapshot from local storage while the Clerk SDK restores its session.
2. A returning account with an eligible snapshot sees a read-only saved Home, Schedule or job summary, with its real last-updated time and a small refreshing indicator. No Login flash or full-screen spinner replaces that saved view.
3. Refresh identity, approval, permissions, Working Terms and current content. As each section becomes available, update it without clearing the whole screen.
4. Only the verified state enables normal protected navigation, submissions, background sync and uploads. A cache alone never activates those capabilities.
5. A confirmed signed-out, revoked, disabled or mismatched identity immediately hides the saved view and invalidates that account's display cache. Missing Working Terms acceptance routes to Working Terms. A network timeout alone keeps an eligible saved view read-only and offers retry; it does not declare the account revoked.

Approved initial scope: saved operational Home/Schedule/job summaries. HR details, private documents, admin screens, account/security settings and other unreviewed routes wait for current verification. If the previous route is outside this scope, open the saved Home view instead. Do not replay a mounted protected screen merely by changing an authentication boolean: its effects and handlers may start authenticated work.

## Cached identity and data lifetime

Persist a small, versioned last-verified identity envelope in platform secure storage: Clerk user/session identifiers, canonical Firebase UID, company/employee identifiers, verification timestamp, account generation and snapshot version. It is display metadata, never a substitute for a provider credential or server permission.

Store only the allowlisted fields needed to render the saved view, using account-scoped app-private storage. Do not persist tokens, passwords, signatures, private attachments or signed download URLs in the display snapshot. Do not copy unrestricted existing cache entries into the snapshot.

Approved display eligibility limit: 24 hours since successful full verification. This is an offline display policy, not an extension to the server's five-minute authorization lease. A missing, malformed, future-dated, expired or incompatible snapshot falls back to a neutral skeleton.

On an ordinary relaunch, preserve the matching snapshot and cache. Explicit logout, known revocation, account/company changes and canonical identity conflicts invalidate them before another account can render. Persist a logout/invalidation marker before asynchronous sign-out or deletion, so a crash cannot restore the old preview. Check account generation again before accepting every delayed read, write or network response. Existing drafts/outbox ownership rules remain intact; do not delete user work as part of preview invalidation.

This deliberately permits recently cached operational information to remain visible until an online revocation is discovered, or until the display limit expires. The user approved that tradeoff together with the read-only screen scope and display limit.

## Parallel work and dependency order

- Start local snapshot/preferences restoration, Clerk SDK restoration and the existing compatibility check independently.
- Keep the required chain: Clerk session token, server bridge verification, then Firebase authentication. A dependent step cannot safely start without its predecessor's result.
- Once the authenticated Firebase identity is established, overlap independent local preference reads, current-access resolution and the Working Terms read. Gather outcomes without allowing an early result to enable protected actions. User and employee lookups retain the ordering needed to resolve and validate the canonical employee ID.
- Refresh independent visible data sections concurrently after current access is established. Defer off-screen resources, token registration and queue processing until their existing authorization prerequisites are met.
- Preserve request deduplication, cancellation and generation checks. One startup or foreground transition must not trigger duplicate bridge requests or allow stale responses to replace a newer account.
- Preserve the existing same-identity warm-renewal behaviour. Do not introduce persisted authorization leases or skip live checks in this change.

## Measurement and verification

Record local durations and outcome categories for: process/UI start, snapshot read, first saved-content render, Clerk restoration, bridge, Firebase sign-in, access checks, Working Terms and first fresh content. Record no account identifiers, credentials or business data in timing logs. No remote analytics service is added.

Test delayed operations to prove independent work overlaps and dependent work stays ordered. Cover returning-account preview, first login, explicit logout followed by process death, different-account startup, same-account new session, changed company/employee, malformed/expired cache, failed secure-storage read, offline timeout, confirmed rejection, missing Working Terms, slow stale responses and background/resume cancellation.

Verify that preview cannot invoke protected mutations or release outbox items, and that rejected/old-account data is hidden from both display and accessibility. Reuse the current auth-restoration, coordinator, cache, Working Terms and offline-identity regressions; extend meaningful behaviour tests without weakening existing assertions.

Measure cold launch and background return on the signed owner iPhone build, on ordinary and slow/offline connections. Compare first saved content and first fresh content separately across repeated runs. A design target is saved content within roughly one second on the reference phone; this is a target, not a performance promise. Test first-run and rejection states as well as the fast path.

## Delivery boundaries

This is a coordinated session/cache/UI change and requires a written implementation plan after design approval. Keep the existing local pilot edits intact. Implementation should isolate display restoration from verified identity rather than migrate all consumers to optimistic authentication.

This design does not change Firebase/Storage rules, Clerk configuration, server lease durations, staff accounts or production deployments. Prepare a reviewable owner pilot artifact after tests; device acceptance is required before claiming the startup issue is fixed or expanding rollout.
