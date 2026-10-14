import assert from "node:assert/strict";
import test from "node:test";
import { createWorkshopFormGroups, readWorkshopDrafts } from "../lib/workshopForms.js";

test("a damaged draft cache does not hide intact drafts in the other cache", () => {
  const result = readWorkshopDrafts("{broken", JSON.stringify({ "minor-123": { vehicleName: "Transit", registration: "AB12 CDE" } }));
  assert.equal(result.errors, 1);
  assert.equal(result.drafts.length, 1);
  assert.equal(result.drafts[0].route, "/service/minor-service/minor-123");
});

test("invalid entries are isolated and valid drafts sort newest first", () => {
  const result = readWorkshopDrafts(JSON.stringify({ "manual-10": { vehicleName: "First" }, bad: null, "manual-30": { vehicleName: "Last" } }), JSON.stringify({ "minor-20": { vehicleSearch: "Middle" } }));
  assert.equal(result.errors, 1);
  assert.deepEqual(result.drafts.map((draft) => draft.title), ["Last", "Middle", "First"]);
  assert.deepEqual(readWorkshopDrafts(null, null), { drafts: [], errors: 0 });
});

test("request-origin service drafts resume with their request and vehicle", () => {
  const result = readWorkshopDrafts(JSON.stringify({ "svc-123": {
    workshopRequestId: "request/a", requestedVehicleId: "vehicle b",
  } }), null);
  assert.equal(result.drafts[0].route, "/service/service-form/svc-123?workshopRequestId=request%2Fa&vehicleId=vehicle%20b");
});

test("workshop actions preserve each supported form destination", () => {
  const destinations = [];
  const groups = createWorkshopFormGroups((route) => destinations.push(route), () => 123);
  groups.flatMap((group) => group.forms).forEach((form) => form.onPress());
  assert.deepEqual(destinations, ["/service/service-form/manual-123", "/service/minor-service/minor-123", "/service/inspections/inspection-form/new-123", "/service/mot-precheck/mot-123", "/service/defect-form", "/service/repair-form"]);
});
