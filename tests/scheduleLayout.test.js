import assert from "node:assert/strict";
import test from "node:test";

import { readRouteBundle } from "./helpers/routeSource.js";

const scheduleSource = readRouteBundle("app/(protected)/(main-tabs)/screens/schedule.js");

test("schedule keeps the calendar legend inside the calendar card", () => {
  const calendarCard = scheduleSource.slice(
    scheduleSource.indexOf("<Calendar"),
    scheduleSource.indexOf("<AgendaList")
  );

  assert.match(calendarCard, /<Calendar[\s\S]*styles\.legendRow/);
  assert.match(scheduleSource, /legendRow:\s*\{[\s\S]*borderTopWidth:/);
});

test("schedule uses a compact prompt before a date is selected", () => {
  assert.match(scheduleSource, /styles\.dateHint/);
  assert.match(scheduleSource, /Tap a date to view jobs or leave details\./);
  assert.doesNotMatch(scheduleSource, /title="Pick a date"/);
});

test("schedule clearly distinguishes today from the selected date", () => {
  assert.match(scheduleSource, /isToday && !isSelected/);
  assert.match(scheduleSource, /isSelected && \{\s*backgroundColor: colors\.accent/);
  assert.match(scheduleSource, /isSelected\s*\? colors\.textOnAccent/);
});

test("schedule calendar and inactive view control remain compact and legible", () => {
  assert.match(scheduleSource, /calendarDay:\s*\{\s*minWidth: t\.controls\.buttonHeight,\s*minHeight: t\.controls\.buttonHeight/);
  assert.match(scheduleSource, /<SegmentedControl[\s\S]*?accessibilityLabel="Schedule view"/);
  assert.match(scheduleSource, /calendarBackground: colors\.groupedSurface/);
});
