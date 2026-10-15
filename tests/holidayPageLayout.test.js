import assert from "node:assert/strict";
import test from "node:test";

import { readRouteBundle } from "./helpers/routeSource.js";

const holidaySource = readRouteBundle("app/(protected)/holidaypage.js");

test("holiday page presents leave as an adaptive mobile table", () => {
  assert.match(holidaySource, /function HolidayTableSection/);
  assert.match(holidaySource, /title="Requests"/);
  assert.match(holidaySource, /title="Upcoming confirmed"/);
  assert.match(holidaySource, /title="Past holidays"/);
  assert.match(holidaySource, /styles\.holidayTableRow/);
  assert.match(holidaySource, />Date</);
  assert.match(holidaySource, />Days</);
  assert.match(holidaySource, />Type</);
  assert.match(holidaySource, /\{onCancel \? "Action" : "Balance"\}/);
  assert.match(holidaySource, /const showTableHeader = items\.length > 0 && !stacked/);
  assert.match(holidaySource, /styles\.holidayTableRowStacked/);
  assert.doesNotMatch(holidaySource, /styles\.holidayItem/);
});

test("negative allowance has one full warning and a concise balance chip", () => {
  assert.match(holidaySource, /getHolidayBalancePresentation\(allowanceBalance, \{ historyComplete: historyReliable \}\)/);
  assert.match(holidaySource, /\{balanceLabel\}/);
  assert.doesNotMatch(holidaySource, /`Overbooked:/);
  assert.match(holidaySource, /Paid leave exceeds allowance by/);
  assert.match(holidaySource, /Review upcoming bookings or contact the office/);
});

test("holiday summary remains compact on phone widths", () => {
  assert.match(holidaySource, /label="Paid used"/);
  assert.match(holidaySource, /label="Paid booked"/);
  assert.match(holidaySource, /label="Unpaid"/);
  assert.match(holidaySource, /function Stat\(\{ label, value \}\)/);
  assert.match(holidaySource, /statsGrid:\s*\{\s*flexDirection: "row"/);
});

test("past holiday history is progressively disclosed", () => {
  assert.match(holidaySource, /getVisibleHolidayHistory\(pastItems, historyExpanded\)/);
  assert.match(holidaySource, /View all \$\{pastItems\.length\}/);
  assert.match(holidaySource, /Show recent/);
  assert.match(holidaySource, /variant="ghost"/);
});
