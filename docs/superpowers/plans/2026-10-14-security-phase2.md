# Security Phase 2 Implementation Plan

> For agentic workers: use superpowers:executing-plans for root code tasks; independent read-only Storage/client investigations use dispatching-parallel-agents. User explicitly authorized execution and local tests in this request; no new permission gate, commits, releases or production writes.

Goal: restore safe employee history and scoped manager review, investigate legacy compatibility, and prepare local rollback.
Architecture: existing protected office APIs provide immutable-snapshot identity resolution and history/approval projections; Render forwards only fixed history routes using the caller bearer token; mobile retains its account-scoped cache and uses the adapter. Manager page uses established PeopleFleet/ui primitives, existing explicit server delegation and observed-version writes. Existing admin screens remain.
Spec: user's Security Remediation Phase 2 requirements and docs/audits/SECURITY_IMPLEMENTATION_PROGRESS.md.
Stack: Next/React, Express, Firestore REST and existing Firebase emulator/Node/Playwright tools; no dependency installation.
Constraints: reject ambiguity; no names/email authority; retain records/outboxes; explicit employee list; no self-review for manager; no payroll/admin expansion; no live writes/publish/migration/token changes. Office AGENTS live Project Control publication is overridden by user's explicit no-publish scope; local records updated only.
Review focus: reused code across archived/foreign employees; conflicting owner stamps; assignment changing while review open; partial history silently missing legacy data; stale request completing after account switch.

- [x] History: test resolver current, unstamped, foreign, duplicate code, UID conflicts, name-only; implement office utils/hrHistory.js and api/hr/_readSnapshot.js, history route and scoped reviews route. Read-only snapshot includes directory, user and records; complete pagination, explicit rejection counts, no shared cache.
- [x] Write boundary: extend api/hr/records/route.js only for safely resolved legacy records and retained own pending holiday cancellation; validate canonical identity in transaction, preserve history, manager self/correction denials, bind observed updateTime. Keep stamped admin workflow regression tests.
- [x] Mobile: test lib/hrHistoryApi.js and server/hrHistoryProxy.js; connect fixed proxy after session gates, hooks and holiday views. Adapter failure never falls back to insecure query; retain same-account offline cache; reject identity changes during request; expose withheld-history warning.
- [x] Manager: test utils/hrReviewClient.js observed-version behavior and UI states; create hr-approvals/page.js and ManagerApprovalPanel.jsx using shared cards/buttons/tables/modal and semantic tokens. Add scoped nav/module entry, test assigned pending/approved/self/foreign, failure and concurrency. Render light/dark wide/narrow with local fixture harness only.
- [x] Storage/client: independent read-only evidence, exact unresolved gaps and compatibility/migration release plan. No sensitive content downloads.
- [x] Rollback: versioned local rule candidate preserving Phase 1 guards plus verified external vehicle guard, demo emulator config/test runner. Run positive/negative release and rollback suites and recovery/unit/office checks.
- [x] Fresh independent review, one fix pass, evidence/source manifest, local Project Control implemented record, concise final report. Stop only dependent ambiguous access; no production rollout.

Completed local scope only. Production compatibility decisions, hosted/REST/device acceptance and publication remain blocked prerequisites; implementation report records them.
