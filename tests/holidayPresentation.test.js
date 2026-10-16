import assert from "node:assert/strict";
import test from "node:test";

import {
  getHolidayBalancePresentation,
  getHolidayRowBalanceLabel,
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

test("incomplete holiday history cannot claim an available or overbooked balance", () => {
  for (const balance of [22, 0, -12]) {
    assert.deepEqual(getHolidayBalancePresentation(balance, { historyComplete: false }), {
      isOverbooked: false,
      balanceValue: null,
      balanceLabel: "Balance: awaiting review",
    });
  }
});

test("verified rows cannot imply a complete balance when other leave is withheld", () => {
  // One verified day against 22 allowance does not prove 21 available when
  // another 18 historical days have been withheld from this response.
  assert.equal(getHolidayRowBalanceLabel(22 - 1, { historyComplete: false }), "Awaiting review");
  assert.equal(getHolidayRowBalanceLabel(22 - 1, { historyComplete: true }), "21 days");
  assert.equal(getHolidayRowBalanceLabel(-0.5, { historyComplete: true }), "-0.5 days");
});

test("provisional balance is explicit and never implies approved availability", () => {
  assert.deepEqual(getHolidayBalancePresentation(4, {historyComplete:false, provisional:true}), {
    isOverbooked:false, balanceValue:4, balanceLabel:"Balance: 4 days — provisional",
  });
  assert.equal(getHolidayBalancePresentation(-2.5,{historyComplete:false,provisional:true}).balanceLabel,"Balance: -2.5 days — provisional");
  assert.equal(getHolidayBalancePresentation(-2.5,{historyComplete:false,provisional:true}).isOverbooked,false);
});

test("a provisional summary requires loaded verified records, a valid calculation and no own withheld history", async () => {
  const {getHolidaySummaryMode}=await import('../lib/holidayPresentation.js');
  assert.equal(typeof getHolidaySummaryMode,'function');
  const valid={historyComplete:false,withheldCount:0,hasRecords:true,calculationReady:true};
  assert.equal(getHolidaySummaryMode(valid),'provisional');
  assert.equal(getHolidaySummaryMode({...valid,historyComplete:true}),'verified');
  for(const extra of [{withheldCount:1},{hasRecords:false},{error:true}])assert.equal(getHolidaySummaryMode({...valid,...extra}),'unavailable');
  for(const extra of [{loading:true},{calculationReady:false}])assert.equal(getHolidaySummaryMode({...valid,...extra}),'loading');
});

test('personal annual review qualifies only its reviewed year, never a stale or absent review', async()=>{
  const {isHolidayBalanceVerified}=await import('../lib/holidayPresentation.js');
  assert.equal(typeof isHolidayBalanceVerified,'function');
  assert.equal(isHolidayBalanceVerified({historyComplete:false,balanceVerification:{year:2026,complete:true}},2026),true);
  for(const resource of [{historyComplete:false},{historyComplete:false,balanceVerification:{year:2025,complete:true}},{historyComplete:false,balanceVerification:{year:2026,complete:false}},{historyComplete:false,balanceVerification:{year:2026,complete:true},withheldCount:1}])assert.equal(isHolidayBalanceVerified(resource,2026),false);
});
