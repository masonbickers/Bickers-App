export function holidayBelongsToYear(holiday, year, startDate) {
  const recordedYear = [holiday?.holidayYear, holiday?.leaveYear, holiday?.year].find(
    (value) => value !== undefined && value !== null && String(value).trim() !== ""
  );

  if (recordedYear !== undefined) {
    const parsedYear = Number(recordedYear);
    if (Number.isInteger(parsedYear)) return parsedYear === Number(year);
  }

  return !!startDate && startDate.getFullYear() === Number(year);
}

export function calculateRemainingHolidayAllowance(totalAllowance, takenDays, bookedDays = 0) {
  const allowance = Number(totalAllowance);
  const taken = Number(takenDays);
  const booked = Number(bookedDays);
  return (Number.isFinite(allowance) ? allowance : 0) -
    (Number.isFinite(taken) ? taken : 0) -
    (Number.isFinite(booked) ? booked : 0);
}

export function effectiveHolidayCarryOver(carried, usedByDeadline, year, now = new Date()) {
  const granted = Math.max(0, Number(carried) || 0);
  const used = Math.min(granted, Math.max(0, Number(usedByDeadline) || 0));
  return now >= new Date(Number(year), 3, 1) ? used : granted;
}
