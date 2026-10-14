export const WORKSHOP_DRAFT_KEYS = ["serviceFormDrafts_v1", "minorServiceFormDrafts_v1"];
export const WORKSHOP_FORM_FLAGS = { motResultLog: false, tyreBrakeCheck: false, dailyCheck: false };

export function readWorkshopDrafts(fullRaw, minorRaw) {
  let errors = 0;
  const drafts = [];
  for (const [raw, type, prefix, fallback] of [
    [fullRaw, "Service Job Form", "/service/service-form", "Service draft"],
    [minorRaw, "Interim / Minor Service", "/service/minor-service", "Minor service draft"],
  ]) {
    try {
      const records = raw ? JSON.parse(raw) : {};
      if (!records || typeof records !== "object" || Array.isArray(records)) throw new Error("Invalid draft collection");
      for (const [id, draft] of Object.entries(records)) {
        if (!draft || typeof draft !== "object" || Array.isArray(draft)) { errors += 1; continue; }
        const text = (value) => typeof value === "string" ? value : "";
        const requestQuery = draft.workshopRequestId && draft.requestedVehicleId
          ? `?workshopRequestId=${encodeURIComponent(draft.workshopRequestId)}&vehicleId=${encodeURIComponent(draft.requestedVehicleId)}` : "";
        drafts.push({ id, type, route: `${prefix}/${encodeURIComponent(id)}${requestQuery}`, timestamp: Number(id.split("-").pop()) || 0,
          workshopRequestId: text(draft.workshopRequestId), requestedVehicleId: text(draft.requestedVehicleId),
          title: text(draft.vehicleName) || text(draft.vehicleSearch) || fallback,
          registration: text(draft.registration), serviceType: text(draft.serviceType) || type,
          serviceDate: text(draft.serviceDate) || "In progress" });
      }
    } catch { errors += 1; }
  }
  return { drafts: drafts.sort((a, b) => b.timestamp - a.timestamp), errors };
}

export function createWorkshopFormGroups(navigate, now = Date.now, flags = WORKSHOP_FORM_FLAGS) {
  const form = (title, subtitle, icon, route) => ({ title, subtitle, icon, onPress: () => navigate(typeof route === "function" ? route() : route) });
  return [
    { title: "Service Forms", forms: [
      form("Full Service", "Full service checklist, parts, labour and workshop notes.", "tool", () => `/service/service-form/manual-${now()}`),
      form("Interim / Minor Service", "Oil, filters and basic safety checks for shorter intervals.", "refresh-ccw", () => `/service/minor-service/minor-${now()}`),
    ] },
    { title: "Inspections", forms: [form("Equipment Inspection", "Pre-use condition check for stunt equipment, rigs and vehicles.", "clipboard", () => `/service/inspections/inspection-form/new-${now()}`)] },
    { title: "MOT & Compliance", forms: [
      form("MOT Pre-Check", "Lights, tyres, brakes, washer, emissions prep and advisories.", "clipboard", () => `/service/mot-precheck/mot-${now()}`),
      ...(flags.motResultLog ? [form("MOT Result / Advisory Log", "Record pass/fail, advisories and next actions.", "file-text", "/service/mot-result")] : []),
    ] },
    { title: "Defects & Repairs", forms: [
      form("Defect Report", "Driver or crew-reported issues that need investigation.", "alert-triangle", "/service/defect-form"),
      form("General Repairs", "Record ad-hoc repairs, rectification work and parts used.", "tool", "/service/repair-form"),
    ] },
    ...(flags.tyreBrakeCheck || flags.dailyCheck ? [{ title: "Tyres & Safety Checks", forms: [
      ...(flags.tyreBrakeCheck ? [form("Tyre & Brake Check", "Depth, wear pattern, pressures, discs & pads condition.", "target", "/service/tyre-brake-check")] : []),
      ...(flags.dailyCheck ? [form("Pre-Shoot / Daily Check", "Fluids, damage, load security and on-set readiness.", "shield", "/service/daily-check")] : []),
    ] }] : []),
  ];
}
