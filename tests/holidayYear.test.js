import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRemainingHolidayAllowance,
  effectiveHolidayCarryOver,
  holidayBelongsToYear,
} from "../lib/holidayYear.js";

test("holiday uses its explicitly recorded leave year", () => {
  const start = new Date(2026, 0, 2);
  assert.equal(holidayBelongsToYear({ holidayYear: 2025 }, 2026, start), false);
  assert.equal(holidayBelongsToYear({ leaveYear: "2026" }, 2026, start), true);
});

test("unused carry-over expires in April but used carry-over remains in annual allowance", () => {
  assert.equal(effectiveHolidayCarryOver(5, 2, 2026, new Date(2026, 2, 31)), 5);
  assert.equal(effectiveHolidayCarryOver(5, 2, 2026, new Date(2026, 3, 1)), 2);
});

test("legacy holiday belongs to the year in which it starts", () => {
  const previousYearStart = new Date(2025, 11, 30);
  assert.equal(holidayBelongsToYear({}, 2026, previousYearStart), false);
  assert.equal(holidayBelongsToYear({}, 2025, previousYearStart), true);
});

test("remaining allowance matches the taken count shown on the dashboard", () => {
  assert.equal(calculateRemainingHolidayAllowance(22, 21), 1);
  assert.equal(calculateRemainingHolidayAllowance("22", "21.5"), 0.5);
});

test("available allowance reserves approved future paid leave", () => {
  assert.equal(calculateRemainingHolidayAllowance(22, 11, 6), 5);
  assert.equal(calculateRemainingHolidayAllowance("22", "11", "6.5"), 4.5);
});
