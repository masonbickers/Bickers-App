// ../../../../../private/tmp/bickers-local-release-20261029/candidate/src/app/utils/motPrepBooking.js
import crypto from "node:crypto";

// ../../../../../private/tmp/bickers-local-release-20261029/candidate/src/app/utils/maintenanceSchema.js
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

// ../../../../../private/tmp/bickers-local-release-20261029/candidate/src/app/utils/maintenanceRecord.js
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
  const aliases = {
    inspection: "pmi",
    eight_week_inspection: "pmi",
    eight_weekly_inspection: "pmi",
    brake: "brake_test",
    braketest: "brake_test",
    mot_test: "mot",
    annual_service: "service",
    repairs: "repair"
  };
  const normalized = aliases[raw] || raw;
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
var buildMaintenanceBickersReference = (record = {}) => {
  const stored = text(record.bickersReference);
  return /^\d{6,}$/.test(stored) ? stored : "";
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

// ../../../../../private/tmp/bickers-local-release-20261029/candidate/src/app/utils/motPrepSchedule.js
var text2 = (value) => String(value || "").trim();
var validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function motPrepScheduleError(prep, motDates = [], motTime = "") {
  const date = text2(prep?.date), time = text2(prep?.time);
  if (!validDate(date)) return "Choose a valid MOT prep date for Liam.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "Choose a valid MOT prep time for Liam.";
  const motDate = [...motDates].sort()[0];
  if (!motDate || date > motDate || date === motDate && motTime && time >= motTime) {
    return "MOT prep must be scheduled before the MOT appointment.";
  }
  return "";
}

// ../../../../../private/tmp/bickers-local-release-20261029/candidate/src/app/utils/motPrepBooking.js
var text3 = (value) => String(value || "").trim();
var hash = (value) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 40);
var motPrepBookingId = (motId) => `mot_prep_${hash(text3(motId))}`;
var slotId = (company, employee, date, time) => `mot_prep_${hash(JSON.stringify([company, employee, date, time]))}`;
var fail = (message) => Object.assign(new Error(message), { status: 409 });
var active = (status) => ["booked", "in_progress", "deferred"].includes(String(status || "").toLowerCase());
var employeeName = (row) => text3(row.name || row.fullName || [row.firstName, row.lastName].filter(Boolean).join(" "));
var disabled = (row) => row.active === false || row.isActive === false || row.isEnabled === false || row.disabled === true || row.archived === true || row.isArchived === true || ["disabled", "inactive", "archived", "terminated"].includes(text3(row.status).toLowerCase());
async function planMotPrepBookings(writes, { io, companyId }) {
  const additional = [], readChecks = [];
  for (const write of writes) {
    if (write.collection !== "maintenanceBookings" || write.deleteDocument) continue;
    const previous = write.exists === false ? null : await io.adminReadDocumentWithMetadata("maintenanceBookings", write.documentId);
    const booking = { ...previous?.data, ...write.patch };
    if (booking.motPrepForBookingId) {
      if (text3(booking.status).toLowerCase() === "completed" && booking.motPrepSlotId) {
        const reserved = await io.adminReadDocumentWithMetadata("maintenanceStaffSlots", booking.motPrepSlotId);
        if (reserved) {
          if (!reserved.updateTime || reserved.data.companyId !== companyId || reserved.data.prepBookingId !== write.documentId || reserved.data.sourceMotBookingId !== booking.motPrepForBookingId) throw fail("MOT prep slot ownership changed.");
          additional.push({
            collection: "maintenanceStaffSlots",
            documentId: booking.motPrepSlotId,
            patch: { status: "released", releasedAt: booking.updatedAt || (/* @__PURE__ */ new Date()).toISOString() },
            updateTime: reserved.updateTime
          });
        }
      }
      continue;
    }
    if (booking.motPrep === void 0 && !previous?.data?.motPrep) continue;
    if (!booking.motPrep || typeof booking.motPrep !== "object" || Array.isArray(booking.motPrep)) {
      throw fail("MOT prep cannot be removed. Choose its date and time, or cancel the linked MOT appointment.");
    }
    if (booking.companyId !== companyId) throw fail("MOT prep belongs to another company.");
    if (previous && !write.updateTime) write.updateTime = previous.updateTime;
    const id = motPrepBookingId(write.documentId);
    if (writes.some((other) => other !== write && other.collection === "maintenanceBookings" && other.documentId === id)) {
      throw fail("MOT prep is already being changed. Refresh before saving.");
    }
    const saved = await io.adminReadDocumentWithMetadata("maintenanceBookings", id);
    if (saved && !saved.updateTime) throw fail("MOT prep native version is unavailable. Refresh before saving.");
    if (saved && (saved.data.companyId !== companyId || saved.data.motPrepForBookingId !== write.documentId || saved.data.vehicleId !== booking.vehicleId || saved.data.type !== "WORK")) throw fail("MOT prep ownership changed.");
    const old = saved?.data;
    const isMot = text3(booking.type).toUpperCase() === "MOT";
    const isActive = isMot && active(booking.status);
    const timestamp = booking.updatedAt || (/* @__PURE__ */ new Date()).toISOString();
    const schedule = normalizeMaintenanceRecord(booking, { id: write.documentId }).schedule;
    if (isActive) {
      const scheduleError = motPrepScheduleError(booking.motPrep, schedule.bookingDates, text3(booking.appointmentTime));
      if (scheduleError) throw fail(scheduleError);
    }
    const releaseOldSlot = async (nextId = "") => {
      if (!old?.motPrepSlotId || old.motPrepSlotId === nextId || text3(old.status).toLowerCase() === "cancelled") return;
      const reserved = await io.adminReadDocumentWithMetadata("maintenanceStaffSlots", old.motPrepSlotId);
      if (!reserved?.updateTime || reserved.data.companyId !== companyId || reserved.data.prepBookingId !== id || reserved.data.sourceMotBookingId !== write.documentId) throw fail("Liam\u2019s previous prep slot needs review.");
      additional.push({
        collection: "maintenanceStaffSlots",
        documentId: old.motPrepSlotId,
        patch: { status: "released", releasedAt: timestamp },
        updateTime: reserved.updateTime
      });
    };
    if (text3(old?.status).toLowerCase() === "completed") {
      if (isActive && (text3(booking.motPrep.date) !== old.appointmentDateISO || text3(booking.motPrep.time) !== old.appointmentTime)) {
        throw fail("Completed MOT prep cannot be moved. Its signed history is retained.");
      }
      continue;
    }
    if (!isActive) {
      if (old && text3(old.status).toLowerCase() !== "cancelled") {
        await releaseOldSlot();
        additional.push({
          collection: "maintenanceBookings",
          documentId: id,
          updateTime: saved.updateTime,
          patch: {
            status: "Cancelled",
            items: (old.items || []).map((item) => ({ ...item, status: "cancelled" })),
            updatedAt: timestamp,
            cancelReason: "Linked MOT is no longer an active appointment.",
            history: [...old.history || [], {
              action: "Prep cancelled with MOT",
              timestamp,
              user: booking.lastEditedBy || "",
              changes: ["MOT prep was not recorded as completed."]
            }]
          }
        });
      }
      continue;
    }
    if (!booking.vehicleId) throw fail("MOT prep needs a vehicle.");
    const date = text3(booking.motPrep.date), time = text3(booking.motPrep.time);
    let employeeId = old?.assignedEmployeeId || "";
    if (!employeeId) {
      const matches = (await io.adminListDocuments("employees")).filter((row) => row.data?.companyId === companyId && employeeName(row.data).toLowerCase() === "liam hamilton");
      if (matches.length !== 1) throw fail("A single Liam Hamilton employee record is required for MOT prep.");
      employeeId = matches[0].id;
    }
    const employee = await io.adminReadDocumentWithMetadata("employees", employeeId);
    if (!employee || employee.data.companyId !== companyId || employeeName(employee.data).toLowerCase() !== "liam hamilton" || disabled(employee.data) || !employee.updateTime) throw fail("Liam Hamilton is unavailable for MOT prep assignment.");
    readChecks.push({ collection: "employees", documentId: employeeId, updateTime: employee.updateTime });
    const reservationId = slotId(companyId, employeeId, date, time);
    const reservation = await io.adminReadDocumentWithMetadata("maintenanceStaffSlots", reservationId);
    if (reservation && !reservation.updateTime) throw fail("Liam\u2019s prep slot native version is unavailable.");
    if (reservation && (reservation.data.companyId !== companyId || reservation.data.assignedEmployeeId !== employeeId || reservation.data.date !== date || reservation.data.time !== time || reservation.data.status !== "released" && (reservation.data.prepBookingId !== id || reservation.data.sourceMotBookingId !== write.documentId))) throw fail("Liam already has an MOT prep slot at this time.");
    await releaseOldSlot(reservationId);
    additional.push({
      collection: "maintenanceStaffSlots",
      documentId: reservationId,
      patch: { companyId, prepBookingId: id, sourceMotBookingId: write.documentId, assignedEmployeeId: employeeId, date, time, status: "reserved", releasedAt: "" },
      ...reservation ? { updateTime: reservation.updateTime } : { exists: false }
    });
    const name = employeeName(employee.data);
    const label = text3(booking.vehicleLabel) || "Vehicle";
    const prep = {
      ...old || {},
      companyId,
      kind: "MAINTENANCE",
      schemaVersion: 1,
      vehicleId: booking.vehicleId,
      vehicleLabel: label,
      type: "WORK",
      maintenanceTypeId: "work",
      maintenanceTypeIds: ["work"],
      status: "Booked",
      items: [{ maintenanceTypeId: "work", status: "booked", documents: [], evidenceStatus: "not_recorded" }],
      title: "MOT prep",
      provider: "BICKERS",
      notes: `MOT prep with ${name}. MOT appointment: ${schedule.bookingDates[0]}${booking.appointmentTime ? ` ${booking.appointmentTime}` : ""}.`,
      appointmentDate: date,
      appointmentDateISO: date,
      appointmentTime: time,
      bookingDates: [date],
      startDate: null,
      startDateISO: "",
      endDate: null,
      endDateISO: "",
      isMultiDay: false,
      motPrepForBookingId: write.documentId,
      motPrepSlotId: reservationId,
      assignedEmployeeId: employeeId,
      assignedToName: name,
      assignedUserId: text3(employee.data.userId),
      createdAt: old?.createdAt || timestamp,
      createdBy: old?.createdBy || booking.createdBy || booking.lastEditedBy || "",
      createdByUid: old?.createdByUid || booking.createdByUid || booking.lastEditedByUid || "",
      lastEditedBy: booking.lastEditedBy || "",
      lastEditedByUid: booking.lastEditedByUid || "",
      updatedAt: timestamp,
      history: [...old?.history || [], {
        action: old ? "MOT prep slot updated" : "MOT prep booked",
        timestamp,
        user: booking.lastEditedBy || "",
        changes: [`${date} ${time} \xB7 ${name}`]
      }]
    };
    write.patch.motPrep = { date, time, bookingId: id, assignedEmployeeId: employeeId, assignedToName: name };
    additional.push({
      collection: "maintenanceBookings",
      documentId: id,
      patch: prep,
      ...saved ? { updateTime: saved.updateTime } : { exists: false }
    });
  }
  return { writes: [...writes, ...additional], readChecks };
}

