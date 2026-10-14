# Work-side shared card styling — 14 October 2026

Ordinary cards now share `lib/design/cardSurface.js`: grouped theme surface,
semantic border colour, 1 pt border and 28 pt independent card corners.
`SectionCard`, outlined `SettingsGroup`, `DocumentCard` and grouped dashboard
cards use this rule. Bespoke wrappers use the same visual-only adapter, preserving
their element types, event handlers and layout properties.

## Source migration coverage

| Work-side page | Migrated custom surface owners | Render coverage in this pass |
| --- | --- | --- |
| Home | Today's Work / Plan Ahead; shared quick actions and More list | Dark status/actions visible; More partially visible |
| Schedule | Selected-day header, date prompt, details, job and agenda cards; shared calendar | Calendar and date prompt verified light and dark; selected/agenda states pending |
| Job Day | Job and Yard cards | Dark Yard/preparation verified; assigned-job state pending |
| Contacts | Contact record cards and grouped page shell | Light background/card contrast verified |
| Me | Section panels, availability history, queried-timesheet warning and grouped page shell | Light overview verified; expanded/history states pending |
| Holiday | Holiday tables | Pending |
| Work Diary | Booking cards | Pending |
| Recce Form | Job summary | Pending |
| Expenses | Expense cards | Pending |
| Company-card Receipts | Receipt rows | Pending |
| Notification Detail | Summary and received-date cards | Pending |
| Timesheet Detail | Daily blocks, turnaround credits, week summary | Pending |
| Add Timesheet | Header, preview summary and preview-day cards | Pending |
| Work Diary Board | Error card | Pending; coloured booking blocks remain an intentional exception |

Previously shared consumers also inherit the rule: Vehicle Check, Vehicle
Preparation, Booking Detail, Working Terms, Spec Sheets and Insurance & Compliance.
Work-side inset-list groups opt into `SettingsGroup outlined`, including Timesheets
and Settings. About and Help Centre informational content remains directly on the
background as requested.

## Preservation and checks

- Compared all 26 migrated style definitions with a pre-edit snapshot: every
  non-surface layout property unchanged, including padding, sizes, flex and gaps.
- Compared JSX after excluding style-only attributes: element types and
  behavioural/accessibility attributes unchanged across the 14 routes.
- TypeScript passes; lint passes for the shared surface owners. Existing
  screen-level styling lint debt is not fixed or suppressed by this migration.
- Full unit suite: 618 passed, 0 failed, 1 skipped (619 total).
- Native QA: Bickers Apple Design QA, iOS 26.5, ordinary text size. Schedule
  inspected in light and dark; Home and Job Day inspected in dark.
- Original dark appearance restored. No records saved/submitted/deleted.
- Android, enlarged text, wider/narrower viewports and the remaining populated,
  error and interactive states require further visual verification. Source and
  test checks do not establish complete rendered coverage or release readiness.

## Intentional exceptions

Calendar-day outlines, semantic status badges and icons, coloured board bookings,
modal shells, nested form controls, PDF paper, table headers/separators and
transparent sections retain their distinct purpose-based treatments. The Recce
summary keeps its accent rail. The queried-timesheet warning retains its original
orange border through the shared `borderAccent` option. Service-side screen
migration is excluded from this Work-side pass; shared defaults retain their
existing contracts. Vehicles remains skipped as requested.


## Follow-up: missed light-mode page backgrounds

Contacts and Me, plus Timesheet Detail, Add Timesheet, Work Diary Board and
Settings, now explicitly use `PageShell appearance="grouped"`. They inherit the
same shared light background as Job Day; card content, layout and business logic
are unchanged. Contacts and Me were rendered and inspected in light appearance
on the QA simulator. Original dark appearance restored. TypeScript and 17 focused
tests passed. Remaining corrected screens still need native visual checks.
