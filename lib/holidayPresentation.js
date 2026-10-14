export function getHolidayBalancePresentation(balance) {
  const roundedBalance = Number(Number(balance || 0).toFixed(1));
  const isOverbooked = roundedBalance < 0;
  const balanceValue = Math.abs(roundedBalance);

  return {
    isOverbooked,
    balanceValue,
    balanceLabel: isOverbooked
      ? `Balance: -${balanceValue}`
      : `Available: ${balanceValue}`,
  };
}

export function getVisibleHolidayHistory(items, expanded, limit = 3) {
  const newestFirst = [...items].reverse();
  return expanded ? newestFirst : newestFirst.slice(0, limit);
}

export function shouldStackHolidayRows(width, fontScale) {
  return width < 360 || fontScale >= 1.3;
}
export function getHolidayLeaveType(holiday = {}) {
  const normalise = (value) => String(value ?? "").trim().toLowerCase();
  if (holiday.isAccrued === true || [holiday.paidStatus, holiday.leaveType, holiday.type, holiday.category]
    .some((value) => normalise(value).includes("accrued") || normalise(value).includes("toil"))) return "Accrued";

  const paidStatus = normalise(holiday.paidStatus);
  if (paidStatus === "paid") return "Paid";
  if (paidStatus === "unpaid") return "Unpaid";

  if (holiday.isUnpaid === true || holiday.unpaid === true || holiday.paid === false ||
      [holiday.leaveType, holiday.type, holiday.holidayType].some((value) => normalise(value).includes("unpaid"))) return "Unpaid";
  return "Paid";
}
