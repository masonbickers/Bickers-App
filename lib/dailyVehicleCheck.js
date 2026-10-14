import { findVehicleRecord, getVehicleReferenceId } from "./fleetSchema.js";

const CHECK_LABELS = [
  "Fuel / Oil / Fluid leaks",
  "Body and Wings Security (Condition)",
  "Tyres / Wheels and Wheel Fixings",
  "Battery Security (If easily accessible)",
  "Brake Lines*",
  "Coupling Security*",
  "Electrical Connections*",
  "Air Build-Up / Leaks",
  "Spray Suppression Devices",
  "Vehicle Height / Load Security (Condition)",
  "Excessive Engine Smoke",
  "Registration Plates",
  "Cab Interior / Seat Belts (Condition)",
  "Tachograph / Sufficient Print Rolls",
  "Steering / Brakes (Inc. ABS / EBS)",
  "Mirrors / Cameras / Glass / Visibility",
  "Lights / Indicators / Side Repeaters",
  "Wipers / Washers / Horn",
  "Reflectors / Markers / Warning Plates",
  "Warning Lamps / MIL (If required)",
  "Speedometer / Speed Limiter",
  "Operator Licence (Visible)",
  "Adblue® / DEF (If required)",
  "Cab, doors and steps security and condition",
  "Height marker (running height)",
  "High voltage emergency cut-off (if fitted)",
  "Alternative fuel systems and isolation (if fitted)",
  "Driver assistance systems / ADAS (if fitted)",
  "Ancillary equipment (if fitted)",
];

export const dailyVehicleCheckItems = CHECK_LABELS.map((label, index) => ({
  i: index + 1,
  label,
  status: null,
  note: "",
  assessment: "",
}));

export const dailyVehicleCheckSections = [
  { id: "cab", title: "Cab & controls", icon: "truck", description: "Visibility, controls, warnings and driver equipment", itemNumbers: [13, 14, 15, 16, 18, 20, 21, 24, 25, 28] },
  { id: "exterior", title: "Exterior & body", icon: "maximize", description: "Leaks, bodywork, lights, plates and markers", itemNumbers: [1, 2, 4, 11, 12, 17, 19, 22, 23, 26, 27, 29] },
  { id: "running", title: "Wheels & brakes", icon: "disc", description: "Tyres, wheel fixings, brakes and air system", itemNumbers: [3, 5, 8, 9] },
  { id: "equipment", title: "Load & equipment", icon: "package", description: "Coupling, connections, height and load security", itemNumbers: [6, 7, 10] },
];

export function buildVehicleCheckDraftId(uid, jobId, dateISO) {
  return `daily-draft_${encodeURIComponent(String(uid || "unknown"))}_${encodeURIComponent(String(jobId || "standalone"))}_${encodeURIComponent(String(dateISO || "unknown-date"))}`;
}

export function validateDailyVehicleCheck({ items, vehicleId, odometer }) {
  if (!vehicleId) return "Please select a vehicle.";
  if (!/^\d+(?:\.\d+)?$/.test(String(odometer || "").trim())) return "Please enter a valid odometer reading.";
  if (!Array.isArray(items) || items.length !== dailyVehicleCheckItems.length || items.some((item) => !item.status)) {
    return "Please complete every check item.";
  }
  if (items.some((item) => item.status === "defect" && !String(item.note || "").trim())) {
    return "Please add a note for each item marked as Defect.";
  }
  if (items.some((item) => item.status === "defect" && !["dangerous", "other"].includes(item.assessment))) {
    return "Please choose an assessment for each defect.";
  }
  return null;
}

export function isReportableCheckDefect(check, item) {
  const approvedLegacy = item?.review?.status === "approved" && ["general", "immediate"].includes(item?.review?.category);
  return approvedLegacy || (check?.status === "submitted" && item?.status === "defect");
}

function checkCadence(vehicleRef, vehicles) {
  const vehicle = findVehicleRecord(vehicleRef, vehicles) || vehicleRef;
  const category = String(vehicle?.category || vehicle?.vehicleType || vehicle?.type || "").toLowerCase();
  if (/\b(hgvs?|lorry|lorries|heavy goods|heavy vehicle)\b/.test(category)) return "daily";
  return "job";
}

export function hasSubmittedJobVehicleCheck(checks, { jobId, dateISO, vehicleRefs, vehicles = [] } = {}) {
  const assigned = (vehicleRefs || []).map((ref) => ({
    id: getVehicleReferenceId(ref),
    cadence: checkCadence(ref, vehicles),
  })).filter((vehicle) => vehicle.id);
  if (!jobId || !dateISO || !assigned.length) return false;
  return assigned.every(({ id, cadence }) => (checks || []).some((check) =>
    check.status === "submitted" && String(check.vehicleId || "") === id &&
    (cadence === "daily"
      ? check.dateISO === dateISO
      : String(check.jobId || check.bookingId) === String(jobId))
  ));
}

export function hasOpenDangerousVehicleDefect(checks, vehicleRefs = []) {
  const vehicleIds = new Set(vehicleRefs.map(getVehicleReferenceId).filter(Boolean));
  return (checks || []).some((check) =>
    check.status === "submitted" && vehicleIds.has(String(check.vehicleId || "")) &&
    (check.items || []).some((item) =>
      item.status === "defect" && item.assessment === "dangerous" &&
      !["resolved", "complete", "completed"].includes(String(item.maintenance?.status || "").toLowerCase())
    )
  );
}
