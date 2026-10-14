import { getCardSurfaceStyle } from "../../../lib/design/cardSurface";
import { useVehiclePrepResource } from "../../../hooks/useVehiclePrepResource";
import { routeColors } from "../../../lib/design/routePresentation/main-tabs-job-js.js";
import { styles } from "../../../lib/design/screenStyles/main-tabs-job-js.js";
// app/screens/job-day.js
import {
  useRouter } from "expo-router";
import { useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import {
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import PageHeaderCard from "../../../components/PageHeaderCard";
import { EmptyState, LoadingState } from "../../../components/AsyncState";
import PageShell from "../../../components/layout/PageShell";
import { SectionCard, AppButton, IconButton,
  AppText as Text,
  AppPressable as TouchableOpacity,
} from "../../../components/ui/AppPrimitives";
import {
  useBookings,
  useCompanyCollection,
  useHolidays,
  useVehicles,
} from "../../../hooks/useOperationalData";
import { isCrewedBooking } from "../../../lib/bookingVisibility";
import {
  collapseLinkedJobsForDay,
  displayJobNumber,
} from "../../../lib/linkedBookingDays";
import { designTokens as t } from "../../../lib/design/tokens";
import {
  findVehicleRecord as resolveVehicleRecord,
  getBookingVehicleReferences,
  getVehicleDisplayList as resolveVehicleDisplayList,
  getVehicleDisplayName,
  getVehicleRegistration,
  hasAssignedVehicle,
} from "../../../lib/fleetSchema";
import { useAuth } from "../../../providers/AuthProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { withAlpha } from "../../../lib/design/color";
import { findVehiclePrepRecord } from "../../../lib/vehiclePrep";
import { hasOpenDangerousVehicleDefect, hasSubmittedJobVehicleCheck } from "../../../lib/dailyVehicleCheck";

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const CALL_BADGE_BG = routeColors.hex_ffd60a_5c6r45; // keeps that punchy yellow for call time
const RECCE_BG = routeColors.hex_ff453a_5bsa1h; // recce button accent

/* ───────────────────────────────
   BANK HOLIDAYS (UK via GOV.UK)
   - Source: https://www.gov.uk/bank-holidays.json
   - Region options: "england-and-wales" | "scotland" | "northern-ireland"
──────────────────────────────── */
const BANK_HOLIDAY_REGION = "england-and-wales";

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

const safeStr = (v) => String(v ?? "").trim().toLowerCase();

const canonicalEmployeeCode = (value) => {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits) return digits.padStart(4, "0");
  return safeStr(raw);
};

const codesEqual = (a, b) => {
  const aa = canonicalEmployeeCode(a);
  const bb = canonicalEmployeeCode(b);
  return !!aa && !!bb && aa === bb;
};

const resolveEmployeeByCode = (allEmployees, codeValue) => {
  const code = canonicalEmployeeCode(codeValue);
  if (!code) return null;
  return (allEmployees || []).find((x) => codesEqual(x?.userCode, code)) || null;
};

const toDateSafe = (val) => {
  if (!val) return null;
  if (typeof val === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
    if (m) {
      const [, y, mo, d] = m;
      return new Date(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0);
    }
  }
  if (val?.toDate && typeof val.toDate === "function") return val.toDate();
  const d = new Date(val);
  return isNaN(d) ? null : d;
};

const toISODate = (d) => {
  const date = d instanceof Date ? d : toDateSafe(d);
  if (!date) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const isWeekend = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const dow = d.getDay();
  return dow === 0 || dow === 6;
};

async function fetchUKBankHolidays(region = BANK_HOLIDAY_REGION) {
  try {
    const res = await fetch("https://www.gov.uk/bank-holidays.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const events = json?.[region]?.events || [];
    const map = {}; // dateISO -> title
    for (const ev of events) {
      if (!ev?.date) continue;
      map[String(ev.date)] = String(ev.title || "Bank holiday");
    }
    return map;
  } catch (e) {
    console.warn("[bank-holidays] failed to fetch:", e?.message || e);
    return {};
  }
}

/** Normalise call time across schemas */
const getCallTime = (job, dateISO) => {
  const byDate =
    job?.callTimes?.[dateISO] ||
    job?.callTimeByDate?.[dateISO] ||
    job?.call_times?.[dateISO];

  const single = job?.callTime || job?.calltime || job?.call_time;

  const fromNotes =
    job?.notesByDate?.[`${dateISO}-callTime`] ||
    job?.notesByDate?.[dateISO]?.callTime;

  return byDate || single || fromNotes || null;
};

/** Day-specific note (notesByDate) – handles "Other" pattern */
const getDayNote = (job, dateISO) => {
  const nb = job?.notesByDate || {};
  const raw = nb[dateISO];

  if (!raw) return null;

  if (raw === "Other") {
    return nb[`${dateISO}-other`] || null;
  }

  if (typeof raw === "string" && raw.trim()) return raw.trim();

  return null;
};

/** General job note */
const getJobNote = (job) => {
  if (typeof job?.notes === "string" && job.notes.trim()) {
    return job.notes.trim();
  }
  return null;
};

const isRecceDay = (job, dateISO) => {
  const note = getDayNote(job, dateISO);
  return /\b(recce\s*day)\b/i.test(note || "");
};

/** Resolve employees for a specific date using employeesByDate / legacy employees */
function getEmployeesForDate(job, isoDate, allEmployees) {
  const byDate = job.employeesByDate || job.employeeAssignmentsByDate || null;
  const byCodeDate = job.employeeCodesByDate || job.assignedEmployeeCodesByDate || null;

  const baseList = byDate?.[isoDate]
    ? byDate[isoDate]
    : Array.isArray(job.employees)
    ? job.employees
    : [];
  const codeList = byCodeDate?.[isoDate]
    ? byCodeDate[isoDate]
    : Array.isArray(job.employeeCodes)
    ? job.employeeCodes
    : [];

  const list = [
    ...(Array.isArray(baseList) ? baseList : []),
    ...(Array.isArray(codeList) ? codeList.map((code) => ({ userCode: code })) : []),
  ];

  const mapped = list.map((e) => {
    if (typeof e === "string") {
      const value = String(e || "").trim();
      const matchByName = allEmployees.find((x) => safeStr(x.name) === safeStr(value));
      if (matchByName) {
        return {
          code: canonicalEmployeeCode(matchByName.userCode),
          name: safeStr(matchByName.name || matchByName.displayName || value),
          displayName: matchByName.name || matchByName.displayName || value,
        };
      }

      const matchByCode = resolveEmployeeByCode(allEmployees, value);
      if (matchByCode) {
        return {
          code: canonicalEmployeeCode(matchByCode.userCode),
          name: safeStr(matchByCode.name || matchByCode.displayName || value),
          displayName: matchByCode.name || matchByCode.displayName || `Code ${value}`,
        };
      }

      return {
        code: canonicalEmployeeCode(value),
        name: safeStr(value),
        displayName: value,
      };
    }

    const name =
      e.name ||
      e.displayName ||
      [e.firstName, e.lastName].filter(Boolean).join(" ");

    const rawCode =
      e.userCode ||
      e.employeeCode ||
      e.code ||
      resolveEmployeeByCode(allEmployees, e.userCode || e.employeeCode || e.code)?.userCode ||
      allEmployees.find((x) => safeStr(x.name) === safeStr(name))?.userCode;

    return {
      code: canonicalEmployeeCode(rawCode),
      name: safeStr(name),
      displayName: name,
    };
  });

  const deduped = [];
  const seen = new Set();
  for (const item of mapped) {
    if (!item) continue;
    const key = `${item.code}::${safeStr(item.displayName || item.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

/**
 * Determine if a holiday is unpaid based on common schema variants.
 * Supports:
 * - unpaid: true
 * - isUnpaid: true
 * - paid: false / isPaid: false
 * - payType: "unpaid" | "paid"
 * - leaveType / type: "unpaid" etc.
 */
function getHolidayPayType(h) {
  const payType = safeStr(h?.payType || h?.pay_type || "");
  const leaveType = safeStr(h?.leaveType || h?.leave_type || h?.type || "");
  const unpaidFlag = !!(h?.unpaid || h?.isUnpaid);
  const paidFlagExists = typeof h?.paid === "boolean" || typeof h?.isPaid === "boolean";
  const paidFlag =
    typeof h?.paid === "boolean" ? h.paid : typeof h?.isPaid === "boolean" ? h.isPaid : null;

  if (payType) {
    if (payType.includes("unpaid")) return "unpaid";
    if (payType.includes("paid")) return "paid";
  }
  if (leaveType) {
    if (leaveType.includes("unpaid")) return "unpaid";
    if (leaveType.includes("paid")) return "paid";
  }

  if (unpaidFlag) return "unpaid";
  if (paidFlagExists) return paidFlag ? "paid" : "unpaid";

  return "paid"; // default to paid
}

/** Find matching APPROVED holiday for employee on date; returns the holiday doc or null */
function getApprovedHolidayForEmployeeOnDate(holidays, employee, targetISO) {
  if (!employee || !targetISO) return null;

  const meCode = canonicalEmployeeCode(employee.userCode);
  const meName = safeStr(employee.name || employee.displayName);

  if (!meCode && !meName) return null;

  for (const h of holidays || []) {
    const statusStr = safeStr(h?.status);
    if (statusStr !== "approved") continue;

    const codeMatch =
      !!meCode && [h.employeeCode, h.userCode].some((code) => codesEqual(code, meCode));

    const nameMatch =
      !!meName && [h.employee, h.name].map(safeStr).includes(meName);

    if (!codeMatch && !nameMatch) continue;

    const start = toDateSafe(h.startDate || h.from);
    const end = toDateSafe(h.endDate || h.to || start);
    if (!start) continue;

    const sISO = toISODate(start);
    const eISO = toISODate(end || start);
    if (!sISO || !eISO) continue;

    if (sISO <= targetISO && eISO >= targetISO) return h;
  }

  return null;
}

/* -------- date helpers for prep window (from Workshop To-Do) -------- */

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// normalise Firestore / string / Date into Date
function toJsDate(value) {
  if (!value) return null;

  if (value?.toDate && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    return new Date(value);
  }

  return new Date(value);
}

function getBookingDepartureDay(booking) {
  if (Array.isArray(booking.bookingDates) && booking.bookingDates.length > 0) {
    const dates = booking.bookingDates
      .map((value) => startOfDay(toJsDate(value)))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b);
    return dates[0] || null;
  }

  const startRaw = booking.startDate || booking.date;
  if (!startRaw) return null;
  const start = startOfDay(toJsDate(startRaw));
  return Number.isNaN(start.getTime()) ? null : start;
}

// normalise vehicles on booking to attach full DB record where possible
function normalizeVehicles(list, vehiclesData) {
  if (!Array.isArray(list)) return [];
  return list
    .map((vehicleRef) => {
      const match = resolveVehicleRecord(vehicleRef, vehiclesData);
      if (match && vehicleRef && typeof vehicleRef === "object") {
        return { ...vehicleRef, ...match };
      }
      if (match) return match;
      return vehicleRef && typeof vehicleRef === "object" ? vehicleRef : null;
    })
    .filter(Boolean);
}

/** ✅ Display vehicles by NAME/REG but keep bookings stored by ID */
function getVehicleDisplayList(job, vehiclesData) {
  return resolveVehicleDisplayList(getBookingVehicleReferences(job), vehiclesData);
}

/* -------------------------------------------------------------------------- */
/*                               JOB CARD (UI)                                */
/* -------------------------------------------------------------------------- */

const JobCard = ({ job, dateISO, router, colors, vehiclesData }) => {
  const callTime = useMemo(() => getCallTime(job, dateISO), [job, dateISO]);
  const dayNote = useMemo(() => getDayNote(job, dateISO), [job, dateISO]);
  const jobNote = useMemo(() => getJobNote(job), [job]);
  const recce = useMemo(() => isRecceDay(job, dateISO), [job, dateISO]);

  const vehiclesDisplay = useMemo(() => {
    return getVehicleDisplayList(job, vehiclesData);
  }, [job, vehiclesData]);

  const vehicleChecked = !!job.vehicleChecked;
  const requiresVehicleCheck = hasAssignedVehicle(job);
  const showActions = requiresVehicleCheck || recce;

  const handleActionPress = (pathname) => {
    router.push({
      pathname,
      params: {
        jobId: job.id,
        dateISO,
        jobNumber: job.jobNumber || "N/A",
        locationName: job.location || "",
      },
    });
  };

  return (
    <View
      key={job.id}
      style={[styles.jobCard, getCardSurfaceStyle(colors)]}
    >
      {/* Top row: job + call time */}
      <View style={[styles.titleRow, { borderBottomColor: colors.border }]}>
        <View style={styles.jobHeading}>
          <View style={styles.jobTitleLine}>
            <View style={[styles.jobDot, { backgroundColor: routeColors.hex_3568be_8u10kp }]} />
            <Text tone={"primary"} style={[styles.jobTitle]} numberOfLines={2}>
              {job.client || `Job #${displayJobNumber(job)}`}
            </Text>
          </View>
          {job.client ? (
            <Text tone={"muted"} style={[styles.jobNumber]}>
              Job #{displayJobNumber(job)}
            </Text>
          ) : null}
        </View>

        {callTime ? (
          <View style={[styles.callBadge, { backgroundColor: CALL_BADGE_BG }]}>
            <Icon name="clock" size={12} color={routeColors.hex_111_yhln9z} style={{ marginRight: t.spacing.xxs }} />
            <Text style={styles.callBadgeText}>CALL {callTime}</Text>
          </View>
        ) : null}
      </View>

      {/* Details */}
      <View style={styles.detailsContainer}>
        {job.location && (
          <JobDetailRow icon="map-pin" value={job.location} colors={colors} />
        )}

        {vehiclesDisplay.length > 0 && (
          <JobDetailRow icon="truck" value={vehiclesDisplay.join(" · ")} colors={colors} />
        )}

        {Array.isArray(job.employees) && job.employees.length > 0 && (
          <JobDetailRow
            icon="users"
            value={job.employees.map((e) => e?.displayName || e?.name || e).join(" · ")}
            colors={colors}
          />
        )}
      </View>

      {job.vehicleDangerous ? (
        <Text tone="danger" layoutStyle={{ marginTop: t.spacing.xs }}>
          Dangerous vehicle defect reported — do not drive until repaired.
        </Text>
      ) : null}

      {/* Notes */}
      {(dayNote || jobNote) && (
        <View
          style={[
            styles.noteBox,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
        >
          <Icon
            name="message-circle"
            size={14}
            color={colors.text}
            style={{ marginRight: t.spacing.xs, marginTop: t.spacing.none }}
          />
          <View style={{ flex: 1 }}>
            {dayNote && (
              <Text tone={"muted"} style={[styles.noteText]}>
                <Text tone={"primary"} style={[styles.noteLabel]}>Day Note</Text>{" "}
                <Text tone={"muted"} style={[styles.noteBody]}>{dayNote}</Text>
              </Text>
            )}
            {jobNote && (
              <Text
                tone={"muted"} style={[
                  styles.noteText,
                  { marginTop: dayNote ? 4 : 0 },
                ]}
              >
                <Text tone={"primary"} style={[styles.noteLabel]}>Job Note</Text>{" "}
                <Text tone={"muted"} style={[styles.noteBody]}>{jobNote}</Text>
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Actions */}
      {showActions && (
        <View style={styles.actionsRow}>
          {requiresVehicleCheck && (
            <AppButton
              label={vehicleChecked ? "Vehicle Check Complete" : "Vehicle Check"}
              icon={vehicleChecked ? "check-circle" : "truck"}
              variant={vehicleChecked ? "secondary" : "primary"}
              onPress={() => handleActionPress("/vehicle-check")}
              accessibilityHint="Opens the vehicle check for this job"
              style={styles.actionBtn}
            />
          )}

          {recce && (
            <AppButton
              label="Recce Form"
              icon="map-pin"
              onPress={() => handleActionPress("/recce-form")}
              accessibilityHint="Opens the recce form for this job"
              style={[styles.actionBtn, { backgroundColor: RECCE_BG, borderColor: RECCE_BG }]}
            />
          )}
        </View>
      )}
    </View>
  );
};

function JobDetailRow({ icon, value, colors }) {
  if (!value) return null;
  return (
    <View style={styles.jobDetailRow}>
      <Icon name={icon} size={15} color={colors.textMuted} />
      <Text tone={"primary"} style={[styles.jobDetailText]}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                             VEHICLE PREP ROW (UI)                          */
/* -------------------------------------------------------------------------- */

function VehiclePrepRow({ item, colors, prepRecord }) {
  const router = useRouter();
  const prepPending = prepRecord?.pendingPrepStatus !== undefined || prepRecord?.hasPendingWrites === true;
  const prepDone = prepRecord?.completed === true && !prepPending && prepRecord?.prepReadState !== "error";

  const dateText = toDateSafe(item.date)?.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const showComplianceWarning = item.isSornOrUntaxed || item.isUninsured;

  const onPress = () => {
    const base = `/vehicle-prep/${encodeURIComponent(item.vehicleId || "vehicle")}`;
    const params = new URLSearchParams({
      date: item.date,
      bookingId: item.bookingId || "",
      vehicleName: item.vehicleName || "",
      registration: item.registration || "",
      vehicleId: item.vehicleId || "",
    });
    router.push(`${base}?${params.toString()}`);
  };

  return (
    <TouchableOpacity
      style={[styles.prepRow, { borderTopColor: colors.divider }]}
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Prepare ${item.vehicleName}${item.registration ? ` ${item.registration}` : ""}`}
      accessibilityHint={`Vehicle goes out ${dateText}`}
    >
      <View style={{ flex: 1 }}>
        <Text tone={"primary"} style={[styles.prepVehicleMain]}>
          {item.vehicleName}
          {item.registration ? ` · ${item.registration}` : ""}
        </Text>
        <Text tone={"muted"} style={[styles.prepGoingOutText]}>
          Going out: {dateText}
        </Text>

        <View style={styles.prepBadgeRow}>
          {prepPending || prepRecord?.prepConflict ? (
            <Text tone="warning">{prepRecord?.prepConflict ? "Prep changed — review required" : "Save pending — awaiting server confirmation"}</Text>
          ) : prepRecord?.prepReadState === "error" ? (
            <Text tone="muted">Preparation status unavailable</Text>
          ) : prepRecord?.prepReadState === "cached" ? (
            <Text tone="muted">Saved preparation — awaiting server confirmation</Text>
          ) : prepRecord?.prepReadState === "loading" ? (
            <Text tone="muted">Loading preparation status…</Text>
          ) : prepDone ? (
            <View
              style={[
                styles.prepReadyState,
                {
                  backgroundColor: withAlpha(colors.success, 0.14),
                  borderColor: withAlpha(colors.success, 0.38),
                },
              ]}
            >
              <Icon name="check-circle" size={13} color={colors.success} />
              <Text tone={"success"} style={[styles.prepReadyText]}>
                {prepRecord?.completedByName
                  ? `Prepped by ${prepRecord.completedByName}`
                  : "Prepped"}
              </Text>
            </View>
          ) : showComplianceWarning ? (
            <View style={styles.prepComplianceBad}>
              <Icon name="alert-triangle" size={12} color={routeColors.hex_fff_yhjmu8} />
              <Text style={styles.prepComplianceText}>CHECK TAX / INS</Text>
            </View>
          ) : (
            <View
              style={[
                styles.prepReadyState,
                {
                  backgroundColor: withAlpha(colors.warning, 0.12),
                  borderColor: withAlpha(colors.warning, 0.34),
                },
              ]}
            >
              <Icon name="clipboard" size={13} color={colors.warning} />
              <Text tone={"warning"} style={[styles.prepReadyText]}>Prep required</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.prepAction}>
        <Text
          style={[
            styles.prepActionText,
            { color: prepDone ? colors.success : colors.accentText },
          ]}
        >
          {prepDone ? "Review" : "Prep"}
        </Text>
        <Icon name="chevron-right" size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

function VehiclePrepGroups({ title, groups, records, colors, emptyMessage, readState }) {
  return (
    <View style={styles.prepRangeSection}>
      <Text tone={"primary"} style={[styles.prepRangeLabel]}>{title}</Text>
      {groups.length === 0 ? (
        <Text tone={"muted"} style={[styles.prepRangeEmpty]}>{emptyMessage}</Text>
      ) : (
        groups.map((group) => {
          const label = toDateSafe(group.date)?.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          });

          return (
            <View key={group.date} style={styles.prepGroup}>
              <Text tone={"muted"} style={[styles.prepDateLabel]}>{label}</Text>
              {group.items.map((item) => (
                <VehiclePrepRow
                  key={item.key}
                  item={item}
                  colors={colors}
                  prepRecord={findVehiclePrepRecord(records, item) || { prepReadState: readState }}
                />
              ))}
            </View>
          );
        })
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  SCREEN                                    */
/* -------------------------------------------------------------------------- */

export default function JobDayScreen() {
  const router = useRouter();
  const { employee, isAuthed, loading } = useAuth();
  const { colors } = useTheme();
  const neutralSurface = colors.groupedSurface;
  const bookingsResource = useBookings();
  const holidaysResource = useHolidays();
  const vehiclesResource = useVehicles();
  const vehicleChecksResource = useCompanyCollection("vehicleChecks");
  const prepRecordsResource = useVehiclePrepResource();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);

  // ✅ Holiday info (paid/unpaid)
  const [holidayInfo, setHolidayInfo] = useState({ onHoliday: false, payType: "paid" });

  // ✅ Bank holidays: date -> title
  const [bankHolidayMap, setBankHolidayMap] = useState({});

  // 👇 data for vehicle prep list (next 3 days)
  const [bookings, setBookings] = useState([]);
  const [vehiclesData, setVehiclesData] = useState([]);
  const [prepLoading, setPrepLoading] = useState(true);

  const dateISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

  // Fetch bank holidays once
  useEffect(() => {
    let alive = true;
    (async () => {
      const map = await fetchUKBankHolidays(BANK_HOLIDAY_REGION);
      if (alive) setBankHolidayMap(map || {});
    })();
    return () => {
      alive = false;
    };
  }, []);

  const bankHolidayTitle = useMemo(() => {
    if (!dateISO) return null;
    return bankHolidayMap?.[dateISO] || null;
  }, [bankHolidayMap, dateISO]);

  const loadAllEmployees = useCallback(
    () => bookingsResource.employees,
    [bookingsResource.employees]
  );

  const loadJobs = useCallback(() => {
    if (loading || !isAuthed) return;

    const meCode = canonicalEmployeeCode(employee?.userCode);
    const meName = safeStr(employee?.name || employee?.displayName);
    if (!meCode && !meName) {
      setJobs([]);
      setHolidayInfo({ onHoliday: false, payType: "paid" });
      return;
    }
    if (!dateISO) return;

    try {
      const allEmployees = loadAllEmployees();
      const bookings = bookingsResource.data;
      const holidays = holidaysResource.data;

      const todaysJobs = [];

      for (const job of bookings) {
        if (!isCrewedBooking(job)) continue;
        const dates = Array.isArray(job.bookingDates) ? job.bookingDates : [];
        if (!dates.length) continue;

        const hasThisDate = dates.some((d) => toISODate(d) === dateISO);
        if (!hasThisDate) continue;

        const todaysEmps = getEmployeesForDate(job, dateISO, allEmployees);

        const isMineToday =
          (!!meCode && todaysEmps.some((r) => codesEqual(r.code, meCode))) ||
          (!!meName && todaysEmps.some((r) => safeStr(r.name) === meName));

        if (!isMineToday) continue;

        todaysJobs.push({
          ...job,
          employees: todaysEmps.map((r) => r.displayName).filter(Boolean),
        });
      }

      const visibleJobs = collapseLinkedJobsForDay(todaysJobs, dateISO);

      const jobsWithCheckFlag = visibleJobs.map((job) => ({
        ...job,
        vehicleChecked: hasSubmittedJobVehicleCheck(vehicleChecksResource.data, {
          jobId: job.id,
          dateISO,
          vehicleRefs: getBookingVehicleReferences(job),
          vehicles: vehiclesResource.data,
        }),
        vehicleDangerous: hasOpenDangerousVehicleDefect(vehicleChecksResource.data, getBookingVehicleReferences(job)),
      }));

      setJobs(jobsWithCheckFlag);

      // ✅ Holiday (paid/unpaid) only applies when no jobs that day
      const hol = getApprovedHolidayForEmployeeOnDate(holidays, employee, dateISO);
      const isHolidayNoJobs = !!hol && jobsWithCheckFlag.length === 0;

      setHolidayInfo({
        onHoliday: isHolidayNoJobs,
        payType: hol ? getHolidayPayType(hol) : "paid",
      });
    } catch (err) {
      console.error("Error loading jobs:", err);
      setJobs([]);
      setHolidayInfo({ onHoliday: false, payType: "paid" });
    }
  }, [
    bookingsResource.data,
    employee,
    holidaysResource.data,
    isAuthed,
    loading,
    dateISO,
    loadAllEmployees,
    vehicleChecksResource.data,
    vehiclesResource.data,
  ]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // 🔄 Load bookings + vehicles for all upcoming Vehicle prep departures
  useEffect(() => {
    setBookings(bookingsResource.data.filter(isCrewedBooking));
    setVehiclesData(vehiclesResource.data);
    setPrepLoading(
      bookingsResource.isInitialLoading ||
        vehiclesResource.isInitialLoading ||
        prepRecordsResource.isInitialLoading
    );
  }, [
    bookingsResource.data,
    bookingsResource.isInitialLoading,
    prepRecordsResource.isInitialLoading,
    vehiclesResource.data,
    vehiclesResource.isInitialLoading,
  ]);

  const prepItems = useMemo(() => {
    if (!bookings.length) return [];

    const today = startOfDay(new Date());
    const windowStart = startOfDay(addDays(today, 1)); // tomorrow
    const soonWindowEnd = startOfDay(addDays(today, 3));

    const validStatuses = new Set(["Confirmed"]); // confirmed jobs only
    const items = [];

    bookings.forEach((b) => {
      const status = b.status || "Confirmed";
      if (!validStatuses.has(status)) return;

      const departureDay = getBookingDepartureDay(b);
      if (!departureDay || departureDay < windowStart) return;

      const normVehicles = normalizeVehicles(
        getBookingVehicleReferences(b),
        vehiclesData
      );
      if (!normVehicles.length) return;

      const dateKey = toISODate(departureDay);

      normVehicles.forEach((v) => {
        const name = getVehicleDisplayName(v, vehiclesData);
        const reg = getVehicleRegistration(v) || "";

        const taxStatus = v.taxStatus || "";
        const insuranceStatus = v.insuranceStatus || "";

        const tax = String(taxStatus).toLowerCase();
        const ins = String(insuranceStatus).toLowerCase();

        const isSornOrUntaxed = ["sorn", "untaxed", "no tax"].includes(tax);
        const isUninsured = ["not insured", "uninsured", "no insurance"].includes(ins);

        items.push({
          key: `${b.id}-${v.id || name}-${dateKey}`,
          bookingId: b.id,
          companyId: b.companyId,
          date: dateKey,
          dateObj: departureDay,
          vehicleId: v.id || reg || name,
          vehicleName: name,
          registration: reg,
          taxStatus,
          insuranceStatus,
          isSornOrUntaxed,
          isUninsured,
          isLater: departureDay > soonWindowEnd,
        });
      });
    });

    items.sort((a, b) => {
      if (a.dateObj.getTime() !== b.dateObj.getTime()) return a.dateObj - b.dateObj;
      return (a.vehicleName || "").localeCompare(b.vehicleName || "");
    });

    return items;
  }, [bookings, vehiclesData]);

  const prepByDate = useMemo(() => {
    if (!prepItems.length) return [];
    const map = new Map();
    prepItems.forEach((item) => {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date).push(item);
    });

    return Array.from(map.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, items]) => ({ date, items, isLater: items[0]?.isLater === true }));
  }, [prepItems]);

  const prepSoonByDate = useMemo(
    () => prepByDate.filter((group) => !group.isLater),
    [prepByDate]
  );
  const prepLaterByDate = useMemo(
    () => prepByDate.filter((group) => group.isLater),
    [prepByDate]
  );

  const goPrevDay = () => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 1);
      return nd;
    });
  };

  const goNextDay = () => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 1);
      return nd;
    });
  };

  const goToday = () => setSelectedDate(new Date());

  const onRefresh = useCallback(async () => {
    setBusy(true);
    try {
      await Promise.all([
        bookingsResource.refresh(),
        holidaysResource.refresh(),
        vehiclesResource.refresh(),
        vehicleChecksResource.refresh(),
        prepRecordsResource.refresh(),
      ]);
    } finally {
      setBusy(false);
    }
  }, [
    bookingsResource,
    holidaysResource,
    prepRecordsResource,
    vehicleChecksResource,
    vehiclesResource,
  ]);

  if (loading || !isAuthed) return null;

  const weekend = isWeekend(selectedDate);
  const isSelectedToday = dateISO === toISODate(new Date());
  const isUnpaidHoliday = holidayInfo.onHoliday && holidayInfo.payType === "unpaid";

  // ✅ include Bank Holiday in status logic (only when no jobs and not on holiday)
  const dayStatus =
    jobs.length > 0
      ? "On Set"
      : holidayInfo.onHoliday
      ? isUnpaidHoliday
        ? "Unpaid Holiday"
        : "Holiday"
      : bankHolidayTitle
      ? "Bank Holiday"
      : weekend
      ? "Off"
      : "Yard";

  const statusColour =
    dayStatus === "On Set"
      ? routeColors.hex_3568be_8u10kp
      : dayStatus === "Holiday" || dayStatus === "Unpaid Holiday"
      ? colors.success
      : dayStatus === "Bank Holiday"
      ? routeColors.hex_a855f7_u9x9hq // purple
      : colors.textMuted;

  return (
    <PageShell
      appearance="grouped"
      contentSpacing="compact"
      customHeader={
        <PageHeaderCard
          eyebrow="Operations"
          title="Job Day"
          action={
            <View
              style={[
                styles.statusPill,
                {
                  borderColor: isUnpaidHoliday ? routeColors.hex_ffd60a_5c6r45 : statusColour,
                  backgroundColor: withAlpha(colors.surfaceAlt, 0.82),
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isUnpaidHoliday ? routeColors.hex_ffd60a_5c6r45 : statusColour },
                ]}
              />
              <Text tone={"primary"} style={[styles.statusText]}>{dayStatus}</Text>
            </View>
          }
          style={styles.heroCard}
          contentStyle={styles.heroContent}
        >
          {bankHolidayTitle && jobs.length === 0 && !holidayInfo.onHoliday ? (
            <View style={styles.heroMetaRow}>
                <View style={[styles.bankHolidayPill, { borderColor: routeColors.hex_a855f7_u9x9hq }]}>
                  <Icon name="flag" size={12} color={routeColors.hex_a855f7_u9x9hq} />
                  <Text style={styles.bankHolidayPillText} numberOfLines={1}>
                    {bankHolidayTitle}
                  </Text>
                </View>
            </View>
          ) : null}

          <View style={styles.dayNavRow}>
              <IconButton
                icon="chevron-left"
                label="Previous day"
                onPress={goPrevDay}
                disabled={busy}
              />
              <View style={styles.dayTitleBlock}>
                <Text tone={"primary"} style={[styles.dayTitle]}>
                  {selectedDate.toLocaleDateString("en-GB", DAY_FORMAT_LONG)}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={isSelectedToday ? "Today selected" : "Return to today"}
                  disabled={isSelectedToday}
                  onPress={goToday}
                  style={styles.todayLink}
                >
                  <Icon
                    name="crosshair"
                    size={12}
                    color={isSelectedToday ? colors.textMuted : colors.accentText}
                  />
                  <Text
                    style={[
                      styles.todayLinkText,
                      { color: isSelectedToday ? colors.textMuted : colors.accentText },
                    ]}
                  >
                    {isSelectedToday ? "Today" : "Back to today"}
                  </Text>
                </TouchableOpacity>
              </View>
              <IconButton
                icon="chevron-right"
                label="Next day"
                onPress={goNextDay}
                disabled={busy}
              />
          </View>
        </PageHeaderCard>
      }
      customHeaderPlacement="scroll"
      refresh={{ refreshing: busy, onRefresh }}
      state={{
        resources: [bookingsResource, holidaysResource, vehiclesResource],
        hasContent:
          bookingsResource.data.length > 0 || holidaysResource.data.length > 0,
        onRetry: onRefresh,
        loadingLabel: "Loading your jobs…",
        refreshErrorMessage: "Couldn’t update schedule data · Showing saved data.",
      }}
    >
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              dateISO={dateISO}
              router={router}
              colors={colors}
              vehiclesData={vehiclesData}
            />
          ))
        ) : holidayInfo.onHoliday ? (
          <EmptyState
            icon="umbrella"
            title={isUnpaidHoliday ? "Unpaid Holiday" : "Holiday"}
            message={
              isUnpaidHoliday
                ? "You’re on approved unpaid leave for this date."
                : "You’re on approved leave for this date."
            }
            presentation="grouped"
          />
        ) : bankHolidayTitle ? (
          <EmptyState
            icon="flag"
            title="Bank Holiday"
            message={bankHolidayTitle}
            presentation="grouped"
          />
        ) : weekend ? (
          <EmptyState
            icon="sun"
            title="Weekend"
            message="No bookings assigned. Enjoy the day."
            presentation="grouped"
          />
        ) : (
          <>
            <View
              style={[styles.yardStatusRow, getCardSurfaceStyle(colors)]}
            >
              <View style={[styles.yardStatusIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name="home" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.yardStatusCopy}>
                <Text tone={"primary"} style={[styles.yardStatusTitle]}>Yard based</Text>
                <Text tone={"muted"} style={[styles.yardStatusText]}>No job assigned for this day.</Text>
              </View>
            </View>

            <View style={styles.prepSectionHeaderRow}>
              <View style={styles.prepSectionTitleRow}>
                <Text tone={"primary"} style={[styles.prepSectionTitle]}>Vehicle preparation</Text>
                {!prepLoading ? (
                  <View style={[styles.prepCount, { backgroundColor: colors.surfaceAlt }]}>
                    <Text tone={"primary"} style={[styles.prepCountText]}>{prepItems.length}</Text>
                  </View>
                ) : null}
              </View>
              <Text tone={"muted"} style={[styles.prepSectionSubtitle]}>
                Confirmed upcoming departures.
              </Text>
            </View>

            <SectionCard
              layoutStyle={styles.prepCard}
              tone="grouped"
            >
              {prepLoading ? (
                <LoadingState label="Loading upcoming vehicles…" presentation="grouped" compact />
              ) : (
                <>
                  <VehiclePrepGroups
                    title="Next 3 days"
                    groups={prepSoonByDate}
                    records={prepRecordsResource.data}
                    readState={prepRecordsResource.state}
                    colors={colors}
                    emptyMessage="No vehicles need preparing in the next 3 days."
                  />
                  <View style={[styles.prepRangeDivider, { backgroundColor: colors.border }]} />
                  <VehiclePrepGroups
                    title="Upcoming after 3 days"
                    groups={prepLaterByDate}
                    records={prepRecordsResource.data}
                    readState={prepRecordsResource.state}
                    colors={colors}
                    emptyMessage="No later confirmed departures."
                  />
                </>
              )}
            </SectionCard>
          </>
        )}
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const DAY_FORMAT_LONG = {
  weekday: "long",
  day: "2-digit",
  month: "short",
  year: "numeric",
};
