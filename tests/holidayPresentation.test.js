import assert from "node:assert/strict";
import test from "node:test";

import {
  getHolidayBalancePresentation,
  getVisibleHolidayHistory,
  shouldStackHolidayRows,
  getHolidayLeaveType,
} from "../lib/holidayPresentation.js";

test("edited web paid status overrides older type and boolean fields", () => {
  assert.equal(getHolidayLeaveType({ paidStatus: "Unpaid", leaveType: "Paid", paid: true }), "Unpaid");
  assert.equal(getHolidayLeaveType({ paidStatus: "Paid", leaveType: "Unpaid", isUnpaid: true }), "Paid");
  assert.equal(getHolidayLeaveType({ paidStatus: "Accrued", leaveType: "Paid" }), "Accrued");
});

test("negative holiday balances use one concise balance label", () => {
  assert.deepEqual(getHolidayBalancePresentation(-48), {
    isOverbooked: true,
    balanceValue: 48,
    balanceLabel: "Balance: -48",
  });
  assert.deepEqual(getHolidayBalancePresentation(9), {
    isOverbooked: false,
    balanceValue: 9,
    balanceLabel: "Available: 9",
  });
});

test("past holiday history starts with the three most recent entries", () => {
  const items = ["oldest", "older", "middle", "recent", "newest"];

  assert.deepEqual(getVisibleHolidayHistory(items, false), ["newest", "recent", "middle"]);
  assert.deepEqual(getVisibleHolidayHistory(items, true), ["newest", "recent", "middle", "older", "oldest"]);
});

test("holiday rows stack only when compact width or larger text needs it", () => {
  assert.equal(shouldStackHolidayRows(390, 1), false);
  assert.equal(shouldStackHolidayRows(390, 1.4), true);
  assert.equal(shouldStackHolidayRows(320, 1), true);
});
