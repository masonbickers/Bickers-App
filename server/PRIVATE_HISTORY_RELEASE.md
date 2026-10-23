# Private history refresh repair

Base: production Render service `bickers-mobile-api`, commit `358823b2093dd568a3c29a123596a9f01e99018f`.

Adds only GET `/hr/history?collection=holidays|timesheets`, required by signed app 5.0.17 (101). Existing handlers and dependencies remain unchanged. This read-only endpoint uses Firebase signature/revocation verification, fresh canonical profile and active server-owned Clerk lease (or eligible Firebase-password session), and a consistent Firestore read-only transaction. The caller cannot choose another employee or company. Legacy record ownership is resolved conservatively; ambiguous records are withheld and balance confidence remains explicit. Timestamp values and versions retain nanosecond precision.

Policy provenance: `historyPolicy/hrHistory.js`, `hrIntegrity.js`, and `holidayBalanceVerification.js` copied from the already-deployed, reviewed pilot source snapshot captured for deployment `dpl_qLqsL2u7WRLuamNQKcP4UHeNhJ9N`; `identitySession.js` copied from the native project's existing shared-session policy. They do not mint tokens or write records. Production website/pilot routing, rules, account approvals and deletion activation are unchanged. This repair does not add holiday cancellation or other absent API routes.

Verification: 22 targeted route/ownership/session/serialization tests; real Admin SDK emulator transaction integration including projected catalog, own-only records, exact reviewed-exclusion timestamp matching and fresh disabled-account rejection; HTTP smoke of the exact API server (health and unauthenticated route). Independent review: no remaining P1/P2 after timestamp fix. Existing 103-test suite: 93 pass, 10 fail both at unchanged base and candidate; failures are pre-existing workshop fake-query test limitations.

Run targeted tests with a supported Node runtime:
`node --test tests/privateHistoryRoute.test.mjs`
`node tests/privateHistoryHttp.mjs`

Emulator integration requires server dependencies, a dedicated synthetic project `demo-phone-refresh-diagnostic`, and `FIRESTORE_EMULATOR_HOST=127.0.0.1:8187`. It refuses any other emulator host. Never point it at production.

Deployment must use this exact candidate commit, retaining Render's existing source, root directory, build command and environment. After deployment verify unauthenticated history returns JSON401 and actual signed app refresh on Wi-Fi and cellular. Do not submit to Apple until device acceptance passes. Previous pinned commit is the rollback target; no database migration or rollback of user data is required.
