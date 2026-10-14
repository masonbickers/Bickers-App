import assert from "node:assert/strict";
import test from "node:test";

import { formatISODateDDMMYYYY, parseDDMMYYYYToISO } from "../lib/dateFormat.js";

test("ISO calendar dates display as day-month-year without changing other values", () => {
  assert.equal(formatISODateDDMMYYYY("2026-09-24"), "24-09-2026");
  assert.equal(formatISODateDDMMYYYY("2026-01-03"), "03-01-2026");
  assert.equal(formatISODateDDMMYYYY(""), "");
  assert.equal(formatISODateDDMMYYYY("24/09/2026"), "24/09/2026");
});

test("entered day-month-year dates are stored as ISO calendar dates", () => {
  assert.equal(parseDDMMYYYYToISO("24-09-2026"), "2026-09-24");
  assert.equal(parseDDMMYYYYToISO("2026-09-24"), "2026-09-24");
  assert.equal(parseDDMMYYYYToISO(""), "");
});
