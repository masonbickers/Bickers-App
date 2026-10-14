import assert from "node:assert/strict";
import test from "node:test";

import {
  countHolidayDays,
  holidayDateKeysFromRange,
  isReviewableHolidayRange,
} from "../lib/holidayRequestParity.js";

test("bank holidays do not consume paid leave on a request or an approved record", () => {
  const bankHolidays = new Set(["2026-12-25"]);
  assert.equal(countHolidayDays("2026-12-24", "2026-12-28", { bankHolidays }), 2);
  assert.equal(countHolidayDays("2026-12-25", "2026-12-25", { bankHolidays, startHalfDay: true }), 0);
});

test("single-day and multi-day half days match the web count", () => {
  assert.equal(countHolidayDays("2026-09-24", "2026-09-24", { startHalfDay: true }), 0.5);
  assert.equal(countHolidayDays("2026-09-24", "2026-09-28", { startHalfDay: true, endHalfDay: true }), 2);
});

test("web reviewable holiday ranges stay within one calendar year", () => {
  assert.equal(isReviewableHolidayRange("2026-12-31", "2027-01-01"), false);
  assert.equal(isReviewableHolidayRange("2026-12-30", "2026-12-31"), true);
  assert.equal(isReviewableHolidayRange("2026-12-31", "2026-12-30"), false);
});

test("saved app holidays include date keys for web booking availability", () => {
  assert.deepEqual(holidayDateKeysFromRange("2026-09-24", "2026-09-26"), [
    "2026-09-24", "2026-09-25", "2026-09-26",
  ]);
});
