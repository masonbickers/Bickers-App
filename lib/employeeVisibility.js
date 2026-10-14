const INACTIVE_STATUSES = new Set([
  "archived", "deleted", "disabled", "ended", "former", "inactive", "left",
  "leaver", "removed", "terminated",
]);
const normalise = (value) => String(value || "").trim().toLowerCase();

/** Active directories only; historical record lookups must retain archived employees. */
export function isCurrentEmployeeRecord(employee) {
  if (!employee || typeof employee !== "object") return false;
  if (employee.active === false || ["deleted", "isDeleted", "removed", "isRemoved", "archived", "isArchived"].some((field) => employee[field] === true)) return false;
  if (["archived", "deleted", "removed"].includes(normalise(employee.role))) return false;
  return !INACTIVE_STATUSES.has(normalise(employee.employmentStatus || employee.lifecycleStatus || employee.employeeStatus));
}
