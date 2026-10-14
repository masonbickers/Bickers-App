function localDate(value) {
  if (typeof value?.toDate === "function") return localDate(value.toDate());
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() + 1 === Number(match[2]) && date.getDate() === Number(match[3]) ? date : null;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isReviewableHolidayRange(start, end) {
  const first = localDate(start);
  const last = localDate(end || start);
  return !!first && !!last && first <= last && first.getFullYear() === last.getFullYear();
}

export function holidayDateKeysFromRange(start, end) {
  if (!isReviewableHolidayRange(start, end)) return [];
  const first = localDate(start);
  const last = localDate(end || start);
  const keys = [];
  for (const day = new Date(first); day <= last; day.setDate(day.getDate() + 1)) keys.push(dateKey(day));
  return keys;
}

export function countHolidayDays(start, end, { bankHolidays = new Set(), startHalfDay = false, endHalfDay = false } = {}) {
  if (!isReviewableHolidayRange(start, end)) return 0;
  const first = localDate(start);
  const last = localDate(end || start);
  const single = first.getTime() === last.getTime();
  let days = 0;
  for (const day = new Date(first); day <= last; day.setDate(day.getDate() + 1)) {
    if (day.getDay() === 0 || day.getDay() === 6 || bankHolidays.has(dateKey(day))) continue;
    const isHalfDay = single
      ? startHalfDay || endHalfDay
      : (day.getTime() === first.getTime() && startHalfDay) ||
        (day.getTime() === last.getTime() && endHalfDay);
    days += isHalfDay ? 0.5 : 1;
  }
  return days;
}
