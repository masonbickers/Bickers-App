/** Remove only consecutive copies of this route, preserving the actual origin. */
export function timesheetBackCount(state) {
  const routes = state?.routes || [];
  const index = state?.index ?? routes.length - 1;
  if (routes[index]?.name !== "timesheet") return 1;
  let count = 1;
  while (index - count > 0 && routes[index - count]?.name === "timesheet") count += 1;
  return count;
}
