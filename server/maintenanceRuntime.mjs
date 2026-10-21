// src/app/utils/coreServiceType.js
var isCoreServiceType = (type) => ["Full service", "Interim service", "Interim / minor service", "Oil & filter change"].includes(type);
var isCoreServiceHistory = (row) => row?.maintenanceTypeId ? row.maintenanceTypeId === "service" : row?.serviceType || row?.type ? isCoreServiceType(row.serviceType || row.type) : true;

// src/app/utils/maintenanceWorkshopLink.js
import crypto from "node:crypto";

// src/app/utils/maintenanceSchema.js
var RECURRING_MAINTENANCE_WORKFLOWS = Object.freeze([
  { key: "mot", maintenanceTypeId: "mot", label: "MOT", dueKey: "mot", lastField: "lastMOT", lastFields: ["lastMOT", "lastMot"], nextField: "nextMOT", nextFields: ["nextMOT", "nextMot", "motExpiryDate", "dvsaMotExpiryDate"], frequencyField: "motFreq", frequencyFields: ["motFreq"], isoWeekField: "motISOWeek", historyField: "motHistory", documentsField: "motDocuments", warningWeeks: 3, autoVorAfterDueWeek: false, dvsaAuthoritative: true },
  { key: "service", maintenanceTypeId: "service", label: "Service", dueKey: "service", lastField: "lastService", lastFields: ["lastService"], nextField: "nextService", nextFields: ["nextService", "nextServiceDate"], frequencyField: "serviceFreq", frequencyFields: ["serviceFreq"], isoWeekField: "serviceISOWeek", historyField: "serviceHistory", documentsField: "serviceDocuments", warningWeeks: 4, autoVorAfterDueWeek: false },
  { key: "pmi", maintenanceTypeId: "pmi", label: "PMI inspection", dueKey: "pmi", lastField: "lastPMI", lastFields: ["lastPMI", "lastEightWeekInspection", "eightWeekInspectionStart", "lastLorryInspection"], nextField: "nextPMI", nextFields: ["nextPMI", "nextPMIInspection", "nextEightWeekInspection", "nextLorryInspection"], frequencyField: "pmiFreq", frequencyFields: ["pmiFreq", "eightWeekInspectionFreq", "lorryInspectionFreq"], isoWeekField: "pmiISOWeek", historyField: "pmiHistory", documentsField: "pmiDocuments", warningWeeks: 1, autoVorAfterDueWeek: false },
  { key: "brake_test", maintenanceTypeId: "brake_test", label: "Brake test", dueKey: "brakeTest", lastField: "lastBrakeTest", lastFields: ["lastBrakeTest"], nextField: "nextBrakeTest", nextFields: ["nextBrakeTest"], frequencyField: "brakeTestFreq", frequencyFields: ["brakeTestFreq"], isoWeekField: "brakeISOWeek", historyField: "brakeTestHistory", documentsField: "brakeTestDocuments", warningWeeks: 1, autoVorAfterDueWeek: false },
  { key: "tacho_inspection", maintenanceTypeId: "tacho_inspection", label: "Tacho inspection", dueKey: "tachoInspection", lastField: "lastTacho", lastFields: ["lastTacho", "lastTachoInspection"], nextField: "nextTacho", nextFields: ["nextTacho", "nextTachoInspection"], frequencyField: "tachoFreq", frequencyFields: ["tachoFreq", "tachoInspectionFreq"], isoWeekField: "tachoISOWeek", historyField: "tachoInspectionHistory", documentsField: "tachoInspectionDocuments", warningWeeks: 3, autoVorAfterDueWeek: false },
  { key: "tacho_download", maintenanceTypeId: "tacho_download", label: "Tacho download", dueKey: "tachoDownload", lastField: "lastTachoDownload", lastFields: ["lastTachoDownload"], nextField: "nextTachoDownload", nextFields: ["nextTachoDownload"], frequencyField: "tachoDownloadFreq", frequencyFields: ["tachoDownloadFreq"], isoWeekField: "tachoDownloadISOWeek", historyField: "tachoDownloadHistory", documentsField: "tachoDownloadDocuments", warningWeeks: 3, autoVorAfterDueWeek: false },
  { key: "tail_lift", maintenanceTypeId: "tail_lift", label: "Tail-lift inspection", dueKey: "tailLift", lastField: "lastTailLift", lastFields: ["lastTailLift"], nextField: "nextTailLift", nextFields: ["nextTailLift", "nextTailLiftInspection"], frequencyField: "tailLiftFreq", frequencyFields: ["tailLiftFreq"], isoWeekField: "tailLiftISOWeek", historyField: "tailLiftHistory", documentsField: "tailLiftDocuments", warningWeeks: 3, autoVorAfterDueWeek: false },
  { key: "loler", maintenanceTypeId: "loler", label: "LOLER", dueKey: "loler", lastField: "lastLoler", lastFields: ["lastLoler", "lastLOLER"], nextField: "nextLoler", nextFields: ["nextLoler", "nextLOLER", "nextLOLERInspection"], frequencyField: "lolerFreq", frequencyFields: ["lolerFreq", "lOLERFreq"], isoWeekField: "lolerISOWeek", historyField: "lolerHistory", documentsField: "lolerDocuments", warningWeeks: 3, autoVorAfterDueWeek: false },
  { key: "tacho_calibration", maintenanceTypeId: "tacho_calibration", label: "Tacho calibration", dueKey: "tachoCalibration", lastField: "lastTachoCalibration", lastFields: ["lastTachoCalibration"], nextField: "nextTachoCalibration", nextFields: ["nextTachoCalibration"], frequencyField: "tachoCalibrationFreq", frequencyFields: ["tachoCalibrationFreq"], isoWeekField: "tachoCalibrationISOWeek", historyField: "tachoCalibrationHistory", documentsField: "tachoCalibrationDocuments", warningWeeks: 3, autoVorAfterDueWeek: false }
]);
var getRecurringMaintenanceWorkflow = (maintenanceTypeId) => RECURRING_MAINTENANCE_WORKFLOWS.find(
  (workflow) => workflow.maintenanceTypeId === String(maintenanceTypeId || "").trim().toLowerCase()
) || null;
var getConfiguredMaintenanceFrequencyWeeks = (vehicle = {}, workflowOrTypeId) => {
  const workflow = typeof workflowOrTypeId === "object" ? workflowOrTypeId : getRecurringMaintenanceWorkflow(workflowOrTypeId);
  if (!workflow) return 0;
  return (workflow.frequencyFields || [workflow.frequencyField]).map((field) => Number(vehicle?.[field] || 0)).find((value) => Number.isFinite(value) && value > 0) || 0;
};
var ADDITIONAL_MAINTENANCE_WORKFLOWS = Object.freeze(
  RECURRING_MAINTENANCE_WORKFLOWS.filter(
    (workflow) => !["mot", "service"].includes(workflow.maintenanceTypeId)
  )
);
var CALENDAR_REMINDER_WORKFLOW_KEYS = Object.freeze([
  "brake_test",
  "pmi"
]);
var CORE_MAINTENANCE_TYPE_IDS = Object.freeze({
  MOT: "mot",
  SERVICE: "service",
  INSPECTION: "eight_week_inspection",
  WORK: "work"
});
var OUT_OF_USE_STATUS_VALUES = /* @__PURE__ */ new Set([
  "vor",
  "out of use",
  "out-of-use",
  "out_of_use",
  "inactive",
  "off road",
  "off-road",
  "off_road"
]);
var ACTIVE_VEHICLE_STATUS = "Active";
var VOR_VEHICLE_STATUS = "VOR";
var ARCHIVE_VEHICLE_STATUS = "Archive";
var normalizeVehicleOperatingStatus = (valueOrAsset = {}) => {
  if (valueOrAsset && typeof valueOrAsset === "object" && (valueOrAsset.archived === true || valueOrAsset.isArchived === true)) {
    return ARCHIVE_VEHICLE_STATUS;
  }
  const values = valueOrAsset && typeof valueOrAsset === "object" ? [
    valueOrAsset.operationalStatus,
    valueOrAsset.fleetStatus,
    valueOrAsset.vehicleStatus,
    valueOrAsset.availabilityStatus,
    valueOrAsset.status
  ] : [valueOrAsset];
  if (values.some((value) => ["archive", "archived"].includes(String(value || "").trim().toLowerCase()))) {
    return ARCHIVE_VEHICLE_STATUS;
  }
  return values.some(
    (value) => OUT_OF_USE_STATUS_VALUES.has(String(value || "").trim().toLowerCase())
  ) ? VOR_VEHICLE_STATUS : ACTIVE_VEHICLE_STATUS;
};
var syncVehicleOperatingStatus = (asset = {}, status) => {
  const normalized = normalizeVehicleOperatingStatus(status);
  return {
    ...asset,
    operationalStatus: normalized,
    fleetStatus: normalized,
    vehicleStatus: normalized,
    availabilityStatus: normalized,
    status: normalized
  };
};
var isMotNotApplicable = (asset = {}) => asset?.motNotApplicable === true || asset?.motApplicable === false || String(asset?.motStatus || "").trim().toLowerCase() === "n/a" || String(asset?.motStatus || "").trim().toLowerCase() === "not applicable";
var isServiceNotApplicable = (asset = {}) => asset?.serviceNotApplicable === true || asset?.serviceApplicable === false || String(asset?.serviceStatus || "").trim().toLowerCase() === "n/a" || String(asset?.serviceStatus || "").trim().toLowerCase() === "not applicable";
var isVehicleOutOfUse = (asset = {}) => {
  return normalizeVehicleOperatingStatus(asset) === VOR_VEHICLE_STATUS;
};
var toDateSafe = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};
var getIsoWeekParts = (value) => {
  const date = toDateSafe(value);
  if (!date) return null;
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 864e5 + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
};
var getIsoWeekLabel = (value) => {
  const parts = getIsoWeekParts(value);
  if (!parts) return "";
  return `${parts.year}-W${String(parts.week).padStart(2, "0")}`;
};

