export function calendarDayMetrics(tokens, fontScale = 1) {
  return {
    width: Math.max(tokens.controls.buttonHeight, Math.ceil(tokens.typography.body.fontSize * fontScale * 2 + tokens.spacing.xs)),
    height: Math.max(tokens.controls.buttonHeight, Math.ceil(tokens.typography.body.lineHeight * fontScale + tokens.spacing.sm)),
  };
}

export function calendarDayLabel(date, state, marking = {}) {
  const label = new Date(date.year, date.month - 1, date.day).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const details = [label];
  if (state === "today") details.push("Today");
  const jobs = Number(marking.jobCount || 0);
  if (jobs > 0) details.push(`${jobs} ${jobs === 1 ? "job" : "jobs"}`);
  if (marking.scheduleTone === "leave") details.push("Paid leave");
  if (marking.scheduleTone === "unpaid") details.push("Unpaid leave");
  if (marking.bankHoliday) details.push("Bank holiday");
  if (!jobs && !["leave", "unpaid"].includes(marking.scheduleTone) && !marking.bankHoliday) details.push("No scheduled events");
  return details.join(", ");
}
