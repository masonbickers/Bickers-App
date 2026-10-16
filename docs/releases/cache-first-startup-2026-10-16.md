# Cache-first startup implementation — 16 October 2026

Source implementation commit: `77e1c4a7` on `codex/cache-first-startup`, based on the shared Clerk pilot `76f76b6c`. Includes its existing provider startup fix; unrelated Me changes remain in the original pilot checkout.

Returning shared-Clerk users can see a bounded read-only Home/Schedule/job snapshot while current verification runs. Eligibility lasts at most 24 hours after full verification. Exact Clerk session, UID, company and employee identities gate reuse. Logout/rejection invalidates the display immediately and persists a tombstone before sign-out. Network failure keeps only an eligible display view. Protected actions, sync and Working Terms enforcement continue to depend on current authentication.

Preferences, access resolution and Working Terms overlap after Firebase authentication. The required Clerk token → bridge → Firebase chain remains ordered. Foreground/reconnect refreshes coalesce for 250 ms; existing request deduplication and per-resource caching remain in place.

Local pilot/development `[startup]` diagnostics contain only fixed phases/outcomes and elapsed/duration milliseconds. `first-saved-layout` and `first-fresh-layout` are native layout callbacks, not proof of screen paint. Cold starts and foreground returns have separate timing cycles. No remote analytics is added.

Validation:
- Full suite: **873 passed, 1 skipped, 0 failed** (874 total). The skipped existing test requires the Firebase Auth emulator. TypeScript `--noEmit` passes. The bundled Node 24.19 runtime ran the suite with `--experimental-vm-modules`; the package script's unsupported Node flag was not changed.
- Scoped lint: no new diagnostics. Existing Home/Schedule debt remains 86 errors and 2 warnings; Service Settings retains its baseline 15 errors and 19 warnings. Baseline/current rule, message and severity counts are identical. Profile, Working Terms and all other changed production files pass scoped lint.
- Actual StartupPreview/shared primitives rendered with synthetic data in RN Web at phone width, light/dark. Date and saved-details controls work; no horizontal overflow observed.
- Final source compiles through offline Expo iOS export to a 12 MB Hermes bundle. This is a JavaScript compilation check, not a signed or installable app. Local evidence and that bundle are retained in ignored `dist/cache-first-startup-77e1c4a7/`.

Pending acceptance: a signed native build containing these commits, iPhone/Android rendering and Dynamic Type, and repeated ordinary/offline/slow-network cold-start/resume measurements. The approximately one-second saved-content goal is not yet measured. The currently installed owner build must not be described as containing this change. No production deployment, auth configuration, account migration or rule change was performed.

Independent review: one fresh reviewer examined the whole branch, ran 81 focused tests, and reported three Important issues (no Critical or Minor findings). All three were accepted and corrected in one pass:

1. Logout now calls the centralized sign-out operation before preference deletion in Home, Profile, Service Settings and unsigned Working Terms. Actual-handler tests simulate suspended preference deletion and relaunch; failed durable sign-out cannot report success.
2. The canonical access boundary normalizes definite Firebase credential/access rejection to `MOBILE_ACCESS_DENIED`; genuine network failures remain unavailable. Tests combine the real access resolver with the actual AuthProvider, cover each Firebase failure code and verify a late old-account rejection cannot invalidate the successor. The distinction follows the [Firebase JS Firestore error definitions](https://github.com/firebase/firebase-js-sdk/blob/main/packages/firestore/src/util/error.ts) and [Firebase authentication rejection guidance](https://firebase.google.com/docs/reference/android/com/google/firebase/auth/FirebaseAuthInvalidUserException).
3. A failed preference read is collected separately, so a later access denial still reaches AuthProvider even if Working Terms remain pending. Failed preferences cannot publish partial verified state.

The new review regressions produced 19 expected failures before fixes. After correction, 87 focused checks passed, followed by the green full suite above. The existing Working Terms close test now requires the corrected sign-out-before-cleanup order. The reviewer was not asked for a second pass; fixes are supported by these regression results. No deferred minor findings.

Implementation decisions, in order:

- Snapshot activation accepts an additional `isCurrent` callback because storage awaits can outlive the initiating session. If overly strict, it can omit an eligible preview; it cannot grant more access.
- Snapshot capture derives current identity and verification time centrally from providers/store instead of duplicating inputs on each screen. If this rejects too much, snapshot capture is skipped while ordinary verified access continues.
- Signed-device acceptance stays pending rather than distributing an unmeasured build. Cost: release waits for signed-device testing.
- The review's native paint, one-second target, Dynamic Type and device lifecycle questions also remain pending; browser layout and bundle compilation cannot settle them. Cost: native experience remains unproven until those checks run.
- Production configuration, rules and migration readiness remain outside this source change. Cost: deployment-specific blockers can remain undiscovered until release validation.
- Unrelated Me edits and existing styling debt remain unchanged. Cost: those visual inconsistencies remain for a separate correction.

Source handoff: integrate this branch into the shared Clerk pilot only after the owner's integration choice, retain the existing approved pilot environment/signing configuration, and build from the integrated commit. Do not copy private migration evidence or credentials into this worktree. Test the exact signed artifact on device for five cold starts and five resumes, plus offline and slow-network runs, measuring saved content separately from fresh content. Include logout/relaunch, revoked access, account switching, expired cache and enlarged text. Current owner build 95 does not contain this source.
