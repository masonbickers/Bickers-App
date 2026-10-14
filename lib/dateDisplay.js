function toDisplayDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string" || value instanceof String) {
    const text = String(value).trim();
    const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if (isoDate) {
      const [, yyyy, mm, dd] = isoDate.map(Number);
      return new Date(yyyy, mm - 1, dd);
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function formatShortDate(value) {
  const date = toDisplayDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function formatLongBookingDate(value) {
  const date = toDisplayDate(value);
  if (!date) return "";

  const weekdays = ["Sun", "Mon", "Tues", "Weds", "Thurs", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const day = date.getDate();
  const suffix = day % 100 >= 11 && day % 100 <= 13
    ? "th"
    : { 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th";

  return `${weekdays[date.getDay()]} ${day}${suffix} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
