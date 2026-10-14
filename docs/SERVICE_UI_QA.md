# Service card migration and page review

Date: 24 September 2026. Scope: the 33 `/service` routes in the current checkout, plus the shared destinations opened from Service Settings. This records source and rendered coverage separately. A preview fixture is not evidence of native navigation or persistence.

## Shared card rule

Independent card surfaces use `designTokens.componentRadius.card` (28pt), the same semantic radius as `SectionCard`. Nested card surfaces use `componentRadius.nestedCard` (18pt); modals use `componentRadius.modal` (18pt). Form fields, buttons, badges, and pills keep their own radius roles. The service style migration changed 57 card surface declarations across 29 style files. Layout and content were retained.

The current route components still render many card surfaces with local `View` or pressable wrappers. Their radii are centralized, but the planned migration of their full surface styling and interaction behavior through `SectionCard` is not complete.

## Route coverage

Legend: **View** means the current screen view was rendered with deterministic sample data in the browser. **Partial** means only a real subsection was rendered. **Source** means the route and styles were checked in source. **Android fixture** means a native Android phone screenshot exists, but workflow verification is still blocked. **Blocked** means iOS/Android authenticated layout and workflow checks still need a test account and records; the iOS visual-test deep link also remains unresolved.

| Route | Browser evidence | Native |
| --- | --- | --- |
| `/service/home` | View: dashboard fixture | Android fixture; workflow blocked |
| `/service/work` | View: workshop forms fixture | Android fixture; workflow blocked |
| `/service/book-work` | Source | Blocked: native route review |
| `/service/service-list` | View: fleet fixture | Android fixture; workflow blocked |
| `/service/issues` | View: issues fixture | Android fixture; workflow blocked |
| `/service/activity-history` | Source | Blocked: native route review |
| `/service/advisories` | Source | Blocked: native route review |
| `/service/daily-check` | Source: disabled placeholder | Blocked: native route review |
| `/service/defect-form` | Source | Blocked: native route review |
| `/service/defects` | Source | Blocked: native route review |
| `/service/defects/[id]` | Source | Blocked: native route review |
| `/service/design-system` | View: development fixtures | Blocked: native route review |
| `/service/equipment-list` | View: equipment fixture | Android fixture; workflow blocked |
| `/service` | View: legacy landing fixture | Blocked: native route review |
| `/service/inspections` | Source | Blocked: native route review |
| `/service/inspections/inspection-form/[id]` | Partial: inspection checklist | Blocked: native route review |
| `/service/minor-service/[id]` | Partial: minor service checklist | Blocked: native route review |
| `/service/mot-precheck/[id]` | Partial: MOT checklist | Blocked: native route review |
| `/service/repair-form` | Source | Blocked: native route review |
| `/service/resolved-defects/[id]` | Source | Blocked: native route review |
| `/service/service-form` | Source: redirect alias | Blocked: native route review |
| `/service/service-form/[id]` | Partial: full-service checklist | Blocked: native route review |
| `/service/service-history` | Source | Blocked: native route review |
| `/service/service-history/[vehicleId]` | Source | Blocked: native route review |
| `/service/service-record/[id]` | Source | Blocked: native route review |
| `/service/service` | Source: legacy list | Blocked: native route review |
| `/service/settings` | Partial: settings fixture | Android fixture; workflow blocked |
| `/service/tyre-brake-check` | Source: disabled placeholder | Blocked: native route review |
| `/service/vehicle-check-form/[id]` | Source | Blocked: native route review |
| `/service/vehicle-prep/[id]` | Source | Blocked: native route review |
| `/service/vehicle-timeline/[id]` | Source | Blocked: native route review |
| `/service/vehicles/[id]` | Source | Blocked: native route review |
| `/service/vehicles/file-viewer` | Source | Blocked: native route review |

Service Settings also opens shared Edit Profile, Help Centre, and About routes; native navigation checks for these remain pending.

## Current verification

- Shared radius enforcement: `tests/serviceCardRadius.test.js` passes (2 checks).
- JavaScript tests: 396 passed, 1 skipped; type check and web visual build pass.
- Browser visual regression: 154 passed across the available service fixtures, themes, and phone/tablet widths. Baselines and screenshots are in `tests/visual/__screenshots__`; this suite does not render all 33 routes.
- Repository lint remains failing with 2,147 errors and 50 warnings across the existing broader codebase. This is an open launch gate, not a service-page pass.
- iOS simulator build passes, but direct links to the visual fixture still land on the signed-out screen. The iOS fixture and authenticated workflow review are blocked pending route access and an approved non-production service account with test records. See `output/service-ui-qa/ios-login-deeplink-blocked.png`.
- Android simulator build passes. Native phone captures of the dashboard, workshop list, fleet, equipment, issues, and settings fixtures are in `output/service-ui-qa/`. These are fixture renders, not authenticated workflow passes, and do not cover tablet or every route.
- Native startup exposed an undefined `primarySuggestion` on Book Work. It is now derived from the current prep, overdue service, due-soon service, and draft queues, with a loading and fallback message. Type check passes after the fix.
- An approved non-production service account and test records have not yet been provided, so save, draft resume, completion, photo, and shared Settings navigation checks remain blocked.

## Acceptance gate

For every active route, inspect iOS and Android phone/tablet in light and dark themes, including long content, large text, scroll end, safe areas, keyboard, tabs, and modal placement. Exercise navigation and each form's validation, save, draft resume, and completion with approved test data. Mark a route passed only after current native evidence exists; report any unavailable device, account, data, or integration as blocked. Do not claim service UI launch readiness while any active route remains pending or blocked.