// src/app/utils/maintenanceRecord.js
var MAINTENANCE_RECORD_SCHEMA_VERSION = 1;
var MAINTENANCE_TYPE_IDS = Object.freeze([
  "mot",
  "service",
  "pmi",
  "brake_test",
  "repair",
  "work",
  "tacho_inspection",
  "tacho_download",
  "tail_lift",
  "loler",
  "tacho_calibration",
  "other"
]);
var MAINTENANCE_RECORD_STATUSES = Object.freeze([
  "requested",
  "booked",
  "in_progress",
  "completed",
  "cancelled",
  "deferred",
  "archived"
]);
var MAINTENANCE_SCHEDULE_RULES = Object.freeze(
  Object.fromEntries(
    RECURRING_MAINTENANCE_WORKFLOWS.map((workflow) => [
      workflow.maintenanceTypeId,
      Object.freeze({
        nextDueSource: workflow.dvsaAuthoritative ? "dvsa" : "completion",
        warningWeeks: workflow.warningWeeks,
        autoVorAfterDueWeek: workflow.autoVorAfterDueWeek
      })
    ])
  )
);
var text = (value) => String(value || "").trim();
var safeArray = (value) => Array.isArray(value) ? value : [];
var REGULATED_MAINTENANCE_EVIDENCE_TYPE_IDS = Object.freeze([
  "mot",
  "pmi",
  "brake_test",
  "loler",
  "tacho_inspection",
  "tacho_calibration",
  "tacho_download"
]);
var EVIDENCE_REQUIRED_TYPE_IDS = new Set(REGULATED_MAINTENANCE_EVIDENCE_TYPE_IDS);
var maintenanceDateOnly = (value) => {
  if (!value) return "";
  if (typeof value?.toDate === "function") return maintenanceDateOnly(value.toDate());
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate()
    ).padStart(2, "0")}`;
  }
  const iso = text(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : maintenanceDateOnly(parsed);
};
var localDate = (value) => {
  const match = maintenanceDateOnly(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
};
var addDays = (value, days) => {
  const date = localDate(value);
  if (!date) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return maintenanceDateOnly(date);
};
var addCalendarMonths = (value, months) => {
  const date = localDate(value);
  if (!date) return "";
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + Number(months || 0));
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate();
  date.setDate(Math.min(originalDay, lastDay));
  return maintenanceDateOnly(date);
};
var maintenanceIsoWeekParts = (value) => {
  const source = localDate(value);
  if (!source) return null;
  const date = new Date(Date.UTC(source.getFullYear(), source.getMonth(), source.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((date - yearStart) / 864e5 + 1) / 7);
  return { year, week };
};
var maintenanceIsoWeekLabel = (value) => {
  const parts = maintenanceIsoWeekParts(value);
  return parts ? `${parts.year}-W${String(parts.week).padStart(2, "0")}` : "";
};
var normalizeMaintenanceTypeId = (value) => {
  const raw = text(value).toLowerCase().replace(/[\s-]+/g, "_");
  const aliases2 = {
    inspection: "pmi",
    eight_week_inspection: "pmi",
    eight_weekly_inspection: "pmi",
    brake: "brake_test",
    braketest: "brake_test",
    mot_test: "mot",
    annual_service: "service",
    repairs: "repair"
  };
  const normalized = aliases2[raw] || raw;
  return MAINTENANCE_TYPE_IDS.includes(normalized) ? normalized : "other";
};
var normalizeMaintenanceRecordStatus = (value) => {
  const raw = text(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (["complete", "closed", "done"].includes(raw)) return "completed";
  if (["planned", "appointment", "scheduled"].includes(raw)) return "booked";
  if (["deleted", "declined", "inactive"].includes(raw)) return "archived";
  if (["inprogress", "underway"].includes(raw)) return "in_progress";
  return MAINTENANCE_RECORD_STATUSES.includes(raw) ? raw : "requested";
};
var bookingDateKeys = (record = {}) => {
  const explicit = safeArray(record.bookingDates).map(maintenanceDateOnly).filter(Boolean);
  if (explicit.length) return [...new Set(explicit)].sort();
  const single = maintenanceDateOnly(
    record.appointmentDateISO || record.appointmentDate || record.date
  );
  if (single) return [single];
  const start = maintenanceDateOnly(record.startDateISO || record.startDate);
  const end = maintenanceDateOnly(record.endDateISO || record.endDate || start);
  if (!start || !end) return [];
  const dates = [];
  let cursor = start;
  while (cursor && cursor <= end && dates.length < 370) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
};
var recordTypeIds = (record = {}) => {
  const explicit = safeArray(record.maintenanceTypeIds).map(normalizeMaintenanceTypeId).filter(Boolean);
  if (explicit.length) return [...new Set(explicit)];
  const explicitOne = text(record.maintenanceTypeId);
  if (explicitOne) return [normalizeMaintenanceTypeId(explicitOne)];
  const core = text(record.type || record.maintenanceType || record.kind).toUpperCase();
  if (core === "INSPECTION") return ["pmi", "brake_test"];
  if (core === "MOT") return ["mot"];
  if (core === "SERVICE") return ["service"];
  if (core === "REPAIR") return ["repair"];
  if (core === "WORK" || core === "MAINTENANCE") return ["work"];
  return ["other"];
};
var itemForType = (record, maintenanceTypeId, recordStatus) => {
  const existing = safeArray(record.items).find(
    (item) => normalizeMaintenanceTypeId(item?.maintenanceTypeId || item?.type) === maintenanceTypeId
  ) || {};
  const legalDueDateISO = maintenanceDateOnly(
    existing.legalDueDateISO || existing.sourceDueDateISO || existing.dueDateISO || record.sourceDueDateISO || record.sourceDueDate
  );
  return {
    maintenanceTypeId,
    status: normalizeMaintenanceRecordStatus(existing.status || recordStatus),
    result: text(existing.result || record.result).toLowerCase(),
    legalDueDateISO,
    legalDueIsoWeek: text(existing.legalDueIsoWeek || existing.sourceDueIsoWeek || record.sourceDueIsoWeek) || maintenanceIsoWeekLabel(legalDueDateISO),
    completionDateISO: maintenanceDateOnly(
      existing.completionDateISO || existing.completedDate || record.completedAtISO
    ),
    nextDueDateISO: maintenanceDateOnly(existing.nextDueDateISO || existing.nextDueDate),
    evidenceStatus: text(existing.evidenceStatus || "").toLowerCase() || "not_recorded",
    documents: safeArray(existing.documents).filter(Boolean)
  };
};
var maintenanceRequirementKey = ({
  companyId = "",
  vehicleId = "",
  items = [],
  maintenanceTypeIds = [],
  legalDueDateISO = "",
  legalDueIsoWeek = ""
} = {}) => {
  const normalizedItems = safeArray(items).map((item) => ({
    maintenanceTypeId: normalizeMaintenanceTypeId(item?.maintenanceTypeId || item?.type),
    legalDueDateISO: maintenanceDateOnly(
      item?.legalDueDateISO || item?.sourceDueDateISO || item?.dueDateISO || legalDueDateISO
    ),
    legalDueIsoWeek: text(item?.legalDueIsoWeek || item?.sourceDueIsoWeek || legalDueIsoWeek) || maintenanceIsoWeekLabel(
      item?.legalDueDateISO || item?.sourceDueDateISO || item?.dueDateISO || legalDueDateISO
    )
  })).filter((item) => item.maintenanceTypeId !== "other");
  const fallbackItems = safeArray(maintenanceTypeIds).map((typeId) => ({
    maintenanceTypeId: normalizeMaintenanceTypeId(typeId),
    legalDueDateISO: maintenanceDateOnly(legalDueDateISO),
    legalDueIsoWeek: text(legalDueIsoWeek) || maintenanceIsoWeekLabel(legalDueDateISO)
  }));
  const itemParts = (normalizedItems.length ? normalizedItems : fallbackItems).map(
    (item) => `${item.maintenanceTypeId}@${item.legalDueDateISO || item.legalDueIsoWeek || "unscheduled"}`
  ).sort();
  const asset = text(vehicleId);
  if (!asset || !itemParts.length) return "";
  return ["maintenance-requirement-v1", text(companyId) || "legacy", asset, itemParts.join("+")].join("|");
};
var maintenanceRequirementDocumentId = (requirementKey) => {
  const value = text(requirementKey);
  if (!value) return "";
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `req_${(hash >>> 0).toString(36)}_${value.length.toString(36)}`;
};
var formatMaintenanceBickersReference = (sequence) => {
  const value = Number(sequence);
  if (!Number.isSafeInteger(value) || value < 1) return "";
  return String(value).padStart(6, "0");
};
var buildMaintenanceBickersReference = (record = {}) => {
  const stored = text(record.bickersReference);
  return /^\d{6,}$/.test(stored) ? stored : "";
};
var buildRequestedMaintenanceRecord = ({
  companyId = "",
  vehicleId = "",
  vehicleLabel: vehicleLabel2 = "",
  items = [],
  maintenanceTypeIds = [],
  legalDueDateISO = "",
  legalDueIsoWeek = "",
  source = "maintenance_schedule",
  sourceId = "",
  workshop = null
} = {}) => {
  const normalizedItems = (safeArray(items).length ? safeArray(items) : safeArray(maintenanceTypeIds).map((maintenanceTypeId) => ({
    maintenanceTypeId,
    legalDueDateISO,
    legalDueIsoWeek
  }))).map((item) => {
    const dueDate = maintenanceDateOnly(item?.legalDueDateISO || legalDueDateISO);
    return {
      maintenanceTypeId: normalizeMaintenanceTypeId(item?.maintenanceTypeId || item?.type),
      status: "requested",
      result: "",
      legalDueDateISO: dueDate,
      legalDueIsoWeek: text(item?.legalDueIsoWeek || legalDueIsoWeek) || maintenanceIsoWeekLabel(dueDate),
      completionDateISO: "",
      nextDueDateISO: "",
      evidenceStatus: "not_recorded",
      documents: []
    };
  }).filter((item) => item.maintenanceTypeId !== "other");
  const requirementKey = maintenanceRequirementKey({ companyId, vehicleId, items: normalizedItems });
  const typeIds = normalizedItems.map((item) => item.maintenanceTypeId);
  const coreType2 = typeIds.every((typeId) => typeId === "mot") ? "MOT" : typeIds.every((typeId) => typeId === "service") ? "SERVICE" : typeIds.some((typeId) => ["repair", "work"].includes(typeId)) ? "WORK" : "INSPECTION";
  const firstDueDate = normalizedItems.map((item) => item.legalDueDateISO).filter(Boolean).sort()[0] || "";
  const firstDueWeek = normalizedItems.map((item) => item.legalDueIsoWeek).filter(Boolean).sort()[0] || "";
  return {
    schemaVersion: MAINTENANCE_RECORD_SCHEMA_VERSION,
    companyId: text(companyId),
    vehicleId: text(vehicleId),
    vehicleLabel: text(vehicleLabel2),
    kind: "MAINTENANCE",
    type: coreType2,
    maintenanceTypeId: typeIds.length === 1 ? typeIds[0] : "combined",
    maintenanceTypeIds: typeIds,
    sourceDueDateISO: firstDueDate,
    sourceDueIsoWeek: firstDueWeek,
    equipment: [],
    status: "requested",
    items: normalizedItems,
    schedule: {
      bookingDates: [],
      appointmentDateISO: "",
      startDateISO: "",
      endDateISO: "",
      bookedIsoWeeks: []
    },
    requirementKey,
    sourceDueKey: requirementKey,
    origin: { source: text(source) || "maintenance_schedule", sourceId: text(sourceId) },
    workshop: workshop && typeof workshop === "object" ? { ...workshop } : null,
    audit: { createdAt: "", createdBy: "system", updatedAt: "", updatedBy: "system", history: [] },
    legacy: { sourceCollection: "", sourceId: text(sourceId), sourceDueKey: requirementKey }
  };
};
var maintenanceCompletionEvidenceIssues = (canonicalRecord, maintenanceTypeIds = [], documentsByType = {}) => {
  const selected = new Set(safeArray(maintenanceTypeIds).map(normalizeMaintenanceTypeId));
  return safeArray(canonicalRecord?.items).filter(
    (item) => selected.has(item.maintenanceTypeId) && EVIDENCE_REQUIRED_TYPE_IDS.has(item.maintenanceTypeId)
  ).filter((item) => {
    const attached = [
      ...safeArray(item.documents),
      ...safeArray(documentsByType?.[item.maintenanceTypeId])
    ].filter(Boolean);
    return item.evidenceStatus !== "attached" && attached.length === 0;
  }).map((item) => `missing_evidence:${item.maintenanceTypeId}`);
};
var normalizeMaintenanceRecord = (record = {}, { id = "" } = {}) => {
  const status = normalizeMaintenanceRecordStatus(record.status);
  const dates = bookingDateKeys(record);
  const first = dates[0] || "";
  const last = dates.at(-1) || first;
  const typeIds = recordTypeIds(record);
  const items = typeIds.map((typeId) => itemForType(record, typeId, status));
  const explicitRequirementKey = text(record.requirementKey);
  const computedRequirementKey = maintenanceRequirementKey({
    companyId: record.companyId,
    vehicleId: record.vehicleId || record.assetId,
    items
  });
  const requirementKey = explicitRequirementKey.startsWith("maintenance-requirement-v1|") ? explicitRequirementKey : computedRequirementKey || explicitRequirementKey || text(record.sourceDueKey);
  return {
    schemaVersion: MAINTENANCE_RECORD_SCHEMA_VERSION,
    id: text(id || record.id),
    companyId: text(record.companyId),
    vehicleId: text(record.vehicleId || record.assetId),
    vehicleLabel: text(record.vehicleLabel || record.assetLabel),
    equipment: safeArray(record.equipment).filter(Boolean),
    status,
    items,
    schedule: {
      bookingDates: dates,
      appointmentDateISO: dates.length === 1 ? first : "",
      startDateISO: dates.length > 1 ? first : "",
      endDateISO: dates.length > 1 ? last : "",
      bookedIsoWeeks: [...new Set(dates.map(maintenanceIsoWeekLabel).filter(Boolean))]
    },
    audit: {
      createdAt: record.createdAt || "",
      createdBy: text(record.createdBy),
      updatedAt: record.updatedAt || "",
      updatedBy: text(record.lastEditedBy || record.updatedBy),
      history: safeArray(record.history)
    },
    requirementKey,
    bickersReference: buildMaintenanceBickersReference(record, { id: id || record.id }),
    origin: {
      source: text(record.origin?.source || record.source || record.sourceCollection),
      sourceId: text(record.origin?.sourceId || record.sourceRef || record.sourceId)
    },
    workshop: record.workshop && typeof record.workshop === "object" ? { ...record.workshop } : record.assetId || record.plannedDate || record.priority ? {
      title: text(record.title),
      priority: text(record.priority || "normal").toLowerCase(),
      plannedDateISO: maintenanceDateOnly(record.plannedDate),
      dueDateISO: maintenanceDateOnly(record.dueDate),
      provider: text(record.provider),
      assignedToName: text(record.assignedToName),
      completionNotes: text(record.completionNotes),
      totalCost: text(record.totalCost),
      poNumber: text(record.poNumber),
      invoiceRef: text(record.invoiceRef)
    } : null,
    legacy: {
      sourceCollection: text(record.sourceCollection),
      sourceId: text(record.sourceId || id || record.id),
      sourceDueKey: text(record.sourceDueKey)
    }
  };
};
var calculateNextMaintenanceDue = ({
  maintenanceTypeId,
  completedDate,
  dvsaExpiryDate = "",
  frequencyWeeks = 0,
  frequencyMonths = 0,
  vehicle = null
} = {}) => {
  const typeId = normalizeMaintenanceTypeId(maintenanceTypeId);
  const completed = maintenanceDateOnly(completedDate);
  const confirmedMotExpiry = maintenanceDateOnly(dvsaExpiryDate);
  if (typeId === "mot" && confirmedMotExpiry) return confirmedMotExpiry;
  if (!completed || !getRecurringMaintenanceWorkflow(typeId)) return "";
  const configuredWeeks = Number(frequencyWeeks) > 0 ? Number(frequencyWeeks) : vehicle ? getConfiguredMaintenanceFrequencyWeeks(vehicle, typeId) : 0;
  if (configuredWeeks > 0) return addDays(completed, configuredWeeks * 7);
  if (Number(frequencyMonths) > 0) return addCalendarMonths(completed, Number(frequencyMonths));
  return "";
};
var recurrenceInputForType = (maintenanceTypeId, vehicle = {}) => {
  const typeId = normalizeMaintenanceTypeId(maintenanceTypeId);
  const frequencyWeeks = getConfiguredMaintenanceFrequencyWeeks(vehicle, typeId);
  const dvsaExpiryDate = [
    vehicle?.nextMOT,
    vehicle?.nextMot,
    vehicle?.motExpiryDate,
    vehicle?.dvsaMotExpiryDate
  ].map(maintenanceDateOnly).find(Boolean) || "";
  return { typeId, frequencyWeeks, dvsaExpiryDate };
};
var buildNextRequestedMaintenanceRecords = ({
  canonicalRecord,
  completedTypeIds = [],
  completionDateISO = "",
  vehicle = {},
  recordedServiceNextDueDate = ""
} = {}) => {
  const selected = new Set(safeArray(completedTypeIds).map(normalizeMaintenanceTypeId));
  const completedDate = maintenanceDateOnly(completionDateISO);
  if (!canonicalRecord || !completedDate || !selected.size) return [];
  const nextItems = safeArray(canonicalRecord.items).filter((item) => selected.has(item.maintenanceTypeId)).map((item) => {
    if (item.maintenanceTypeId === "mot") return null;
    if (item.maintenanceTypeId === "service" && [vehicle.lastService, vehicle.lastServiceDate, ...safeArray(vehicle.serviceHistory).filter(isCoreServiceHistory).map((row) => row.completedDate)].map(maintenanceDateOnly).filter(Boolean).some((date) => date > completedDate)) return null;
    const recurrence = recurrenceInputForType(item.maintenanceTypeId, vehicle);
    const explicitServiceDate = item.maintenanceTypeId === "service" ? maintenanceDateOnly(recordedServiceNextDueDate) : "";
    const nextDueDateISO = (explicitServiceDate > completedDate ? explicitServiceDate : "") || calculateNextMaintenanceDue({
      maintenanceTypeId: item.maintenanceTypeId,
      completedDate,
      dvsaExpiryDate: recurrence.dvsaExpiryDate,
      frequencyWeeks: recurrence.frequencyWeeks
    });
    if (!nextDueDateISO || nextDueDateISO <= completedDate) return null;
    return {
      maintenanceTypeId: item.maintenanceTypeId,
      legalDueDateISO: nextDueDateISO,
      legalDueIsoWeek: maintenanceIsoWeekLabel(nextDueDateISO)
    };
  }).filter(Boolean);
  const selectedInspectionItem = nextItems.find(
    (item) => ["pmi", "brake_test"].includes(item.maintenanceTypeId)
  );
  if (selectedInspectionItem) {
    const counterpartType = selectedInspectionItem.maintenanceTypeId === "pmi" ? "brake_test" : "pmi";
    const counterpartWorkflow = getRecurringMaintenanceWorkflow(counterpartType);
    const counterpartDate = (counterpartWorkflow?.nextFields || [counterpartWorkflow?.nextField]).filter(Boolean).map((field) => maintenanceDateOnly(vehicle?.[field])).find(Boolean) || "";
    if (counterpartDate > completedDate && maintenanceIsoWeekLabel(counterpartDate) === selectedInspectionItem.legalDueIsoWeek && !nextItems.some((item) => item.maintenanceTypeId === counterpartType)) {
      nextItems.push({
        maintenanceTypeId: counterpartType,
        legalDueDateISO: counterpartDate,
        legalDueIsoWeek: maintenanceIsoWeekLabel(counterpartDate)
      });
    }
  }
  const groups = /* @__PURE__ */ new Map();
  nextItems.forEach((item) => {
    const combineInspection = ["pmi", "brake_test"].includes(item.maintenanceTypeId);
    const key = combineInspection ? `inspection:${item.legalDueIsoWeek}` : `${item.maintenanceTypeId}:${item.legalDueDateISO}`;
    groups.set(key, [...groups.get(key) || [], item]);
  });
  return [...groups.values()].map(
    (items) => buildRequestedMaintenanceRecord({
      companyId: canonicalRecord.companyId,
      vehicleId: canonicalRecord.vehicleId,
      vehicleLabel: canonicalRecord.vehicleLabel,
      items,
      source: "completion_recurrence",
      sourceId: canonicalRecord.id
    })
  );
};
var completeCanonicalMaintenanceItems = (canonicalRecord, maintenanceTypeIds = [], completedDate, { documentsByType = {} } = {}) => {
  const completionDateISO = maintenanceDateOnly(completedDate);
  const selected = new Set(
    safeArray(maintenanceTypeIds).map(normalizeMaintenanceTypeId).filter((typeId) => typeId !== "other")
  );
  if (!completionDateISO || !selected.size) {
    return {
      ...canonicalRecord,
      items: safeArray(canonicalRecord?.items).map((item) => ({ ...item })),
      completedTypeIds: [],
      allCompleted: false
    };
  }
  const completedTypeIds = [];
  const items = safeArray(canonicalRecord?.items).map((item) => {
    if (!selected.has(item.maintenanceTypeId)) return { ...item };
    const documents = [
      ...safeArray(item.documents),
      ...safeArray(documentsByType?.[item.maintenanceTypeId])
    ].filter(Boolean);
    completedTypeIds.push(item.maintenanceTypeId);
    return {
      ...item,
      status: "completed",
      result: "passed",
      completionDateISO,
      evidenceStatus: documents.length ? "attached" : item.evidenceStatus === "attached" ? "attached" : "pending",
      documents
    };
  });
  return {
    ...canonicalRecord,
    items,
    completedTypeIds,
    allCompleted: items.length > 0 && items.every((item) => item.status === "completed")
  };
};
var AUTOMATIC_DUE_SOURCES = /* @__PURE__ */ new Set([
  "automatic_schedule",
  "vehicle_maintenance_schedule",
  "maintenance_schedule",
  "completion_recurrence",
  "safe_reconciliation"
]);
var isConfirmedMaintenanceBooking = (booking = {}) => {
  const canonical = normalizeMaintenanceRecord(booking, { id: booking?.id });
  if (!["booked", "in_progress"].includes(canonical.status)) return false;
  if (!canonical.schedule.bookingDates.length) return false;
  const originSource = String(booking?.origin?.source || canonical.origin?.source || "").trim().toLowerCase();
  if (!AUTOMATIC_DUE_SOURCES.has(originSource)) return true;
  return Boolean(
    booking?.scheduleManuallyAdjusted === true || booking?.arrangedAt || booking?.arrangedBy || booking?.restoredAfterVor || booking?.reactivatedAfterVorAtISO || String(booking?.provider || "").trim() || String(booking?.bookingRef || "").trim() || String(booking?.location || "").trim()
  );
};

// src/app/utils/maintenanceWorkshopLink.js
var text2 = (value) => String(value || "").trim();
var maintenanceWorkshopRequestId = (bookingId) => `maintenance_${crypto.createHash("sha256").update(text2(bookingId)).digest("hex").slice(0, 40)}`;
function projectMaintenanceWorkshopRequest(booking, bookingId, existing = null) {
  const canonical = normalizeMaintenanceRecord(booking, { id: bookingId });
  const inHouse = text2(booking.provider).toUpperCase() === "BICKERS";
  const active = ["booked", "in_progress", "deferred"].includes(canonical.status);
  const dates = canonical.schedule.bookingDates;
  if ((!inHouse || !active || !dates.length) && !existing) return null;
  const typeIds = canonical.items.map((item) => item.maintenanceTypeId);
  const service = typeIds.length === 1 && typeIds[0] === "service";
  const status = canonical.status === "completed" ? "completed" : !inHouse || !active || !dates.length ? "cancelled" : existing?.status === "completed" ? "completed" : "open";
  const label = text2(booking.vehicleLabel || booking.workshop?.assetLabel || booking.title) || "Workshop work";
  return {
    companyId: canonical.companyId,
    source: "maintenance_booking",
    sourceMaintenanceBookingId: bookingId,
    sourceMaintenanceTypeIds: typeIds,
    sourceBookingUpdatedAt: text2(booking.updatedAt),
    assetKind: "vehicle",
    assetType: "vehicle",
    assetId: text2(booking.vehicleId),
    assetLabel: label,
    workType: service && text2(booking.vehicleId) ? "full_service" : "general_repair",
    maintenanceLabel: text2(booking.title) || (service ? "Service" : typeIds.join(" + ").replaceAll("_", " ")),
    description: [
      text2(booking.title) || typeIds.join(" + ").replaceAll("_", " "),
      text2(booking.notes),
      text2(booking.location) ? `Location: ${text2(booking.location)}` : "",
      text2(booking.bookingRef) ? `Garage reference: ${text2(booking.bookingRef)}` : ""
    ].filter(Boolean).join("\n"),
    priority: "high",
    dueDate: dates[0] || "",
    appointmentTime: text2(booking.appointmentTime),
    bookingDates: dates,
    status,
    requestedByUid: text2(booking.createdByUid || booking.lastEditedByUid),
    requestedByName: text2(booking.createdBy || booking.lastEditedBy),
    createdAt: existing?.createdAt || booking.createdAt || booking.updatedAt || "",
    updatedAt: booking.updatedAt || existing?.updatedAt || "",
    formCollection: existing?.formCollection || "",
    formRecordId: existing?.formRecordId || "",
    completedAt: status === "completed" ? existing?.completedAt || booking.completedAtISO || booking.updatedAt || "" : "",
    completedBy: status === "completed" ? existing?.completedBy || booking.lastEditedBy || "office" : ""
  };
}

// src/app/utils/maintenanceTransport.js
import { AsyncLocalStorage } from "node:async_hooks";
var context = new AsyncLocalStorage();
var currentMaintenanceTransport = () => context.getStore();
var withMaintenanceTransport = (transport, run) => context.run(transport, run);

// src/app/utils/motExpiry.js
var DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
var dateOnly = (value) => {
  const clean = String(value || "").trim().slice(0, 10);
  return DATE_ONLY_PATTERN.test(clean) ? clean : "";
};
var isPassedMot = (test = {}) => String(test?.testResult || "").trim().toUpperCase() === "PASSED";
var completedDateValue = (test = {}) => dateOnly(test?.completedDate);
var getAuthoritativeDvsaMotExpiry = (vehicle = {}, { notBeforeCompletionDate = "" } = {}) => {
  const notBefore = dateOnly(notBeforeCompletionDate);
  const candidates = [
    vehicle?.dvsaLatestMot,
    ...Array.isArray(vehicle?.dvsaMotTests) ? vehicle.dvsaMotTests : []
  ].filter(
    (test) => isPassedMot(test) && dateOnly(test?.expiryDate) && (!notBefore || completedDateValue(test) >= notBefore)
  ).sort((a, b) => completedDateValue(b).localeCompare(completedDateValue(a)));
  return dateOnly(candidates[0]?.expiryDate);
};

// src/app/utils/maintenanceArchiveRebuild.js
var list = (value) => Array.isArray(value) ? value : [];
var maintenanceReconciliationEntries = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
var text3 = (value) => typeof value === "string" ? value.trim() : "";
var independentlyOwned = (entry) => /dvsa|import|manual|register/i.test(text3(entry?.source));
function maintenanceEvidenceMatches(entry, bookingId, maintenanceTypeId, primaryField = "bookingId") {
  if (!entry || entry[primaryField] !== bookingId || independentlyOwned(entry)) return false;
  for (const field of ["bookingId", "sourceRecordId", "sourceId", "sourceRef", "completionSourceId"]) {
    if (entry[field] !== void 0 && entry[field] !== null && entry[field] !== "" && entry[field] !== bookingId) return false;
  }
  if (entry.origin?.sourceId !== void 0 && entry.origin.sourceId !== bookingId) return false;
  if (entry.legacy?.sourceId !== void 0 && entry.legacy.sourceId !== bookingId) return false;
  if (primaryField === "bookingId" && [entry.type, entry.maintenanceType].some((value) => value !== void 0 && value !== null && value !== "" && normalizeMaintenanceTypeId(value) !== maintenanceTypeId)) return false;
  if (entry.maintenanceTypeId !== void 0 && entry.maintenanceTypeId !== maintenanceTypeId) return false;
  return true;
}
var aliases = (workflow) => ({
  history: workflow.maintenanceTypeId === "pmi" ? [workflow.historyField, "eightWeekInspectionHistory"] : [workflow.historyField],
  last: [.../* @__PURE__ */ new Set([...workflow.lastFields || [workflow.lastField], ...workflow.maintenanceTypeId === "mot" ? ["lastMotDate"] : workflow.maintenanceTypeId === "service" ? ["lastServiceDate"] : workflow.maintenanceTypeId === "pmi" ? ["lastPmi"] : []])],
  next: [.../* @__PURE__ */ new Set([...workflow.nextFields || [workflow.nextField], ...workflow.maintenanceTypeId === "service" ? ["serviceDueDate"] : []])],
  week: workflow.maintenanceTypeId === "pmi" ? [workflow.isoWeekField, "eightWeekInspectionISOWeek", "lorryInspectionISOWeek"] : [workflow.isoWeekField]
});
function rebuildArchivedMaintenanceCompletion(vehicle = {}, booking = {}) {
  const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
  const affected = new Set(canonical.items.map((item) => item.maintenanceTypeId));
  const patch = {}, markers = [...maintenanceReconciliationEntries(vehicle.maintenanceReconciliationRequired)];
  const mark = (type, reason) => {
    if (!markers.some((entry) => entry?.maintenanceTypeId === type && entry?.sourceRecordId === booking.id && entry?.reason === reason))
      markers.push({ maintenanceTypeId: type, sourceRecordId: booking.id, reason, disposition: "manual_review_required" });
  };
  for (const workflow of RECURRING_MAINTENANCE_WORKFLOWS.filter((item) => affected.has(item.maintenanceTypeId))) {
    const names = aliases(workflow), retained = [];
    let removedEvidence = false;
    for (const field of names.history) {
      const original = list(vehicle[field]);
      if (original.some((entry) => entry?.bookingId !== booking.id && text3(entry?.bookingId) === booking.id))
        mark(workflow.maintenanceTypeId, "archive_ambiguous_evidence_requires_review");
      const remaining = original.filter((entry) => !maintenanceEvidenceMatches(entry, booking.id, workflow.maintenanceTypeId));
      if (remaining.length !== original.length) removedEvidence = true;
      if (remaining.length !== original.length) patch[field] = remaining;
      retained.push(...remaining);
    }
    if (workflow.documentsField) {
      const original = list(vehicle[workflow.documentsField]);
      const remaining = original.filter((entry) => !maintenanceEvidenceMatches(entry, booking.id, workflow.maintenanceTypeId, "sourceRecordId"));
      if (remaining.length !== original.length) patch[workflow.documentsField] = remaining;
    }
    if (!removedEvidence) {
      mark(workflow.maintenanceTypeId, "archive_completion_attribution_unproven");
      continue;
    }
    if (retained.some((entry) => entry?.maintenanceTypeId !== void 0 && entry.maintenanceTypeId !== workflow.maintenanceTypeId || typeof entry?.bookingId === "string" && entry.bookingId !== entry.bookingId.trim() || entry?.bookingId && !independentlyOwned(entry) && !maintenanceEvidenceMatches(entry, entry.bookingId, workflow.maintenanceTypeId))) {
      mark(workflow.maintenanceTypeId, "archive_conflicting_retained_authority_requires_review");
      continue;
    }
    const dated = retained.filter((entry) => maintenanceDateOnly(entry?.completedDate));
    const latestDate = dated.map((entry) => maintenanceDateOnly(entry.completedDate)).sort().at(-1) || "";
    const latest = dated.filter((entry) => maintenanceDateOnly(entry.completedDate) === latestDate);
    const currentDate = names.last.map((field) => maintenanceDateOnly(vehicle[field])).filter(Boolean).sort().at(-1) || "";
    const removedDate = canonical.items.find((item) => item.maintenanceTypeId === workflow.maintenanceTypeId)?.completionDateISO || maintenanceDateOnly(booking.completedAtISO);
    const officialMot = workflow.dvsaAuthoritative && (vehicle.dvsaLatestMot || vehicle.dvsaLatestMotResult || vehicle.dvsaMotTests?.length);
    if (officialMot || latest.some(independentlyOwned)) {
      continue;
    }
    if (!latestDate || latest.some((entry) => typeof entry?.bookingId !== "string" || !entry.bookingId || entry.bookingId !== entry.bookingId.trim()) || currentDate && currentDate !== removedDate && currentDate !== latestDate) {
      mark(workflow.maintenanceTypeId, "archive_retained_authority_requires_review");
      continue;
    }
    for (const field of names.last) patch[field] = latestDate;
    if (workflow.dvsaAuthoritative) continue;
    const dueDates = [...new Set(latest.map((entry) => maintenanceDateOnly(entry.nextDueDate)).filter(Boolean))];
    if (dueDates.length === 1 && latest.every((entry) => maintenanceDateOnly(entry.nextDueDate) === dueDates[0])) {
      for (const field of names.next) patch[field] = dueDates[0];
      for (const field of names.week.filter(Boolean)) patch[field] = maintenanceIsoWeekLabel(dueDates[0]);
    } else mark(workflow.maintenanceTypeId, "archive_recurrence_unproven");
  }
  if (markers.length !== maintenanceReconciliationEntries(vehicle.maintenanceReconciliationRequired).length) patch.maintenanceReconciliationRequired = markers;
  return patch;
}

// src/app/utils/maintenanceVersion.js
function normalizeMaintenanceVersion(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date) value = value.toISOString();
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    const nanos = value.nanoseconds ?? value._nanoseconds;
    if (!Number.isSafeInteger(seconds) || !Number.isInteger(nanos) || nanos < 0 || nanos > 999999999) throw new Error("Invalid maintenance version.");
    return new Date(seconds * 1e3).toISOString().replace(/\.\d{3}Z$/, `.${String(nanos).padStart(9, "0")}Z`);
  }
  if (typeof value !== "string") throw new Error("Invalid maintenance version.");
  const iso = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(value);
  return iso ? `${iso[1]}.${(iso[2] || "").padEnd(9, "0")}Z` : value;
}

// src/app/utils/hgvCompliance.js
var HGV_COMPLIANCE_TYPES = Object.freeze(["pmi", "brake_test"]);
var text4 = (value) => String(value || "").trim();
var safeArray2 = (value) => Array.isArray(value) ? value : [];
var complianceDateOnly = (value) => {
  if (!value) return "";
  if (typeof value?.toDate === "function") return complianceDateOnly(value.toDate());
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate()
    ).padStart(2, "0")}`;
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : complianceDateOnly(parsed);
};
var localDate2 = (value) => {
  const match = complianceDateOnly(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
};
var isoWeekStart = (value) => {
  const date = localDate2(value);
  if (!date) return null;
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
};
var isHgvComplianceVehicle = (vehicle = {}) => {
  const category = text4(vehicle.category).toLowerCase();
  if (category === "hgv" || category === "hgv trailers" || category === "hgv trailer") {
    return true;
  }
  const haystack = [vehicle.category, vehicle.type, vehicle.name, vehicle.manufacturer, vehicle.model].map((value) => text4(value).toLowerCase()).join(" ");
  return haystack.includes("lorry") || haystack.includes("transport");
};
var isOffFleetVehicle = (vehicle = {}) => [
  vehicle.operationalStatus,
  vehicle.fleetStatus,
  vehicle.vehicleStatus,
  vehicle.availabilityStatus,
  vehicle.status
].some((value) => text4(value).toLowerCase() === "off fleet");
var hiddenMaintenance = (vehicle) => new Set(safeArray2(vehicle?.hiddenAdditionalMaintenance).map((value) => text4(value).toLowerCase()));
var isHgvComplianceTypeEnabled = (vehicle = {}, type) => {
  if (!isHgvComplianceVehicle(vehicle)) return false;
  const hidden = hiddenMaintenance(vehicle);
  if (type === "mot") return !isMotNotApplicable(vehicle);
  if (type === "pmi") {
    return !hidden.has("pmi") && !hidden.has("pmiinspection");
  }
  if (type === "brake_test") {
    return !hidden.has("brake_test") && !hidden.has("braketest");
  }
  return false;
};
var getHgvComplianceDueDates = (vehicle = {}) => ({
  pmi: complianceDateOnly(vehicle.nextPMI || vehicle.nextEightWeekInspection),
  brake_test: complianceDateOnly(vehicle.nextBrakeTest),
  mot: complianceDateOnly(
    vehicle.nextMOT || vehicle.nextMot || vehicle.nextMotDate || vehicle.motDueDate || vehicle.motExpiryDate
  )
});
var getCompletionHistory = (vehicle, type) => {
  if (type === "pmi") {
    return [
      ...safeArray2(vehicle.pmiHistory),
      ...safeArray2(vehicle.eightWeekInspectionHistory)
    ].filter((entry) => text4(entry?.source).toLowerCase() !== "vehicle_creation");
  }
  if (type === "brake_test") {
    return safeArray2(vehicle.brakeTestHistory).filter(
      (entry) => text4(entry?.source).toLowerCase() !== "vehicle_creation"
    );
  }
  if (type === "mot") {
    const dvsaPassed = safeArray2(vehicle.dvsaMotTests).filter((item) => text4(item?.testResult).toUpperCase() === "PASSED").map((item) => ({
      completedDate: item.completedDate,
      source: "dvsa",
      motTestNumber: item.motTestNumber || ""
    }));
    return [
      ...safeArray2(vehicle.motHistory).filter(
        (entry) => text4(entry?.source).toLowerCase() !== "vehicle_creation"
      ),
      ...dvsaPassed
    ];
  }
  return [];
};
var getLatestHgvCompletion = (vehicle, type, asOfDate = /* @__PURE__ */ new Date()) => {
  const asOfDateISO = complianceDateOnly(asOfDate);
  return getCompletionHistory(vehicle, type).map((entry) => ({
    entry,
    completedDate: complianceDateOnly(
      entry?.completedDate || entry?.date || entry?.inspectionDate
    )
  })).filter((item) => item.completedDate && (!asOfDateISO || item.completedDate <= asOfDateISO)).sort((left, right) => left.completedDate.localeCompare(right.completedDate)).at(-1) || null;
};
var getLatestHgvCompletionDate = (vehicle, type, asOfDate = /* @__PURE__ */ new Date()) => getLatestHgvCompletion(vehicle, type, asOfDate)?.completedDate || "";
var getCurrentHgvVorStartDate = (vehicle = {}) => {
  const history = safeArray2(vehicle.vorHistory);
  const activeRecord = history.find(
    (record) => vehicle.activeVorRecordId && record?.id === vehicle.activeVorRecordId || !vehicle.activeVorRecordId && text4(record?.status).toLowerCase() === "open"
  );
  return complianceDateOnly(
    activeRecord?.offRoadDate || vehicle.complianceVor?.startedDate || vehicle.maintenanceCountdownPause?.startedDate || vehicle.vorStartedAt
  );
};
var isComplianceDueWeekPast = (dueDate, asOfDate = /* @__PURE__ */ new Date()) => {
  const dueWeekStart = isoWeekStart(dueDate);
  const asOf = localDate2(asOfDate);
  if (!dueWeekStart || !asOf) return false;
  const firstDayAfterDueWeek = new Date(dueWeekStart);
  firstDayAfterDueWeek.setDate(firstDayAfterDueWeek.getDate() + 7);
  return asOf.getTime() >= firstDayAfterDueWeek.getTime();
};
var normalizeReason = (reason = {}, type) => ({
  type,
  dueDate: complianceDateOnly(reason.dueDate),
  dueIsoWeek: text4(reason.dueIsoWeek),
  triggeredAt: text4(reason.triggeredAt),
  resolvedAt: text4(reason.resolvedAt),
  completionDate: complianceDateOnly(reason.completionDate),
  completionRef: text4(reason.completionRef)
});
var evaluateHgvCompliance = (vehicle = {}, { asOfDate = /* @__PURE__ */ new Date(), evaluatedAt = (/* @__PURE__ */ new Date()).toISOString() } = {}) => {
  if (!isHgvComplianceVehicle(vehicle) || isOffFleetVehicle(vehicle)) {
    return {
      complianceVor: vehicle.complianceVor || { state: "clear", reasons: {} },
      shouldStartVor: false,
      unresolvedTypes: []
    };
  }
  const previous = vehicle.complianceVor || {};
  if (!["active", "ready_for_release"].includes(text4(previous.state).toLowerCase())) {
    const dueDates2 = getHgvComplianceDueDates(vehicle);
    return {
      shouldStartVor: false,
      unresolvedTypes: HGV_COMPLIANCE_TYPES.filter(
        (type) => isHgvComplianceTypeEnabled(vehicle, type) && isComplianceDueWeekPast(dueDates2[type], asOfDate)
      ),
      complianceVor: {
        ...previous,
        state: "clear",
        reasons: {},
        releaseRequired: false,
        lastEvaluatedAt: evaluatedAt
      }
    };
  }
  const reasons = Object.fromEntries(
    Object.entries(previous.reasons || {}).map(([type, reason]) => [
      type,
      normalizeReason(reason, type)
    ])
  );
  const dueDates = getHgvComplianceDueDates(vehicle);
  let shouldStartVor = false;
  HGV_COMPLIANCE_TYPES.forEach((type) => {
    if (!isHgvComplianceTypeEnabled(vehicle, type)) {
      if (reasons[type] && !reasons[type].resolvedAt) {
        reasons[type] = { ...reasons[type], resolvedAt: evaluatedAt };
      }
      return;
    }
    const dueDate = dueDates[type];
    if (!dueDate) return;
    const latestCompletion = getLatestHgvCompletion(vehicle, type, asOfDate);
    const overdue = isComplianceDueWeekPast(dueDate, asOfDate);
    const existing = reasons[type];
    if (overdue) {
      if (!existing || existing.resolvedAt || existing.dueDate !== dueDate) {
        reasons[type] = {
          type,
          dueDate,
          dueIsoWeek: getIsoWeekLabel(dueDate),
          triggeredAt: evaluatedAt,
          resolvedAt: "",
          completionDate: "",
          completionRef: ""
        };
        shouldStartVor = true;
      }
      return;
    }
    if (existing && !existing.resolvedAt && latestCompletion?.completedDate) {
      reasons[type] = {
        ...existing,
        resolvedAt: evaluatedAt,
        completionDate: latestCompletion.completedDate,
        completionRef: text4(
          latestCompletion.entry?.bookingId || latestCompletion.entry?.motTestNumber || latestCompletion.entry?.sourceRecordId
        )
      };
    }
  });
  const unresolvedTypes = HGV_COMPLIANCE_TYPES.filter(
    (type) => reasons[type] && !reasons[type].resolvedAt
  );
  const wasActive = ["active", "ready_for_release"].includes(text4(previous.state).toLowerCase());
  const startedDate = complianceDateOnly(previous.startedDate || previous.triggeredAt);
  const latestPmi = getLatestHgvCompletionDate(vehicle, "pmi", asOfDate);
  const freshPmiCompletedAt = startedDate && latestPmi && latestPmi >= startedDate ? latestPmi : complianceDateOnly(previous.freshPmiCompletedAt);
  const state = unresolvedTypes.length ? "active" : wasActive || shouldStartVor ? "ready_for_release" : "clear";
  return {
    shouldStartVor: false,
    unresolvedTypes,
    complianceVor: {
      version: 1,
      state,
      startedDate: complianceDateOnly(previous.startedDate) || (state !== "clear" ? complianceDateOnly(asOfDate) : ""),
      triggeredAt: text4(previous.triggeredAt) || (state !== "clear" ? evaluatedAt : ""),
      reasons,
      freshPmiCompletedAt,
      releaseRequired: state !== "clear",
      lastEvaluatedAt: evaluatedAt,
      releasedAt: text4(previous.releasedAt),
      releasedBy: previous.releasedBy || null
    }
  };
};
var syncCanonicalPmiAliases = (vehicle = {}, { asOfDate = /* @__PURE__ */ new Date() } = {}) => {
  const asOfDateISO = complianceDateOnly(asOfDate);
  const sourceHistory = safeArray2(vehicle.pmiHistory).length ? safeArray2(vehicle.pmiHistory) : safeArray2(vehicle.eightWeekInspectionHistory);
  const pmiHistory = sourceHistory.filter((entry) => {
    const completedDate = complianceDateOnly(
      entry?.completedDate || entry?.date || entry?.inspectionDate
    );
    return !completedDate || !asOfDateISO || completedDate <= asOfDateISO;
  });
  const latestHistoryDate = pmiHistory.filter((entry) => text4(entry?.source).toLowerCase() !== "vehicle_creation").map((entry) => complianceDateOnly(entry?.completedDate || entry?.date || entry?.inspectionDate)).filter(Boolean).sort().at(-1) || "";
  const storedLastPMI = complianceDateOnly(vehicle.lastPMI || vehicle.eightWeekInspectionStart);
  const validStoredLastPMI = storedLastPMI && (!asOfDateISO || storedLastPMI <= asOfDateISO) ? storedLastPMI : "";
  const lastPMI = [validStoredLastPMI, latestHistoryDate].filter(Boolean).sort().at(-1) || "";
  const nextPMI = complianceDateOnly(vehicle.nextPMI || vehicle.nextEightWeekInspection);
  const aliases2 = {
    lastPMI,
    nextPMI,
    pmiFreq: String(Math.max(1, Number(vehicle.pmiFreq || 8) || 8)),
    pmiISOWeek: getIsoWeekLabel(nextPMI),
    pmiHistory,
    eightWeekInspectionStart: lastPMI,
    nextEightWeekInspection: nextPMI,
    eightWeekInspectionISOWeek: getIsoWeekLabel(nextPMI),
    lastLorryInspection: lastPMI,
    nextLorryInspection: nextPMI,
    lorryInspectionISOWeek: getIsoWeekLabel(nextPMI)
  };
  if (vehicle.futurePmiHistoryCleanupLocked !== true) {
    aliases2.eightWeekInspectionHistory = pmiHistory;
  }
  return aliases2;
};
var complianceVorReleaseBlocker = (vehicle = {}) => {
  const complianceVor = vehicle.complianceVor || {};
  const unresolved = Object.values(complianceVor.reasons || {}).filter(
    (reason) => reason && ["pmi", "brake_test"].includes(text4(reason.type).toLowerCase()) && !reason.resolvedAt
  );
  if (unresolved.length) {
    return `Complete all overdue compliance items before release: ${unresolved.map((reason) => String(reason.type || "").replace("_", " ").toUpperCase()).join(", ")}.`;
  }
  return "";
};
var buildComplianceReleasePatch = (vehicle = {}, { releasedAt = (/* @__PURE__ */ new Date()).toISOString(), releasedBy = null } = {}) => ({
  ...syncVehicleOperatingStatus({}, "Active"),
  complianceVor: {
    ...vehicle.complianceVor || {},
    state: "clear",
    releaseRequired: false,
    releasedAt,
    releasedBy,
    lastEvaluatedAt: releasedAt
  }
});

// src/app/utils/vorPeriods.js
var text5 = (value) => String(value ?? "").trim();
var DAY_MS = 864e5;
var VOR_COUNTDOWN_DEFINITIONS = Object.freeze([
  { key: "mot", fields: ["nextMOT", "nextMot", "nextMotDate", "motDueDate", "motExpiryDate"], isoField: "motISOWeek" },
  { key: "service", fields: ["nextService", "nextServiceDate", "serviceDueDate"], isoField: "serviceISOWeek" },
  { key: "eight_week_inspection", fields: ["nextEightWeekInspection"], isoField: "eightWeekInspectionISOWeek" },
  { key: "road_tax", fields: ["nextRFL"], isoField: "rflISOWeek" },
  { key: "tacho_inspection", fields: ["nextTacho"], isoField: "tachoISOWeek" },
  { key: "brake_test", fields: ["nextBrakeTest"], isoField: "brakeISOWeek" },
  { key: "pmi", fields: ["nextPMI"], isoField: "pmiISOWeek" },
  { key: "tacho_download", fields: ["nextTachoDownload"], isoField: "tachoDownloadISOWeek" },
  { key: "tail_lift", fields: ["nextTailLift"], isoField: "tailLiftISOWeek" },
  { key: "loler", fields: ["nextLoler"], isoField: "lolerISOWeek" },
  { key: "tacho_calibration", fields: ["nextTachoCalibration"], isoField: "tachoCalibrationISOWeek" },
  { key: "lorry_inspection", fields: ["nextLorryInspection"], isoField: "lorryInspectionISOWeek" }
]);
var toLocalDate = (value) => {
  const match = text5(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};
var dateOnly2 = (value) => {
  const date = toLocalDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
var visibleVorHistory = (vehicle = {}, excludedRecordId = "") => (Array.isArray(vehicle?.vorHistory) ? vehicle.vorHistory : []).filter((record) => {
  const status = text5(record?.status).toLowerCase();
  return text5(record?.id) !== text5(excludedRecordId) && !["archived", "deleted", "superseded"].includes(status);
});
var vorPeriodBounds = (record = {}) => ({
  start: dateOnly2(record.offRoadDate || record.startedAt),
  end: dateOnly2(record.returnedDate || record.completedAt) || "9999-12-31"
});
var periodsOverlap = (left = {}, right = {}) => {
  const a = vorPeriodBounds(left);
  const b = vorPeriodBounds(right);
  return Boolean(a.start && b.start && a.start <= b.end && b.start <= a.end);
};
var assertVorHistoryIntegrity = (vehicle = {}) => {
  const openPeriods = visibleVorHistory(vehicle).filter(
    (record) => text5(record?.status).toLowerCase() === "open"
  );
  if (openPeriods.length > 1) {
    throw new Error("This vehicle has contradictory open VOR/SORN periods. Correct the history before continuing.");
  }
  return true;
};
var assertVorPeriodDoesNotOverlap = (vehicle = {}, candidate = {}, { excludedRecordId = "" } = {}) => {
  const conflict = visibleVorHistory(vehicle, excludedRecordId).find(
    (record) => periodsOverlap(record, candidate)
  );
  if (conflict) {
    throw new Error(
      `This VOR/SORN period overlaps the existing period starting ${vorPeriodBounds(conflict).start}.`
    );
  }
  return true;
};
var calculateVorDurationDays = (startDate, returnDate) => {
  const start = toLocalDate(startDate);
  const end = toLocalDate(returnDate);
  if (!start || !end || end.getTime() < start.getTime()) return null;
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
};
var captureMaintenanceCountdowns = (vehicle = {}) => Object.fromEntries(
  VOR_COUNTDOWN_DEFINITIONS.map((definition) => [
    definition.key,
    definition.fields.map((field) => text5(vehicle[field])).find(Boolean) || ""
  ])
);
var addWeeks = (value, weeks) => {
  const start = toLocalDate(value);
  const frequency = Number(weeks || 0);
  if (!start || !Number.isFinite(frequency) || frequency <= 0) return "";
  start.setDate(start.getDate() + Math.round(frequency) * 7);
  return dateOnly2(
    `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
      start.getDate()
    ).padStart(2, "0")}`
  );
};
var startVehicleVorPeriod = (vehicle = {}, {
  offRoadDate,
  odometer = "",
  approvedBy = "",
  approvedPosition = "",
  reason = "",
  operatorLicenceNumber = ""
} = {}, {
  recordId = `vor-${Date.now()}`,
  startedAt = (/* @__PURE__ */ new Date()).toISOString()
} = {}) => {
  assertVorHistoryIntegrity(vehicle);
  if (visibleVorHistory(vehicle).some((record2) => text5(record2?.status).toLowerCase() === "open")) {
    throw new Error("This vehicle already has an open VOR/SORN period.");
  }
  if (isVehicleOutOfUse(vehicle)) throw new Error("Incomplete legacy VOR history requires a separate recovery workflow.");
  if (!dateOnly2(offRoadDate) || dateOnly2(offRoadDate) !== offRoadDate) throw new Error("Enter a valid VOR start date.");
  const record = {
    id: recordId,
    status: "open",
    registration: text5(vehicle.registration || vehicle.reg),
    operatorLicenceNumber: text5(operatorLicenceNumber),
    offRoadDate: dateOnly2(offRoadDate),
    offRoadOdometer: text5(odometer),
    approvedBy: text5(approvedBy),
    approvedPosition: text5(approvedPosition),
    reason: text5(reason),
    maintenanceDueDatesAtStart: captureMaintenanceCountdowns(vehicle),
    countdownPolicy: "continues_while_vor",
    startedAt
  };
  assertVorPeriodDoesNotOverlap(vehicle, record);
  return {
    ...syncVehicleOperatingStatus(vehicle, "VOR"),
    vorStartedAt: startedAt,
    activeVorRecordId: recordId,
    maintenanceCountdownPause: {
      status: "not_paused",
      policy: "continues_while_vor",
      recordId,
      startedDate: dateOnly2(offRoadDate)
    },
    vorHistory: [...Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [], record]
  };
};
var addMissingVehicleVorStartDate = (vehicle = {}, { offRoadDate, returnedDate = "" } = {}, { recordedAt = (/* @__PURE__ */ new Date()).toISOString(), recordedBy = null } = {}) => {
  if (!isVehicleOutOfUse(vehicle)) throw new Error("Only a vehicle currently VOR can have a missing VOR start date added.");
  assertVorHistoryIntegrity(vehicle);
  const date = dateOnly2(offRoadDate);
  if (!date || date !== offRoadDate) throw new Error("Enter a valid VOR start date.");
  if (date > recordedAt.slice(0, 10)) throw new Error("The VOR start date cannot be in the future.");
  if (returnedDate && (dateOnly2(returnedDate) !== returnedDate || date > returnedDate)) {
    throw new Error("The VOR start date must be on or before the return or inspection date.");
  }
  if (vehicle.vorHistory != null && (!Array.isArray(vehicle.vorHistory) || vehicle.vorHistory.some((record2) => !record2 || typeof record2 !== "object" || Array.isArray(record2)))) {
    throw new Error("Malformed VOR history requires manual recovery.");
  }
  const history = Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [];
  const open = visibleVorHistory(vehicle).find((record2) => text5(record2.status).toLowerCase() === "open");
  if (vehicle.activeVorRecordId && open && open.id !== vehicle.activeVorRecordId) {
    throw new Error("The active VOR record does not match the open period. Correct the vehicle history first.");
  }
  if (open?.offRoadDate || vehicle.maintenanceCountdownPause?.startedDate && vehicle.maintenanceCountdownPause.startedDate !== date) {
    throw new Error("A VOR start date is already recorded. Refresh the vehicle before continuing.");
  }
  if (vehicle.activeVorRecordId && !open && history.some((record2) => record2.id === vehicle.activeVorRecordId)) {
    throw new Error("The active VOR record is not open. Correct the vehicle history first.");
  }
  const recordId = open?.id || vehicle.activeVorRecordId || `vor-repair-${recordedAt}`;
  const record = {
    ...open || { id: recordId, status: "open", source: "missing_vor_start_repair" },
    id: recordId,
    offRoadDate: date,
    corrections: [
      ...Array.isArray(open?.corrections) ? open.corrections : [],
      { field: "offRoadDate", previousValue: "", value: date, reason: "Missing VOR start date added from the reactivation form", correctedAt: recordedAt, correctedBy: recordedBy }
    ]
  };
  assertVorPeriodDoesNotOverlap(vehicle, record, { excludedRecordId: open?.id || "" });
  return {
    ...vehicle,
    activeVorRecordId: recordId,
    vorHistory: open ? history.map((entry) => entry === open ? record : entry) : [...history, record],
    maintenanceCountdownPause: { ...vehicle.maintenanceCountdownPause || {}, startedDate: date, recordId },
    vorHistoryLastMutatedAt: recordedAt,
    vorHistoryLastMutatedBy: recordedBy
  };
};
var vehicleVorIntegrityError = (vehicle = {}) => {
  const history = vehicle.vorHistory;
  if (history != null && !Array.isArray(history)) return "Invalid legacy VOR history requires recovery.";
  if (Array.isArray(history) && history.some((record) => !record || typeof record !== "object" || Array.isArray(record))) return "Malformed legacy VOR history requires recovery.";
  const open = visibleVorHistory(vehicle).filter((record) => text5(record.status).toLowerCase() === "open");
  if (open.length !== 1 || !open[0]?.id || !dateOnly2(open[0]?.offRoadDate) || dateOnly2(open[0].offRoadDate) !== open[0].offRoadDate) return "Incomplete legacy VOR history requires recovery before continuing.";
  if (vehicle.activeVorRecordId && vehicle.activeVorRecordId !== open[0].id) return "The active VOR record conflicts with the open history period. Recovery is required.";
  if ((history || []).filter((record) => record?.id === open[0].id).length !== 1) return "Duplicate VOR record IDs require recovery.";
  if (vehicle.maintenanceCountdownPause?.startedDate && vehicle.maintenanceCountdownPause.startedDate !== open[0].offRoadDate) return "Conflicting legacy VOR start dates require recovery.";
  return "";
};
var vehicleReturnDeclarationErrors = (values = {}) => {
  const errors = {};
  if (!dateOnly2(values.returnedDate) || dateOnly2(values.returnedDate) !== values.returnedDate) errors.returnedDate = "Enter a valid return or inspection date.";
  const odometer = String(values.odometer ?? "").trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(odometer) || !Number.isFinite(Number(odometer.replaceAll(",", "")))) errors.odometer = "Enter a valid non-negative odometer reading.";
  for (const [field, label] of [["removedBy", "return authoriser"], ["removedPosition", "authoriser position"], ["signature", "declaration signature"]]) {
    if (typeof values[field] !== "string" || !values[field].trim()) errors[field] = `Enter the ${label}.`;
  }
  return errors;
};
var assertVehicleReturnDeclaration = (values = {}) => {
  const errors = vehicleReturnDeclarationErrors(values);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
};
var returnVehicleFromVor = (vehicle = {}, {
  returnedDate,
  odometer = "",
  removedBy = "",
  removedPosition = "",
  signature = "",
  firstUseInspectionDate = ""
} = {}, { completedAt = (/* @__PURE__ */ new Date()).toISOString() } = {}) => {
  if (!isVehicleOutOfUse(vehicle)) throw new Error("Only a VOR vehicle can be returned to service.");
  assertVorHistoryIntegrity(vehicle);
  const integrityError = vehicleVorIntegrityError(vehicle);
  if (integrityError) throw new Error(integrityError);
  const history = Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [];
  const activeRecord = history.find(
    (record) => text5(record?.status).toLowerCase() === "open" && (record.id === vehicle.activeVorRecordId || !vehicle.activeVorRecordId)
  ) || null;
  const activeRecordId = vehicle.activeVorRecordId || activeRecord?.id || "";
  if (!activeRecord || !activeRecordId) {
    throw new Error("This vehicle does not have an open VOR/SORN period to return from.");
  }
  const offRoadDate = activeRecord?.offRoadDate || vehicle.maintenanceCountdownPause?.startedDate;
  const durationDays = calculateVorDurationDays(offRoadDate, returnedDate);
  if (durationDays === null) {
    throw new Error(
      "The return date must be on or after the date the vehicle was taken off the fleet."
    );
  }
  assertVehicleReturnDeclaration({ returnedDate, odometer, removedBy, removedPosition, signature });
  const firstUseDate = dateOnly2(firstUseInspectionDate);
  if (firstUseInspectionDate && (!firstUseDate || firstUseDate !== firstUseInspectionDate || firstUseDate > returnedDate)) throw new Error("The return date cannot precede the supporting inspection completion date.");
  const updatedHistory = history.map(
    (record) => record === activeRecord ? {
      ...record,
      status: "closed",
      returnedDate: dateOnly2(returnedDate),
      returnOdometer: text5(odometer),
      removedBy: text5(removedBy),
      removedPosition: text5(removedPosition),
      signature: text5(signature),
      firstUseInspectionDate: firstUseDate,
      durationDays,
      countdownPolicy: "continues_while_vor",
      completedAt
    } : record
  );
  return {
    ...syncVehicleOperatingStatus(vehicle, "Active"),
    vorEndedAt: completedAt,
    activeVorRecordId: "",
    maintenanceCountdownPause: {
      ...vehicle.maintenanceCountdownPause || {},
      status: "not_paused",
      policy: "continues_while_vor",
      returnedDate: dateOnly2(returnedDate),
      returnedAt: completedAt,
      durationDays
    },
    vorHistory: updatedHistory,
    odometer: text5(odometer),
    pendingReturnInspection: null
  };
};
var canReleaseVehicleAfterCompletedCompliance = (vehicle = {}) => {
  if (vehicleVorIntegrityError(vehicle)) return false;
  const state = text5(vehicle.complianceVor?.state).toLowerCase();
  const pmiCompletionDate = dateOnly2(
    vehicle.complianceVor?.freshPmiCompletedAt || vehicle.complianceVor?.reasons?.pmi?.completionDate || vehicle.lastPMI || vehicle.eightWeekInspectionStart
  );
  const brakeCompletionDate = dateOnly2(
    vehicle.complianceVor?.reasons?.brake_test?.completionDate || vehicle.lastBrakeTest
  );
  const hasCompletedPair = Boolean(
    pmiCompletionDate && brakeCompletionDate && pmiCompletionDate === brakeCompletionDate
  );
  const vorStartDate = getCurrentHgvVorStartDate(vehicle);
  const hasFreshCompletedPair = Boolean(
    hasCompletedPair && vorStartDate && pmiCompletionDate >= vorStartDate && brakeCompletionDate >= vorStartDate
  );
  return hasFreshCompletedPair && pmiCompletionDate <= (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) && (state === "ready_for_release" || state === "clear") && !complianceVorReleaseBlocker(vehicle);
};
var releaseVehicleAfterCompletedCompliance = (vehicle = {}, declaration = {}, {
  completedAt = (/* @__PURE__ */ new Date()).toISOString(),
  releasedBy = null
} = {}) => {
  const integrityError = vehicleVorIntegrityError(vehicle);
  if (integrityError) throw new Error(integrityError);
  const complianceVor = vehicle.complianceVor || {};
  if (!canReleaseVehicleAfterCompletedCompliance(vehicle)) {
    throw new Error("Complete all required PMI and brake-test work before releasing this vehicle.");
  }
  const blocker = complianceVorReleaseBlocker(vehicle);
  if (blocker) throw new Error(blocker);
  const pendingReturnInspection = vehicle.pendingReturnInspection || null;
  const pmiCompletionDate = dateOnly2(
    complianceVor.freshPmiCompletedAt || complianceVor.reasons?.pmi?.completionDate || vehicle.lastPMI || vehicle.eightWeekInspectionStart
  );
  const brakeCompletionDate = dateOnly2(
    complianceVor.reasons?.brake_test?.completionDate || vehicle.lastBrakeTest
  );
  const restoredNextPmi = pendingReturnInspection ? addWeeks(
    pmiCompletionDate,
    getConfiguredMaintenanceFrequencyWeeks(vehicle, "pmi")
  ) : "";
  const restoredNextBrakeTest = pendingReturnInspection ? addWeeks(
    brakeCompletionDate,
    getConfiguredMaintenanceFrequencyWeeks(vehicle, "brake_test")
  ) : "";
  const returned = returnVehicleFromVor(
    vehicle,
    {
      ...declaration,
      firstUseInspectionDate: pmiCompletionDate
    },
    { completedAt }
  );
  const releasePatch = buildComplianceReleasePatch(returned, {
    releasedAt: completedAt,
    releasedBy
  });
  return {
    ...returned,
    ...releasePatch,
    ...restoredNextPmi ? {
      nextPMI: restoredNextPmi,
      nextEightWeekInspection: restoredNextPmi,
      nextLorryInspection: restoredNextPmi,
      pmiISOWeek: getIsoWeekLabel(restoredNextPmi),
      eightWeekInspectionISOWeek: getIsoWeekLabel(restoredNextPmi),
      lorryInspectionISOWeek: getIsoWeekLabel(restoredNextPmi)
    } : {},
    ...restoredNextBrakeTest ? {
      nextBrakeTest: restoredNextBrakeTest,
      brakeISOWeek: getIsoWeekLabel(restoredNextBrakeTest)
    } : {},
    complianceVor: {
      ...releasePatch.complianceVor,
      releaseMethod: "completed_compliance_inspections",
      releaseEvidence: {
        pmiCompletionDate,
        brakeCompletionDate,
        supersededPendingReturnInspection: pendingReturnInspection
      }
    }
  };
};
var scheduleVehicleReturnInspection = (vehicle = {}, {
  inspectionDate,
  odometer = "",
  removedBy = "",
  removedPosition = "",
  signature = ""
} = {}, { requestedAt = (/* @__PURE__ */ new Date()).toISOString() } = {}) => {
  assertVehicleReturnDeclaration({ returnedDate: inspectionDate, odometer, removedBy, removedPosition, signature });
  const normalizedInspectionDate = dateOnly2(inspectionDate);
  const integrityError = vehicleVorIntegrityError(vehicle);
  if (integrityError) throw new Error(integrityError);
  const history = Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [];
  const activeRecord = history.find(
    (record) => record.id === vehicle.activeVorRecordId || !vehicle.activeVorRecordId && record.status === "open"
  ) || null;
  const activeRecordId = vehicle.activeVorRecordId || activeRecord?.id || "";
  const offRoadDate = activeRecord?.offRoadDate || vehicle.maintenanceCountdownPause?.startedDate;
  if (calculateVorDurationDays(offRoadDate, normalizedInspectionDate) === null) {
    throw new Error(
      "The return inspection date must be on or after the date the vehicle was taken off the fleet."
    );
  }
  const declaration = {
    inspectionDate: normalizedInspectionDate,
    odometer: text5(odometer),
    removedBy: text5(removedBy),
    removedPosition: text5(removedPosition),
    signature: text5(signature),
    requestedAt
  };
  const updatedHistory = history.map(
    (record) => record === activeRecord ? {
      ...record,
      plannedReturnInspectionDate: normalizedInspectionDate,
      returnOdometer: declaration.odometer,
      removedBy: declaration.removedBy,
      removedPosition: declaration.removedPosition,
      signature: declaration.signature,
      returnInspectionRequestedAt: requestedAt
    } : record
  );
  return {
    ...syncVehicleOperatingStatus(vehicle, "VOR"),
    nextPMI: normalizedInspectionDate,
    nextEightWeekInspection: normalizedInspectionDate,
    pmiISOWeek: getIsoWeekLabel(normalizedInspectionDate),
    eightWeekInspectionISOWeek: getIsoWeekLabel(normalizedInspectionDate),
    nextBrakeTest: normalizedInspectionDate,
    brakeISOWeek: getIsoWeekLabel(normalizedInspectionDate),
    pendingReturnInspection: {
      status: "inspection_required",
      ...declaration
    },
    vorHistory: updatedHistory
  };
};
var vehicleReturnInspectionBookingIntent = (vehicle = {}) => {
  const pending = vehicle.pendingReturnInspection || {};
  const appointmentDateISO = dateOnly2(pending.inspectionDate);
  const vehicleId = text5(vehicle.id);
  if (text5(pending.status).toLowerCase() !== "inspection_required" || !appointmentDateISO || !vehicleId) {
    return null;
  }
  return {
    vehicleId,
    vehicleLabel: text5(vehicle.name || vehicle.registration || vehicle.reg),
    type: "INSPECTION",
    status: "Booked",
    maintenanceTypeIds: ["pmi", "brake_test"],
    appointmentDateISO,
    sourceDueDateISO: appointmentDateISO,
    sourceDueKey: `vor-return:${vehicleId}:${appointmentDateISO}`,
    notes: "Required combined PMI and brake-test inspection before return to fleet.",
    origin: "vehicle_vor_return",
    sourceVorPeriodId: text5(vehicle.activeVorRecordId)
  };
};
var buildReturnInspectionCompletionPatch = (vehicle = {}, { completedDate, bookingId = "" } = {}, { completedAt = (/* @__PURE__ */ new Date()).toISOString() } = {}) => {
  const pending = vehicle?.pendingReturnInspection || null;
  const normalizedCompletedDate = dateOnly2(completedDate);
  if (!pending || text5(pending.status).toLowerCase() !== "inspection_required" || !normalizedCompletedDate) {
    return null;
  }
  const expectedBookingId = text5(pending.bookingId);
  const expectedDate = dateOnly2(pending.inspectionDate);
  const isExpectedInspection = expectedBookingId ? expectedBookingId === text5(bookingId) : expectedDate === normalizedCompletedDate;
  if (!isExpectedInspection) return null;
  const returned = returnVehicleFromVor(
    vehicle,
    {
      returnedDate: normalizedCompletedDate,
      odometer: pending.odometer,
      removedBy: pending.removedBy,
      removedPosition: pending.removedPosition,
      signature: pending.signature,
      firstUseInspectionDate: normalizedCompletedDate
    },
    { completedAt }
  );
  return {
    ...syncVehicleOperatingStatus({}, "Active"),
    vorEndedAt: returned.vorEndedAt,
    activeVorRecordId: returned.activeVorRecordId,
    maintenanceCountdownPause: returned.maintenanceCountdownPause,
    vorHistory: returned.vorHistory,
    odometer: returned.odometer,
    pendingReturnInspection: null
  };
};
var buildHistoricVorPeriod = ({
  id = `vor-history-${Date.now()}`,
  registration = "",
  offRoadDate,
  returnedDate,
  reason,
  approvedBy,
  approvedPosition,
  removedBy,
  removedPosition,
  firstUseInspectionDate = "",
  operatorLicenceNumber = "",
  offRoadOdometer = "",
  returnOdometer = "",
  migratedBy = {}
}) => {
  const durationDays = calculateVorDurationDays(offRoadDate, returnedDate);
  if (durationDays === null) throw new Error("Historic VOR return date must be on or after its start date.");
  if (firstUseInspectionDate && (dateOnly2(firstUseInspectionDate) < dateOnly2(offRoadDate) || dateOnly2(firstUseInspectionDate) > dateOnly2(returnedDate))) {
    throw new Error("Historic first-use inspection must fall within the VOR/SORN period.");
  }
  return {
    id,
    status: "closed",
    source: "historic_migration",
    migrated: true,
    migratedAt: (/* @__PURE__ */ new Date()).toISOString(),
    migratedBy: {
      uid: text5(migratedBy.uid),
      name: text5(migratedBy.name || migratedBy.email) || "Unknown",
      email: text5(migratedBy.email)
    },
    registration: text5(registration),
    operatorLicenceNumber: text5(operatorLicenceNumber),
    offRoadDate: dateOnly2(offRoadDate),
    returnedDate: dateOnly2(returnedDate),
    offRoadOdometer: text5(offRoadOdometer),
    returnOdometer: text5(returnOdometer),
    reason: text5(reason),
    approvedBy: text5(approvedBy),
    approvedPosition: text5(approvedPosition),
    removedBy: text5(removedBy),
    removedPosition: text5(removedPosition),
    firstUseInspectionDate: dateOnly2(firstUseInspectionDate),
    durationDays,
    startedAt: `${dateOnly2(offRoadDate)}T00:00:00.000Z`,
    completedAt: `${dateOnly2(returnedDate)}T00:00:00.000Z`
  };
};
var addHistoricVorPeriod = (vehicle = {}, input = {}, options = {}) => {
  assertVorHistoryIntegrity(vehicle);
  const record = buildHistoricVorPeriod(input);
  assertVorPeriodDoesNotOverlap(vehicle, record);
  return {
    ...vehicle,
    vorHistory: [...Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [], record],
    vorHistoryLastMutatedAt: options.mutatedAt || (/* @__PURE__ */ new Date()).toISOString(),
    vorHistoryLastMutatedBy: normalizeVorAuditUser(options.mutatedBy)
  };
};
var historicVorFirstUseBookingIntent = (vehicle = {}, period = {}) => {
  const appointmentDateISO = dateOnly2(period.firstUseInspectionDate);
  if (!appointmentDateISO) return null;
  const vehicleId = text5(vehicle.id);
  const periodId = text5(period.id);
  return {
    vehicleId,
    vehicleLabel: text5(vehicle.name || vehicle.registration || vehicle.reg),
    type: "INSPECTION",
    status: "Booked",
    maintenanceTypeIds: ["pmi", "brake_test"],
    appointmentDateISO,
    sourceDueDateISO: appointmentDateISO,
    sourceDueKey: `historic-vor-first-use:${vehicleId}:${periodId}:${appointmentDateISO}`,
    notes: `First-use inspection following historic VOR/SORN period ${periodId}.`,
    origin: "historic_vor_first_use",
    sourceVorPeriodId: periodId
  };
};
var historicVorAuditSnapshot = (record = {}) => ({
  status: text5(record.status),
  offRoadDate: dateOnly2(record.offRoadDate || record.startedAt),
  returnedDate: dateOnly2(record.returnedDate || record.completedAt),
  offRoadOdometer: text5(record.offRoadOdometer),
  returnOdometer: text5(record.returnOdometer),
  reason: text5(record.reason),
  approvedBy: text5(record.approvedBy),
  approvedPosition: text5(record.approvedPosition),
  removedBy: text5(record.removedBy),
  removedPosition: text5(record.removedPosition),
  firstUseInspectionDate: dateOnly2(record.firstUseInspectionDate),
  operatorLicenceNumber: text5(record.operatorLicenceNumber)
});
var normalizeVorAuditUser = (user = {}) => ({
  uid: text5(user.uid),
  name: text5(user.name || user.displayName || user.email) || "Unknown",
  email: text5(user.email)
});
var isHistoricallyMigratedVorPeriod = (record = {}) => record?.migrated === true || text5(record?.source).toLowerCase() === "historic_migration";
var isAutomaticComplianceVorPeriod = (record = {}) => {
  const source = text5(record?.source).toLowerCase();
  const id = text5(record?.id).toLowerCase();
  const approver = text5(record?.approvedBy).toLowerCase();
  const reason = text5(record?.reason).toLowerCase();
  return source === "automatic_compliance" || id.startsWith("compliance-vor-") || approver === "hgv compliance system" || reason.startsWith("automatic compliance vor:");
};
var isAdminCorrectableVorPeriod = (record = {}) => isHistoricallyMigratedVorPeriod(record) || isAutomaticComplianceVorPeriod(record);
var activeAutomaticPeriod = (vehicle, recordId) => {
  assertVorHistoryIntegrity(vehicle);
  const history = Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [];
  const record = history.find((entry) => text5(entry?.id) === text5(recordId));
  if (!record || text5(record.status).toLowerCase() !== "open" || !isAutomaticComplianceVorPeriod(record) || !isVehicleOutOfUse(vehicle) || vehicle.activeVorRecordId && vehicle.activeVorRecordId !== record.id) {
    throw new Error("Only the current open automatic compliance VOR period can be changed here.");
  }
  return record;
};
var correctOpenAutomaticVorPeriod = (vehicle = {}, recordId, changes = {}, { reason, correctedAt = (/* @__PURE__ */ new Date()).toISOString(), correctedBy = {} } = {}) => {
  const record = activeAutomaticPeriod(vehicle, recordId);
  const integrityError = vehicleVorIntegrityError(vehicle);
  if (integrityError) throw new Error(integrityError);
  if (!text5(reason)) throw new Error("Enter a reason for correcting this VOR period.");
  const allowed = ["reason", "approvedBy", "approvedPosition", "offRoadOdometer", "operatorLicenceNumber"];
  if (Object.keys(changes).some((field) => !allowed.includes(field))) throw new Error("Open VOR dates and return details must use the release workflow.");
  const corrected = Object.fromEntries(allowed.filter((field) => field in changes).map((field) => [field, text5(changes[field])]));
  if (!text5(corrected.reason ?? record.reason)) throw new Error("Enter the reason for VOR/SORN.");
  const auditUser = normalizeVorAuditUser(correctedBy);
  return {
    ...vehicle,
    vorHistory: vehicle.vorHistory.map((entry) => entry === record ? {
      ...entry,
      ...corrected,
      source: "automatic_compliance",
      correctedAt,
      correctedBy: auditUser,
      correctionReason: text5(reason),
      auditHistory: [...Array.isArray(entry.auditHistory) ? entry.auditHistory : [], {
        action: "corrected",
        at: correctedAt,
        by: auditUser,
        reason: text5(reason),
        previous: historicVorAuditSnapshot(entry)
      }]
    } : entry),
    vorHistoryLastMutatedAt: correctedAt,
    vorHistoryLastMutatedBy: auditUser
  };
};
var voidOpenAutomaticVorPeriod = (vehicle = {}, recordId, { reason, voidedAt = (/* @__PURE__ */ new Date()).toISOString(), voidedBy = {} } = {}) => {
  const record = activeAutomaticPeriod(vehicle, recordId);
  const integrityError = vehicleVorIntegrityError(vehicle);
  if (integrityError) throw new Error(integrityError);
  if (!text5(reason)) throw new Error("Enter why this automatic VOR entry is being removed.");
  const auditUser = normalizeVorAuditUser(voidedBy);
  const archived = archiveHistoricVorPeriod({ ...record, source: "automatic_compliance" }, { reason, archivedAt: voidedAt, archivedBy: voidedBy });
  return {
    ...syncVehicleOperatingStatus(vehicle, "Active"),
    vorHistory: vehicle.vorHistory.map((entry) => entry === record ? archived : entry),
    activeVorRecordId: "",
    vorStartedAt: "",
    maintenanceCountdownPause: null,
    pendingReturnInspection: null,
    complianceVor: { ...vehicle.complianceVor || {}, state: "clear", startedDate: "", reasons: {}, releaseRequired: false },
    vorHistoryLastMutatedAt: voidedAt,
    vorHistoryLastMutatedBy: auditUser
  };
};
var correctHistoricVorPeriod = (record = {}, changes = {}, { reason, correctedAt = (/* @__PURE__ */ new Date()).toISOString(), correctedBy = {} } = {}) => {
  if (!isAdminCorrectableVorPeriod(record)) {
    throw new Error("Only migrated or automatic compliance VOR/SORN periods can be corrected here.");
  }
  if (!text5(reason)) throw new Error("Enter a reason for correcting this historic period.");
  const corrected = buildHistoricVorPeriod({
    id: record.id,
    registration: changes.registration ?? record.registration,
    operatorLicenceNumber: changes.operatorLicenceNumber ?? record.operatorLicenceNumber,
    offRoadDate: changes.offRoadDate ?? record.offRoadDate,
    returnedDate: changes.returnedDate ?? record.returnedDate,
    offRoadOdometer: changes.offRoadOdometer ?? record.offRoadOdometer,
    returnOdometer: changes.returnOdometer ?? record.returnOdometer,
    approvedBy: changes.approvedBy ?? record.approvedBy,
    approvedPosition: changes.approvedPosition ?? record.approvedPosition,
    removedBy: changes.removedBy ?? record.removedBy,
    removedPosition: changes.removedPosition ?? record.removedPosition,
    reason: changes.reason ?? record.reason,
    firstUseInspectionDate: changes.firstUseInspectionDate ?? record.firstUseInspectionDate,
    migratedBy: record.migratedBy
  });
  const missingRequiredField = [
    [corrected.offRoadDate, "start date"],
    [corrected.returnedDate, "return date"],
    [corrected.approvedBy, "VOR approver"],
    [corrected.approvedPosition, "approver position"],
    [corrected.removedBy, "return authoriser"],
    [corrected.removedPosition, "return authoriser position"],
    [corrected.reason, "VOR/SORN reason"]
  ].find(([value]) => !text5(value));
  if (missingRequiredField) {
    throw new Error(`Enter the ${missingRequiredField[1]} before saving this correction.`);
  }
  const auditUser = normalizeVorAuditUser(correctedBy);
  const migratedRecord = isHistoricallyMigratedVorPeriod(record);
  return {
    ...record,
    ...corrected,
    source: record.source || (isAutomaticComplianceVorPeriod(record) ? "automatic_compliance" : corrected.source),
    migrated: record.migrated === true,
    migratedAt: migratedRecord ? record.migratedAt || corrected.migratedAt : record.migratedAt,
    migratedBy: migratedRecord ? record.migratedBy || corrected.migratedBy : record.migratedBy,
    correctedAt,
    correctedBy: auditUser,
    correctionReason: text5(reason),
    auditHistory: [
      ...Array.isArray(record.auditHistory) ? record.auditHistory : [],
      {
        action: "corrected",
        at: correctedAt,
        by: auditUser,
        reason: text5(reason),
        previous: historicVorAuditSnapshot(record)
      }
    ]
  };
};
var correctVehicleHistoricVorPeriod = (vehicle = {}, recordId, changes = {}, options = {}) => {
  assertVorHistoryIntegrity(vehicle);
  const history = Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [];
  const current = history.find((record) => text5(record?.id) === text5(recordId));
  if (!current) throw new Error("Historic VOR/SORN period no longer exists.");
  const corrected = correctHistoricVorPeriod(current, changes, options);
  assertVorPeriodDoesNotOverlap(vehicle, corrected, { excludedRecordId: recordId });
  return {
    ...vehicle,
    vorHistory: history.map((record) => text5(record?.id) === text5(recordId) ? corrected : record)
  };
};
var archiveHistoricVorPeriod = (record = {}, { reason, archivedAt = (/* @__PURE__ */ new Date()).toISOString(), archivedBy = {} } = {}) => {
  if (!isAdminCorrectableVorPeriod(record)) {
    throw new Error("Only migrated or automatic compliance VOR/SORN periods can be archived here.");
  }
  if (!text5(reason)) throw new Error("Enter a reason for archiving this historic period.");
  const auditUser = normalizeVorAuditUser(archivedBy);
  return {
    ...record,
    status: "archived",
    archivedAt,
    archivedBy: auditUser,
    archiveReason: text5(reason),
    auditHistory: [
      ...Array.isArray(record.auditHistory) ? record.auditHistory : [],
      {
        action: "archived",
        at: archivedAt,
        by: auditUser,
        reason: text5(reason),
        previous: historicVorAuditSnapshot(record)
      }
    ]
  };
};
var archiveVehicleHistoricVorPeriod = (vehicle = {}, recordId, options = {}) => {
  assertVorHistoryIntegrity(vehicle);
  const history = Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [];
  const current = history.find((record) => text5(record?.id) === text5(recordId));
  if (!current) throw new Error("Historic VOR/SORN period no longer exists.");
  const archived = archiveHistoricVorPeriod(current, options);
  return {
    ...vehicle,
    vorHistory: history.map((record) => text5(record?.id) === text5(recordId) ? archived : record)
  };
};

// src/app/utils/vehicleVorRecovery.js
var text6 = (value) => String(value ?? "").trim();
var validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(text6(value)) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function closedVorReturnRecovery(vehicle = {}, asOfDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) {
  if (normalizeVehicleOperatingStatus(vehicle) !== "VOR" || !Array.isArray(vehicle.vorHistory)) return null;
  const history = vehicle.vorHistory;
  if (history.some((record2) => !record2 || typeof record2 !== "object" || !record2.id)) return null;
  if (new Set(history.map((record2) => record2.id)).size !== history.length) return null;
  const visible = history.filter((record2) => !["archived", "deleted", "superseded"].includes(text6(record2.status).toLowerCase()));
  if (!visible.length || visible.some((record2) => text6(record2.status).toLowerCase() !== "closed" || !validDate(record2.offRoadDate) || !validDate(record2.returnedDate) || record2.offRoadDate > record2.returnedDate)) return null;
  const periods = [...visible].sort((a, b) => a.offRoadDate.localeCompare(b.offRoadDate));
  if (periods.some((record2, index) => index > 0 && periods[index - 1].returnedDate >= record2.offRoadDate)) return null;
  const record = periods.at(-1);
  if (record.returnedDate > asOfDate || vehicle.activeVorRecordId && vehicle.activeVorRecordId !== record.id) return null;
  if (vehicle.pendingReturnInspection) return null;
  if (text6(vehicle.vorStartedAt).slice(0, 10) > record.returnedDate || text6(vehicle.complianceVor?.startedDate).slice(0, 10) > record.returnedDate) return null;
  const pauseDate = vehicle.maintenanceCountdownPause?.startedDate;
  if (pauseDate && pauseDate !== record.offRoadDate) return null;
  return { record };
}
var validationVehicle = (vehicle, record) => ({
  ...vehicle,
  activeVorRecordId: record.id,
  // A temporary validation view only. The original history is restored in the output.
  vorHistory: vehicle.vorHistory.map((entry) => entry === record ? { ...entry, status: "open" } : entry),
  maintenanceCountdownPause: { ...vehicle.maintenanceCountdownPause || {}, startedDate: record.offRoadDate },
  complianceVor: { ...vehicle.complianceVor || {}, state: "ready_for_release" }
});
function closedVorReturnRecoveryReady(vehicle, recovery) {
  if (!recovery) return false;
  const candidate = validationVehicle(vehicle, recovery.record);
  const pmi = candidate.complianceVor?.freshPmiCompletedAt || candidate.complianceVor?.reasons?.pmi?.completionDate || candidate.lastPMI || candidate.eightWeekInspectionStart;
  const brake = candidate.complianceVor?.reasons?.brake_test?.completionDate || candidate.lastBrakeTest;
  return canReleaseVehicleAfterCompletedCompliance(candidate) && pmi <= recovery.record.returnedDate && brake <= recovery.record.returnedDate;
}
function recoverClosedVehicleReturn(vehicle, declaration = {}, { actor = {}, recordedAt = (/* @__PURE__ */ new Date()).toISOString() } = {}) {
  const recovery = closedVorReturnRecovery(vehicle, recordedAt.slice(0, 10));
  if (!recovery || recovery.record.id !== declaration.recordId) throw new Error("The recorded return has changed or is ambiguous. Review the vehicle timeline before recovery.");
  if (declaration.returnedDate !== recovery.record.returnedDate) throw new Error("Use the return date already recorded on this period. Recovery cannot rewrite history.");
  if (!text6(declaration.reason)) throw new Error("Enter the reason for reconciling this vehicle status.");
  if (vehicle.vorRecoveryHistory != null && !Array.isArray(vehicle.vorRecoveryHistory)) throw new Error("The existing recovery audit needs review.");
  if (!closedVorReturnRecoveryReady(vehicle, recovery)) throw new Error("Record the completed PMI and brake test on or before the recorded return date before confirming recovery.");
  const released = releaseVehicleAfterCompletedCompliance(validationVehicle(vehicle, recovery.record), declaration, { completedAt: recordedAt, releasedBy: actor });
  return {
    ...released,
    vorHistory: vehicle.vorHistory,
    vorRecoveryHistory: [...vehicle.vorRecoveryHistory || [], {
      recordId: recovery.record.id,
      recordedAt,
      actor,
      reason: text6(declaration.reason),
      previousStatus: Object.fromEntries(["operationalStatus", "fleetStatus", "vehicleStatus", "availabilityStatus", "status"].map((field) => [field, vehicle[field] ?? null])),
      declaration: Object.fromEntries(["returnedDate", "odometer", "removedBy", "removedPosition", "signature"].map((field) => [field, declaration[field]])),
      inspectionEvidence: released.complianceVor.releaseEvidence
    }]
  };
}

// src/app/api/maintenance/bookings/_service.js
import crypto2 from "node:crypto";

// src/app/utils/vehicleEditorSave.js
var VEHICLE_EDITOR_PROTECTED_MAINTENANCE_FIELDS = Object.freeze([
  "archivedFuturePmiHistory",
  "brakeTestDocuments",
  "brakeTestHistory",
  "dvsaLatestMot",
  "dvsaLatestMotAdvisoryCount",
  "dvsaLatestMotDangerousCount",
  "dvsaLatestMotDefectCount",
  "dvsaLatestMotMajorCount",
  "dvsaLatestMotOdometer",
  "dvsaLatestMotResult",
  "dvsaLatestMotTestNumber",
  "dvsaMotExpiryDate",
  "dvsaMotHistoryFetchedAt",
  "dvsaMotMileageWarning",
  "dvsaMotTests",
  "dvsaMotVehicleDetails",
  "eightWeekInspectionHistory",
  "eightWeekInspectionStart",
  "futurePmiHistoryCleanupHistory",
  "futurePmiHistoryCleanupLocked",
  "hgvComplianceMigratedAt",
  "hgvComplianceMigrationIssues",
  "hgvComplianceMigrationVersion",
  "lastBrakeTest",
  "lastEightWeekInspection",
  "lastLOLER",
  "lastLoler",
  "lastLorryInspection",
  "lastMOT",
  "lastMot",
  "lastMotDate",
  "lastPMI",
  "lastPmi",
  "lastService",
  "lastServiceDate",
  "lastTacho",
  "lastTachoCalibration",
  "lastTachoDownload",
  "lastTachoInspection",
  "lastTailLift",
  "lolerDocuments",
  "lolerHistory",
  "maintenanceReconciliationRequired",
  "motAwaitingDvsaBookingId",
  "motAwaitingDvsaCompletionDate",
  "motAwaitingDvsaConfirmation",
  "motAwaitingDvsaSince",
  "motDocuments",
  "motDvsaConfirmationStatus",
  "motDvsaConfirmedAt",
  "motHistory",
  "motHistoryLatestTestNumber",
  "motHistorySyncedAt",
  "pendingReturnInspection",
  "pmiDocuments",
  "pmiHistory",
  "serviceDocuments",
  "serviceHistory",
  "serviceHistoryFiles",
  "tachoCalibrationDocuments",
  "tachoCalibrationHistory",
  "tachoDownloadDocuments",
  "tachoDownloadHistory",
  "tachoInspectionDocuments",
  "tachoInspectionHistory",
  "tailLiftDocuments",
  "tailLiftHistory"
]);
var VEHICLE_VOR_PROTECTED_FIELDS = Object.freeze([
  "operationalStatus",
  "fleetStatus",
  "vehicleStatus",
  "availabilityStatus",
  "status",
  "archivedOperatingStatus",
  "vorStartedAt",
  "vorEndedAt",
  "activeVorRecordId",
  "vorRecoveryHistory",
  "vorHistory",
  "vorHistoryLastMutatedAt",
  "vorHistoryLastMutatedBy",
  "maintenanceCountdownPause",
  "complianceVor"
]);
var PROTECTED_FIELDS = /* @__PURE__ */ new Set([...VEHICLE_EDITOR_PROTECTED_MAINTENANCE_FIELDS, ...VEHICLE_VOR_PROTECTED_FIELDS]);
function sanitizeInitialVehicleLegalEvidence(profile = {}) {
  return Object.fromEntries(Object.entries(profile).filter(([field]) => !VEHICLE_EDITOR_PROTECTED_MAINTENANCE_FIELDS.includes(field)));
}
var VEHICLE_INITIAL_COMPLETION_FIELDS = Object.freeze(VEHICLE_EDITOR_PROTECTED_MAINTENANCE_FIELDS.filter((field) => field.startsWith("last") || field === "eightWeekInspectionStart"));

// guard:transport
function adminCommitDocumentPatches() {
  throw new Error("A workshop transaction transport is required.");
}
function adminCommitDocumentPatchesWithSequence() {
  throw new Error("A workshop transaction transport is required.");
}
function adminListDocuments() {
  throw new Error("A workshop transaction transport is required.");
}
function adminReadDocument() {
  throw new Error("A workshop transaction transport is required.");
}
function adminReadDocumentWithMetadata() {
  throw new Error("A workshop transaction transport is required.");
}

// src/app/utils/maintenanceDocuments.js
var text7 = (value) => String(value || "").trim();
var maintenanceDocumentUrl = (document = {}) => text7(
  typeof document === "string" ? document : document.url || document.downloadURL || document.downloadUrl || document.fileUrl || document.documentUrl
);
var maintenanceDocumentId = (document = {}) => text7(document?.id || document?.storagePath || maintenanceDocumentUrl(document));
var normalizeMaintenanceUploader = (uploader = {}) => {
  if (typeof uploader === "string") {
    return { uid: "", name: uploader || "Unknown", email: "" };
  }
  return {
    uid: text7(uploader.uid || uploader.userUid),
    name: text7(uploader.name || uploader.displayName || uploader.email) || "Unknown",
    email: text7(uploader.email)
  };
};
var normalizeMaintenanceDocument = (document, defaults = {}) => {
  const sourceDocument = typeof document === "string" ? { url: document } : document && typeof document === "object" ? document : {};
  const url = maintenanceDocumentUrl(sourceDocument);
  const storagePath = text7(sourceDocument.storagePath || defaults.storagePath);
  const uploadedAt = text7(
    sourceDocument.uploadedAt || sourceDocument.createdAt || sourceDocument.completedAt || defaults.uploadedAt
  );
  const maintenanceTypeId = text7(
    sourceDocument.maintenanceTypeId || defaults.maintenanceTypeId
  ).toLowerCase();
  const source = text7(sourceDocument.source || defaults.source) || "maintenance";
  const id = text7(sourceDocument.id) || storagePath || url || `${maintenanceTypeId}:${uploadedAt}:${text7(sourceDocument.name || defaults.name)}`;
  return {
    id,
    name: text7(
      sourceDocument.name || sourceDocument.fileName || sourceDocument.filename || defaults.name
    ) || "Maintenance document",
    url,
    storagePath,
    contentType: text7(sourceDocument.contentType || defaults.contentType),
    size: Number(sourceDocument.size || defaults.size || 0),
    maintenanceTypeId,
    source,
    sourceRecordId: text7(sourceDocument.sourceRecordId || defaults.sourceRecordId),
    uploadedAt,
    uploadedBy: normalizeMaintenanceUploader(
      sourceDocument.uploadedBy || (sourceDocument.uploadedByUid || sourceDocument.uploadedByName || sourceDocument.uploadedByEmail || sourceDocument.uploader ? {
        uid: sourceDocument.uploadedByUid,
        name: sourceDocument.uploadedByName || sourceDocument.uploader,
        email: sourceDocument.uploadedByEmail
      } : defaults.uploadedBy)
    )
  };
};
var normalizeMaintenanceDocumentList = (documents, defaults = {}) => (Array.isArray(documents) ? documents : []).map((document) => normalizeMaintenanceDocument(document, defaults)).filter((document) => document.url);

// src/app/utils/additionalMaintenanceCompletion.js
var safeArr = (value) => Array.isArray(value) ? value : [];
var toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
var dateOnly3 = (value) => {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const parsed = toDate(value);
  if (!parsed) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
var buildAdditionalMaintenanceCompletionPatch = ({
  vehicle = {},
  workflows = [],
  completedDate,
  completedAt = (/* @__PURE__ */ new Date()).toISOString(),
  documentsByKey = {},
  auditUser = {},
  bookingId = "",
  source = "system_appointment",
  provider = "",
  bookingRef = "",
  notes = ""
} = {}) => {
  const normalizedCompletedDate = dateOnly3(completedDate);
  if (!normalizedCompletedDate || !workflows.length) return null;
  const patch = { updatedAt: completedAt };
  workflows.forEach((workflow) => {
    const suppliedDocuments = documentsByKey[workflow.key] || documentsByKey[workflow.maintenanceTypeId] || [];
    const documents = normalizeMaintenanceDocumentList(
      Array.isArray(suppliedDocuments) ? suppliedDocuments : [suppliedDocuments],
      {
        maintenanceTypeId: workflow.maintenanceTypeId,
        sourceRecordId: bookingId,
        uploadedBy: auditUser
      }
    );
    const frequencyWeeks = getConfiguredMaintenanceFrequencyWeeks(vehicle, workflow);
    const nextDueDate = calculateNextMaintenanceDue({
      maintenanceTypeId: workflow.maintenanceTypeId,
      completedDate: normalizedCompletedDate,
      frequencyWeeks
    });
    const priorHistory = safeArr(vehicle[workflow.historyField]);
    patch[workflow.lastField] = normalizedCompletedDate;
    if (nextDueDate) {
      patch[workflow.nextField] = nextDueDate;
      patch[workflow.isoWeekField] = getIsoWeekLabel(nextDueDate);
    } else {
      patch[workflow.nextField] = "";
      patch[workflow.isoWeekField] = "";
    }
    if (documents.length) {
      patch[workflow.documentsField] = [
        ...safeArr(vehicle[workflow.documentsField]),
        ...documents
      ];
    }
    const historyEntry2 = {
      maintenanceTypeId: workflow.maintenanceTypeId,
      label: workflow.label,
      completedDate: normalizedCompletedDate,
      nextDueDate,
      completedAt,
      completedBy: {
        uid: String(auditUser?.uid || "").trim(),
        name: String(auditUser?.name || auditUser?.email || "").trim(),
        email: String(auditUser?.email || "").trim()
      },
      bookingId: String(bookingId || "").trim(),
      source,
      provider: String(provider || "").trim(),
      bookingRef: String(bookingRef || "").trim(),
      notes: String(notes || "").trim(),
      documents
    };
    patch[workflow.historyField] = [
      ...priorHistory.filter((entry) => {
        if (historyEntry2.bookingId) {
          return !maintenanceEvidenceMatches(entry, historyEntry2.bookingId, historyEntry2.maintenanceTypeId);
        }
        return !(entry?.maintenanceTypeId === historyEntry2.maintenanceTypeId && dateOnly3(entry?.completedDate) === historyEntry2.completedDate && String(entry?.source || "") === historyEntry2.source);
      }),
      historyEntry2
    ].sort(
      (left, right) => dateOnly3(left?.completedDate).localeCompare(dateOnly3(right?.completedDate))
    );
  });
  const selectedTypeIds = new Set(
    workflows.map((workflow) => String(workflow?.maintenanceTypeId || "").trim())
  );
  if (selectedTypeIds.has("pmi")) {
    Object.assign(
      patch,
      syncCanonicalPmiAliases(
        { ...vehicle, ...patch },
        { asOfDate: normalizedCompletedDate }
      )
    );
  }
  const compliance = evaluateHgvCompliance(
    { ...vehicle, ...patch },
    { asOfDate: normalizedCompletedDate, evaluatedAt: completedAt }
  );
  patch.complianceVor = compliance.complianceVor;
  const completesReturnInspection = selectedTypeIds.has("pmi") && selectedTypeIds.has("brake_test");
  if (completesReturnInspection) {
    const releaseCandidate = { ...vehicle, ...patch };
    const returnPatch = buildReturnInspectionCompletionPatch(
      releaseCandidate,
      { completedDate: normalizedCompletedDate, bookingId },
      { completedAt }
    );
    const releaseBlocker = returnPatch ? complianceVorReleaseBlocker(releaseCandidate, {
      asOfDate: normalizedCompletedDate
    }) : "";
    if (returnPatch && !releaseBlocker) {
      Object.assign(patch, returnPatch);
      Object.assign(
        patch,
        buildComplianceReleasePatch(
          { ...releaseCandidate, ...returnPatch },
          {
            releasedAt: completedAt,
            releasedBy: auditUser
          }
        )
      );
    }
  }
  return patch;
};

// src/app/utils/maintenanceForecast.js
var text8 = (value) => String(value || "").trim();
var list2 = (value) => Array.isArray(value) ? value : [];
var AUTOMATIC_CALENDAR_MAINTENANCE_TYPE_IDS = Object.freeze(
  RECURRING_MAINTENANCE_WORKFLOWS.map((workflow) => workflow.maintenanceTypeId)
);
var INSPECTION_MAINTENANCE_TYPE_IDS = Object.freeze(["pmi", "brake_test"]);
var normalizedIncludedTypeIds = (includedTypeIds) => new Set(
  (Array.isArray(includedTypeIds) ? includedTypeIds : AUTOMATIC_CALENDAR_MAINTENANCE_TYPE_IDS).map((value) => text8(value).toLowerCase()).filter((value) => AUTOMATIC_CALENDAR_MAINTENANCE_TYPE_IDS.includes(value))
);
var yearOf = (value) => Number(maintenanceDateOnly(value).slice(0, 4) || 0);
var vehicleLabel = (vehicle = {}) => {
  const name = text8(vehicle.name || vehicle.vehicleName || vehicle.title);
  const registration = text8(vehicle.registration || vehicle.reg).toUpperCase();
  if (name && registration && !name.toUpperCase().includes(registration)) {
    return `${name} (${registration})`;
  }
  return name || registration || text8(vehicle.id) || "Vehicle";
};
var additionalUiKeyByType = Object.freeze({
  tacho_inspection: "tachoInspection",
  brake_test: "brakeTest",
  pmi: "pmiInspection",
  tacho_download: "tachoDownload",
  tail_lift: "tailLift",
  loler: "loler",
  tacho_calibration: "tachoCalibration"
});
var isVehicleMaintenanceTypeEnabled = (vehicle = {}, workflow = {}) => {
  const uiKey = additionalUiKeyByType[workflow.maintenanceTypeId] || workflow.dueKey;
  const hiddenTypes = new Set(list2(vehicle.hiddenAdditionalMaintenance).map((value) => text8(value)));
  if ([uiKey, workflow.key, workflow.maintenanceTypeId].filter(Boolean).some((value) => hiddenTypes.has(text8(value)))) {
    return false;
  }
  const hasDate = [...workflow.nextFields || [workflow.nextField], ...workflow.lastFields || [workflow.lastField]].some((field) => maintenanceDateOnly(vehicle[field]));
  const hasAuthoritativeDueDate = workflow.dvsaAuthoritative === true && (workflow.nextFields || [workflow.nextField]).some((field) => maintenanceDateOnly(vehicle[field]));
  if (hasAuthoritativeDueDate) return true;
  return hasDate && getConfiguredMaintenanceFrequencyWeeks(vehicle, workflow) > 0;
};
var requestedRecord = ({ companyId, vehicle, items, year }) => {
  const record = buildRequestedMaintenanceRecord({
    companyId: text8(vehicle.companyId) || text8(companyId),
    vehicleId: text8(vehicle.id),
    vehicleLabel: vehicleLabel(vehicle),
    items,
    source: "automatic_schedule",
    sourceId: text8(vehicle.id)
  });
  return {
    ...record,
    id: maintenanceRequirementDocumentId(record.requirementKey),
    forecastYear: Number(year),
    scheduleManuallyAdjusted: false,
    origin: {
      ...record.origin,
      source: "automatic_schedule",
      sourceId: text8(vehicle.id)
    }
  };
};
var buildAnnualMaintenanceForecast = ({
  vehicle = {},
  year,
  companyId = "",
  includedTypeIds
} = {}) => {
  const forecastYear = Number(year);
  if (!text8(vehicle.id) || !Number.isInteger(forecastYear)) return [];
  const includedTypes = normalizedIncludedTypeIds(includedTypeIds);
  const pendingReturnInspection = String(vehicle?.pendingReturnInspection?.status || "").trim().toLowerCase() === "inspection_required";
  const suppressVorInspectionForecast = isVehicleOutOfUse(vehicle) && !pendingReturnInspection;
  const items = [];
  RECURRING_MAINTENANCE_WORKFLOWS.forEach((workflow) => {
    if (!includedTypes.has(workflow.maintenanceTypeId)) return;
    if (workflow.maintenanceTypeId === "mot" && isMotNotApplicable(vehicle)) return;
    if (workflow.maintenanceTypeId === "service" && isServiceNotApplicable(vehicle)) return;
    if (suppressVorInspectionForecast && INSPECTION_MAINTENANCE_TYPE_IDS.includes(workflow.maintenanceTypeId)) {
      return;
    }
    if (!isVehicleMaintenanceTypeEnabled(vehicle, workflow)) return;
    const dueDateISO = (workflow.nextFields || [workflow.nextField]).map((field) => maintenanceDateOnly(vehicle[field])).find(Boolean) || (() => {
      const completedDate = (workflow.lastFields || [workflow.lastField]).map((field) => maintenanceDateOnly(vehicle[field])).find(Boolean);
      return calculateNextMaintenanceDue({
        maintenanceTypeId: workflow.maintenanceTypeId,
        completedDate,
        frequencyWeeks: getConfiguredMaintenanceFrequencyWeeks(vehicle, workflow)
      });
    })();
    if (!dueDateISO || yearOf(dueDateISO) !== forecastYear) return;
    items.push({
      maintenanceTypeId: workflow.maintenanceTypeId,
      legalDueDateISO: dueDateISO,
      legalDueIsoWeek: maintenanceIsoWeekLabel(dueDateISO)
    });
  });
  const groups = /* @__PURE__ */ new Map();
  items.forEach((item) => {
    const combine = ["pmi", "brake_test"].includes(item.maintenanceTypeId);
    const key = combine ? `pmi-brake:${item.legalDueIsoWeek}` : `${item.maintenanceTypeId}:${item.legalDueDateISO}`;
    groups.set(key, [...groups.get(key) || [], item]);
  });
  return [...groups.values()].map((groupItems) => {
    const sortedItems = [...groupItems].sort(
      (a, b) => `${a.legalDueDateISO}:${a.maintenanceTypeId}`.localeCompare(
        `${b.legalDueDateISO}:${b.maintenanceTypeId}`
      )
    );
    return requestedRecord({
      companyId,
      vehicle,
      items: sortedItems,
      year: forecastYear
    });
  }).filter((record) => record.id).sort(
    (a, b) => `${a.sourceDueDateISO}:${a.requirementKey}`.localeCompare(
      `${b.sourceDueDateISO}:${b.requirementKey}`
    )
  );
};
var automaticSources = /* @__PURE__ */ new Set([
  "automatic_schedule",
  "vehicle_maintenance_schedule",
  "maintenance_schedule",
  "completion_recurrence",
  "safe_reconciliation"
]);
var terminalStatuses = /* @__PURE__ */ new Set(["completed", "cancelled", "archived"]);
var recreationBlockingStatuses = /* @__PURE__ */ new Set(["completed", "cancelled"]);
var activeRequirementStatuses = /* @__PURE__ */ new Set(["requested", "booked", "in_progress", "deferred"]);
var confirmedLegacyStatuses = /* @__PURE__ */ new Set(["booked", "in_progress", "deferred"]);
var automaticArchiveTerms = ["future schedule reset", "supersed", "obsolete", "replaced by canonical"];
var isVorTransitionCancellation = (source, canonical) => canonical.status === "cancelled" && text8(source?.cancellationSource).toLowerCase() === "vehicle_vor_transition";
var itemTypeKey = (items = []) => list2(items).map((item) => text8(item?.maintenanceTypeId).toLowerCase()).filter(Boolean).sort().join("+");
var sameTrustedCompany = (record, canonical) => Boolean(text8(record?.companyId)) && text8(record.companyId) === text8(canonical?.companyId);
var explicitLegalRequirementMatch = (record, canonical) => {
  if (!sameTrustedCompany(record, canonical)) return false;
  if (text8(record.vehicleId) !== text8(canonical.vehicleId)) return false;
  if (itemTypeKey(record.items) !== itemTypeKey(canonical.items)) return false;
  if (!list2(record.items).length || list2(record.items).some((item) => !maintenanceDateOnly(item.legalDueDateISO))) {
    return false;
  }
  if (list2(canonical.items).some((item) => !maintenanceDateOnly(item.legalDueDateISO))) return false;
  const combinedInspection = itemTypeKey(record.items) === "brake_test+pmi";
  return list2(record.items).every((desiredItem) => {
    const existingItem = list2(canonical.items).find(
      (item) => item.maintenanceTypeId === desiredItem.maintenanceTypeId
    );
    if (!existingItem) return false;
    if (combinedInspection) {
      return maintenanceIsoWeekLabel(existingItem.legalDueDateISO) === maintenanceIsoWeekLabel(desiredItem.legalDueDateISO);
    }
    return maintenanceDateOnly(existingItem.legalDueDateISO) === maintenanceDateOnly(desiredItem.legalDueDateISO);
  });
};
var isLegacyConfirmedRequirementCandidate = (record, { source, canonical }) => {
  if (!sameTrustedCompany(record, canonical)) return false;
  if (text8(record.vehicleId) !== text8(canonical.vehicleId)) return false;
  if (itemTypeKey(record.items) !== itemTypeKey(canonical.items)) return false;
  if (!confirmedLegacyStatuses.has(canonical.status)) return false;
  if (text8(source.requirementKey) || text8(source.sourceDueKey)) return false;
  if (list2(canonical.items).some((item) => maintenanceDateOnly(item.legalDueDateISO))) return false;
  const desiredWeeks = [...new Set(
    list2(record.items).map((item) => maintenanceIsoWeekLabel(item.legalDueDateISO)).filter(Boolean)
  )];
  if (desiredWeeks.length !== 1) return false;
  return list2(canonical.schedule?.bookingDates).some(
    (date) => maintenanceIsoWeekLabel(date) === desiredWeeks[0]
  );
};
var isAutomaticallyArchivedObsolete = (source, canonical) => {
  if (canonical.status !== "archived") return false;
  if (!automaticSources.has(text8(source.origin?.source || canonical.origin?.source))) return false;
  if (source.scheduleManuallyAdjusted === true) return false;
  const auditText = [
    source.archiveReason,
    ...list2(source.history).flatMap((entry) => [entry?.action, ...list2(entry?.changes)])
  ].map((value) => text8(value).toLowerCase()).join(" ");
  return automaticArchiveTerms.some((term) => auditText.includes(term));
};
var reconcileAnnualMaintenanceForecast = ({
  forecast = [],
  existingBookings = [],
  vehicleId = "",
  year,
  todayISO = maintenanceDateOnly(/* @__PURE__ */ new Date()),
  includedTypeIds,
  restoreVorCancelledAppointments = false
} = {}) => {
  const targetYear = Number(year);
  const includedTypes = normalizedIncludedTypeIds(includedTypeIds);
  const relevant = list2(existingBookings).map((source) => ({ source, canonical: normalizeMaintenanceRecord(source, { id: source.id }) })).filter(
    ({ canonical }) => canonical.vehicleId === text8(vehicleId) && canonical.items.length > 0 && canonical.items.every((item) => includedTypes.has(item.maintenanceTypeId))
  );
  const combinedInspectionForecasts = list2(forecast).filter(
    (record) => itemTypeKey(record.items) === "brake_test+pmi"
  );
  const isStandaloneInspectionRequestSuperseded = (source, canonical) => {
    if (canonical.status !== "requested" || source.scheduleManuallyAdjusted === true) return false;
    const existingType = itemTypeKey(canonical.items);
    if (!INSPECTION_MAINTENANCE_TYPE_IDS.includes(existingType)) return false;
    const existingItem = canonical.items[0];
    const existingWeek = maintenanceIsoWeekLabel(existingItem?.legalDueDateISO);
    if (!existingWeek) return false;
    return combinedInspectionForecasts.some((record) => {
      if (text8(record.vehicleId) !== canonical.vehicleId) return false;
      if (text8(record.companyId) && text8(canonical.companyId) && text8(record.companyId) !== text8(canonical.companyId)) {
        return false;
      }
      const replacementItem = list2(record.items).find(
        (item) => text8(item?.maintenanceTypeId).toLowerCase() === existingType
      );
      return maintenanceIsoWeekLabel(replacementItem?.legalDueDateISO) === existingWeek;
    });
  };
  const byRequirementKey = /* @__PURE__ */ new Map();
  relevant.forEach((entry) => {
    if (entry.canonical.requirementKey) {
      byRequirementKey.set(entry.canonical.requirementKey, [
        ...byRequirementKey.get(entry.canonical.requirementKey) || [],
        entry
      ]);
    }
  });
  const create = [];
  const preserve = [];
  const blocked = [];
  const duplicate = [];
  const ambiguous = [];
  const reactivate = [];
  const restore = [];
  const desiredKeys = /* @__PURE__ */ new Set();
  const occupiedDocumentIds = new Set(
    list2(existingBookings).map((booking) => text8(booking?.id)).filter(Boolean)
  );
  const withAvailableDocumentId = (record) => {
    if (!occupiedDocumentIds.has(record.id)) {
      occupiedDocumentIds.add(record.id);
      return record;
    }
    let attempt = 1;
    let replacementId = "";
    do {
      replacementId = maintenanceRequirementDocumentId(
        `${record.requirementKey}|active-replacement:${attempt}`
      );
      attempt += 1;
    } while (occupiedDocumentIds.has(replacementId));
    occupiedDocumentIds.add(replacementId);
    return { ...record, id: replacementId };
  };
  const uniqueEntries = (entries) => {
    const seen = /* @__PURE__ */ new Set();
    return entries.filter(({ source }) => {
      const key = text8(source?.id) || source;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  list2(forecast).forEach((record) => {
    desiredKeys.add(record.requirementKey);
    const exactMatches = byRequirementKey.get(record.requirementKey) || [];
    const explicitMatches = relevant.filter(
      ({ canonical }) => explicitLegalRequirementMatch(record, canonical)
    );
    const legalMatches = uniqueEntries([...exactMatches, ...explicitMatches]);
    const activeExactMatches = exactMatches.filter(
      ({ canonical }) => activeRequirementStatuses.has(canonical.status)
    );
    if (activeExactMatches.length) {
      const [active2, ...duplicates] = activeExactMatches;
      preserve.push(active2.source);
      duplicates.forEach(({ source }) => duplicate.push(source));
      return;
    }
    const activeExplicitMatches = explicitMatches.filter(
      ({ canonical }) => activeRequirementStatuses.has(canonical.status)
    );
    if (activeExplicitMatches.length > 1) {
      activeExplicitMatches.forEach(({ source }) => {
        ambiguous.push(source);
        preserve.push(source);
      });
      return;
    }
    if (activeExplicitMatches.length === 1) {
      preserve.push(activeExplicitMatches[0].source);
      return;
    }
    const legacyCandidates = relevant.filter(
      (entry) => isLegacyConfirmedRequirementCandidate(record, entry)
    );
    if (legacyCandidates.length > 1) {
      legacyCandidates.forEach(({ source }) => {
        ambiguous.push(source);
        preserve.push(source);
      });
      return;
    }
    if (legacyCandidates.length === 1) {
      preserve.push(legacyCandidates[0].source);
      return;
    }
    if (restoreVorCancelledAppointments) {
      const cancelledForVor = relevant.filter(
        ({ source, canonical }) => isVorTransitionCancellation(source, canonical) && itemTypeKey(record.items) === itemTypeKey(canonical.items)
      );
      if (cancelledForVor.length) {
        const desiredAppointmentDate = maintenanceDateOnly(record.sourceDueDateISO) || list2(record.items).map((item) => maintenanceDateOnly(item.legalDueDateISO)).find(Boolean);
        const matchingAppointment = cancelledForVor.find(
          ({ canonical }) => list2(canonical.schedule?.bookingDates).map(maintenanceDateOnly).includes(desiredAppointmentDate)
        );
        cancelledForVor.forEach(({ source }) => preserve.push(source));
        if (matchingAppointment) {
          reactivate.push({ source: matchingAppointment.source, forecast: record });
        } else {
          restore.push({
            record: withAvailableDocumentId(record),
            appointmentDateISO: desiredAppointmentDate,
            replaces: cancelledForVor[0].source
          });
        }
        return;
      }
    }
    const blocker = legalMatches.find(
      ({ source, canonical }) => recreationBlockingStatuses.has(canonical.status) || canonical.status === "archived" && !isAutomaticallyArchivedObsolete(source, canonical)
    );
    if (blocker) {
      blocked.push(blocker.source);
      legalMatches.filter((entry) => entry !== blocker).forEach(({ source }) => duplicate.push(source));
      return;
    }
    const active = legalMatches.find(({ canonical }) => !terminalStatuses.has(canonical.status));
    if (active) {
      preserve.push(active.source);
      legalMatches.filter((entry) => entry !== active).forEach(({ source }) => duplicate.push(source));
      return;
    }
    if (!legalMatches.length) {
      create.push(record);
      return;
    }
    legalMatches.forEach(({ source }) => preserve.push(source));
    create.push(withAvailableDocumentId(record));
  });
  relevant.forEach(({ source, canonical }) => {
    if (desiredKeys.has(canonical.requirementKey)) return;
    if (isStandaloneInspectionRequestSuperseded(source, canonical)) return;
    const originSource = text8(source.origin?.source || canonical.origin?.source);
    const shouldPreserve = ["booked", "in_progress", "deferred"].includes(canonical.status) || source.scheduleManuallyAdjusted === true || !automaticSources.has(originSource);
    if (shouldPreserve && !preserve.some((record) => record.id === source.id)) {
      preserve.push(source);
    }
  });
  const supersede = relevant.filter(({ source, canonical }) => {
    if (desiredKeys.has(canonical.requirementKey)) return false;
    const replacesStandaloneInspection = isStandaloneInspectionRequestSuperseded(source, canonical);
    if (!replacesStandaloneInspection && !automaticSources.has(text8(source.origin?.source || canonical.origin?.source))) return false;
    if (source.scheduleManuallyAdjusted === true) return false;
    if (canonical.status !== "requested") return false;
    const dueDate = canonical.items.map((item) => item.legalDueDateISO).filter(Boolean).sort()[0] || "";
    const forecastRecordYear = Number(source.forecastYear || yearOf(dueDate));
    return forecastRecordYear === targetYear;
  }).map(({ source }) => source);
  return { create, preserve, blocked, duplicate, ambiguous, reactivate, restore, supersede };
};
var buildAnnualMaintenancePersistencePayload = (record, { createdBy = "system", nowISO: nowISO2 = (/* @__PURE__ */ new Date()).toISOString() } = {}) => {
  const typeIds = list2(record?.items).map((item) => item.maintenanceTypeId);
  const type = typeIds.length === 1 && typeIds[0] === "mot" ? "MOT" : typeIds.length === 1 && typeIds[0] === "service" ? "SERVICE" : typeIds.some((typeId) => ["repair", "work"].includes(typeId)) ? "WORK" : "INSPECTION";
  return {
    schemaVersion: record.schemaVersion,
    kind: "MAINTENANCE",
    type,
    maintenanceTypeId: typeIds[0] || "work",
    maintenanceTypeIds: typeIds,
    companyId: record.companyId,
    vehicleId: record.vehicleId,
    vehicleLabel: record.vehicleLabel,
    status: "Requested",
    items: list2(record.items).map((item) => ({ ...item, status: "requested" })),
    bookingDates: [],
    appointmentDateISO: "",
    startDateISO: "",
    endDateISO: "",
    requirementKey: record.requirementKey,
    sourceDueKey: record.requirementKey,
    sourceDueDateISO: list2(record.items).map((item) => item.legalDueDateISO).filter(Boolean).sort()[0] || "",
    sourceDueIsoWeek: list2(record.items).map((item) => item.legalDueIsoWeek).filter(Boolean).sort()[0] || "",
    origin: record.origin,
    forecastYear: Number(record.forecastYear || record.sourceDueDateISO?.slice(0, 4) || 0) || null,
    scheduleManuallyAdjusted: false,
    createdBy,
    lastEditedBy: createdBy,
    history: [{
      action: "Due item created",
      user: createdBy,
      timestamp: nowISO2,
      changes: [`Unarranged maintenance requirement created for ${record.sourceDueDateISO}.`]
    }],
    createdAt: nowISO2,
    updatedAt: nowISO2
  };
};

// src/app/utils/vorBookingPolicy.js
var text9 = (value) => String(value || "").trim();
var dateOnly4 = (value) => {
  if (!value) return "";
  if (typeof value?.toDate === "function") return dateOnly4(value.toDate());
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate()
    ).padStart(2, "0")}`;
  }
  const match = text9(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : dateOnly4(parsed);
};
var bookingDates = (booking = {}) => {
  const explicit = Array.isArray(booking.bookingDates) ? booking.bookingDates.map(dateOnly4).filter(Boolean) : [];
  if (explicit.length) return explicit;
  return [
    booking.appointmentDateISO,
    booking.startDateISO,
    booking.endDateISO,
    booking.appointmentDate,
    booking.startDate,
    booking.endDate,
    booking.date
  ].map(dateOnly4).filter(Boolean);
};
var isVorAffectedMaintenanceBooking = (booking = {}, { offRoadDate = "" } = {}) => {
  const status = text9(booking.status).toLowerCase();
  if (["completed", "complete", "cancelled", "canceled", "declined", "deleted", "closed"].includes(status)) {
    return false;
  }
  const typeIds = [
    ...safeExplicitTypeIds(booking.maintenanceTypeIds),
    ...safeExplicitTypeIds([booking.maintenanceTypeId]),
    ...Array.isArray(booking.items) ? booking.items.map((item) => text9(item?.maintenanceTypeId).toLowerCase()).filter(Boolean) : []
  ];
  const isPmiOrBrake = typeIds.some((item) => ["pmi", "brake_test"].includes(item));
  if (!isPmiOrBrake) return false;
  const dates = bookingDates(booking);
  const start = dateOnly4(offRoadDate);
  return start ? dates.some((date) => date >= start) : dates.length > 0;
};
function safeExplicitTypeIds(values) {
  return Array.isArray(values) ? values.map((item) => text9(item).toLowerCase()).filter(Boolean) : [];
}
var getVehicleVorStartDate = (vehicle = {}) => {
  const history = Array.isArray(vehicle.vorHistory) ? vehicle.vorHistory : [];
  const activeRecord = history.find(
    (record) => record?.status === "open" && (record.id === vehicle.activeVorRecordId || !vehicle.activeVorRecordId)
  ) || history.find((record) => record?.status === "open") || null;
  return dateOnly4(
    activeRecord?.offRoadDate || vehicle.maintenanceCountdownPause?.startedDate || vehicle.complianceVor?.startedDate || vehicle.vorStartedAt
  );
};
var isPendingReturnInspectionBooking = (booking = {}, vehicle = {}) => {
  const pending = vehicle.pendingReturnInspection || {};
  if (text9(pending.status).toLowerCase() !== "inspection_required") return false;
  if (text9(pending.bookingId)) return text9(booking.id) === text9(pending.bookingId);
  const expectedDate = dateOnly4(pending.inspectionDate);
  if (!expectedDate || !bookingDates(booking).includes(expectedDate)) return false;
  const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
  const typeIds = new Set(canonical.items.map((item) => text9(item.maintenanceTypeId).toLowerCase()));
  return typeIds.has("pmi") && typeIds.has("brake_test");
};
var isVorInspectionCancellationCandidate = (booking = {}, { vehicle = {}, offRoadDate = "" } = {}) => isVorAffectedMaintenanceBooking(booking, {
  offRoadDate: offRoadDate || getVehicleVorStartDate(vehicle)
}) && !isPendingReturnInspectionBooking(booking, vehicle);
var getVorInspectionCancellationCandidates = (bookings = [], { vehicle = {}, offRoadDate = "" } = {}) => (Array.isArray(bookings) ? bookings : []).filter(
  (booking) => isVorInspectionCancellationCandidate(booking, { vehicle, offRoadDate })
);
var buildVorInspectionCancellationPatch = (booking = {}, {
  cancelledAt = (/* @__PURE__ */ new Date()).toISOString(),
  cancelledBy = null,
  cancellationSource = "vehicle_vor_reconciliation",
  sourceRecordId = "",
  reason = "Vehicle is VOR; previous PMI/brake plans are no longer valid"
} = {}) => {
  const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
  const affectedTypeIds = /* @__PURE__ */ new Set(["pmi", "brake_test"]);
  const hasUnaffectedItems = canonical.items.some(
    (item) => !affectedTypeIds.has(text9(item.maintenanceTypeId).toLowerCase())
  );
  const nextStatus = hasUnaffectedItems ? "Booked" : "Cancelled";
  const actor = text9(cancelledBy?.email || cancelledBy?.name || cancelledBy?.uid || cancelledBy) || "system";
  const historyEntry2 = {
    action: "Cancelled for VOR",
    user: actor,
    timestamp: cancelledAt,
    source: cancellationSource,
    changes: [
      `Status: ${text9(booking.status) || canonical.status || "Blank"} -> ${nextStatus}`,
      hasUnaffectedItems ? `PMI/brake items cancelled; unrelated appointment items preserved` : `Reason: ${reason}`
    ]
  };
  return {
    status: nextStatus,
    schemaVersion: MAINTENANCE_RECORD_SCHEMA_VERSION,
    items: canonical.items.map((item) => ({
      ...item,
      status: affectedTypeIds.has(text9(item.maintenanceTypeId).toLowerCase()) ? "cancelled" : item.status
    })),
    cancellationReason: reason,
    cancellationSource,
    cancellationSourceRecordId: text9(sourceRecordId),
    cancelledAtISO: cancelledAt,
    cancelledBy,
    lastEditedBy: actor,
    lastEditedByUid: text9(cancelledBy?.uid),
    history: [...Array.isArray(booking.history) ? booking.history : [], historyEntry2],
    updatedAt: cancelledAt
  };
};

// src/app/utils/maintenanceMutationPolicy.js
var assertInitialMaintenanceStatus = (value) => {
  const status = normalizeMaintenanceRecordStatus(value || "booked");
  if (!["requested", "booked"].includes(status)) {
    throw new Error("New bookings may only start as Requested or Booked.");
  }
  return status;
};
var assertMaintenanceTransition = (currentValue, nextValue) => {
  const current = normalizeMaintenanceRecordStatus(currentValue);
  const next = normalizeMaintenanceRecordStatus(nextValue);
  const allowed = {
    requested: /* @__PURE__ */ new Set(["requested", "booked"]),
    booked: /* @__PURE__ */ new Set(["booked", "in_progress", "deferred"]),
    in_progress: /* @__PURE__ */ new Set(["in_progress", "booked", "deferred"]),
    deferred: /* @__PURE__ */ new Set(["deferred", "booked"])
  };
  if (!allowed[current]?.has(next)) {
    throw new Error(`Invalid maintenance transition: ${current} -> ${next}.`);
  }
  return next;
};
var rescheduleCrossesLegalIsoWeek = (legalWeeks = [], bookingDates3 = []) => {
  const expected = new Set((legalWeeks || []).filter(Boolean));
  return expected.size > 0 && (bookingDates3 || []).some(
    (date) => !expected.has(maintenanceIsoWeekLabel(date))
  );
};
var getMaintenanceScheduleRule = ({
  type,
  legalDueDate,
  legalDueWeeks = [],
  bookingDates: bookingDates3 = []
} = {}) => {
  const normalizedType = String(type || "").trim().toUpperCase();
  const dates = (Array.isArray(bookingDates3) ? bookingDates3 : []).map(maintenanceDateOnly).filter(Boolean).sort();
  const dueDate = maintenanceDateOnly(legalDueDate);
  const outsideScheduledWeek = rescheduleCrossesLegalIsoWeek(legalDueWeeks, dates);
  const afterDueDate = Boolean(dueDate && dates.some((date) => date > dueDate));
  const outsideLegalWeek = outsideScheduledWeek && (!dueDate || afterDueDate);
  if (normalizedType === "MOT") {
    return {
      outsideLegalWeek,
      requiresAcknowledgement: afterDueDate,
      requiresExceptionReason: false,
      blocked: false,
      state: afterDueDate ? "after_expiry" : "allowed"
    };
  }
  if (normalizedType === "SERVICE") {
    return {
      outsideLegalWeek,
      requiresAcknowledgement: false,
      requiresExceptionReason: false,
      blocked: false,
      state: outsideLegalWeek ? "service_advisory" : "allowed"
    };
  }
  const requiresExceptionReason = normalizedType === "INSPECTION" && outsideLegalWeek;
  return {
    outsideLegalWeek,
    requiresAcknowledgement: false,
    requiresExceptionReason,
    blocked: false,
    state: requiresExceptionReason ? "inspection_exception" : "allowed"
  };
};
var buildAtomicRescheduleWriteSet = ({
  bookingId,
  bookingPatch,
  bookingUpdateTime,
  vehicleId,
  vehiclePatch
}) => {
  const dates = Array.isArray(bookingPatch?.bookingDates) ? bookingPatch.bookingDates : [];
  const summaryAppointment = Object.entries(vehiclePatch || {}).find(
    ([key, value]) => /(AppointmentDate|BookingDate)$/.test(key) && value
  )?.[1];
  if (dates.length === 1 && summaryAppointment && summaryAppointment !== dates[0]) {
    throw new Error("Booking and vehicle summary appointment dates must match.");
  }
  return [
    {
      collection: "maintenanceBookings",
      documentId: bookingId,
      patch: bookingPatch,
      updateTime: bookingUpdateTime
    },
    ...vehicleId && vehiclePatch ? [{ collection: "vehicles", documentId: vehicleId, patch: vehiclePatch, exists: true }] : []
  ];
};
var getMaintenanceCreationDisposition = ({ existing, id, status, dates, typeIds, vehicleId }) => {
  if (!existing) return "create";
  const canonical = normalizeMaintenanceRecord(existing, { id });
  const sameTypeIds = [...canonical.items.map((item) => item.maintenanceTypeId)].sort().join("|") === [...typeIds].sort().join("|");
  const sameVehicle = String(canonical.vehicleId || "").trim() === String(vehicleId || canonical.vehicleId || "").trim();
  const confirmed = isConfirmedMaintenanceBooking(existing);
  if (canonical.status === "booked" && status === "booked" && confirmed && sameTypeIds && sameVehicle && canonical.schedule.bookingDates.join("|") === dates.join("|")) return "idempotent";
  if (canonical.status === "requested") return "arrange";
  if (canonical.status === "booked" && !confirmed && status === "booked" && sameTypeIds && sameVehicle) return "arrange";
  throw new Error(`Existing ${canonical.status} maintenance records cannot be replaced through creation.`);
};

// src/app/api/maintenance/bookings/_service.js
var defaultMaintenanceIO = {
  adminCommitDocumentPatches,
  adminCommitDocumentPatchesWithSequence,
  adminListDocuments,
  adminReadDocument,
  adminReadDocumentWithMetadata
};
var maintenanceIO = () => currentMaintenanceTransport() || defaultMaintenanceIO;
var workshopRecordOwned = (record, companyId) => record?.companyId === companyId;
var text10 = (value) => String(value || "").trim();
var safeArray3 = (value) => Array.isArray(value) ? value : [];
var withBickersReference = (record, id) => ({
  ...record,
  bickersReference: buildMaintenanceBickersReference(record, { id })
});
var commitMaintenanceWrites = async (writes, companyId = "", readChecks = [], queryChecks = []) => {
  try {
    return await commitMaintenanceWritesUnchecked(await linkWorkshopWrites(writes, companyId), companyId, readChecks, queryChecks);
  } catch (error) {
    if (/FAILED_PRECONDITION|ABORTED/.test(String(error?.message || ""))) {
      const conflict = new Error("Maintenance changed during saving. Refresh before retrying.");
      conflict.status = 409;
      conflict.code = "maintenance_conflict";
      throw conflict;
    }
    throw error;
  }
};
var commitMaintenanceWritesUnchecked = (writes, companyId = "", readChecks = [], queryChecks = []) => {
  const newBookingIndexes = writes.map((write, index) => ({ write, index })).filter(
    ({ write }) => write.collection === "maintenanceBookings" && (write.exists === false || Object.prototype.hasOwnProperty.call(write.patch || {}, "bickersReference") && !text10(write.patch?.bickersReference)) && !/^\d{6,}$/.test(text10(write.patch?.bickersReference))
  ).map(({ index }) => index);
  if (!newBookingIndexes.length) return maintenanceIO().adminCommitDocumentPatches(writes, { readChecks, queryChecks });
  const sequenceByIndex = new Map(newBookingIndexes.map((index, offset) => [index, offset]));
  return maintenanceIO().adminCommitDocumentPatchesWithSequence({
    writes,
    counterCollection: "systemCounters",
    counterDocumentId: `maintenance_${text10(companyId) || "default"}`,
    allocationCount: newBookingIndexes.length,
    readChecks,
    queryChecks,
    applySequence: (pendingWrites, firstSequence) => pendingWrites.map((write, index) => {
      const offset = sequenceByIndex.get(index);
      if (offset === void 0) return write;
      return {
        ...write,
        patch: {
          ...write.patch,
          bickersReference: formatMaintenanceBickersReference(firstSequence + offset)
        }
      };
    })
  });
};
var linkWorkshopWrites = async (writes, companyId) => {
  const linked = [];
  for (const write of writes) {
    if (write.collection !== "maintenanceBookings" || write.deleteDocument) continue;
    const previous = write.exists === false ? null : await maintenanceIO().adminReadDocumentWithMetadata("maintenanceBookings", write.documentId);
    if (previous) await assertTenant(previous.data, companyId, "maintenanceBookings", write.documentId);
    const booking = { ...previous?.data, ...write.patch };
    if (text10(booking.companyId) !== companyId) {
      if (!previous) throw new Error("Workshop booking company is unavailable.");
      booking.companyId = companyId;
      write.patch = { ...write.patch, companyId };
    }
    const requestId = maintenanceWorkshopRequestId(write.documentId);
    const request = await maintenanceIO().adminReadDocumentWithMetadata("workshopRequests", requestId);
    if (request && (request.data.companyId !== companyId || request.data.sourceMaintenanceBookingId !== write.documentId || request.data.source !== "maintenance_booking")) {
      const error = new Error("Workshop link belongs to another company or booking.");
      error.status = 403;
      throw error;
    }
    const patch = projectMaintenanceWorkshopRequest(booking, write.documentId, request?.data);
    if (!patch) continue;
    if (previous && !write.updateTime) write.updateTime = previous.updateTime;
    write.patch = { ...write.patch, workshopRequestId: requestId };
    linked.push({
      collection: "workshopRequests",
      documentId: requestId,
      patch,
      ...request ? { updateTime: request.updateTime } : { exists: false }
    });
  }
  return [...writes, ...linked];
};
var syncWorkshopMutation = async ({ actor, companyId }) => {
  if (!["admin", "companyadmin", "company admin", "platformadmin", "platform admin", "superadmin", "super admin"].includes(text10(actor.role).toLowerCase())) {
    const error = new Error("Administrator access is required to sync existing workshop bookings.");
    error.status = 403;
    throw error;
  }
  const rows = await maintenanceIO().adminListDocuments("maintenanceBookings");
  let synced = 0;
  const skipped = [];
  for (const row of rows) {
    if (!await workshopRecordOwned(row.data, companyId, "maintenanceBookings", row.id)) continue;
    const snapshot = await maintenanceIO().adminReadDocumentWithMetadata("maintenanceBookings", row.id);
    if (!snapshot || !await workshopRecordOwned(snapshot.data, companyId, "maintenanceBookings", row.id)) continue;
    const requestId = maintenanceWorkshopRequestId(row.id);
    const request = await maintenanceIO().adminReadDocument("workshopRequests", requestId);
    if (!request && !projectMaintenanceWorkshopRequest({ ...snapshot.data, companyId }, row.id)) continue;
    if (snapshot.data.vehicleId) {
      const vehicle = await maintenanceIO().adminReadDocument("vehicles", snapshot.data.vehicleId);
      if (!vehicle || !await workshopRecordOwned(vehicle, companyId, "vehicles", snapshot.data.vehicleId)) {
        const projected = projectMaintenanceWorkshopRequest({ ...snapshot.data, companyId }, row.id, request);
        if (projected?.status === "open") {
          skipped.push({ bookingId: row.id, reason: "vehicle_unavailable" });
          continue;
        }
      }
    }
    await commitMaintenanceWrites([{
      collection: "maintenanceBookings",
      documentId: row.id,
      patch: {},
      updateTime: snapshot.updateTime
    }], companyId);
    synced += 1;
  }
  return { synced, skipped };
};
var nowISO = () => (/* @__PURE__ */ new Date()).toISOString();
var titleStatus = (status) => ({
  requested: "Requested",
  booked: "Booked",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  deferred: "Deferred",
  archived: "Archived"
})[status] || "Requested";
var coreType = (type, typeIds = []) => {
  const requested = text10(type).toUpperCase();
  if (["MOT", "SERVICE", "INSPECTION", "WORK"].includes(requested)) return requested;
  if (typeIds.length === 1 && typeIds[0] === "mot") return "MOT";
  if (typeIds.length === 1 && typeIds[0] === "service") return "SERVICE";
  if (typeIds.some((id) => ["pmi", "brake_test", "tacho_inspection", "tacho_download", "tail_lift", "loler", "tacho_calibration"].includes(id))) return "INSPECTION";
  return "WORK";
};
var inputTypeIds = (payload = {}) => {
  const type = coreType(payload.type);
  const values = safeArray3(payload.maintenanceTypeIds).map(normalizeMaintenanceTypeId).filter((id) => id !== "other");
  if (values.length) return [...new Set(values)];
  if (type === "MOT") return ["mot"];
  if (type === "SERVICE") return ["service"];
  if (type === "INSPECTION") return ["pmi", "brake_test"];
  return [normalizeMaintenanceTypeId(payload.maintenanceTypeId || "work")];
};
var bookingDates2 = (payload = {}) => {
  const explicit = safeArray3(payload.dateKeys || payload.bookingDates).map(maintenanceDateOnly).filter(Boolean);
  if (explicit.length) return [...new Set(explicit)].sort();
  const appointment = maintenanceDateOnly(payload.appointmentDate || payload.appointmentDateISO);
  if (appointment) return [appointment];
  const start = maintenanceDateOnly(payload.startDate || payload.startDateISO);
  const end = maintenanceDateOnly(payload.endDate || payload.endDateISO || start);
  if (!start || !end || start > end) return [];
  const dates = [];
  const cursor = /* @__PURE__ */ new Date(`${start}T12:00:00Z`);
  const finish = /* @__PURE__ */ new Date(`${end}T12:00:00Z`);
  while (cursor <= finish && dates.length < 370) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};
var scheduleFields = (dates, appointmentTime = "") => ({
  bookingDates: dates,
  appointmentDateISO: dates.length === 1 ? dates[0] : "",
  appointmentDate: dates.length === 1 ? dates[0] : null,
  appointmentTime: /^\d{2}:\d{2}$/.test(text10(appointmentTime)) ? text10(appointmentTime) : "",
  startDateISO: dates.length > 1 ? dates[0] : "",
  startDate: dates.length > 1 ? dates[0] : null,
  endDateISO: dates.length > 1 ? dates.at(-1) : "",
  endDate: dates.length > 1 ? dates.at(-1) : null,
  isMultiDay: dates.length > 1
});
var historyEntry = (action, actor, changes, timestamp = nowISO()) => ({
  action,
  user: actor.email || actor.uid,
  userUid: actor.uid,
  timestamp,
  changes: safeArray3(changes).filter(Boolean)
});
var assertTenant = (record, companyId) => {
  if (typeof companyId !== "string" || !companyId || companyId !== companyId.trim() || record?.companyId !== companyId) {
    const error = new Error("Maintenance record belongs to another company.");
    error.status = 403;
    throw error;
  }
};
var assertCanonicalId = (value) => {
  if (typeof value !== "string" || !value || value !== value.trim() || /[\s/]/.test(value)) {
    throw new Error("A canonical maintenance document ID is required.");
  }
  return value;
};
var assertNativeVersion = (snapshot) => {
  if (typeof snapshot?.updateTime !== "string" || !snapshot.updateTime) {
    const error = new Error("Maintenance version is unavailable. Refresh the record before retrying.");
    error.status = 409;
    error.code = "maintenance_conflict";
    throw error;
  }
};
var assertDisplayedVersion = (booking, expected, required) => {
  let matches = false;
  try {
    matches = (!required || expected !== void 0) && (expected === void 0 || normalizeMaintenanceVersion(expected) === normalizeMaintenanceVersion(booking.updatedAt));
  } catch {
  }
  if (!matches) {
    const error = new Error("Maintenance changed since editing began. Refresh before retrying.");
    error.status = 409;
    error.code = "maintenance_conflict";
    throw error;
  }
};
var readContext = async (bookingId, companyId, { allowMissingVehicle = false, expectedUpdatedAt, requireDisplayedVersion = false } = {}) => {
  const bookingSnapshot = await maintenanceIO().adminReadDocumentWithMetadata("maintenanceBookings", bookingId);
  if (!bookingSnapshot) {
    const error = new Error("Maintenance booking not found.");
    error.status = 404;
    throw error;
  }
  const booking = bookingSnapshot.data;
  assertTenant(booking, companyId);
  assertNativeVersion(bookingSnapshot);
  assertDisplayedVersion(booking, expectedUpdatedAt, requireDisplayedVersion);
  const vehicleId = booking.vehicleId == null || booking.vehicleId === "" ? "" : assertCanonicalId(booking.vehicleId);
  const vehicleSnapshot = vehicleId ? await maintenanceIO().adminReadDocumentWithMetadata("vehicles", vehicleId) : null;
  const vehicle = vehicleSnapshot?.data || null;
  if (vehicleId && !vehicle && !allowMissingVehicle) {
    const error = new Error("Maintenance vehicle not found in this company.");
    error.status = 409;
    error.code = "maintenance_vehicle_not_found";
    throw error;
  }
  if (vehicle) {
    assertTenant(vehicle, companyId);
    assertNativeVersion(vehicleSnapshot);
  }
  return {
    booking: { ...booking, id: bookingId },
    bookingUpdateTime: bookingSnapshot.updateTime,
    vehicleUpdateTime: vehicleSnapshot?.updateTime,
    vehicle: vehicle ? { ...vehicle, id: vehicleId } : null
  };
};
var clearSummary = (vehicle = {}, bookingId = "") => {
  const patch = {};
  const groups = [
    ["mot", ["BookingId", "BookedStatus", "BookedOn", "AppointmentDate", "AppointmentTime", "BookingStartDate", "BookingEndDate"]],
    ["service", ["BookingId", "BookedStatus", "BookedOn", "AppointmentDate", "AppointmentTime", "BookingStartDate", "BookingEndDate"]],
    ["inspection", ["BookingId", "BookedStatus", "BookedOn", "AppointmentDate", "AppointmentTime", "BookingStartDate", "BookingEndDate"]],
    ["work", ["BookingId", "BookedStatus", "BookingDate", "BookingTime", "BookingStartDate", "BookingEndDate"]]
  ];
  groups.forEach(([prefix, suffixes]) => {
    if (text10(vehicle[`${prefix}BookingId`]) !== text10(bookingId)) return;
    suffixes.forEach((suffix) => {
      patch[`${prefix}${suffix}`] = "";
    });
  });
  return patch;
};
var bookingSummaryPatch = (booking, dates, status) => {
  const ids = inputTypeIds(booking);
  const type = coreType(booking.type, ids);
  const prefix = type === "MOT" ? "mot" : type === "SERVICE" ? "service" : type === "INSPECTION" ? "inspection" : "work";
  const isWork = prefix === "work";
  return {
    [`${prefix}BookingId`]: booking.id,
    [`${prefix}BookedStatus`]: titleStatus(status),
    [`${prefix}${isWork ? "BookingDate" : "AppointmentDate"}`]: dates.length === 1 ? dates[0] : "",
    [`${prefix}${isWork ? "BookingTime" : "AppointmentTime"}`]: text10(booking.appointmentTime),
    [`${prefix}BookingStartDate`]: dates.length > 1 ? dates[0] : "",
    [`${prefix}BookingEndDate`]: dates.length > 1 ? dates.at(-1) : ""
  };
};
var canonicalItems = ({ typeIds, status, dueDate, dueWeek, existing = [] }) => {
  const prior = new Map(safeArray3(existing).map((item) => [normalizeMaintenanceTypeId(item.maintenanceTypeId), item]));
  return typeIds.map((maintenanceTypeId) => ({
    ...prior.get(maintenanceTypeId) || {},
    maintenanceTypeId,
    status,
    legalDueDateISO: maintenanceDateOnly(prior.get(maintenanceTypeId)?.legalDueDateISO || dueDate),
    legalDueIsoWeek: text10(prior.get(maintenanceTypeId)?.legalDueIsoWeek || dueWeek) || maintenanceIsoWeekLabel(dueDate),
    completionDateISO: "",
    evidenceStatus: text10(prior.get(maintenanceTypeId)?.evidenceStatus) || "not_recorded",
    documents: safeArray3(prior.get(maintenanceTypeId)?.documents)
  }));
};
var createMutation = async ({ payload, actor, companyId }) => {
  const status = assertInitialMaintenanceStatus(payload.status || "booked");
  const dates = bookingDates2(payload);
  if (status === "booked" && !dates.length) throw new Error("A booked maintenance appointment needs a valid date.");
  const typeIds = inputTypeIds(payload);
  if (payload.requestedRecordId !== void 0 && payload.requestedRecordId !== "") assertCanonicalId(payload.requestedRecordId);
  const id = text10(payload.requestedRecordId) || maintenanceRequirementDocumentId(text10(payload.sourceDueKey)) || crypto2.randomUUID();
  const existingSnapshot = await maintenanceIO().adminReadDocumentWithMetadata("maintenanceBookings", id);
  const existing = existingSnapshot?.data || null;
  if (existing) {
    assertTenant(existing, companyId);
  }
  const disposition = getMaintenanceCreationDisposition({
    existing,
    id,
    status,
    dates,
    typeIds,
    vehicleId: payload.vehicleId
  });
  if (disposition === "idempotent") return { id, ...existing, idempotent: true };
  const dueDate = maintenanceDateOnly(
    payload.sourceDueDate || payload.sourceDueDateISO || existing?.sourceDueDateISO
  );
  const dueWeek = text10(payload.sourceDueIsoWeek || existing?.sourceDueIsoWeek) || maintenanceIsoWeekLabel(dueDate);
  const scheduleRule = getMaintenanceScheduleRule({
    type: coreType(payload.type, typeIds),
    legalDueDate: dueDate,
    legalDueWeeks: dueWeek ? [dueWeek] : [],
    bookingDates: dates
  });
  if (scheduleRule.requiresAcknowledgement && payload.motExpiryAcknowledged !== true) {
    throw new Error("Acknowledge that the MOT will be expired on the appointment date before booking.");
  }
  if (scheduleRule.requiresExceptionReason && !text10(payload.scheduleExceptionReason)) {
    throw new Error("A reason is required when moving an inspection outside the legal ISO week.");
  }
  const timestamp = nowISO();
  const arrangedNow = Boolean(existing && status === "booked" && dates.length);
  const record = withBickersReference({
    ...existing || {},
    schemaVersion: 1,
    kind: "MAINTENANCE",
    companyId: companyId || text10(existing?.companyId),
    vehicleId: text10(payload.vehicleId || existing?.vehicleId),
    vehicleLabel: text10(payload.vehicleLabel || existing?.vehicleLabel),
    type: coreType(payload.type, typeIds),
    maintenanceTypeId: typeIds.length === 1 ? typeIds[0] : "combined",
    maintenanceTypeIds: typeIds,
    status: titleStatus(status),
    items: canonicalItems({ typeIds, status, dueDate, dueWeek, existing: existing?.items }),
    ...scheduleFields(dates, payload.appointmentTime),
    provider: text10(payload.provider),
    bookingRef: text10(payload.bookingRef),
    location: text10(payload.location),
    cost: text10(payload.cost),
    notes: text10(payload.notes),
    equipment: safeArray3(payload.equipment),
    ...payload.workshop && typeof payload.workshop === "object" ? { workshop: payload.workshop, title: text10(payload.title) } : {},
    sourceDueDateISO: dueDate,
    sourceDueIsoWeek: dueWeek,
    sourceDueKey: text10(payload.sourceDueKey),
    requirementKey: text10(existing?.requirementKey || payload.sourceDueKey),
    scheduleExceptionReason: text10(payload.scheduleExceptionReason),
    motExpiryAcknowledged: scheduleRule.requiresAcknowledgement,
    motExpiryAcknowledgedAt: scheduleRule.requiresAcknowledgement ? timestamp : "",
    motExpiryAcknowledgedBy: scheduleRule.requiresAcknowledgement ? actor.email : "",
    motExpiryAcknowledgedByUid: scheduleRule.requiresAcknowledgement ? actor.uid : "",
    createdAt: existing?.createdAt || timestamp,
    createdBy: existing?.createdBy || actor.email,
    createdByUid: existing?.createdByUid || actor.uid,
    ...arrangedNow ? { arrangedAt: timestamp, arrangedBy: actor.email, arrangedByUid: actor.uid } : {},
    lastEditedBy: actor.email,
    lastEditedByUid: actor.uid,
    updatedAt: timestamp,
    history: [...safeArray3(existing?.history), historyEntry(arrangedNow ? "Workshop date confirmed" : existing ? "Booked" : "Created", actor, [
      `Status: ${titleStatus(status)}`,
      arrangedNow ? `Workshop date: ${dates.join(", ")}` : "",
      dueDate ? `Legal due date: ${dueDate}` : "",
      scheduleRule.requiresAcknowledgement ? "Expired MOT appointment acknowledged" : ""
    ], timestamp)]
  }, id);
  const writes = [{
    collection: "maintenanceBookings",
    documentId: id,
    patch: record,
    ...existingSnapshot?.updateTime ? { updateTime: existingSnapshot.updateTime } : { exists: false }
  }];
  const vehicleSnapshot = record.vehicleId ? await maintenanceIO().adminReadDocumentWithMetadata("vehicles", assertCanonicalId(record.vehicleId)) : null;
  const vehicle = vehicleSnapshot?.data || null;
  if (record.vehicleId && !vehicle) {
    const error = new Error("Maintenance vehicle not found in this company.");
    error.status = 400;
    error.code = "maintenance_vehicle_not_found";
    throw error;
  }
  if (vehicle) {
    assertTenant(vehicle, companyId);
    assertNativeVersion(vehicleSnapshot);
    record.companyId = record.companyId || text10(vehicle.companyId);
  }
  const canonicalCandidate = normalizeMaintenanceRecord(record, { id });
  if (canonicalCandidate.requirementKey) {
    const activeStatuses = /* @__PURE__ */ new Set(["requested", "booked", "in_progress", "deferred", "completed"]);
    const duplicate = (await maintenanceIO().adminListDocuments("maintenanceBookings")).filter((entry) => text10(entry.id) !== id).map((entry) => normalizeMaintenanceRecord(entry.data, { id: entry.id })).find(
      (candidate) => candidate.requirementKey === canonicalCandidate.requirementKey && activeStatuses.has(candidate.status) && (!companyId || !candidate.companyId || candidate.companyId === companyId)
    );
    if (duplicate) {
      const error = new Error(`Duplicate active maintenance requirement: ${duplicate.id}.`);
      error.status = 409;
      error.code = "maintenance_requirement_conflict";
      error.details = { requirementKey: canonicalCandidate.requirementKey, existingBookingId: duplicate.id };
      throw error;
    }
  }
  if (vehicle && status === "booked") writes.push({ collection: "vehicles", documentId: record.vehicleId, patch: { ...bookingSummaryPatch({ ...record, id }, dates, status), updatedAt: timestamp }, updateTime: vehicleSnapshot.updateTime });
  await commitMaintenanceWrites(writes, companyId);
  return { id, ...record };
};
var rescheduleMutation = async ({ payload, actor, companyId }) => {
  const { booking, bookingUpdateTime, vehicle, vehicleUpdateTime } = await readContext(text10(payload.bookingId), companyId, { expectedUpdatedAt: payload.expectedUpdatedAt, requireDisplayedVersion: false });
  const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
  if (!["booked", "in_progress", "deferred"].includes(canonical.status)) throw new Error("Only an active booked appointment can be rescheduled.");
  const dates = bookingDates2(payload.updates || {});
  if (!dates.length) throw new Error("Choose a valid appointment date.");
  const legalWeeks = new Set(canonical.items.map((item) => item.legalDueIsoWeek).filter(Boolean));
  const legalDueDate = canonical.items.map((item) => item.legalDueDateISO).filter(Boolean).sort()[0] || "";
  const scheduleRule = getMaintenanceScheduleRule({
    type: booking.type,
    legalDueDate,
    legalDueWeeks: [...legalWeeks],
    bookingDates: dates
  });
  const reason = text10(payload.reason);
  if (scheduleRule.requiresAcknowledgement && payload.motExpiryAcknowledged !== true) {
    throw new Error("Acknowledge that the MOT will be expired on the appointment date before booking.");
  }
  if (scheduleRule.requiresExceptionReason && !reason) throw new Error("A reason is required when moving an inspection outside the legal ISO week.");
  const timestamp = nowISO();
  const patch = {
    ...scheduleFields(dates, payload.updates?.appointmentTime || booking.appointmentTime),
    ...booking.workshop && typeof booking.workshop === "object" ? { workshop: { ...booking.workshop, bookedDate: dates[0], plannedDate: dates[0] } } : {},
    scheduleExceptionReason: scheduleRule.requiresExceptionReason ? reason : "",
    motExpiryAcknowledged: scheduleRule.requiresAcknowledgement,
    motExpiryAcknowledgedAt: scheduleRule.requiresAcknowledgement ? timestamp : "",
    motExpiryAcknowledgedBy: scheduleRule.requiresAcknowledgement ? actor.email : "",
    motExpiryAcknowledgedByUid: scheduleRule.requiresAcknowledgement ? actor.uid : "",
    scheduleManuallyAdjusted: true,
    lastEditedBy: actor.email,
    lastEditedByUid: actor.uid,
    updatedAt: timestamp,
    history: [...safeArray3(booking.history), historyEntry("Rescheduled", actor, [
      `Booking dates: ${canonical.schedule.bookingDates.join(", ") || "Unknown"} -> ${dates.join(", ")}`,
      reason ? `Reason: ${reason}` : "",
      scheduleRule.requiresAcknowledgement ? "Expired MOT appointment acknowledged" : ""
    ], timestamp)]
  };
  const vehiclePatch = vehicle ? { ...bookingSummaryPatch(booking, dates, canonical.status), updatedAt: timestamp } : null;
  const writes = buildAtomicRescheduleWriteSet({
    bookingId: booking.id,
    bookingPatch: patch,
    bookingUpdateTime,
    vehicleId: vehicle?.id,
    vehiclePatch
  });
  for (const write of writes) if (write.collection === "vehicles") {
    delete write.exists;
    write.updateTime = vehicleUpdateTime;
  }
  await commitMaintenanceWrites(writes, companyId);
  return { id: booking.id, ...booking, ...patch, vehiclePatch: writes[1]?.patch || null };
};
var completionVehiclePatch = ({ booking, vehicle, typeIds, completedDate, documentsByType, actor, allCompleted, recordedServiceNextDueDate = "" }) => {
  if (!vehicle) return null;
  const timestamp = nowISO();
  const patch = { ...allCompleted ? clearSummary(vehicle, booking.id) : {}, updatedAt: timestamp };
  if (typeIds.includes("mot")) {
    const documents = normalizeMaintenanceDocumentList(documentsByType?.mot, {
      maintenanceTypeId: "mot",
      sourceRecordId: booking.id,
      uploadedBy: actor
    });
    const newerMotDate = [
      vehicle.lastMOT,
      vehicle.lastMot,
      vehicle.lastMotDate,
      ...safeArray3(vehicle.motHistory).map((entry) => entry?.completedDate)
    ].map(maintenanceDateOnly).filter(Boolean).sort().at(-1) || "";
    if (newerMotDate <= completedDate && !getAuthoritativeDvsaMotExpiry(vehicle, { notBeforeCompletionDate: completedDate })) {
      patch.lastMOT = completedDate;
      patch.lastMot = completedDate;
      patch.lastMotDate = completedDate;
      patch.nextMOT = "";
      patch.nextMot = "";
      patch.nextMotDate = "";
      patch.motDueDate = "";
      patch.motExpiryDate = "";
      patch.motAwaitingDvsaConfirmation = true;
      patch.motAwaitingDvsaCompletionDate = completedDate;
      patch.motAwaitingDvsaSince = timestamp;
      patch.motAwaitingDvsaBookingId = booking.id;
    }
    patch.motHistory = [...safeArray3(vehicle.motHistory).filter((item) => !maintenanceEvidenceMatches(item, booking.id, "mot")), {
      maintenanceTypeId: "mot",
      completedDate,
      bookingId: booking.id,
      source: "maintenance_booking",
      ...newerMotDate > completedDate ? { recurrenceDisposition: "historic_frequency_unproven" } : {},
      provider: text10(booking.provider),
      bookingRef: text10(booking.bookingRef),
      notes: text10(booking.notes),
      documents,
      recordedAt: timestamp
    }];
    if (documents.length) {
      const incomingIds = new Set(documents.map(maintenanceDocumentId));
      patch.motDocuments = [
        ...safeArray3(vehicle.motDocuments).filter((document) => !incomingIds.has(maintenanceDocumentId(document)) || !maintenanceEvidenceMatches(document, booking.id, "mot", "sourceRecordId")),
        ...documents
      ];
    }
  }
  if (typeIds.includes("service")) {
    const documents = normalizeMaintenanceDocumentList(documentsByType?.service, {
      maintenanceTypeId: "service",
      sourceRecordId: booking.id,
      uploadedBy: actor
    });
    const newerServiceDate = [
      vehicle.lastService,
      vehicle.lastServiceDate,
      ...safeArray3(vehicle.serviceHistory).filter(isCoreServiceHistory).map((item) => item?.completedDate)
    ].map(maintenanceDateOnly).filter(Boolean).sort().at(-1) || "";
    const backdated = newerServiceDate > completedDate;
    const frequencyWeeks = getConfiguredMaintenanceFrequencyWeeks(vehicle, "service");
    const nextDueDate = backdated ? "" : recordedServiceNextDueDate || calculateNextMaintenanceDue({
      maintenanceTypeId: "service",
      completedDate,
      frequencyWeeks
    });
    if (!backdated) {
      patch.lastService = completedDate;
      patch.lastServiceDate = completedDate;
      patch.nextService = nextDueDate;
      patch.nextServiceDate = nextDueDate;
      patch.serviceDueDate = nextDueDate;
      patch.serviceISOWeek = nextDueDate ? maintenanceIsoWeekLabel(nextDueDate) : "";
    }
    patch.serviceHistory = [...safeArray3(vehicle.serviceHistory).filter((item) => !maintenanceEvidenceMatches(item, booking.id, "service")), {
      maintenanceTypeId: "service",
      completedDate,
      nextDueDate,
      ...backdated ? { recurrenceDisposition: "historic_frequency_unproven" } : { frequencyWeeks },
      bookingId: booking.id,
      source: "maintenance_booking",
      documents,
      recordedAt: timestamp
    }];
    if (backdated) patch.maintenanceReconciliationRequired = [...maintenanceReconciliationEntries(vehicle.maintenanceReconciliationRequired), {
      maintenanceTypeId: "service",
      sourceRecordId: booking.id,
      reason: "backdated_completion_recurrence_unproven",
      disposition: "manual_review_required"
    }];
    if (documents.length) {
      const incomingIds = new Set(documents.map(maintenanceDocumentId));
      patch.serviceDocuments = [
        ...safeArray3(vehicle.serviceDocuments).filter((document) => !incomingIds.has(maintenanceDocumentId(document)) || !maintenanceEvidenceMatches(document, booking.id, "service", "sourceRecordId")),
        ...documents
      ];
    }
  }
  const workflows = ADDITIONAL_MAINTENANCE_WORKFLOWS.filter((workflow) => typeIds.includes(workflow.maintenanceTypeId));
  const currentWorkflows = [];
  for (const workflow of workflows) {
    const latestDate = [
      ...(workflow.lastFields || [workflow.lastField]).map((field) => vehicle[field]),
      ...safeArray3(vehicle[workflow.historyField]).map((entry) => entry?.completedDate)
    ].map(maintenanceDateOnly).filter(Boolean).sort().at(-1) || "";
    if (latestDate <= completedDate) {
      currentWorkflows.push(workflow);
      continue;
    }
    const result = buildAdditionalMaintenanceCompletionPatch({
      vehicle: { ...vehicle, ...patch },
      workflows: [workflow],
      completedDate,
      completedAt: timestamp,
      documentsByKey: documentsByType,
      auditUser: actor,
      bookingId: booking.id,
      provider: booking.provider,
      bookingRef: booking.bookingRef,
      notes: booking.notes,
      source: "maintenance_booking"
    }) || {};
    if (latestDate > completedDate) {
      const newEntry = safeArray3(result[workflow.historyField]).find((entry) => entry.bookingId === booking.id);
      if (newEntry) {
        result[workflow.historyField] = [
          ...safeArray3(vehicle[workflow.historyField]).filter((entry) => !maintenanceEvidenceMatches(entry, booking.id, workflow.maintenanceTypeId)),
          { ...newEntry, nextDueDate: "", recurrenceDisposition: "historic_frequency_unproven" }
        ];
      }
      for (const field of Object.keys(result)) {
        if (![workflow.historyField, workflow.documentsField, "updatedAt"].includes(field)) delete result[field];
      }
      result.maintenanceReconciliationRequired = [...maintenanceReconciliationEntries(patch.maintenanceReconciliationRequired || vehicle.maintenanceReconciliationRequired), {
        maintenanceTypeId: workflow.maintenanceTypeId,
        sourceRecordId: booking.id,
        reason: "backdated_completion_recurrence_unproven",
        disposition: "manual_review_required"
      }];
    }
    Object.assign(patch, result);
  }
  if (currentWorkflows.length) Object.assign(patch, buildAdditionalMaintenanceCompletionPatch({
    vehicle: { ...vehicle, ...patch },
    workflows: currentWorkflows,
    completedDate,
    completedAt: timestamp,
    documentsByKey: documentsByType,
    auditUser: actor,
    bookingId: booking.id,
    provider: booking.provider,
    bookingRef: booking.bookingRef,
    notes: booking.notes,
    source: "maintenance_booking"
  }) || {});
  return patch;
};
var assertOwnedSuccessor = (existing, expected, companyId, bookingId) => {
  assertTenant(existing, companyId);
  const aliases2 = [existing.origin?.sourceId, existing.sourceId, existing.sourceRef, existing.completionSourceId, existing.legacy?.sourceId];
  const expectedTypes = safeArray3(expected.items).map((item) => item.maintenanceTypeId).sort();
  const actualTypes = safeArray3(existing.items).map((item) => item?.maintenanceTypeId).sort();
  const explicitTypes = safeArray3(existing.maintenanceTypeIds).slice().sort();
  if (existing.vehicleId !== expected.vehicleId || existing.requirementKey !== expected.requirementKey || existing.origin?.sourceId !== bookingId || aliases2.some((value) => value !== void 0 && value !== null && value !== "" && value !== bookingId) || [existing.type, existing.maintenanceType].some((value) => value !== void 0 && value !== null && value !== "" && text10(value).toUpperCase() !== text10(expected.type).toUpperCase()) || safeArray3(existing.items).some((item) => [item?.type, item?.maintenanceType].some((value) => value !== void 0 && value !== null && value !== "" && normalizeMaintenanceTypeId(value) !== item.maintenanceTypeId)) || JSON.stringify(actualTypes) !== JSON.stringify(expectedTypes) || explicitTypes.length && JSON.stringify(explicitTypes) !== JSON.stringify(expectedTypes) || existing.maintenanceTypeId && existing.maintenanceTypeId !== expected.maintenanceTypeId) {
    const error = new Error("Existing maintenance requirement has conflicting ownership, workflow or source. Review it before completing this booking.");
    error.status = 409;
    throw error;
  }
};
var storedSuccessorReceiptIds = async (records, companyId, bookingId) => {
  const ids = [];
  for (const record of records) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const id = maintenanceRequirementDocumentId(attempt ? `${record.requirementKey}|active-replacement:${attempt}` : record.requirementKey);
      if (!id) break;
      const snapshot = await maintenanceIO().adminReadDocumentWithMetadata("maintenanceBookings", id);
      if (!snapshot) break;
      assertNativeVersion(snapshot);
      assertOwnedSuccessor(snapshot.data, record, companyId, bookingId);
      const status = normalizeMaintenanceRecord(snapshot.data, { id }).status;
      if (["requested", "booked", "in_progress", "deferred"].includes(status)) {
        ids.push(id);
        break;
      }
      if (["completed", "cancelled"].includes(status)) break;
    }
  }
  return ids;
};
var provenRecurrenceTypes = (types, vehicle, bookingId) => types.filter((type) => {
  const workflow = RECURRING_MAINTENANCE_WORKFLOWS.find((item) => item.maintenanceTypeId === type);
  return !safeArray3(vehicle?.[workflow?.historyField]).some((entry) => entry.bookingId === bookingId && entry.recurrenceDisposition === "historic_frequency_unproven");
});
var completeMutation = async ({ payload, actor, companyId, selectedOnly }) => {
  const { booking, bookingUpdateTime, vehicle, vehicleUpdateTime } = await readContext(text10(payload.bookingId), companyId, { expectedUpdatedAt: payload.expectedUpdatedAt });
  const completedDate = maintenanceDateOnly(payload.completedISO);
  if (!completedDate) throw new Error("Enter the actual completion date.");
  const recordedServiceNextDueDate = maintenanceDateOnly(payload.recordedServiceNextDueDate);
  if (payload.recordedServiceNextDueDate && (payload.recordedServiceNextDueDate !== recordedServiceNextDueDate || !recordedServiceNextDueDate || !Number.isFinite(Date.parse(recordedServiceNextDueDate)) || new Date(recordedServiceNextDueDate).toISOString().slice(0, 10) !== recordedServiceNextDueDate || recordedServiceNextDueDate <= completedDate)) throw new Error("Next service date must be after completion.");
  const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
  if (canonical.status === "completed") {
    const sameCompletion = canonical.items.filter((item) => !selectedOnly || safeArray3(payload.maintenanceTypeIds).map(normalizeMaintenanceTypeId).includes(item.maintenanceTypeId)).every((item) => item.status === "completed" && item.completionDateISO === completedDate);
    if (sameCompletion) {
      const recurrence2 = buildNextRequestedMaintenanceRecords({
        canonicalRecord: canonical,
        completedTypeIds: provenRecurrenceTypes(canonical.items.map((item) => item.maintenanceTypeId), vehicle, booking.id),
        completionDateISO: completedDate,
        vehicle: vehicle || {}
      });
      if (canonical.items.some((item) => item.maintenanceTypeId === "mot") && provenRecurrenceTypes(["mot"], vehicle, booking.id).length) {
        const confirmedDueDate = maintenanceDateOnly(
          vehicle?.nextMOT || vehicle?.nextMot || vehicle?.motExpiryDate
        );
        if (confirmedDueDate) {
          recurrence2.push(buildRequestedMaintenanceRecord({
            companyId: canonical.companyId,
            vehicleId: canonical.vehicleId,
            vehicleLabel: canonical.vehicleLabel,
            items: [{ maintenanceTypeId: "mot", legalDueDateISO: confirmedDueDate }],
            source: "dvsa_reconciliation",
            sourceId: booking.id
          }));
        }
      }
      return {
        id: booking.id,
        ...booking,
        idempotent: true,
        nextRequestedRecordIds: await storedSuccessorReceiptIds(recurrence2, companyId, booking.id),
        recurrenceStatus: "completed"
      };
    }
  }
  if (!["booked", "in_progress", "deferred"].includes(canonical.status)) throw new Error("Only an active booked appointment can be completed.");
  const selected = selectedOnly ? safeArray3(payload.maintenanceTypeIds).map(normalizeMaintenanceTypeId) : canonical.items.filter((item) => item.status !== "completed").map((item) => item.maintenanceTypeId);
  const selectedItems = selected.map((id) => canonical.items.find((item) => item.maintenanceTypeId === id)).filter(Boolean);
  if (selectedItems.length > 0 && selectedItems.every((item) => item.status === "completed" && item.completionDateISO === completedDate)) {
    const recurrence2 = buildNextRequestedMaintenanceRecords({
      canonicalRecord: canonical,
      completedTypeIds: provenRecurrenceTypes(selected, vehicle, booking.id),
      completionDateISO: completedDate,
      vehicle: vehicle || {}
    });
    return {
      id: booking.id,
      ...booking,
      idempotent: true,
      nextRequestedRecordIds: await storedSuccessorReceiptIds(recurrence2, companyId, booking.id),
      recurrenceStatus: "completed"
    };
  }
  const available = selected.filter((id) => canonical.items.some((item) => item.maintenanceTypeId === id && item.status !== "completed"));
  if (!available.length) throw new Error("Select at least one incomplete maintenance item.");
  const evidenceIssues = maintenanceCompletionEvidenceIssues(
    canonical,
    available,
    payload.documentsByType || {}
  );
  if (evidenceIssues.length) {
    const missingTypes = evidenceIssues.map((issue) => issue.replace("missing_evidence:", ""));
    const error = new Error(
      `Attach evidence before completing regulated maintenance: ${missingTypes.join(", ")}.`
    );
    error.status = 400;
    error.code = "maintenance_evidence_required";
    error.details = { missingMaintenanceTypeIds: missingTypes };
    throw error;
  }
  const completed = completeCanonicalMaintenanceItems(canonical, available, completedDate, { documentsByType: payload.documentsByType || {} });
  const timestamp = nowISO();
  const nextStatus = completed.allCompleted ? "completed" : "booked";
  const bookingPatch = {
    status: titleStatus(nextStatus),
    items: completed.items,
    completedAtISO: completed.allCompleted ? completedDate : "",
    lastEditedBy: actor.email,
    lastEditedByUid: actor.uid,
    updatedAt: timestamp,
    history: [...safeArray3(booking.history), historyEntry(selectedOnly ? "Maintenance items completed" : "Completed", actor, [
      ...available.map((id) => `${id}: completed on ${completedDate}`)
    ], timestamp)]
  };
  const vehiclePatch = completionVehiclePatch({ booking, vehicle, typeIds: available, completedDate, documentsByType: payload.documentsByType || {}, actor, allCompleted: completed.allCompleted, recordedServiceNextDueDate });
  const writes = [{ collection: "maintenanceBookings", documentId: booking.id, patch: bookingPatch, updateTime: bookingUpdateTime }];
  if (vehiclePatch) writes.push({ collection: "vehicles", documentId: vehicle.id, patch: vehiclePatch, updateTime: vehicleUpdateTime });
  const recurrenceTypes = provenRecurrenceTypes(available, vehiclePatch, booking.id);
  const recurrence = buildNextRequestedMaintenanceRecords({ canonicalRecord: canonical, completedTypeIds: recurrenceTypes, completionDateISO: completedDate, vehicle: { ...vehicle, ...vehiclePatch }, recordedServiceNextDueDate });
  const createdIds = [], readChecks = [];
  const readSuccessor = async (id) => {
    const snapshot = await maintenanceIO().adminReadDocumentWithMetadata("maintenanceBookings", id);
    if (snapshot) assertNativeVersion(snapshot);
    readChecks.push({
      collection: "maintenanceBookings",
      documentId: id,
      ...snapshot ? { updateTime: snapshot.updateTime } : { exists: false }
    });
    return snapshot;
  };
  for (const record of recurrence) {
    const inspectionTypeIds = safeArray3(record.items).map((item) => item.maintenanceTypeId).filter((id2) => ["pmi", "brake_test"].includes(id2));
    if (inspectionTypeIds.length === 2) {
      for (const item of record.items) {
        const individual = buildRequestedMaintenanceRecord({
          companyId: record.companyId,
          vehicleId: record.vehicleId,
          vehicleLabel: record.vehicleLabel,
          items: [item],
          source: "completion_recurrence",
          sourceId: booking.id
        });
        const individualId = maintenanceRequirementDocumentId(individual.requirementKey);
        const individualSnapshot = individualId ? await readSuccessor(individualId) : null;
        if (individualSnapshot) assertOwnedSuccessor(individualSnapshot.data, individual, companyId, booking.id);
        const individualCanonical = individualSnapshot ? normalizeMaintenanceRecord(individualSnapshot.data, { id: individualId }) : null;
        if (individualSnapshot && individualCanonical?.status === "requested" && individualSnapshot.data.scheduleManuallyAdjusted !== true) {
          writes.push({
            collection: "maintenanceBookings",
            documentId: individualId,
            updateTime: individualSnapshot.updateTime,
            patch: {
              status: "Archived",
              archiveReason: "Replaced by the combined PMI and Brake Test requirement.",
              archivedAtISO: timestamp,
              updatedAt: timestamp,
              history: [
                ...safeArray3(individualSnapshot.data.history),
                historyEntry("Combined inspection successor created", actor, [
                  `Replaced by requirement: ${record.requirementKey}`
                ], timestamp)
              ]
            }
          });
        }
      }
    }
    let id = maintenanceRequirementDocumentId(record.requirementKey);
    if (!id) continue;
    let existingSuccessor = (await readSuccessor(id))?.data;
    if (existingSuccessor) {
      assertOwnedSuccessor(existingSuccessor, record, companyId, booking.id);
      const successorStatus = normalizeMaintenanceRecord(existingSuccessor, { id }).status;
      if (["requested", "booked", "in_progress", "deferred"].includes(successorStatus)) {
        createdIds.push(id);
        continue;
      }
      if (["completed", "cancelled"].includes(successorStatus)) continue;
      let attempt = 1;
      let foundActiveReplacement = false;
      while (attempt < 100) {
        id = maintenanceRequirementDocumentId(`${record.requirementKey}|active-replacement:${attempt}`);
        existingSuccessor = (await readSuccessor(id))?.data;
        attempt += 1;
        if (!existingSuccessor) break;
        assertOwnedSuccessor(existingSuccessor, record, companyId, booking.id);
        const replacementStatus = normalizeMaintenanceRecord(existingSuccessor, { id }).status;
        if (["requested", "booked", "in_progress", "deferred"].includes(replacementStatus)) {
          createdIds.push(id);
          foundActiveReplacement = true;
          break;
        }
        if (["completed", "cancelled"].includes(replacementStatus)) {
          foundActiveReplacement = true;
          break;
        }
      }
      if (foundActiveReplacement) continue;
      if (existingSuccessor) continue;
    }
    const persisted = withBickersReference({
      ...record,
      ...scheduleFields(record.schedule?.bookingDates || [], ""),
      status: titleStatus(record.status),
      companyId: companyId || text10(record.companyId),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: "recurrence",
      lastEditedBy: "recurrence",
      history: [historyEntry("Recurring due item created", actor, [`Source completion: ${booking.id}`], timestamp)]
    }, id);
    writes.push({ collection: "maintenanceBookings", documentId: id, patch: persisted, exists: false });
    createdIds.push(id);
  }
  const recurrenceCreatedTypeIds = new Set(
    recurrence.flatMap((record) => safeArray3(record.items).map((item) => item.maintenanceTypeId))
  );
  const retryTypeIds = available.filter((id) => id === "mot" && !recurrenceCreatedTypeIds.has(id));
  let recurrenceStatus = "completed";
  if (retryTypeIds.length) {
    recurrenceStatus = "partial_failure";
    const reconciliationId = `recurrence_${booking.id}_${completedDate.replaceAll("-", "")}`;
    const existingJob = await maintenanceIO().adminReadDocument("maintenanceReconciliationJobs", reconciliationId);
    if (!existingJob) writes.push({
      collection: "maintenanceReconciliationJobs",
      documentId: reconciliationId,
      exists: false,
      patch: {
        kind: "maintenance_recurrence",
        status: "pending",
        companyId,
        bookingId: booking.id,
        vehicleId: text10(booking.vehicleId),
        completedDateISO: completedDate,
        maintenanceTypeIds: retryTypeIds,
        attempts: 0,
        nextAttemptAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastError: retryTypeIds.includes("mot") ? "Awaiting DVSA confirmation" : "Next due date unavailable"
      }
    });
  }
  await commitMaintenanceWrites(writes, companyId, readChecks);
  return {
    id: booking.id,
    ...bookingPatch,
    vehiclePatch,
    nextRequestedRecordIds: createdIds,
    recurrenceStatus,
    ...recurrenceStatus === "partial_failure" ? { partialFailure: { code: "recurrence_pending", message: "Completion saved; follow-up scheduling is queued for reconciliation." } } : {}
  };
};
var terminalMutation = async ({ payload, actor, companyId, archive }) => {
  const actorRole = text10(actor.role).toLowerCase().replaceAll(/[^a-z]/g, "");
  if (archive && !["admin", "platformadmin"].includes(actorRole)) {
    const error = new Error("Only an authorised administrator can archive a legal maintenance requirement.");
    error.status = 403;
    throw error;
  }
  const { booking, bookingUpdateTime, vehicle, vehicleUpdateTime } = await readContext(
    text10(payload.bookingId),
    companyId,
    { allowMissingVehicle: archive, expectedUpdatedAt: payload.expectedUpdatedAt }
  );
  const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
  if (["cancelled", "archived"].includes(canonical.status)) throw new Error(`Cannot ${archive ? "archive" : "cancel"} a terminal maintenance record.`);
  if (!archive && canonical.status === "completed") throw new Error("A completed maintenance record can only be archived by an authorised administrator.");
  const reason = text10(payload.reason || payload.cancellationReason);
  if (archive && !reason) throw new Error("Enter a reason for archiving this maintenance requirement.");
  const timestamp = nowISO();
  const status = archive ? "archived" : text10(payload.cancellationMode).toLowerCase() === "requirement" ? "cancelled" : "requested";
  const patch = {
    status: titleStatus(status),
    items: canonical.items.map((item) => ({ ...item, status })),
    ...status === "requested" ? scheduleFields([], "") : {},
    ...archive ? { archivedAtISO: timestamp, archivedBy: actor, archiveReason: reason } : { cancellationReason: reason, cancelledAtISO: timestamp, cancelledBy: actor },
    lastEditedBy: actor.email,
    lastEditedByUid: actor.uid,
    updatedAt: timestamp,
    history: [...safeArray3(booking.history), historyEntry(archive ? "Archived" : "Cancelled", actor, [`Status: ${booking.status} -> ${titleStatus(status)}`, reason ? `Reason: ${reason}` : ""], timestamp)]
  };
  const writes = [{ collection: "maintenanceBookings", documentId: booking.id, patch, updateTime: bookingUpdateTime }];
  const queryChecks = [];
  if (archive && canonical.status === "completed") {
    const successors = await maintenanceIO().adminListDocuments("maintenanceBookings");
    const expected = successors.filter((row) => row.data?.companyId === companyId && row.data?.vehicleId === booking.vehicleId && [row.data?.origin?.sourceId, row.data?.sourceRef, row.data?.sourceId, row.data?.completionSourceId, row.data?.legacy?.sourceId].includes(booking.id)).map((row) => ({ id: row.id, updateTime: row.updateTime })).sort((a, b) => a.id.localeCompare(b.id));
    if (expected.some((row) => !row.updateTime)) {
      const error = new Error("Maintenance dependency version unavailable.");
      error.status = 409;
      throw error;
    }
    queryChecks.push({ collection: "maintenanceBookings", companyId, vehicleId: booking.vehicleId, sourceId: booking.id, expected });
    const affectedTypes = new Set(canonical.items.map((item) => item.maintenanceTypeId));
    for (const record of successors) {
      const data = record?.data || record;
      const references = [data?.origin?.sourceId, data?.sourceRef, data?.sourceId, data?.completionSourceId, data?.legacy?.sourceId].filter((value) => value !== void 0 && value !== null && value !== "");
      if (!references.some((value) => value === booking.id)) continue;
      if (data.companyId !== companyId || data.vehicleId !== booking.vehicleId) continue;
      if (references.some((value) => typeof value !== "string" || value !== booking.id)) {
        const error = new Error("Successor source evidence conflicts. Review it before archiving.");
        error.status = 409;
        throw error;
      }
      assertCanonicalId(record.id);
      const successor = normalizeMaintenanceRecord(data, { id: record.id });
      if (!["requested", "booked", "in_progress", "deferred"].includes(successor.status)) continue;
      if (!successor.items.length || successor.items.some((item) => !affectedTypes.has(item.maintenanceTypeId))) continue;
      const expectedCore = successor.items.length > 1 || !["mot", "service"].includes(successor.items[0]?.maintenanceTypeId) ? "INSPECTION" : successor.items[0].maintenanceTypeId.toUpperCase();
      if (data.maintenanceTypeId !== void 0 && data.maintenanceTypeId !== (successor.items.length === 1 ? successor.items[0].maintenanceTypeId : "combined") || [data.type, data.maintenanceType].some((value) => value !== void 0 && value !== null && value !== "" && text10(value).toUpperCase() !== expectedCore) || safeArray3(data.items).some((item) => [item?.type, item?.maintenanceType].some((value) => value !== void 0 && value !== null && value !== "" && normalizeMaintenanceTypeId(value) !== item.maintenanceTypeId))) {
        const error = new Error("Successor workflow evidence conflicts. Review it before archiving.");
        error.status = 409;
        throw error;
      }
      const snapshot = await maintenanceIO().adminReadDocumentWithMetadata("maintenanceBookings", record.id);
      assertNativeVersion(snapshot);
      if (!record.updateTime || snapshot.updateTime !== record.updateTime) {
        const error = new Error("Maintenance successor changed. Refresh before archiving.");
        error.status = 409;
        throw error;
      }
      assertTenant(snapshot.data, companyId);
      writes.push({
        collection: "maintenanceBookings",
        documentId: record.id,
        patch: {
          status: "Archived",
          items: successor.items.map((item) => ({ ...item, status: "archived" })),
          archiveReason: `Successor removed after completion ${booking.id} was archived.`,
          archivedAtISO: timestamp,
          archivedBy: actor,
          updatedAt: timestamp,
          history: [...safeArray3(data.history), historyEntry("Archived", actor, [reason, `Source completion: ${booking.id}`], timestamp)]
        },
        updateTime: snapshot.updateTime
      });
    }
  }
  const vehiclePatch = vehicle ? {
    ...clearSummary(vehicle, booking.id),
    ...archive && canonical.status === "completed" ? rebuildArchivedMaintenanceCompletion(vehicle, booking) : {},
    updatedAt: timestamp
  } : null;
  if (vehiclePatch) writes.push({ collection: "vehicles", documentId: vehicle.id, patch: vehiclePatch, updateTime: vehicleUpdateTime });
  await commitMaintenanceWrites(writes, companyId, [], queryChecks);
  return { id: booking.id, ...patch, vehiclePatch };
};
var editMutation = async ({ payload, actor, companyId }) => {
  const { booking, bookingUpdateTime } = await readContext(text10(payload.bookingId), companyId, { expectedUpdatedAt: payload.expectedUpdatedAt });
  const current = normalizeMaintenanceRecord(booking, { id: booking.id }).status;
  const next = normalizeMaintenanceRecordStatus(payload.status || booking.status);
  if (["completed", "cancelled", "archived"].includes(next)) throw new Error("Use the dedicated completion, cancellation or archive operation.");
  if (!["requested", "booked", "in_progress", "deferred"].includes(current)) throw new Error("Terminal maintenance records cannot be edited.");
  if (bookingDates2(payload).join() !== bookingDates2(booking).join()) throw new Error("Use the dedicated reschedule operation to change appointment dates.");
  assertMaintenanceTransition(current, next);
  const timestamp = nowISO();
  const patch = {
    bickersReference: buildMaintenanceBickersReference(booking, { id: booking.id }),
    status: titleStatus(next),
    provider: text10(payload.provider),
    bookingRef: text10(payload.bookingRef),
    location: text10(payload.location),
    cost: text10(payload.cost),
    notes: text10(payload.notes),
    equipment: safeArray3(payload.equipment),
    lastEditedBy: actor.email,
    lastEditedByUid: actor.uid,
    updatedAt: timestamp,
    history: [...safeArray3(booking.history), historyEntry("Edited", actor, [`Status: ${booking.status} -> ${titleStatus(next)}`], timestamp)]
  };
  await commitMaintenanceWrites([{ collection: "maintenanceBookings", documentId: booking.id, patch, updateTime: bookingUpdateTime }], companyId);
  return { id: booking.id, ...booking, ...patch };
};
var createWorkMutation = ({ payload, actor, companyId }) => {
  const job = payload.job || {};
  const plannedDate = maintenanceDateOnly(job.bookedDate || job.plannedDate);
  return createMutation({
    actor,
    companyId,
    payload: {
      vehicleId: job.assetId || job.vehicleId,
      vehicleLabel: job.assetLabel || job.vehicleLabel,
      type: "WORK",
      maintenanceTypeId: job.type || "repair",
      maintenanceTypeIds: [job.type || "repair"],
      status: plannedDate ? "Booked" : "Requested",
      appointmentDate: plannedDate,
      sourceDueDate: job.dueDate,
      provider: job.provider,
      notes: job.notes,
      title: job.title,
      workshop: { ...job, status: text10(job.status || "planned").toLowerCase() }
    }
  });
};
var updateWorkMutation = async ({ payload, actor, companyId }) => {
  const { booking, bookingUpdateTime, vehicle, vehicleUpdateTime } = await readContext(text10(payload.bookingId), companyId, { expectedUpdatedAt: payload.expectedUpdatedAt, requireDisplayedVersion: true });
  const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
  const rawTypeIds = [
    booking.type,
    booking.maintenanceTypeId,
    ...safeArray3(booking.maintenanceTypeIds),
    ...safeArray3(booking.items).flatMap((item) => [item?.maintenanceTypeId, item?.type])
  ].map(normalizeMaintenanceTypeId);
  if (text10(booking.type).toUpperCase() !== "WORK" || rawTypeIds.some(
    (typeId) => RECURRING_MAINTENANCE_WORKFLOWS.some((workflow) => workflow.maintenanceTypeId === typeId)
  )) throw new Error("Only WORK records may use the generic workshop update.");
  const terminalStates = /* @__PURE__ */ new Set(["completed", "cancelled", "archived"]);
  if (!["requested", "booked", "in_progress", "deferred"].includes(canonical.status) || [booking.status, booking.workshop?.status, ...safeArray3(booking.items).map((item) => item?.status)].some((status) => status && (text10(status).toLowerCase() === "canceled" || terminalStates.has(normalizeMaintenanceRecordStatus(status))))) {
    throw new Error("Terminal maintenance evidence cannot be changed through a generic WORK update.");
  }
  if (booking.items != null && (!Array.isArray(booking.items) || booking.items.some((item) => !item || typeof item !== "object" || Array.isArray(item)))) {
    throw new Error("Malformed WORK item evidence requires review before editing.");
  }
  const input = payload.patch || {};
  const currentWorkshop = booking.workshop && typeof booking.workshop === "object" ? booking.workshop : {};
  const workshop = { ...currentWorkshop, ...input };
  const rawStatus = text10(input.status || workshop.status || booking.status).toLowerCase().replaceAll("_", " ");
  if (![
    "requested",
    "planned",
    "booked",
    "in progress",
    "inprogress",
    "deferred",
    "awaiting parts",
    "qa",
    "completed",
    "complete",
    "closed",
    "cancelled",
    "canceled",
    "archived"
  ].includes(rawStatus)) {
    throw new Error("Choose a supported WORK status.");
  }
  const nextStatus = ["booked"].includes(rawStatus) ? "booked" : ["in progress", "inprogress"].includes(rawStatus) ? "in_progress" : ["deferred", "awaiting parts", "qa"].includes(rawStatus) ? "deferred" : "requested";
  if (["completed", "complete", "closed", "cancelled", "canceled", "archived"].includes(rawStatus)) {
    throw new Error("Use the dedicated completion, cancellation or archive operation.");
  }
  assertMaintenanceTransition(canonical.status, nextStatus);
  const requestedDate = maintenanceDateOnly(input.bookedDate || input.plannedDate);
  const existingDate = bookingDates2(booking)[0] || "";
  if (requestedDate && requestedDate !== existingDate) {
    throw new Error("Use the dedicated reschedule operation to change appointment dates.");
  }
  const date = existingDate || maintenanceDateOnly(workshop.bookedDate || workshop.plannedDate);
  const dates = date ? [date] : bookingDates2(booking);
  if (["booked", "in_progress"].includes(nextStatus) && !dates.length) throw new Error("Choose an appointment date before booking workshop work.");
  const timestamp = nowISO();
  const patch = {
    status: titleStatus(nextStatus),
    items: (safeArray3(booking.items).length ? booking.items : canonical.items).map((item) => ({ ...item, status: nextStatus })),
    workshop,
    provider: Object.prototype.hasOwnProperty.call(input, "provider") ? text10(input.provider) : text10(booking.provider),
    title: text10(input.title || workshop.title || booking.title),
    notes: text10(input.notes || workshop.notes || booking.notes),
    ...scheduleFields(dates, booking.appointmentTime),
    lastEditedBy: actor.email,
    lastEditedByUid: actor.uid,
    updatedAt: timestamp,
    history: [...safeArray3(booking.history), historyEntry("Workshop job updated", actor, [`Status: ${booking.status} -> ${titleStatus(nextStatus)}`], timestamp)]
  };
  const writes = [{ collection: "maintenanceBookings", documentId: booking.id, patch, updateTime: bookingUpdateTime }];
  const vehiclePatch = vehicle && dates.length ? { ...bookingSummaryPatch(booking, dates, nextStatus), updatedAt: timestamp } : null;
  if (vehiclePatch) writes.push({ collection: "vehicles", documentId: vehicle.id, patch: vehiclePatch, updateTime: vehicleUpdateTime });
  await commitMaintenanceWrites(writes, companyId);
  return { id: booking.id, ...booking, ...patch, vehiclePatch };
};
var updateDocumentsMutation = async ({ payload, actor, companyId }) => {
  const { booking, bookingUpdateTime, vehicle, vehicleUpdateTime } = await readContext(text10(payload.bookingId), companyId, { expectedUpdatedAt: payload.expectedUpdatedAt });
  const allowedTypeIds = new Set(normalizeMaintenanceRecord(booking, { id: booking.id }).items.map((item) => item.maintenanceTypeId));
  const suppliedItems = safeArray3(payload.items);
  const items = safeArray3(booking.items).map((existingItem) => {
    const typeId = normalizeMaintenanceTypeId(existingItem.maintenanceTypeId);
    const supplied = suppliedItems.find((item) => normalizeMaintenanceTypeId(item.maintenanceTypeId) === typeId);
    if (!supplied || !allowedTypeIds.has(typeId)) return existingItem;
    const documents = normalizeMaintenanceDocumentList(supplied.documents, {
      maintenanceTypeId: typeId,
      sourceRecordId: booking.id,
      uploadedBy: actor
    });
    return { ...existingItem, documents, evidenceStatus: documents.length ? "attached" : "not_recorded" };
  });
  const timestamp = nowISO();
  const bookingPatch = {
    items,
    lastEditedBy: actor.email,
    lastEditedByUid: actor.uid,
    updatedAt: timestamp,
    history: [...safeArray3(booking.history), historyEntry("Evidence updated", actor, ["Maintenance evidence attachments changed"], timestamp)]
  };
  const writes = [{ collection: "maintenanceBookings", documentId: booking.id, patch: bookingPatch, updateTime: bookingUpdateTime }];
  let vehiclePatch = null;
  if (vehicle) {
    vehiclePatch = {};
    RECURRING_MAINTENANCE_WORKFLOWS.filter((workflow) => allowedTypeIds.has(workflow.maintenanceTypeId)).forEach((workflow) => {
      const supplied = suppliedItems.find(
        (item) => normalizeMaintenanceTypeId(item.maintenanceTypeId) === workflow.maintenanceTypeId
      );
      if (!supplied) return;
      const priorBookingItem = safeArray3(booking.items).find(
        (item) => normalizeMaintenanceTypeId(item.maintenanceTypeId) === workflow.maintenanceTypeId
      );
      const priorIds = new Set(safeArray3(priorBookingItem?.documents).map(maintenanceDocumentId).filter(Boolean));
      const nextDocuments = normalizeMaintenanceDocumentList(supplied.documents, {
        maintenanceTypeId: workflow.maintenanceTypeId,
        sourceRecordId: booking.id,
        uploadedBy: actor
      });
      vehiclePatch[workflow.documentsField] = [
        ...safeArray3(vehicle[workflow.documentsField]).filter((document) => !priorIds.has(maintenanceDocumentId(document)) || !maintenanceEvidenceMatches(document, booking.id, workflow.maintenanceTypeId, "sourceRecordId")),
        ...nextDocuments
      ];
      vehiclePatch[workflow.historyField] = safeArray3(vehicle[workflow.historyField]).map(
        (entry) => maintenanceEvidenceMatches(entry, booking.id, workflow.maintenanceTypeId) ? { ...entry, documents: nextDocuments } : entry
      );
    });
    if (Object.keys(vehiclePatch).length) {
      writes.push({
        collection: "vehicles",
        documentId: vehicle.id,
        patch: { ...vehiclePatch, updatedAt: timestamp },
        updateTime: vehicleUpdateTime
      });
    }
  }
  await commitMaintenanceWrites(writes, companyId);
  return { id: booking.id, items, history: bookingPatch.history, vehiclePatch };
};
var VEHICLE_VOR_MUTATION_FIELDS = [
  "operationalStatus",
  "fleetStatus",
  "vehicleStatus",
  "status",
  "availabilityStatus",
  "archivedOperatingStatus",
  "vorStartedAt",
  "vorEndedAt",
  "activeVorRecordId",
  "vorHistory",
  "vorHistoryLastMutatedAt",
  "vorHistoryLastMutatedBy",
  "vorRecoveryHistory",
  "maintenanceCountdownPause",
  "pendingReturnInspection",
  "complianceVor",
  "odometer",
  "nextPMI",
  "nextEightWeekInspection",
  "nextLorryInspection",
  "pmiISOWeek",
  "eightWeekInspectionISOWeek",
  "lorryInspectionISOWeek",
  "nextBrakeTest",
  "brakeISOWeek"
];
var vehicleVorPatch = (vehicle = {}) => Object.fromEntries(
  VEHICLE_VOR_MUTATION_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(vehicle, field)).map((field) => [field, vehicle[field]])
);
var assertHistoricVorAdmin = (actor = {}) => {
  if (!["admin", "platformadmin", "platform_admin"].includes(text10(actor.role).toLowerCase())) {
    const error = new Error("Admin access is required to correct, archive or link historic VOR records.");
    error.status = 403;
    throw error;
  }
};
var applyVehicleVorMutation = (vehicle, operation, payload, actor, timestamp) => {
  if (operation === "correct_open_automatic") {
    assertHistoricVorAdmin(actor);
    return correctOpenAutomaticVorPeriod(vehicle, payload.recordId, payload.changes, { reason: payload.reason, correctedAt: timestamp, correctedBy: actor });
  }
  if (operation === "void_open_automatic") {
    assertHistoricVorAdmin(actor);
    return voidOpenAutomaticVorPeriod(vehicle, payload.recordId, { reason: payload.reason, voidedAt: timestamp, voidedBy: actor });
  }
  if (operation === "recover_closed_return") {
    assertHistoricVorAdmin(actor);
    return recoverClosedVehicleReturn(vehicle, payload, { actor, recordedAt: timestamp });
  }
  if (["correct_historic", "archive_historic"].includes(operation)) {
    assertHistoricVorAdmin(actor);
    const record = safeArray3(vehicle.vorHistory).find((entry) => entry?.id === payload.recordId);
    if (text10(record?.status).toLowerCase() !== "closed") throw new Error("Only closed historic periods may be corrected or archived. Open periods require the release workflow.");
  }
  if (operation === "add_missing_start") {
    assertHistoricVorAdmin(actor);
    return addMissingVehicleVorStartDate(vehicle, payload, { recordedAt: timestamp, recordedBy: actor });
  }
  if (operation === "archive") {
    if (normalizeVehicleOperatingStatus(vehicle) === "Archive") throw new Error("Vehicle is already archived.");
    return { ...syncVehicleOperatingStatus(vehicle, "Archive"), archivedOperatingStatus: normalizeVehicleOperatingStatus(vehicle) };
  }
  if (operation === "restore") {
    if (normalizeVehicleOperatingStatus(vehicle) !== "Archive") throw new Error("Vehicle is not archived.");
    const hasOpen = safeArray3(vehicle.vorHistory).some((record) => text10(record.status).toLowerCase() === "open");
    const previous = vehicle.archivedOperatingStatus;
    if (!["Active", "VOR"].includes(previous)) throw new Error("Legacy archive status requires recovery before restoring.");
    return syncVehicleOperatingStatus(vehicle, hasOpen || vehicle.activeVorRecordId || previous === "VOR" ? "VOR" : "Active");
  }
  if (operation === "start") {
    if (normalizeVehicleOperatingStatus(vehicle) === "Archive") throw new Error("Restore the archived vehicle before changing its VOR state.");
    for (const field of ["approvedBy", "approvedPosition", "reason"]) {
      if (typeof payload[field] !== "string" || !payload[field].trim()) throw new Error("VOR approver, position and reason are required.");
    }
    return startVehicleVorPeriod(vehicle, payload, { startedAt: timestamp });
  }
  if (operation === "schedule_return") {
    return scheduleVehicleReturnInspection(vehicle, payload, { requestedAt: timestamp });
  }
  if (operation === "release") {
    if (normalizeVehicleOperatingStatus(vehicle) !== "VOR") throw new Error("Only a VOR vehicle can be released.");
    return releaseVehicleAfterCompletedCompliance(vehicle, payload, {
      completedAt: timestamp,
      releasedBy: actor
    });
  }
  if (operation === "correct_historic") {
    return correctVehicleHistoricVorPeriod(vehicle, payload.recordId, payload.changes, {
      reason: payload.reason,
      correctedAt: timestamp,
      correctedBy: actor
    });
  }
  if (operation === "archive_historic") {
    return archiveVehicleHistoricVorPeriod(vehicle, payload.recordId, {
      reason: payload.reason,
      archivedAt: timestamp,
      archivedBy: actor
    });
  }
  throw new Error("Unsupported VOR/SORN mutation.");
};
var vehicleVorMutation = async ({ payload, actor, companyId }) => {
  const vehicleId = text10(payload.vehicleId);
  if (!vehicleId) throw new Error("Vehicle id is required.");
  const snapshot = await maintenanceIO().adminReadDocumentWithMetadata("vehicles", vehicleId);
  if (!snapshot) throw new Error("Vehicle not found.");
  assertTenant(snapshot.data, companyId);
  const timestamp = nowISO();
  const currentVehicle = { id: vehicleId, ...snapshot.data };
  const updatedVehicle = applyVehicleVorMutation(
    currentVehicle,
    text10(payload.operation),
    payload.payload || {},
    actor,
    timestamp
  );
  const writes = [];
  let bookingId = "";
  let bookingSummary = {};
  if (text10(payload.operation) === "start") {
    const bookings = await maintenanceIO().adminListDocuments("maintenanceBookings");
    const candidates = getVorInspectionCancellationCandidates(bookings.map((entry) => ({ id: entry.id, ...entry.data, __updateTime: entry.updateTime })).filter((booking) => text10(booking.vehicleId) === vehicleId), { vehicle: updatedVehicle, offRoadDate: payload.payload.offRoadDate });
    for (const booking of candidates) {
      assertTenant(booking, companyId);
      Object.assign(bookingSummary, clearSummary(currentVehicle, booking.id));
      writes.push({ collection: "maintenanceBookings", documentId: booking.id, patch: buildVorInspectionCancellationPatch(booking, { cancelledAt: timestamp, cancelledBy: actor, cancellationSource: "vehicle_vor_transition", sourceRecordId: updatedVehicle.activeVorRecordId }), updateTime: booking.__updateTime });
    }
  }
  if (text10(payload.operation) === "schedule_return") {
    const intent = vehicleReturnInspectionBookingIntent(updatedVehicle);
    if (!intent) throw new Error("Return inspection booking details are incomplete.");
    const allBookings = await maintenanceIO().adminListDocuments("maintenanceBookings");
    const matching = allBookings.map((entry) => ({ id: entry.id, ...entry.data })).find((booking) => {
      if (text10(booking.vehicleId) !== vehicleId) return false;
      if (["cancelled", "declined", "archived", "deleted", "closed", "superseded"].includes(normalizeMaintenanceRecordStatus(booking.status))) return false;
      const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
      const typeIds = new Set(canonical.items.map((item) => item.maintenanceTypeId));
      return canonical.schedule.bookingDates.includes(intent.appointmentDateISO) && typeIds.has("pmi") && typeIds.has("brake_test");
    });
    bookingId = text10(matching?.id) || maintenanceRequirementDocumentId(intent.sourceDueKey);
    if (!matching) {
      const dueWeek = maintenanceIsoWeekLabel(intent.sourceDueDateISO);
      const booking = withBickersReference({
        schemaVersion: 1,
        kind: "MAINTENANCE",
        companyId: companyId || text10(snapshot.data.companyId),
        vehicleId,
        vehicleLabel: intent.vehicleLabel,
        type: intent.type,
        maintenanceTypeId: "combined",
        maintenanceTypeIds: intent.maintenanceTypeIds,
        status: intent.status,
        items: canonicalItems({
          typeIds: intent.maintenanceTypeIds,
          status: "booked",
          dueDate: intent.sourceDueDateISO,
          dueWeek
        }),
        ...scheduleFields([intent.appointmentDateISO], ""),
        sourceDueDateISO: intent.sourceDueDateISO,
        sourceDueIsoWeek: dueWeek,
        sourceDueKey: intent.sourceDueKey,
        requirementKey: intent.sourceDueKey,
        origin: intent.origin,
        sourceVorPeriodId: intent.sourceVorPeriodId,
        notes: intent.notes,
        createdAt: timestamp,
        createdBy: actor.email,
        createdByUid: actor.uid,
        lastEditedBy: actor.email,
        lastEditedByUid: actor.uid,
        updatedAt: timestamp,
        history: [historyEntry("Return-to-fleet inspection booked", actor, [
          `Workshop date: ${intent.appointmentDateISO}`,
          "PMI and brake test required before vehicle release"
        ], timestamp)]
      }, bookingId);
      writes.push({
        collection: "maintenanceBookings",
        documentId: bookingId,
        patch: booking,
        exists: false
      });
    }
    updatedVehicle.pendingReturnInspection = {
      ...updatedVehicle.pendingReturnInspection,
      bookingId
    };
    bookingSummary = bookingSummaryPatch({
      id: bookingId,
      type: "INSPECTION",
      maintenanceTypeIds: intent.maintenanceTypeIds
    }, [intent.appointmentDateISO], "booked");
  }
  const patch = {
    ...vehicleVorPatch(updatedVehicle),
    ...bookingSummary,
    updatedAt: timestamp
  };
  writes.push({
    collection: "vehicles",
    documentId: vehicleId,
    patch,
    updateTime: snapshot.updateTime
  });
  await commitMaintenanceWrites(writes, companyId);
  return { vehicle: { ...currentVehicle, ...patch }, bookingId: bookingId || null };
};
var HISTORIC_VOR_PATCH_FIELDS = [
  "vorHistory",
  "vorHistoryLastMutatedAt",
  "vorHistoryLastMutatedBy"
];
var addHistoricVorMutation = async ({ payload, actor, companyId }) => {
  const vehicleId = text10(payload.vehicleId);
  const vehicleSnapshot = await maintenanceIO().adminReadDocumentWithMetadata("vehicles", vehicleId);
  const storedVehicle = vehicleSnapshot?.data;
  if (!storedVehicle) throw new Error("Vehicle not found.");
  assertTenant(storedVehicle, companyId);
  const timestamp = nowISO();
  const periodId = text10(payload.periodId) || `vor-history-${crypto2.randomUUID()}`;
  const currentVehicle = { id: vehicleId, ...storedVehicle };
  const updatedVehicle = addHistoricVorPeriod(currentVehicle, {
    ...payload,
    id: periodId,
    migratedBy: actor
  }, { mutatedAt: timestamp, mutatedBy: actor });
  const period = safeArray3(updatedVehicle.vorHistory).find((entry) => text10(entry.id) === periodId);
  const bookingIntent = historicVorFirstUseBookingIntent(currentVehicle, period);
  const writes = [];
  let bookingId = "";
  if (bookingIntent) {
    const all = await maintenanceIO().adminListDocuments("maintenanceBookings");
    const matching = all.map((entry) => ({ id: entry.id, ...entry.data })).find((booking) => {
      if (text10(booking.vehicleId) !== vehicleId) return false;
      if (["cancelled", "declined", "archived", "deleted", "closed", "superseded"].includes(normalizeMaintenanceRecordStatus(booking.status))) return false;
      const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
      const types = new Set(canonical.items.map((item) => item.maintenanceTypeId));
      return canonical.schedule.bookingDates.includes(bookingIntent.appointmentDateISO) && types.has("pmi") && types.has("brake_test");
    });
    bookingId = text10(matching?.id) || maintenanceRequirementDocumentId(bookingIntent.sourceDueKey);
    if (!matching) {
      const dueWeek = maintenanceIsoWeekLabel(bookingIntent.appointmentDateISO);
      const typeIds = bookingIntent.maintenanceTypeIds;
      const booking = withBickersReference({
        schemaVersion: 1,
        kind: "MAINTENANCE",
        companyId: companyId || text10(storedVehicle.companyId),
        vehicleId,
        vehicleLabel: bookingIntent.vehicleLabel,
        type: "INSPECTION",
        maintenanceTypeId: "combined",
        maintenanceTypeIds: typeIds,
        status: "Booked",
        items: canonicalItems({ typeIds, status: "booked", dueDate: bookingIntent.sourceDueDateISO, dueWeek }),
        ...scheduleFields([bookingIntent.appointmentDateISO], ""),
        sourceDueDateISO: bookingIntent.sourceDueDateISO,
        sourceDueIsoWeek: dueWeek,
        sourceDueKey: bookingIntent.sourceDueKey,
        requirementKey: bookingIntent.sourceDueKey,
        origin: bookingIntent.origin,
        sourceVorPeriodId: periodId,
        notes: bookingIntent.notes,
        createdAt: timestamp,
        createdBy: actor.email,
        createdByUid: actor.uid,
        lastEditedBy: actor.email,
        lastEditedByUid: actor.uid,
        updatedAt: timestamp,
        history: [historyEntry("First-use inspection booked from historic VOR", actor, [
          `Workshop date: ${bookingIntent.appointmentDateISO}`,
          `Historic VOR period: ${periodId}`
        ], timestamp)]
      }, bookingId);
      writes.push({ collection: "maintenanceBookings", documentId: bookingId, patch: booking, exists: false });
    }
    period.linkedFirstUseInspectionBookingId = bookingId;
  }
  const vehiclePatch = Object.fromEntries(HISTORIC_VOR_PATCH_FIELDS.map((field) => [field, updatedVehicle[field]]));
  if (bookingIntent) {
    Object.assign(vehiclePatch, bookingSummaryPatch({ id: bookingId, type: "INSPECTION", maintenanceTypeIds: ["pmi", "brake_test"] }, [bookingIntent.appointmentDateISO], "booked"));
  }
  vehiclePatch.updatedAt = timestamp;
  writes.push({ collection: "vehicles", documentId: vehicleId, patch: vehiclePatch, updateTime: vehicleSnapshot.updateTime });
  await commitMaintenanceWrites(writes, companyId);
  return { vehicle: { ...currentVehicle, ...vehiclePatch }, periodId, bookingId: bookingId || null };
};
var linkHistoricVorInspectionMutation = async ({ payload, actor, companyId }) => {
  assertHistoricVorAdmin(actor);
  const vehicleId = text10(payload.vehicleId);
  const periodId = text10(payload.periodId);
  const vehicleSnapshot = await maintenanceIO().adminReadDocumentWithMetadata("vehicles", vehicleId);
  const storedVehicle = vehicleSnapshot?.data;
  if (!storedVehicle) throw new Error("Vehicle not found.");
  assertTenant(storedVehicle, companyId);
  const history = safeArray3(storedVehicle.vorHistory);
  const period = history.find((entry) => text10(entry.id) === periodId);
  if (!period) throw new Error("Historic VOR/SORN period not found.");
  if (text10(period.status).toLowerCase() !== "closed") throw new Error("Only closed historic periods may be linked to an inspection.");
  if (normalizeMaintenanceRecordStatus(period.status) === "archived") throw new Error("Archived VOR/SORN periods cannot create bookings.");
  const intent = historicVorFirstUseBookingIntent({ id: vehicleId, ...storedVehicle }, period);
  if (!intent) throw new Error("Enter a first-use inspection date before creating the booking.");
  const all = await maintenanceIO().adminListDocuments("maintenanceBookings");
  const matching = all.map((entry) => ({ id: entry.id, ...entry.data })).find((booking) => {
    if (text10(booking.vehicleId) !== vehicleId) return false;
    if (["cancelled", "declined", "archived", "deleted", "closed", "superseded"].includes(normalizeMaintenanceRecordStatus(booking.status))) return false;
    const canonical = normalizeMaintenanceRecord(booking, { id: booking.id });
    const types = new Set(canonical.items.map((item) => item.maintenanceTypeId));
    return canonical.schedule.bookingDates.includes(intent.appointmentDateISO) && types.has("pmi") && types.has("brake_test");
  });
  const bookingId = text10(matching?.id) || maintenanceRequirementDocumentId(intent.sourceDueKey);
  const timestamp = nowISO();
  const writes = [];
  if (!matching) {
    const dueWeek = maintenanceIsoWeekLabel(intent.appointmentDateISO);
    const typeIds = intent.maintenanceTypeIds;
    writes.push({
      collection: "maintenanceBookings",
      documentId: bookingId,
      exists: false,
      patch: withBickersReference({
        schemaVersion: 1,
        kind: "MAINTENANCE",
        companyId: companyId || text10(storedVehicle.companyId),
        vehicleId,
        vehicleLabel: intent.vehicleLabel,
        type: "INSPECTION",
        maintenanceTypeId: "combined",
        maintenanceTypeIds: typeIds,
        status: "Booked",
        items: canonicalItems({ typeIds, status: "booked", dueDate: intent.sourceDueDateISO, dueWeek }),
        ...scheduleFields([intent.appointmentDateISO], ""),
        sourceDueDateISO: intent.sourceDueDateISO,
        sourceDueIsoWeek: dueWeek,
        sourceDueKey: intent.sourceDueKey,
        requirementKey: intent.sourceDueKey,
        origin: intent.origin,
        sourceVorPeriodId: periodId,
        notes: intent.notes,
        createdAt: timestamp,
        createdBy: actor.email,
        createdByUid: actor.uid,
        lastEditedBy: actor.email,
        lastEditedByUid: actor.uid,
        updatedAt: timestamp,
        history: [historyEntry("First-use inspection linked to historic VOR", actor, [
          `Workshop date: ${intent.appointmentDateISO}`,
          `Historic VOR period: ${periodId}`
        ], timestamp)]
      }, bookingId)
    });
  }
  const linkedHistory = history.map((entry) => text10(entry.id) === periodId ? { ...entry, linkedFirstUseInspectionBookingId: bookingId, firstUseInspectionLinkedAt: timestamp, firstUseInspectionLinkedBy: actor } : entry);
  writes.push({
    collection: "vehicles",
    documentId: vehicleId,
    updateTime: vehicleSnapshot.updateTime,
    patch: {
      vorHistory: linkedHistory,
      vorHistoryLastMutatedAt: timestamp,
      vorHistoryLastMutatedBy: actor,
      ...bookingSummaryPatch({ id: bookingId, type: "INSPECTION", maintenanceTypeIds: ["pmi", "brake_test"] }, [intent.appointmentDateISO], "booked"),
      updatedAt: timestamp
    }
  });
  await commitMaintenanceWrites(writes, companyId);
  return { periodId, bookingId, idempotent: Boolean(matching) };
};
var forecastMutation = async ({ payload, actor, companyId }) => {
  const explicitId = payload.vehicleId;
  const legacyId = payload.vehicle?.id;
  if (explicitId != null && legacyId != null && explicitId !== legacyId) throw new Error("Conflicting vehicle identities require review.");
  const vehicleId = assertCanonicalId(explicitId ?? legacyId);
  const vehicleSnapshot = await maintenanceIO().adminReadDocumentWithMetadata("vehicles", vehicleId);
  if (!vehicleSnapshot) {
    const error = new Error("Vehicle not found.");
    error.status = 404;
    throw error;
  }
  const vehicle = { ...vehicleSnapshot.data, id: vehicleId };
  assertTenant(vehicle, companyId);
  assertNativeVersion(vehicleSnapshot);
  const year = Number(payload.year);
  const all = await maintenanceIO().adminListDocuments("maintenanceBookings");
  const existing = all.filter((entry) => entry.data?.companyId === companyId && entry.data?.vehicleId === vehicleId).map((entry) => ({ ...entry.data, id: assertCanonicalId(entry.id), __updateTime: entry.updateTime }));
  const forecast = buildAnnualMaintenanceForecast({ vehicle, year, companyId, includedTypeIds: payload.includedTypeIds });
  const reconciliation = reconcileAnnualMaintenanceForecast({
    forecast,
    existingBookings: existing,
    vehicleId: vehicle.id,
    year,
    todayISO: maintenanceDateOnly(/* @__PURE__ */ new Date()),
    includedTypeIds: payload.includedTypeIds,
    restoreVorCancelledAppointments: payload.restoreVorCancelledAppointments === true
  });
  const timestamp = nowISO();
  const writes = [];
  const createdIds = [];
  for (const record of reconciliation.create) {
    const id = record.id || maintenanceRequirementDocumentId(record.requirementKey);
    if (!id || await maintenanceIO().adminReadDocument("maintenanceBookings", id)) continue;
    const persisted = withBickersReference({ ...buildAnnualMaintenancePersistencePayload(record, { createdBy: actor.email, nowISO: timestamp }), createdAt: timestamp, updatedAt: timestamp }, id);
    writes.push({ collection: "maintenanceBookings", documentId: id, patch: persisted, exists: false });
    createdIds.push(id);
  }
  const reactivatedIds = [];
  for (const entry of reconciliation.reactivate) {
    const id = text10(entry.source?.id);
    const appointmentDates = bookingDates2(entry.source);
    if (!id || !appointmentDates.length) continue;
    const typeIds = safeArray3(entry.forecast?.items).map((item) => item.maintenanceTypeId);
    writes.push({
      collection: "maintenanceBookings",
      documentId: id,
      updateTime: entry.source.__updateTime,
      patch: {
        status: "Booked",
        items: safeArray3(entry.forecast.items).map((item) => ({ ...item, status: "booked" })),
        maintenanceTypeId: typeIds[0] || "work",
        maintenanceTypeIds: typeIds,
        requirementKey: entry.forecast.requirementKey,
        sourceDueKey: entry.forecast.requirementKey,
        sourceDueDateISO: entry.forecast.sourceDueDateISO,
        sourceDueIsoWeek: entry.forecast.sourceDueIsoWeek,
        origin: entry.forecast.origin,
        forecastYear: entry.forecast.forecastYear,
        reactivatedAfterVorAtISO: timestamp,
        lastEditedBy: actor.email,
        lastEditedByUid: actor.uid,
        updatedAt: timestamp,
        history: [
          ...safeArray3(entry.source.history),
          historyEntry("Reactivated after VOR", actor, [
            `Appointment restored for ${appointmentDates.join(", ")}.`
          ], timestamp)
        ]
      }
    });
    reactivatedIds.push(id);
  }
  const restoredIds = [];
  for (const entry of reconciliation.restore) {
    const id = text10(entry.record?.id);
    const appointmentDate = maintenanceDateOnly(entry.appointmentDateISO);
    if (!id || !appointmentDate || await maintenanceIO().adminReadDocument("maintenanceBookings", id)) continue;
    const base = buildAnnualMaintenancePersistencePayload(entry.record, {
      createdBy: actor.email,
      nowISO: timestamp
    });
    writes.push({
      collection: "maintenanceBookings",
      documentId: id,
      exists: false,
      patch: withBickersReference({
        ...base,
        ...scheduleFields([appointmentDate], ""),
        status: "Booked",
        items: safeArray3(base.items).map((item) => ({ ...item, status: "booked" })),
        restoredAfterVor: true,
        replacesVorCancelledBookingId: text10(entry.replaces?.id),
        createdAt: timestamp,
        updatedAt: timestamp,
        history: [historyEntry("Replacement appointment created after VOR", actor, [
          `Appointment created for ${appointmentDate}.`,
          entry.replaces?.id ? `Replaces cancelled appointment: ${entry.replaces.id}` : ""
        ], timestamp)]
      }, id)
    });
    restoredIds.push(id);
  }
  reconciliation.supersede.forEach((record) => writes.push({ collection: "maintenanceBookings", documentId: record.id, patch: { status: "Archived", archiveReason: "Schedule changed; replaced by canonical forecast.", archivedAtISO: timestamp, updatedAt: timestamp, history: [...safeArray3(record.history), historyEntry("Superseded by schedule", actor, ["Automatic appointment replaced."], timestamp)] }, updateTime: record.__updateTime }));
  if (writes.length) {
    for (const write of writes) if (write.exists !== false) assertNativeVersion({ updateTime: write.updateTime });
    writes.push({ collection: "vehicles", documentId: vehicleId, patch: { updatedAt: timestamp }, updateTime: vehicleSnapshot.updateTime });
    await commitMaintenanceWrites(writes, companyId);
  }
  return {
    createdIds,
    supersededIds: reconciliation.supersede.map((record) => record.id),
    preservedIds: reconciliation.preserve.map((record) => record.id).filter(Boolean),
    duplicateIds: reconciliation.duplicate.map((record) => record.id).filter(Boolean),
    blockedIds: reconciliation.blocked.map((record) => record.id).filter(Boolean),
    reactivatedIds,
    restoredIds
  };
};
var createControlledVehicleMutation = async ({ payload, actor, companyId }) => {
  const timestamp = nowISO();
  const profile = sanitizeInitialVehicleLegalEvidence(payload.profile || {});
  for (const field of [...VEHICLE_VOR_PROTECTED_FIELDS, "pendingReturnInspection"]) delete profile[field];
  delete profile.id;
  if (!["VOR", "Archive"].includes(payload.status)) throw new Error("Unsupported initial vehicle state.");
  const vehicle = applyVehicleVorMutation({ ...profile, companyId, ...syncVehicleOperatingStatus({}, "Active"), createdAt: timestamp, updatedAt: timestamp }, payload.status === "Archive" ? "archive" : "start", payload.declaration || {}, actor, timestamp);
  const id = crypto2.randomUUID();
  await commitMaintenanceWrites([{ collection: "vehicles", documentId: id, patch: vehicle, exists: false }], companyId);
  return { id, vehicle: { ...vehicle, id } };
};
var mutateMaintenanceBooking = async ({ operation, payload = {}, actor, companyId }) => {
  if (typeof companyId !== "string" || !companyId || companyId !== companyId.trim()) {
    const error = new Error("An assigned maintenance company is required.");
    error.status = 403;
    throw error;
  }
  if (payload.bookingId !== void 0) assertCanonicalId(payload.bookingId);
  if (payload.vehicleId != null && payload.vehicleId !== "") assertCanonicalId(payload.vehicleId);
  if (operation === "create_vehicle_state") return createControlledVehicleMutation({ payload, actor, companyId });
  if (operation === "sync_workshop") return syncWorkshopMutation({ actor, companyId });
  if (operation === "create") return createMutation({ payload, actor, companyId });
  if (operation === "edit") return editMutation({ payload, actor, companyId });
  if (operation === "reschedule") return rescheduleMutation({ payload, actor, companyId });
  if (operation === "complete") return completeMutation({ payload, actor, companyId, selectedOnly: false });
  if (operation === "complete_items") return completeMutation({ payload, actor, companyId, selectedOnly: true });
  if (operation === "cancel") return terminalMutation({ payload, actor, companyId, archive: false });
  if (operation === "archive") return terminalMutation({ payload, actor, companyId, archive: true });
  if (operation === "create_work") return createWorkMutation({ payload, actor, companyId });
  if (operation === "update_work") return updateWorkMutation({ payload, actor, companyId });
  if (operation === "update_documents") return updateDocumentsMutation({ payload, actor, companyId });
  if (operation === "vehicle_vor") return vehicleVorMutation({ payload, actor, companyId });
  if (operation === "vor_transition") throw new Error("The legacy transition endpoint is retired. Use the vehicle VOR workflow.");
  if (operation === "add_historic_vor") return addHistoricVorMutation({ payload, actor, companyId });
  if (operation === "link_historic_vor_inspection") return linkHistoricVorInspectionMutation({ payload, actor, companyId });
  if (operation === "sync_forecast") return forecastMutation({ payload, actor, companyId });
  throw new Error("Unsupported maintenance mutation operation.");
};

// src/app/utils/serviceRecordCompat.js
function toDateLike(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d2 = new Date(value.seconds * 1e3);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, y, m, d2] = match;
      const date = new Date(Number(y), Number(m) - 1, Number(d2));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const ukMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (ukMatch) {
      const [, d2, m, y, hh = "0", mm = "0"] = ukMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d2), Number(hh), Number(mm));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function dateOnlyString(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = toDateLike(value);
  if (!parsed) return "";
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// src/app/utils/serviceCompletionSchedule.js
function planServiceCompletionSchedule({ vehicle, vehicleId, companyId, completedDate, nextDueDate = "", sourceRecordId, bookings = [], at }) {
  if (!companyId || vehicle?.companyId !== companyId || !sourceRecordId) throw Error("Service schedule ownership/evidence required");
  const completed = dateOnlyString(completedDate), explicit = dateOnlyString(nextDueDate);
  if (typeof completedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(completedDate) || nextDueDate && (typeof nextDueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate))) throw Error("Expected canonical service dates");
  const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(completed) || nextDueDate && (!valid(explicit) || explicit <= completed)) throw Error("Invalid completed/next service date");
  const latest = [vehicle.lastService, vehicle.lastServiceDate, ...(vehicle.serviceHistory || []).filter(isCoreServiceHistory).map((h) => h.completedDate)].map(dateOnlyString).filter(Boolean).sort().at(-1);
  if (latest && latest > completed) return { vehiclePatch: {}, writes: [], supersededByNewerService: true };
  const next = explicit || calculateNextMaintenanceDue({ maintenanceTypeId: "service", completedDate: completed, frequencyWeeks: getConfiguredMaintenanceFrequencyWeeks(vehicle, "service") });
  const priorDates = new Set([vehicle.nextService, vehicle.nextServiceDate, vehicle.serviceDueDate].map(dateOnlyString).filter(Boolean));
  const audit = { sourceRecordId, completedDate: completed, nextDueDate: next, recordedAt: at };
  const vehiclePatch = { lastService: completed, lastServiceDate: completed, nextService: next, nextServiceDate: next, serviceDueDate: next, serviceISOWeek: next ? maintenanceIsoWeekLabel(next) : "", serviceScheduleNeedsReview: !next, updatedAt: at };
  const writes = [];
  for (const row of bookings) {
    const b = row.data || row, id = row.id;
    if (b.companyId !== companyId || b.vehicleId !== vehicleId) throw Error("Foreign service requirement");
    const c = normalizeMaintenanceRecord(b, { id });
    if (c.items.length !== 1 || c.items[0].maintenanceTypeId !== "service" || !["requested", "booked", "in_progress", "deferred"].includes(c.status)) continue;
    if (!["vehicle_maintenance_schedule", "automatic_schedule", "completion_recurrence", "service_record_reconciliation"].includes(b.origin?.source) || b.provider || b.workshop || b.scheduleManuallyAdjusted || b.workshopCompletion) continue;
    const due = c.items[0].legalDueDateISO;
    const safeHistory = (b.history || []).every((h) => ["Booked", "Due item created", "Recurring due item created"].includes(h.action));
    if (!safeHistory || c.schedule.bookingDates.some((date) => date > completed)) continue;
    const fulfilled = due && (due <= completed || latest && latest < completed && next && due < next && priorDates.has(due));
    if (!fulfilled) continue;
    const done = completeCanonicalMaintenanceItems(c, ["service"], completed);
    writes.push({ collection: "maintenanceBookings", documentId: id, patch: { status: "Completed", completedAtISO: completed, items: done.items.map((i) => ({ ...i, nextDueDateISO: next })), completionServiceRecordId: sourceRecordId, serviceScheduleCompletion: audit, updatedAt: at, history: [...b.history || [], { action: "Fulfilled by signed service form", timestamp: at, sourceRecordId, changes: [`Service completed ${completed}; next due ${next || "requires scheduling"}.`] }] } });
  }
  if (next) {
    const existing = bookings.find((row) => {
      const b = row.data || row, c = normalizeMaintenanceRecord(b, { id: row.id });
      return ["requested", "booked", "in_progress", "deferred"].includes(c.status) && c.items.some((i) => i.maintenanceTypeId === "service" && i.legalDueDateISO === next) && !writes.some((w) => w.documentId === row.id);
    });
    if (!existing) {
      const successor = buildRequestedMaintenanceRecord({ companyId, vehicleId, vehicleLabel: vehicle.name || vehicle.vehicleName || "", items: [{ maintenanceTypeId: "service", legalDueDateISO: next }], source: "service_record_reconciliation", sourceId: sourceRecordId });
      const id = maintenanceRequirementDocumentId(successor.requirementKey);
      const collision = bookings.find((b) => b.id === id);
      if (collision) throw Error("Service successor identity already exists; review required");
      writes.push({ collection: "maintenanceBookings", documentId: id, exists: false, patch: { ...successor, createdAt: at, updatedAt: at } });
    }
  }
  return { vehiclePatch, writes, supersededByNewerService: false };
}

// src/app/api/maintenance/bookings/workshopCompletion.js
var fail = (message) => Object.assign(new Error(message), { status: 409 });
async function planWorkshopMaintenanceCompletion({
  db,
  tx,
  request,
  requestId,
  record,
  recordId,
  formCollection,
  uid,
  user,
  now,
  vehiclePatch = null
}) {
  if (!request?.sourceMaintenanceBookingId) return [];
  const companyId = String(user.companyId || "").trim();
  const bookingId = request.sourceMaintenanceBookingId;
  if (request.source !== "maintenance_booking" || request.companyId !== companyId || requestId !== maintenanceWorkshopRequestId(bookingId)) throw fail("Invalid maintenance workshop link.");
  const reads = /* @__PURE__ */ new Map();
  const planned = [];
  const read = async (collection, id) => {
    const key = `${collection}/${id}`;
    if (!reads.has(key)) {
      const snapshot3 = await tx.get(db.collection(collection).doc(id));
      const data = snapshot3.exists ? snapshot3.data() : null;
      reads.set(key, data ? { data, updateTime: snapshot3.updateTime?.toDate?.().toISOString() || "transaction" } : null);
    }
    const snapshot2 = reads.get(key);
    if (!snapshot2) return null;
    return { ...snapshot2, data: {
      ...snapshot2.data,
      ...collection === "vehicles" && id === record.vehicleId ? vehiclePatch : {}
    } };
  };
  const commit = async (writes, { readChecks = [], queryChecks = [] } = {}) => {
    if (queryChecks.length) throw fail("Unsupported maintenance completion dependency query.");
    for (const write of [...readChecks, ...writes]) {
      const previous = await read(write.collection, write.documentId);
      if (write.exists === false && previous || write.exists === true && !previous || write.updateTime && previous?.updateTime !== write.updateTime) throw fail("Maintenance changed during workshop completion.");
    }
    planned.push(...writes);
  };
  const transport = {
    adminReadDocumentWithMetadata: read,
    adminReadDocument: async (collection, id) => (await read(collection, id))?.data || null,
    adminListDocuments: async (collection) => {
      const snapshot2 = await tx.get(db.collection(collection).where("companyId", "==", companyId));
      return snapshot2.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
    },
    adminCommitDocumentPatches: commit,
    adminCommitDocumentPatchesWithSequence: async ({ writes, applySequence, counterCollection, counterDocumentId, allocationCount, readChecks, queryChecks }) => {
      const counter = await read(counterCollection, counterDocumentId);
      const first = Math.max(0, Number(counter?.data.lastNumber) || 0) + 1;
      await commit([...applySequence(writes, first), {
        collection: counterCollection,
        documentId: counterDocumentId,
        patch: { lastNumber: first + allocationCount - 1, updatedAt: now },
        ...counter ? { updateTime: counter.updateTime } : { exists: false }
      }], { readChecks, queryChecks });
    }
  };
  const snapshot = await read("maintenanceBookings", bookingId);
  const booking = snapshot?.data;
  if (!booking || booking.companyId !== companyId || request.status !== "open" || String(booking.vehicleId || "") !== String(record.vehicleId || "")) throw fail("Maintenance booking is unavailable for this form.");
  const projection = projectMaintenanceWorkshopRequest(booking, bookingId, request);
  if (!projection || projection.status !== "open" || projection.workType !== request.workType || request.sourceBookingUpdatedAt !== String(booking.updatedAt || "").trim() || String(record.workshopBookingVersion ?? "") !== request.sourceBookingUpdatedAt) throw fail("Maintenance booking changed. Refresh the workshop task.");
  const canonical = normalizeMaintenanceRecord(booking, { id: bookingId });
  const types = canonical.items.filter((item) => item.status !== "completed").map((item) => item.maintenanceTypeId);
  const completion = {
    status: "completed",
    formCollection,
    formRecordId: recordId,
    completedBy: record.signedBy || user.displayName || uid,
    completedByUid: uid,
    completedAt: now,
    completedDateISO: record.serviceDateOnly
  };
  const regulated = types.some((type) => !["service", "work", "repair", "other"].includes(type));
  const needsEvidence = regulated || maintenanceCompletionEvidenceIssues(canonical, types).length > 0;
  if (needsEvidence) {
    planned.push({
      collection: "maintenanceBookings",
      documentId: bookingId,
      updateTime: snapshot.updateTime,
      patch: {
        workshopCompletion: { ...completion, status: "awaiting_evidence" },
        updatedAt: now,
        history: [...booking.history || [], {
          action: "Workshop form completed; compliance evidence pending",
          user: user.email || uid,
          userUid: uid,
          timestamp: now,
          changes: [`${formCollection}/${recordId}`]
        }]
      }
    });
  } else {
    await withMaintenanceTransport(transport, () => mutateMaintenanceBooking({
      operation: "complete",
      companyId,
      actor: { uid, email: user.email || uid, role: user.role || "user" },
      payload: { bookingId, expectedUpdatedAt: booking.updatedAt ?? null, completedISO: record.serviceDateOnly, recordedServiceNextDueDate: record.nextServiceDate || "" }
    }));
    const sourceWrite = planned.find((write) => write.collection === "maintenanceBookings" && write.documentId === bookingId);
    sourceWrite.patch.workshopCompletion = completion;
  }
  return planned.filter((write) => !(write.collection === "workshopRequests" && write.documentId === requestId));
}
export {
  isCoreServiceType,
  planServiceCompletionSchedule,
  planWorkshopMaintenanceCompletion
};
