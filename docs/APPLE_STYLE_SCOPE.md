# Current user-approved scope

The user clarified the task after the initial broad design request:

- Preserve existing screen layouts, navigation, content organisation, features and workflows.
- Limit changes to Apple-style buttons; consistent fonts, colours, spacing and existing cards/controls; and fixes for overlapping or clipped content.
- Do not redesign screens or restructure layouts.
- Review this task's earlier changes and undo only unnecessary structural redesigns, preserving pre-existing user work and legitimate overlap fixes.

This constraint governs the still-active goal. Earlier migration completion labels
and fixture pass counts do not prove compliance with this clarified scope.

## Scope correction in progress

- Contacts: restored the exact pre-edit screen source from this task's captured command output. Removed the unused replacement component and helper created during the interrupted redesign, preserving copies in `output/apple-design/scope-correction`.
- Notifications: restored the horizontal filters, grouped cards and original row organisation. Kept initial loading/refresh error feedback and adjusted existing font weights.
- Issues: restored the original grouped and single-card layouts, retaining real collection loading/error/retry states and adjusting font weights.
- Service Settings: restored original sections, row layout, reminder time/theme controls and account actions.
- Service landing page: restored original header, action-card arrangement and attention cards, retaining the duplicate-attention correction.
- Dashboard, workshop forms and fleet maintenance: restored their original layouts from saved duplicate-route backups, after comparing the captured canonical source sections. Retained collection error handling, isolated draft recovery and corrected maintenance labels/search handling.
- Equipment: restored the recorded original screen body and horizontal filters. Reconstructed its uncaptured style/helper tail from the repository version using the existing style-token transform, retaining centralised colours and current refresh-error feedback. Its actual view has since passed sample-data render checks below.
- Removed the unused replacement components and their rendered fixtures/tests. Copies are retained under `output/apple-design/scope-correction/retired-previews`.
- Reverted the additional form-route navigation hiding rules; measured accessory clearance remains to prevent overlap without removing existing navigation.
- Next: rendered verification of the preserved actual layouts. Some extracted fixture components still represent superseded layouts and must not be treated as verification of restored routes.
- Keep shared overlap fixes, semantic contrast and reduced-motion improvements unless inspection demonstrates they alter the user's intended workflow or layout.

## Validation after the latest restorations

The restored Contacts, Notifications, Issues, Service Settings and service landing
sources pass the current unit suite (368 pass, 1 emulator test skipped), ESLint,
TypeScript and the Expo web export. The service landing retains refresh-failure
feedback as well as the duplicate-attention correction. Rendered checks for the
restored routes are still outstanding; superseded content fixtures are not
acceptable evidence for their current layouts.

The dashboard, workshop forms and fleet-list restorations also pass 368 unit
tests (1 skipped), uncached ESLint, TypeScript and the Expo web export. Existing
rendered fixture tests for their replacement components have not been used to
claim validation of these restored screens. Equipment recovery is the remaining
screen-level rollback, followed by fixture cleanup and checks of the preserved
layouts.

## First restored-screen render checks

The equipment and fleet routes now delegate data access to a small wrapper around
their unchanged screen views. The QA route renders those same views with sample
resources; it does not substitute redesigned components. Eighteen browser checks
pass across both themes and three widths, including filter height/centred labels,
section containment, search, expansion, destination callbacks and error recovery.
Original horizontal filters and cards remain. Long fleet text now wraps in place.
Other actual screens and authenticated/native flows remain outstanding.

## Contacts verification

The original Contacts row now wraps long names and metadata in its existing middle
column. Avatar, call/WhatsApp controls, grouping and navigation are unchanged. A
thin data wrapper exposes the same view to deterministic QA. Six checks pass at
320/390/820 pixels in both themes, covering containment, full text, touch targets,
search and action callbacks, and missing-number disabled states. Calls/messages
are intercepted in the fixture; device app launching remains unverified.

The full current browser suite passes 62 checks. Unit results remain 368 passing,
one emulator test skipped, with uncached lint, TypeScript and web export passing.

## Notifications verification

The actual preserved Notifications view is now used for sample-data browser QA.
Filter controls use the shared 44-point height. Long titles and metadata wrap within
existing rows; grouping, navigation callbacks and two-line message previews remain.
Selected filters and unread text use the shared readable red palette after measured
contrast failures. Eleven checks cover both themes and three widths, filter/row
callbacks, loading/empty/error states and text contrast. No real inbox data is
modified by these fixtures. Native alerts, persistence and actual destination
navigation still require verification.

Current full suite: 73 browser checks and 368 unit tests pass (one emulator test
skipped). Uncached lint, TypeScript and the web export also pass.

## Service Issues verification

Preserved grouped/single cards now wrap long titles and asset names in place.
Single-card resolve buttons use the shared 44-point height and expose accessible
labels, disabled and busy states. Section copy has a gap beside its count. Summary
and icon colours use the readable semantic palette. A thin view boundary lets the
QA route render the actual JSX using sample items. Twelve browser checks pass,
covering phone/tablet layouts, groups/actions, loading/empty/error/partial states
and summary contrast. Simulated resolution does not write production data or prove
Firestore/offline persistence or native confirmation alerts.

