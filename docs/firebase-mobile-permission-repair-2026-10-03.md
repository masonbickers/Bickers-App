# Firebase mobile permission repair — 3 October 2026

The deployed Firestore baseline was updated on 2 October at 22:41 UTC. It requires company ownership on timesheet creation and on both sides of updates. Installed mobile weekly saves omit companyId, employeeId and ownerUid; older existing documents also omit companyId. This reproduced as permission-denied in the emulator against the exact live source.

## Live repair

Firestore and the primary Storage bucket were deployed and their complete source hashes re-read successfully at 09:33 BST on 3 October. See `firebase/mobile-compat/deployment.json` for ruleset identities and hashes. Previous live source and release IDs are in `firebase/mobile-compat/previous/`. The backup Storage bucket was not changed.

- Legacy timesheet get/create/update compatibility is restricted to the authenticated user's linked employee, Bickers company, employee code and exact weekly document ID. Explicit foreign company, employee ID and owner UID are rejected. Only the employee's exact missing week can return nonexistence.
- Shared workspace checks retain enabled-account, password-transition, trusted web identity and role checks, but avoid duplicate evaluation that exceeded Firestore's 1000-expression limit for valid sessions.
- Employees can update only phone/mobile/updatedAt on their own company employee profile.
- Employees can create their own company vehicle checks and open vehicle issues. Submitted vehicle-check originals and their snapshots remain protected.
- Missing owner upload paths for expenses, vehicle checks, recce photos, uploaded photos and maintenance issue photos are restored with workspace, UID, MIME and size checks. Recce paths also require a same-company booking. Evidence filenames are create-only except expense photos, which support owner edits.

`firebase.json` now points at the reviewed `firebase/mobile-compat` sources. The old root rules files were preserved because they contain unrelated local work and differ significantly from production. Do not deploy those older files or copy the mobile checkout's historical permissive rules into the web project. Future web rules deployments must retain these reviewed compatibility changes; their candidate may contain other unpublished changes, so merge selectively.

## Client repair prepared here

Alternative timesheet entry stamps authenticated company, employee and owner identity. Recce and vehicle-check writes stamp company ownership. Weekly editing reads the exact legacy document from the server when it is absent from the company-filtered query, preserves saved content, blocks saves on failed reads, and resets defaults when changing to a genuinely missing week. These client changes require an app release; no binary or OTA was published by this task.

Follow-up: the user subsequently authorized an OTA publication. See `docs/timesheet-ota-2026-10-03.md` for actual published platforms, runtimes and delivery verification. The statement above describes the initial rules-repair turn.

## Fresh verification

- Exact live baseline: both legacy weekly save and ownership-stamping update failed with permission-denied; the initial other-permission suite failed all four intended positive flows.
- Final combined Firestore/Storage emulator matrix: 11 tests passed. Includes foreign identities, disabled/unapproved/anonymous users, stale password sessions, valid recovered-password and trusted web sessions, immutable submissions, upload ownership/MIME checks and confirming a new own week is missing.
- Final application suite: 500 passed, 1 skipped, 0 failed using `NODE_OPTIONS=--experimental-vm-modules npm test`. Bare npm test previously failed three sessionGate tests because Node requires the VM modules flag; the rerun resolved those environment failures.
- Independent agent review approved the rules and independently passed 10 hydration/ownership tests. Client lint passed with the existing screen design restriction rules disabled; pre-existing warnings remain.
- Live deployment verified by reading both released sources and comparing SHA-256 hashes with the tested candidates. No employee business records or credentials were changed, and no production timesheet was submitted as a test.

Repeat the emulator matrix with `node scripts/run-with-jdk21.mjs -- firebase emulators:exec --only firestore,storage --project demo-mobile-permissions --config firebase.mobile-permissions-test.json 'node --test --test-concurrency=1 tests/timesheetPermissions.rules.test.cjs tests/mobileOtherPermissions.rules.test.cjs'`. The rules test dependency is the existing web project's installed `@firebase/rules-unit-testing`; no new production dependencies were added.

## Remaining compatibility limits

Older installed builds query timesheets by employeeCode alone. That query cannot safely satisfy strict company rules and remains denied; these builds need the updated client for the overview. New missing-week reads support codes containing letters, digits, underscores and hyphens. Legacy records remain absent from company-filtered overview queries until their next ownership-stamped save or a separately reviewed ownership backfill.

The broader audit also found workshop forms that omit companyId and attempt direct writes to server-owned legal-maintenance completion fields. Those completion workflows require client/server integration work. Their server-owned protections were retained. This repair does not certify every workshop workflow.

For rollback, use the recorded previous ruleset IDs for the two named releases after confirming that no later deployment superseded this repair. The guarded deployment script refuses to replace a changed baseline; it is intentionally not a generic repeat-deploy tool.
