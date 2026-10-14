function parseCalendarDate(year, month, day, hours = 0, minutes = 0) {
  const date = new Date(year, month - 1, day, hours, minutes);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

export function parseServiceRecordDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return parseServiceRecordDate(value.toDate());
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  const yearFirst = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(text);
  if (yearFirst && (!text[yearFirst[0].length] || text[yearFirst[0].length] === "Z" || text[yearFirst[0].length] === ":" || text[yearFirst[0].length] === "." || text[yearFirst[0].length] === "+" || text[yearFirst[0].length] === "-")) {
    if (text.includes("T") && /(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) {
      const dated = new Date(text);
      return Number.isNaN(dated.getTime()) ? null : dated;
    }
    return parseCalendarDate(...yearFirst.slice(1, 6).map((part) => Number(part || 0)));
  }

  const dayFirst = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text);
  if (dayFirst) {
    const [, day, month, year, hours, minutes] = dayFirst;
    return parseCalendarDate(Number(year), Number(month), Number(day), Number(hours || 0), Number(minutes || 0));
  }

  return null;
}

export function formatServiceRecordDate(value, { includeTime = false } = {}) {
  const date = parseServiceRecordDate(value);
  if (!date) return "";
  const pad = (part) => String(part).padStart(2, "0");
  const day = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  return includeTime ? `${day} · ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}
