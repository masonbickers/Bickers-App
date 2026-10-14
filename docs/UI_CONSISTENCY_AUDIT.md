# Work-side card styling migration

Scope: Work-side ordinary card surfaces. Service-side routes are excluded, and Vehicles remains skipped. Existing wrappers, event handlers, content, padding, dimensions, flex rules and navigation stay in place.

Shared rule: `lib/design/cardSurface.js` owns surface, semantic border colour, 1 pt border and purpose-based corners. `SectionCard` and `DocumentCard` use the same rule. Existing bespoke wrappers use the visual-only helper to avoid altering their structure or default padding.

Intentional exceptions: calendar-day marks, status badges, coloured board bookings, nested controls and fields, modal shells, transparent page sections, PDF paper and table headers/separators. These are not ordinary neutral cards.

## Plan

1. Connect existing shared components to the shared surface rule.
2. Migrate active custom Work-side wrappers and remove duplicate owning styles.
3. Check that event handlers and all non-surface layout properties remain unchanged.
4. Run TypeScript and relevant tests; inspect representative native renders.
5. Record verified and pending render coverage in `UI_CONSISTENCY_REPORT.md`.
