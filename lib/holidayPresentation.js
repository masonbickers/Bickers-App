export function getHolidayBalancePresentation(balance, { historyComplete = true, provisional = false } = {}) {
  if (!historyComplete && provisional && Number.isFinite(Number(balance))) {
    const rounded = Number(Number(balance).toFixed(1));
    return {isOverbooked:false, balanceValue:Math.abs(rounded), balanceLabel:`Balance: ${rounded} days — provisional`};
  }
  if (!historyComplete) {
    return { isOverbooked: false, balanceValue: null, balanceLabel: "Balance: awaiting review" };
  }
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

export function getHolidayRowBalanceLabel(balance, { historyComplete = true } = {}) {
  return historyComplete ? `${Number(Number(balance).toFixed(1))} days` : "Awaiting review";
}

/** Only verified rows with a ready calculation may support an explicitly provisional summary. */
export function getHolidaySummaryMode({historyComplete, withheldCount = 0, hasRecords = false, calculationReady = false, error = false, loading = false}) {
  if (error || withheldCount > 0) return 'unavailable';
  if (loading || !calculationReady) return 'loading';
  if (historyComplete) return 'verified';
  return hasRecords ? 'provisional' : 'unavailable';
}

/** Company-wide legacy review is separate from a server-verified annual personal balance. */
export function isHolidayBalanceVerified(resource, year) {
  if (resource?.error || resource?.withheldCount) return false;
  return resource?.historyComplete === true ||
    (resource?.balanceVerification?.year === year && resource?.balanceVerification?.complete === true);
}
