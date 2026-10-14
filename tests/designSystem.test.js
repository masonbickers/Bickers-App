import assert from "node:assert/strict";
import test from "node:test";

import { getResponsiveLayout } from "../lib/design/responsive.js";
import { getDashboardGridColumns } from "../lib/design/dashboardLayout.js";
import { getContrastRatio } from "../lib/design/contrast.js";
import * as semantics from "../lib/design/semantics.js";

const { createActionLock, getStatusColors, normalizeStatusTone } = semantics;

test("responsive layout uses phone, tablet, and wide gutters", () => {
  assert.equal(getResponsiveLayout(390).columns, 1);
  assert.equal(getResponsiveLayout(390).pageGutter, 16);
  assert.equal(getResponsiveLayout(800).columns, 2);
  assert.equal(getResponsiveLayout(800).pageGutter, 24);
  assert.equal(getResponsiveLayout(1400).pageGutter, 32);
});

test("dashboard grid adapts to usable width and accessibility text", () => {
  assert.equal(getDashboardGridColumns(280), 1);
  assert.equal(getDashboardGridColumns(320), 2);
  assert.equal(getDashboardGridColumns(393), 3);
  assert.equal(getDashboardGridColumns(768), 3);
  assert.equal(getDashboardGridColumns(393, 1.6), 1);
  assert.equal(getDashboardGridColumns(768, 1.6), 3);
});

test("operational status aliases map to stable semantic tones", () => {
  assert.equal(normalizeStatusTone("1st Pencil"), "firstPencil");
  assert.equal(normalizeStatusTone("Approved"), "approved");
  assert.equal(normalizeStatusTone("unknown-value"), "neutral");
});

test("status colours retain labels across light and dark schemes", () => {
  const light = getStatusColors("maintenance", "light");
  const dark = getStatusColors("maintenance", "dark");
  assert.equal(light.tone, "maintenance");
  assert.equal(dark.tone, "maintenance");
  assert.notEqual(light.background, dark.background);
  assert.ok(light.foreground && light.border && dark.foreground && dark.border);
});

test("service traffic-light markers use solid, readable colours", () => {
  for (const scheme of ["light", "dark"]) {
    for (const tone of ["success", "warning", "danger"]) {
      const palette = semantics.getServiceStatusColors(tone, scheme);
      assert.match(palette.background, /^#[0-9A-F]{6}$/);
      assert.equal(palette.border, palette.background);
      assert.ok(getContrastRatio(palette.onBackground, palette.background) >= 4.5);
      assert.ok(getContrastRatio(palette.foreground, scheme === "dark" ? "#000000" : "#FFFFFF") >= 4.5);
    }
  }
});

test("action lock prevents simultaneous submissions and unlocks afterwards", async () => {
  const run = createActionLock();
  let calls = 0;
  let release;
  const pending = run(
    () =>
      new Promise((resolve) => {
        calls += 1;
        release = resolve;
      })
  );
  assert.equal(await run(async () => { calls += 1; }), false);
  assert.equal(calls, 1);
  release();
  assert.equal(await pending, true);
  assert.equal(await run(async () => { calls += 1; }), true);
  assert.equal(calls, 2);
});

test("negative balances use the danger semantic tone", () => {
  assert.equal(semantics.getBalanceStatusTone?.(-0.5), "danger");
  assert.equal(semantics.getBalanceStatusTone?.(0), "success");
  assert.equal(semantics.getBalanceStatusTone?.(12), "success");
});
