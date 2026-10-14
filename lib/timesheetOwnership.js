// Session identity comes from AuthProvider's Firebase user and employee link.
// Apply after editable state so cached or offline data cannot replace ownership.
export function timesheetOwnership(employee) {
  const companyId = employee?.companyId;
  const employeeId = employee?.employeeId;
  const ownerUid = employee?.uid;
  if (![companyId, employeeId, ownerUid].every(
    (value) => typeof value === "string" && /^[^/\s]+$/.test(value)
  )) {
    throw new Error("Missing authenticated timesheet ownership");
  }
  return { companyId, employeeId, ownerUid };
}
