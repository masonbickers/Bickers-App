import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentEmployeeRecord } from "../lib/employeeVisibility.js";

test("archived or inactive employee records do not appear in active directories", () => {
  const archived = { name: "Tim Rogers", active: false, archived: true, isEnabled: false };
  const current = { name: "Current colleague", active: true };
  assert.deepEqual([archived, current].filter(isCurrentEmployeeRecord), [current]);
  assert.deepEqual(archived, { name: "Tim Rogers", active: false, archived: true, isEnabled: false });
});

test("legacy removal flags and lifecycle statuses are excluded", () => {
  for (const field of ["deleted", "isDeleted", "removed", "isRemoved", "archived", "isArchived"]) assert.equal(isCurrentEmployeeRecord({ [field]: true }), false);
  for (const status of ["archived", "deleted", "disabled", "ended", "former", "inactive", "left", "leaver", "removed", "terminated"]) {
    for (const field of ["employmentStatus", "lifecycleStatus", "employeeStatus"]) assert.equal(isCurrentEmployeeRecord({ [field]: ` ${status.toUpperCase()} ` }), false);
  }
  assert.equal(isCurrentEmployeeRecord({ role: "archived" }), false);
});

test("current and legacy active staff remain available without treating login permissions as employment status", () => {
  for (const employee of [{}, { active: true }, { employmentStatus: "active" }, { employmentStatus: "on leave" }, { isEnabled: false, active: true }]) assert.equal(isCurrentEmployeeRecord(employee), true);
  assert.equal(isCurrentEmployeeRecord(null), false);
});
