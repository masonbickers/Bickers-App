# Bickers app: page styling reviews

## When the user shows a page

Treat a supplied app screenshot or page as a request to review that page against
the established design system and fix clear styling inconsistencies. This is
standing authorization for focused, reversible styling corrections. If the user
explicitly asks for review only, report findings without editing.

Use the `global-ui-consistency` skill for this work. The sources of truth are
`DESIGN_SYSTEM.md`, `lib/design/tokens.ts`, `lib/design/radius.ts`,
`providers/ThemeProvider.tsx`, `components/layout/PageShell.tsx`, and
`components/ui/AppPrimitives.js`. Read the actual affected component and its
styles before changing it. Direct user instructions take precedence.

## Review checklist

- Corner shapes: use purpose-based shared radii. For matching nested rounded
  rectangles, derive the inner radius with `getConcentricRadius`, including the
  parent's border and padding in the inset. Equal radii do not imply concentric
  corners. Keep capsules and circles appropriate to their purpose.
- Alignment: centre labels vertically and horizontally where intended. Check
  the actual container alignment, minimum height, padding and native text
  metrics rather than applying arbitrary text offsets.
- Spacing: use the shared spacing scale, consistent gutters and section gaps;
  remove accidental excess whitespace while preserving useful grouping.
- Typography: use shared `AppText` variants and semantic tones, consistent
  hierarchy, readable wrapping and support for enlarged text.
- Colours and surfaces: use semantic theme colours, shared borders and approved
  material treatments. Check both light and dark appearance where available.
- Controls: reuse shared buttons, fields, selectors and modals; preserve touch
  targets, focus, selected, disabled, loading and pressed behaviour.
- Layout: check clipping, overflow, safe areas, narrow widths, keyboard behaviour
  and responsive arrangements relevant to the supplied page.

## Implementation and verification

Keep changes limited to the shown page and the shared component work necessary
to fix it. Preserve business logic, data, navigation and functionality. Do not
start a whole-app migration, unrelated cleanup, emulator investigation or broad
redesign unless requested.

Prefer an existing supported component API over screen-specific visual
overrides. If a reusable treatment needs a new shared variant, make its contract
explicit and document it in `DESIGN_SYSTEM.md`. Do not silently change global
tokens or describe a local override as a global rule. Check affected consumers
when changing shared behaviour. Do not weaken lint rules or test thresholds.

Run proportionate relevant checks. Inspect the updated page in a renderer when
available, or use the user's fresh screenshot as visual evidence. Passing tests
alone does not prove rendered alignment or corner geometry. State missing device
or theme verification plainly; do not claim those states are verified.

Report briefly: what was inconsistent, what changed, what was checked, and any
material verification gap. Proceed with clear authorized corrections without
asking for repeated confirmation; clarify only genuinely ambiguous design or
behaviour changes.


## Shared card styling

For ordinary Work-side cards, use `SectionCard`, `DocumentCard`, or the visual-only
`getCardSurfaceStyle` adapter from `lib/design/cardSurface.js`. Keep layout and
handlers in the existing owning component; do not duplicate card surface,
border colour, border width or corner radius locally. Preserve documented
calendar/status/nested-control exceptions. Check affected native renders and
report pending coverage; a source migration is not full visual verification.
