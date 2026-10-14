# Security Phase 3 Investigation Plan

> For agentic workers: use dispatching-parallel-agents for three independent read-only domains; root performs office failure diagnosis, isolated REST/workflow checks and synthesis. User explicitly authorizes local investigation/checks; no further execution approval or commit/publication step.

**Goal:** Produce an owner-reviewable release-blocker report with fresh evidence, local resolutions, decisions and external acceptance gaps.
**Architecture:** Read-only provider inventories and source comparison; exact per-account/object ledgers; actual REST testing only in a verified isolated environment; immutable source manifests for local rollback.
**Tech stack:** Existing Firebase/Firestore REST/CLI, Node tests, provider metadata/source APIs, local emulator tools.
**Spec:** User's Phase 3 request; SECURITY_IMPLEMENTATION_PROGRESS.md and SECURITY_PHASE2_IMPLEMENTATION_REPORT.md.

## Constraints
Production GET/list/read only; no deployment, data/account changes, reset/revocation, token/metadata changes or migration. Do not grant authority through email/name/UI role or weaken policies/assertions. Preserve dirty shared workspaces and originals. Only local or explicitly isolated-test mutations. No Project Control publication; local record update only.

## Review focus
Complete inventories and pagination; identity conflicts across archived/foreign users; current aliases differing from retained releases; parent references insufficient for file ownership; emulator behavior distinct from production REST/staging; exact rollback hashes and positive/negative proof rather than vulnerable baselines.

- [ ] Account domain: fresh Firebase Auth/canonical masked-field inventory; per-account/employee ambiguity and strict-access impact; owner-readable reconciliation ledger with proposed actions but no executing mutation tool. Test classifier against adversarial identities.
- [ ] Client domain: fresh office/Render/EAS/available distribution metadata and exact source contracts; older supported payloads and safe upgrade plan; access gaps reported rather than inferred.
- [ ] File domain: fresh metadata/reference checks for all167 generations; one row per ordinal/file and ownership/access classification, H&S/training decisions, secure token handling/retention plan; no content download or token value publication.
- [ ] Root: reproduce20 office failures, prove whether fixtures or behavior, locally fix only confirmed harmless harness drift without weakening safety; run focused/full office suite. Determine available staging credentials/isolated identity before any mutation; exercise actual REST and representative workflows locally where available; never treat emulator as hosted staging proof.
- [ ] Freeze and verify local rollback source/test manifests and compatibility prerequisites; no release-ready claim without external acceptance. Update local Project Control and concise blocker report with resolved/decision/external categories and exact next steps.
