import assert from "node:assert/strict";
import test from "node:test";
import { calendarDayMetrics, calendarDayLabel } from "../lib/scheduleAccessibility.js";

test("calendar targets meet platform minimums and grow with accessibility text", () => {
  for (const minimum of [44, 48]) {
    const tokens = { controls: { buttonHeight: minimum }, typography: { body: { fontSize: 17, lineHeight: 24 } }, spacing: { xs: 8, sm: 12 } };
    const standard = calendarDayMetrics(tokens, 1);
    assert.ok(standard.width >= minimum && standard.height >= minimum);
    const enlarged = calendarDayMetrics(tokens, 2.5);
    assert.ok(enlarged.width >= 17 * 2.5 * 2);
    assert.ok(enlarged.height >= 24 * 2.5 + 12);
  }
});

test("calendar announcements identify date, today and simultaneous events", () => {
  const date = { year: 2026, month: 10, day: 14 };
  assert.equal(calendarDayLabel(date, "today", { jobCount: 2, scheduleTone: "unpaid", bankHoliday: true }), "Wednesday, 14 October 2026, Today, 2 jobs, Unpaid leave, Bank holiday");
  assert.match(calendarDayLabel(date, "", { jobCount: 1, scheduleTone: "leave" }), /1 job, Paid leave$/);
  assert.match(calendarDayLabel(date, "", {}), /No scheduled events$/);
});
