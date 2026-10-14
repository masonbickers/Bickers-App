# Grouped settings implementation plan

**Goal:** Establish the supplied Apple Settings screenshot as the common settings
language and apply it to Timesheets and Autofill without changing their data flows.

**Architecture:** Shared theme colours, typography and grouped row components;
opt-in grouped PageShell and selector presentation. Existing operational screens
retain their behaviour until their layouts are migrated to these shared contracts.

- [ ] Add semantic grouped surfaces and readable settings typography.
- [ ] Add shared borderless groups and accessible setting rows; verify callbacks,
  disabled states, wrapping and light/dark geometry.
- [ ] Migrate Timesheets groups and Autofill selectors; keep existing business
  callbacks and use glass selectively for floating actions.
- [ ] Document one visual standard and verify TypeScript, unit tests, shared lint
  and rendered phone/tablet light/dark settings states.
