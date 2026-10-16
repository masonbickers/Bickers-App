/** A missing or malformed calendar must never be treated as zero bank holidays. */
export function parseHolidayCalendar(payload, year) {
  const events = payload?.['england-and-wales']?.events;
  if (!Array.isArray(events) || !Number.isInteger(Number(year))) throw new Error('Bank holiday calendar unavailable.');
  const dates = new Set();
  for (const event of events) {
    const date = event?.date;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Invalid bank holiday calendar.');
    if (Number(date.slice(0, 4)) === Number(year)) dates.add(date);
  }
  if (!dates.size) throw new Error('Bank holiday calendar unavailable for this year.');
  return dates;
}
