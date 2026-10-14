import assert from "node:assert/strict";
import test from "node:test";

import { formatLongBookingDate } from "../lib/dateDisplay.js";

test("booking dates use weekday, ordinal day, month and year", () => {
  assert.equal(formatLongBookingDate("2026-09-24"), "Thurs 24th Sept 2026");
  assert.equal(formatLongBookingDate("2026-09-25"), "Fri 25th Sept 2026");
  assert.equal(formatLongBookingDate("2026-10-01"), "Thurs 1st Oct 2026");
  assert.equal(formatLongBookingDate("2026-10-11"), "Sun 11th Oct 2026");
});