The current full browser suite passes 85 checks. Unit suite: 368 pass, one skipped.
Uncached lint, TypeScript and Expo web export pass. The overall goal stays active.

## Service landing verification

The existing service landing layout remains intact. Quick-action cards now use
current theme surfaces/text instead of fixed dark colours; summary counts and
status/defect pills use shared semantic colours. Cards expose accessible action
labels. The actual view runs with sample resources for 12 browser checks across
both themes and three widths, covering layout, action callbacks, attention
uniqueness, data states and contrast. All pass. These follow the previous full
85-check browser pass; 97 checks are now configured. Unit suite remains 368 pass,
one skipped, with uncached lint, TypeScript and web export passing.
Authenticated navigation, data fetching and native behaviour remain outstanding.

## Workshop Forms verification

The existing Workshop Forms view is now rendered directly in QA with sample drafts.
Cards expose accessible button roles and labels. The invalid General Repairs
`wrench` Feather glyph was replaced by `tool`, verified against the installed icon
map. Form/draft icons use semantic foreground/background colours to fix faint
light-mode draft icons and maintain contrast in both themes. Layout and enabled
forms remain unchanged.

Eleven focused browser checks pass, covering all six launch callbacks, resuming a
draft, long content at 320/390/820px, loading/empty/retry states, icon warnings and
3:1 icon contrast in both themes. Alongside the prior full 85-check run and 12 landing
checks, 108 browser checks are configured. Unit suite: 368 pass, one skipped;
uncached lint, TypeScript and web export pass. Real storage/native flows remain
outstanding and the goal stays active.

## Service Settings verification

The actual settings presentation is available to QA through a thin view boundary.
Sample preferences exercise the unchanged row organisation. The reminder control
cluster is capped at 55% of the row, fixing the 320px label's mid-word wrapping.
Time/theme buttons expose selected state and use shared semantic colours. Switches
and account chevrons have accessible labels. Six focused browser checks pass at
320/390/820px in both themes, including selection callbacks and touch targets.
The fixture does not verify account actions, actual theme persistence, password
changes or reminder persistence. 114 browser checks are now configured; latest
focused run passed six settings checks. Unit suite: 368 pass, one skipped; uncached
lint, TypeScript and web export pass. The goal remains active.

## Service dashboard verification

The preserved dashboard now has a thin resource boundary for rendering the actual
screen and calculations with sample collections. Cards expose accessible labels.
Summary figures and count badges use shared semantic colours. Twelve checks pass
for 320/390/820px in both themes: 120 defects, capped badges, action callbacks,
loading/empty/error/partial recovery and 4.5:1 contrast. Original card positions,
summary structure and workspace permissions remain unchanged.

The latest complete browser run passes 126 checks. Unit suite: 368 passing, one
skipped. Uncached lint, TypeScript and Expo export pass. Live data, destination
navigation and native workflows remain outstanding; the goal remains active.

## Full-service checklist verification

The form's existing ChecklistSection is exported for rendering its real controls
with sample values. Rating buttons were confirmed at 32 points and now use the
shared 44-point height. The photo control uses the shared size and theme colour.
Rating and N/A text use semantic palettes, including correction of the selected
N/A label that disappeared in light mode. Check/selection semantics are accessible.
The existing section and wrapping row arrangement remain intact.

Eight focused browser checks pass for three widths and both themes: long headings,
checkbox/rating/N/A callbacks, required notes, validation recovery, and contrast.
There are 134 browser checks configured after the prior full 126-check run. Unit
suite remains 368 passing, one skipped; lint, TypeScript and web export pass.
This does not verify full-form data flow, photo handling, persistence or submission.

## Additional workshop checklist rows

Minor-service, MOT and equipment-inspection ChecklistRow functions are rendered
unchanged in structure through the QA route. Ratings have 44-point minimum targets,
semantic colours and accessible selection labels. MOT's existing row now wraps at
narrow widths after a rendered test showed ratings overlapping the item text.
Inspection's required-note error clears when nonblank text is entered. Eighteen
new tests plus eight full-service checks pass across three widths and both themes.
No full-form submission or attachment behaviour is claimed from these row fixtures.

Current total: 152 browser checks configured; latest focused run 26 pass. Unit
suite: 368 pass, one skipped; lint, TypeScript and web export pass. The inspection
form's existing irreversible N/A selection is a discovered functional follow-up.
The goal remains active.

## Inspection N/A correction

The discovered one-way N/A selection is corrected. Its button no longer disables
itself, and the existing form handler clears the item's N/A flag and marks the form
dirty on a second tap. Setting N/A retains the original clearing of rating/notes;
returning to applicable requires a fresh rating under the existing validation.
The browser regression initially timed out on the disabled N/A control. All six
inspection row checks now pass at 320/390/820px in both themes, verifying that
ratings disable under N/A, re-enable on undo, and can be selected again. Callbacks
in the row fixture remain simulated; full-form persistence is still unverified.
Unit suite: 368 pass, one skipped; lint, TypeScript and web export pass.
