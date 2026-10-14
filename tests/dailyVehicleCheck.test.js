import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVehicleCheckDraftId,
  dailyVehicleCheckItems,
  isReportableCheckDefect,
  hasSubmittedJobVehicleCheck,
  hasOpenDangerousVehicleDefect,
  validateDailyVehicleCheck,
} from "../lib/dailyVehicleCheck.js";

test("daily checklist includes the current HGV-specific checks", () => {
  const labels = dailyVehicleCheckItems.map((item) => item.label).join(" ");
  for (const topic of ["doors and steps", "height marker", "high voltage", "alternative fuel", "driver assistance", "ancillary equipment"]) {
    assert.match(labels.toLowerCase(), new RegExp(topic));
  }
});

test("daily drafts are separate for driver, job and date", () => {
  const base = buildVehicleCheckDraftId("driver/1", "job/1", "2026-09-24");
  assert.notEqual(base, buildVehicleCheckDraftId("driver/2", "job/1", "2026-09-24"));
  assert.notEqual(base, buildVehicleCheckDraftId("driver/1", "job/2", "2026-09-24"));
  assert.notEqual(base, buildVehicleCheckDraftId("driver/1", "job/1", "2026-09-25"));
  assert.doesNotMatch(base, /\//);
});

test("submission requires a vehicle, odometer and assessed defect notes", () => {
  const clear = dailyVehicleCheckItems.map((item) => ({ ...item, status: "serviceable" }));
  assert.equal(validateDailyVehicleCheck({ items: clear, vehicleId: "van-1", odometer: "140000" }), null);
  assert.match(validateDailyVehicleCheck({ items: clear, vehicleId: "", odometer: "140000" }), /vehicle/i);
  assert.match(validateDailyVehicleCheck({ items: clear, vehicleId: "van-1", odometer: "" }), /odometer/i);
  const defective = clear.map((item, index) => index === 0 ? { ...item, status: "defect", note: "Brake fluid leak" } : item);
  assert.match(validateDailyVehicleCheck({ items: defective, vehicleId: "van-1", odometer: "140000" }), /assessment/i);
  defective[0].assessment = "dangerous";
  assert.equal(validateDailyVehicleCheck({ items: defective, vehicleId: "van-1", odometer: "140000" }), null);
});

test("submitted driver defects reach workshop while drafts and clear items do not", () => {
  const defect = { status: "defect", assessment: "dangerous", note: "Brake fluid leak" };
  assert.equal(isReportableCheckDefect({ status: "submitted" }, defect), true);
  assert.equal(isReportableCheckDefect({ status: "draft" }, defect), false);
  assert.equal(isReportableCheckDefect({ status: "submitted" }, { status: "serviceable" }), false);
  assert.equal(isReportableCheckDefect({ status: "submitted" }, { review: { status: "approved", category: "general" } }), true);
});

test("job check completion requires a submitted record for each assigned vehicle on that date", () => {
  const identity = { jobId: "job-1", dateISO: "2026-09-24", vehicleRefs: ["van-1", { id: "truck-2" }], vehicles: [{ id: "van-1", category: "Vans" }, { id: "truck-2", category: "Lorries" }] };
  const checks = [
    { jobId: "job-1", dateISO: "2026-09-23", vehicleId: "van-1", status: "submitted" },
    { jobId: "job-1", dateISO: "2026-09-24", vehicleId: "truck-2", status: "draft" },
  ];
  assert.equal(hasSubmittedJobVehicleCheck(checks, identity), false);
  checks[1].status = "submitted";
  assert.equal(hasSubmittedJobVehicleCheck(checks, identity), true);
  checks[1].dateISO = "2026-09-23";
  assert.equal(hasSubmittedJobVehicleCheck(checks, identity), false);
});

test("one HGV check covers its vehicle for that day, across jobs", () => {
  const checks = [{ jobId: "job-1", dateISO: "2026-09-24", vehicleId: "truck-2", status: "submitted" }];
  const identity = { jobId: "job-2", dateISO: "2026-09-24", vehicleRefs: ["truck-2"], vehicles: [{ id: "truck-2", category: "Lorries" }] };
  assert.equal(hasSubmittedJobVehicleCheck(checks, identity), true);
  assert.equal(hasSubmittedJobVehicleCheck(checks, { ...identity, dateISO: "2026-09-25" }), false);
});

test("a non-HGV check lasts for its job but does not cover a different job", () => {
  const checks = [{ jobId: "job-1", dateISO: "2026-09-24", vehicleId: "van-1", status: "submitted" }];
  const identity = { jobId: "job-1", dateISO: "2026-09-25", vehicleRefs: ["van-1"], vehicles: [{ id: "van-1", category: "Vans" }] };
  assert.equal(hasSubmittedJobVehicleCheck(checks, identity), true);
  assert.equal(hasSubmittedJobVehicleCheck(checks, { ...identity, jobId: "job-2" }), false);
});

test("unclassified vehicles and trailers need one check per job", () => {
  const checks = [{ jobId: "job-1", dateISO: "2026-09-24", vehicleId: "asset-1", status: "submitted" }];
  for (const category of ["", "Trailer"]) {
    assert.equal(hasSubmittedJobVehicleCheck(checks, {
      jobId: "job-1", dateISO: "2026-09-25", vehicleRefs: ["asset-1"],
      vehicles: [{ id: "asset-1", category }],
    }), true);
    assert.equal(hasSubmittedJobVehicleCheck(checks, {
      jobId: "job-2", dateISO: "2026-09-25", vehicleRefs: ["asset-1"],
      vehicles: [{ id: "asset-1", category }],
    }), false);
  }
});

test("an unresolved dangerous defect warns on later jobs using that vehicle", () => {
  const checks = [{ vehicleId: "truck-2", status: "submitted", items: [{ status: "defect", assessment: "dangerous" }] }];
  assert.equal(hasOpenDangerousVehicleDefect(checks, [{ id: "truck-2" }]), true);
  checks[0].items[0].maintenance = { status: "resolved" };
  assert.equal(hasOpenDangerousVehicleDefect(checks, ["truck-2"]), false);
});
