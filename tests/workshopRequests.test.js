import assert from "node:assert/strict";
import test from "node:test";
import {
  routeForWorkshopRequest,
  completionForWorkshopRequest,
  isWorkshopRequestVisible,
} from "../lib/workshopRequests.js";

test("each request opens its matching form with stable request and asset context", () => {
  const base = { id: "request-1", assetId: "asset-1" };
  assert.deepEqual(
    ["full_service", "minor_service", "general_repair", "vehicle_check", "equipment_inspection", "mot_precheck"].map((workType) => routeForWorkshopRequest({ ...base, workType })),
    [
      "/service/service-form/request-1?workshopRequestId=request-1&vehicleId=asset-1",
      "/service/minor-service/request-1?workshopRequestId=request-1&vehicleId=asset-1",
      "/service/repair-form?workshopRequestId=request-1&vehicleId=asset-1",
      "/service/vehicle-check-form/request-1?workshopRequestId=request-1&vehicleId=asset-1",
      "/service/inspections/inspection-form/new-request-1?workshopRequestId=request-1&equipmentDocId=asset-1",
      "/service/mot-precheck/request-1?workshopRequestId=request-1&vehicleId=asset-1",
    ]
  );
});

test("completion requires the matching signed form", () => {
  const request = { id: "one", workType: "general_repair", assetId: "van-1", companyId: "tenant-1", status: "open" };
  assert.equal(completionForWorkshopRequest(request, { id: "record-1", collection: "serviceRecords", assetId: "van-1", signedBy: "Alex" }).status, "completed");
  assert.throws(() => completionForWorkshopRequest(request, { id: "record-1", collection: "equipmentInspections", assetId: "van-1", signedBy: "Alex" }));
  assert.throws(() => completionForWorkshopRequest(request, { id: "record-1", collection: "serviceRecords", assetId: "other", signedBy: "Alex" }));
  assert.throws(() => completionForWorkshopRequest(request, { id: "record-1", collection: "serviceRecords", assetId: "van-1" }));
});

test("request list stays within company and selected status", () => {
  assert.equal(isWorkshopRequestVisible({ companyId: "a", status: "open" }, "a", "open"), true);
  assert.equal(isWorkshopRequestVisible({ companyId: "b", status: "open" }, "a", "open"), false);
  assert.equal(isWorkshopRequestVisible({ companyId: "a", status: "completed" }, "a", "open"), false);
});
