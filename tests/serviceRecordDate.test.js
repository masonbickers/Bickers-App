import test from "node:test";
import assert from "node:assert/strict";

import { formatServiceRecordDate } from "../lib/serviceRecordDate.js";

test("service record dates display in day-month-year order", () => {
  assert.equal(formatServiceRecordDate("2027-07-07"), "07-07-2027");
  assert.equal(formatServiceRecordDate("07/07/2027"), "07-07-2027");
  assert.equal(formatServiceRecordDate("24/09/2026 14:30"), "24-09-2026");
});

test("service record dates accept saved timestamp values without inventing missing dates", () => {
  assert.equal(
    formatServiceRecordDate({ toDate: () => new Date(2026, 8, 24, 14, 30) }),
    "24-09-2026"
  );
  assert.equal(formatServiceRecordDate("31/02/2026"), "");
  assert.equal(formatServiceRecordDate(null), "");
});