// ../../../../../private/tmp/bickers-local-release-20261029/candidate/src/app/utils/serviceWorkshopAssignment.js
var text4 = (value) => String(value || "").trim();
var nameOf = (row) => text4(row.name || row.fullName || [row.firstName, row.lastName].filter(Boolean).join(" "));
var disabled2 = (row) => row.active === false || row.isActive === false || row.isEnabled === false || row.disabled === true || row.archived === true || row.isArchived === true || ["disabled", "inactive", "archived", "terminated"].includes(text4(row.status).toLowerCase());
var fail2 = (message) => Object.assign(new Error(message), { status: 409 });
async function assignServiceWorkshopEmployee(writes, { io, companyId }) {
  const readChecks = [];
  for (const write of writes) {
    if (write.collection !== "maintenanceBookings" || write.deleteDocument) continue;
    const previous = write.exists === false ? null : await io.adminReadDocumentWithMetadata("maintenanceBookings", write.documentId);
    const booking = { ...previous?.data, ...write.patch };
    if (!Object.prototype.hasOwnProperty.call(booking, "serviceAssignee")) continue;
    if (booking.companyId !== companyId) throw fail2("Service assignment belongs to another company.");
    if (previous && !write.updateTime) write.updateTime = previous.updateTime;
    if (text4(booking.type).toUpperCase() !== "SERVICE" || booking.serviceAssignee === "") {
      Object.assign(write.patch, { serviceAssignee: "", assignedEmployeeId: "", assignedToName: "", assignedUserId: "" });
      continue;
    }
    if (booking.serviceAssignee !== "liam") throw fail2("Choose a valid service assignment.");
    if (!["booked", "in_progress", "deferred"].includes(text4(booking.status).toLowerCase())) continue;
    let employeeId = previous?.data?.serviceAssignee === "liam" ? text4(previous.data.assignedEmployeeId) : "";
    if (!employeeId) {
      const matches = (await io.adminListDocuments("employees")).filter((row) => row.data?.companyId === companyId && nameOf(row.data).toLowerCase() === "liam hamilton");
      if (matches.length !== 1) throw fail2("A single Liam Hamilton employee record is required for service assignment.");
      employeeId = matches[0].id;
    }
    const employee = await io.adminReadDocumentWithMetadata("employees", employeeId);
    if (!employee?.updateTime || employee.data.companyId !== companyId || disabled2(employee.data) || nameOf(employee.data).toLowerCase() !== "liam hamilton") throw fail2("Liam Hamilton is unavailable for service assignment.");
    readChecks.push({ collection: "employees", documentId: employeeId, updateTime: employee.updateTime });
    Object.assign(write.patch, {
      serviceAssignee: "liam",
      assignedEmployeeId: employeeId,
      assignedToName: nameOf(employee.data),
      assignedUserId: text4(employee.data.userId)
    });
  }
  return readChecks;
}
export {
  assignServiceWorkshopEmployee,
  planMotPrepBookings
};
