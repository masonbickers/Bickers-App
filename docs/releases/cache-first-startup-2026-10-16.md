# Cache-first startup implementation — 16 October 2026

Source: `codex/cache-first-startup`, based on the shared Clerk pilot `76f76b6c`. Includes its existing provider startup fix; unrelated Me changes remain in the original pilot checkout.

Returning shared-Clerk users can see a bounded read-only Home/Schedule/job snapshot while current verification runs. Eligibility lasts at most 24 hours after full verification. Exact Clerk session, UID, company and employee identities gate reuse. Logout/rejection invalidates the display immediately and persists a tombstone before sign-out. Network failure keeps only an eligible display view. Protected actions, sync and Working Terms enforcement continue to depend on current authentication.

Preferences, access resolution and Working Terms overlap after Firebase authentication. The required Clerk token → bridge → Firebase chain remains ordered. Foreground/reconnect refreshes coalesce for 250 ms; existing request deduplication and per-resource caching remain in place.

Local pilot/development `[startup]` diagnostics contain only fixed phases/outcomes and elapsed/duration milliseconds. `first-saved-layout` and `first-fresh-layout` are native layout callbacks, not proof of screen paint. Cold starts and foreground returns have separate timing cycles. No remote analytics is added.

Validation:
- Focused and ordinary unit suites, TypeScript and scoped lint run with the bundled compatible Node runtime. The package script's unsupported Node flag was not changed.
- Existing Home/Schedule design lint debt remains: 86 errors and 2 warnings, unchanged by rule/message counts. Other changed production files pass scoped lint.
- Actual StartupPreview/shared primitives rendered with synthetic data in RN Web at phone width, light/dark. Date and saved-details controls work; no horizontal overflow observed.
- Independent final review and final test totals are recorded below when completed.

Pending acceptance: a signed native build containing these commits, iPhone/Android rendering and Dynamic Type, and repeated ordinary/offline/slow-network cold-start/resume measurements. The approximately one-second saved-content goal is not yet measured. The currently installed owner build must not be described as containing this change. No production deployment, auth configuration, account migration or rule change was performed.
