# Paul Clerk Working Terms repair

User authorizes the server repair and live deployment. Base: exact deployed Bickers-App commit e0a27aa36c9b22fcbf1a00585d698ca0f335f7cb, isolated clone on codex/paul-clerk-terms-access. Do not deploy current main, which diverges from live.

1. Add a failing regression to tests/workingTermsIdentity.test.js for an approved Clerk caller whose immutable signature belongs to an explicitly linked legacy UID. Include current-session rejection, unavailable authority, identity mismatch, invalid custom claims, and unchanged password callers.
2. Update only server/workingTermsIdentity.js to recognize verified Clerk claims and require the existing read-only primary /api/security/session authority before reading signature history. Preserve all existing employee/company/email/signature checks and every record unchanged. No new dependencies or credentials.
3. Run targeted tests and the full existing suite; compare against the exact baseline. Baseline has 129 passes and 21 existing failures in PC429 route fixture imports and workshop query doubles. Do not alter unrelated runtime or weaken tests.
4. Obtain a fresh security review, publish a branch based on the exact live commit, manually deploy its specific commit to srv-d9qdrm7qj5pc7388j1i0, and verify deployment/source/health/unauthenticated denial. Retain device acceptance as pending until Paul retries.

Review focus: current live Clerk lease/revocation must remain authoritative; arbitrary custom tokens must fail; unavailable or malformed authority responses must fail closed; historical signatures and password compatibility must remain intact.
