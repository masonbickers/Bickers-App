import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { maintenanceBookingAssignedToAccount, notificationVisibleToAccount } from "../lib/notificationVisibility.js";

const mason = { uid: "uid-mason", personId: "employee-mason", companyId: "company", employeeCode: "9453" };

test("inbox shows only notifications addressed to the signed-in employee", () => {
  assert.equal(notificationVisibleToAccount({ data: { bookingId: "job", employeeCode: "9453", companyId: "company" } }, mason), true);
  assert.equal(notificationVisibleToAccount({ data: { bookingId: "job", employeeCode: "other", companyId: "company" } }, mason), false);
  assert.equal(notificationVisibleToAccount({ data: { holidayId: "holiday", recipientEmployeeId: "employee-mason" } }, mason), true);
  assert.equal(notificationVisibleToAccount({ data: { holidayId: "holiday", recipientEmployeeId: "employee-other" } }, mason), false);
  assert.equal(notificationVisibleToAccount({ data: { bookingId: "job", employeeCode: "9453", companyId: "other" } }, mason), false);
});

test("unaddressed fleet activity stays out of a personal inbox", () => {
  assert.equal(notificationVisibleToAccount({ title: "Maintenance booked", data: {} }, mason), false);
  assert.equal(notificationVisibleToAccount({ title: "Maintenance booked", data: { recipientEmployeeId: "employee-mason" } }, mason), true);
  assert.equal(notificationVisibleToAccount({ data: { recipientUid: "uid-other" } }, mason), false);
});

test("maintenance reminders require an explicit employee assignment", () => {
  assert.equal(maintenanceBookingAssignedToAccount({ vehicleId: "van" }, mason), false);
  assert.equal(maintenanceBookingAssignedToAccount({ employeeCodes: ["9453"] }, mason), true);
  assert.equal(maintenanceBookingAssignedToAccount({ assignedEmployeeId: "employee-other" }, mason), false);
});

test("notification API binds anonymous sessions to a server-side employee record", () => {
  const server = readFileSync(new URL("../server/index.js", import.meta.url), "utf8");
  assert.match(server, /String\(userData\.employeeId \|\| ""\)\.trim\(\) !== employee\.id/);
  assert.match(server, /String\(decodedUser\.employeeId \|\| ""\)\.trim\(\) !== employee\.id/);
});
