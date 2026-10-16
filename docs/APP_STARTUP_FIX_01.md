# Startup audit Task 1: screen loading-state repair

Date: 16 October 2026. Scope: Pilot only; no startup/authentication redesign.

## Target and changes

Checkout: `/Users/masonbickers/.codex/worktrees/saved-home-live/bickers-app-launch`.
Revision: detached HEAD `fca8742e3eeb551824a4943d0773da94e4eb0f8b`.
The target, revision, AGENTS.md, existing tracked/untracked changes, relevant design-system guidance, current shell/resolver, working Insurance callsite and existing loader/shell tests were inspected before editing. Existing uncommitted work was preserved.

Only these four files were changed/created by this task:

- `app/(protected)/recce-form.js:552`: pass `resources: [{ isInitialLoading: loadingJob }]`, `hasContent: false` and the unchanged loading label.
- `app/(protected)/vehicle-check.js:459`: pass `resources: [{ isInitialLoading: loadingDoc }]`, `hasContent: false` and the unchanged loading label.
- `tests/formLoadingState.test.js`: new focused regression tests.
- `docs/APP_STARTUP_FIX_01.md`: this report.

No shared component, global style/token, dependency, native setting, authentication/Working Terms logic, permissions, security rule, cache, data-loading or submission code changed. No staging, commit, reset, stash, merge, publication, cloud build, deployment, OTA or Metro restart was performed. H&S/training access remains admin-only, including employees' own records.

## Root cause and supported contract

Both screens passed `state={{ loading: true, loadingLabel: ... }}` during their normal loading branch. `PageStateConfig` in `components/layout/PageShell.tsx:67–83` requires `resources` and `hasContent`. The shell invokes `state.resources.some(...)`, and the resolver selects loading from a resource's `isInitialLoading`, not a top-level `loading` property.

The callsites now use that existing contract. Each branch has no usable form content yet, so `hasContent` is false; its resource flag is the screen's existing readiness flag. Once the existing loader clears that flag, the screen selects its unchanged loaded form branch. This both prevents the exception and actually selects the intended shared grouped LoadingState. No optional-chain suppression, compatibility layer or artificial delay was added.

Labels remain “Loading Recce Form...” and “Loading vehicle check…”. Grouped appearance, form mode/width, header/back handlers, shared typography, surfaces and progress accessibility label/role remain owned by the existing components.

## Regression evidence

The new tests compile and execute each **complete production screen**, its actual PageShell, actual async-state resolver, actual LoadingState and actual design tokens. They do not reconstruct the malformed props or stub PageShell. Native hosts, external services, provider context, route styling and unrelated primitive leaves are substituted. Unknown imports fail closed; no production SDK initializes and no live account/record is read.

The screen's existing mount effects run against synthetic booking/draft reads for the readiness/error tests. Tests verify:

- Each production loading branch exposes one labelled progressbar, its spinner/text and no submit action, in light/dark theme fixtures.
- Successful existing loaders remove progress and expose each loaded form's submit action.
- Recce read failure retains its Load Error alert and back navigation.
- Vehicle Check read failure retains its warning/retry; successful retry removes the warning and restores the form.

**Before the fix:** 8 tests ran; 4 passed and 4 failed. The four loading cases (two screens × two theme fixtures) each threw `TypeError: Cannot read properties of undefined (reading 'some')` from actual PageShell. The loaded/error behavior cases passed unchanged. An initial harness setup run exposed a missing native `Platform.select` fixture; that fixture was completed before recording the meaningful RED result and before production edits.

**After the fix:** the combined new regression, existing Vehicle Check loader, shared-shell refresh/spacing and async-state suite passed **39/39**, with zero failed, cancelled or skipped tests. This includes all eight new regression cases. These are local composed-component tests, not native screenshot acceptance.

## Commands and limitations

Working runner rechecked: `/Users/masonbickers/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`, v24.19.0. Package scripts were inspected; verification used the direct runner because the existing test script contains `--experimental-default-type=module`, which this runner rejects. No script/configuration was changed. `N` below denotes that absolute runner. All commands ran in the Pilot unless specified.

```sh
pwd
git rev-parse HEAD
git status --short
# Read-only source/test/design inspection with cat, head, tail, sed, grep, find.
N --version

# RED, before either production edit: exit 1, four expected loading crashes.
N --experimental-vm-modules --test tests/formLoadingState.test.js

# GREEN: exit 0, 39 passed.
N --experimental-vm-modules --test tests/formLoadingState.test.js tests/vehicleCheckLoading.test.js tests/pageShellRefresh.test.js tests/pageShellSpacing.test.js tests/asyncState.test.js

# Scoped lint: exit 1, existing findings described below.
N node_modules/eslint/bin/eslint.js 'app/(protected)/recce-form.js' 'app/(protected)/vehicle-check.js' tests/formLoadingState.test.js

# New test only: exit 0, no lint findings.
N node_modules/eslint/bin/eslint.js tests/formLoadingState.test.js

git diff --check
git diff -- 'app/(protected)/recce-form.js' 'app/(protected)/vehicle-check.js'
```

Python captured SHA-256 inventories of both checkouts in `/private/tmp/bickers-fix01-baseline.json` before writes, then compared the final files. Only the two intended production files changed among existing Pilot files; Main had no changes. Final comparison also checked newly added paths against the permitted test/report additions. No Git mutations were used.

Scoped lint is **not clean**: Recce has four `bickers-design/no-screen-presentation` errors; Vehicle Check has eighteen errors under that same rule plus one `react-hooks/exhaustive-deps` warning for missing `vehiclesResource.data` in `loadData` dependencies. These concern existing visual overrides and the existing hook dependency list, not the loading-state props. A before/after stdin lint comparison reconstructed the original source, checked its SHA-256 against the pre-edit baseline, and confirmed identical finding rule IDs/severities/messages/node types. Only downstream line numbers moved. No lint rules were weakened and no unrelated cleanup was done.

The runner also emits the existing `MODULE_TYPELESS_PACKAGE_JSON` syntax-detection warning. It was left untouched. No whole-repository lint/build/test cleanup or release qualification was attempted; checks were limited to the affected flows and shared shell.

Temporary local logs: `/private/tmp/bickers-fix01-red.log`, `/private/tmp/bickers-fix01-green.log`, `/private/tmp/bickers-fix01-lint.log`, `/private/tmp/bickers-fix01-lint-comparison.json`. They contain synthetic fixture/test results, not customer records or credentials. The key results are recorded above so this report remains useful if temporary files expire.

## Native verification and Main

Native light/dark rendering: **NOT VERIFIED**. No identified isolated native test build/account was established. Theme fixtures prove the composed progress semantics, not native layout, font metrics, physical touch behavior, or real-device navigation. A running Metro listener does not identify the installed binary, and this task makes no claim of a live device update.

Main at `/Users/masonbickers/Desktop/Projects/bickers-app-launch` remains untouched. Its Recce and Vehicle Check loading callsites still contain the equivalent malformed state and therefore retain the audit's confirmed source defect. The fix was not copied into Main.

## Next recommendation and stop

Task 1 is fixed locally in Pilot. It repairs two screen-loading crashes; it does not establish faster app launch or complete startup reliability.

The next recommended startup task is the audit's Task 2: bound the Working Terms fallback/verification recovery path, preserving denial vs unavailability and all access checks, with suitable isolated fault tests and measured device acceptance. No work on Tasks 2–5 was started. Separate approval is required.
