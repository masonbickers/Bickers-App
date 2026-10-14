import assert from "node:assert/strict";
import test from "node:test";
import { bookingDetailRows } from "../lib/bookingDetailPresentation.js";

test("booking details format dates and mixed crew records without changing source data", () => {
  const booking = { client: "Production", startDate: "2026-10-14", endDate: "2026-10-15", employees: ["Alex", { name: "Sam" }], notes: "Full note\nSecond line" };
  const before = JSON.stringify(booking);
  const rows = bookingDetailRows(booking);
  assert.equal(rows.find((row) => row.label === "Dates").value, "14/10/2026 → 15/10/2026");
  assert.equal(rows.find((row) => row.label === "Crew").value, "Alex\nSam");
  assert.equal(rows.find((row) => row.label === "Notes").value, booking.notes);
  assert.equal(JSON.stringify(booking), before);
});

test("booking details omit absent fields and use existing vehicle-name formatting", () => {
  assert.deepEqual(bookingDetailRows({}), []);
  const rows = bookingDetailRows({ dates: ["2026-10-14"], vehicles: [{ name: "Pool Van", registration: "LM17 WFG" }] });
  assert.equal(rows.find((row) => row.label === "Dates").value, "14/10/2026");
  assert.match(rows.find((row) => row.label === "Vehicles").value, /Pool Van/);
});
