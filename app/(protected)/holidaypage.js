import { cancelEmployeeHoliday } from "../../lib/hrHistoryApi";
import { getCardSurfaceStyle } from "../../lib/design/cardSurface";
import { routeColors } from "../../lib/design/routePresentation/holidaypage-js.js";
import { styles } from "../../lib/design/screenStyles/holidaypage-js.js";
import { AppButton, AppText as Text, AppPressable as TouchableOpacity, Banner } from "../../components/ui/AppPrimitives";
// app/holidaypage.js
import {
  useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect,
  useMemo,
  useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { db } from "../../firebaseConfig";
import { effectiveHolidayCarryOver, holidayBelongsToYear } from "../../lib/holidayYear";
import { countHolidayDays } from "../../lib/holidayRequestParity";
import { useHolidays } from "../../hooks/useOperationalData";
import {
  getHolidayBalancePresentation,
  getHolidayLeaveType,
  getVisibleHolidayHistory,
  shouldStackHolidayRows,
} from "../../lib/holidayPresentation";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { withAlpha } from "../../lib/design/color";
import PageShell from "../../components/layout/PageShell";

/* ─────────────────────────── Helpers ─────────────────────────── */
const norm = (v) => String(v ?? "").trim().toLowerCase();


/** Parse "YYYY-MM-DD" safely at local midnight (no TZ shift). */
const parseYMD = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const [, Y, M, D] = m.map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
};

/** Safer Firestore -> Date conversion (prefers strict YMD). */
const toDate = (v) => {
  if (!v) return null;
  if (typeof v === "string") {
    const strict = parseYMD(v);
    if (strict) return strict;
    const d = new Date(v);
    return Number.isNaN(+d) ? null : d;
  }
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(+d) ? null : d;
  }
  const d = new Date(v);
  return Number.isNaN(+d) ? null : d;
};

const eachDateInclusive = (start, end) => {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) out.push(new Date(d));
  return out;
};

const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

const countBusinessDaysInclusive = (start, end, isBankHolidayFn = null) =>
  eachDateInclusive(start, end).filter((d) => {
    if (isWeekend(d)) return false;
    if (isBankHolidayFn && isBankHolidayFn(d)) return false; // ✅ exclude bank holidays too
    return true;
  }).length;

const fmt = (d) =>
  !d
    ? "—"
    : d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function getHolidayStart(h) {
  return toDate(
    firstValue(
      h?.startDate,
      h?.dateFrom,
      h?.fromDate,
      h?.from,
      h?.start,
      h?.date,
      h?.holidayStart,
      h?.start_date
    )
  );
}

function getHolidayEnd(h) {
  return (
    toDate(
      firstValue(
        h?.endDate,
        h?.dateTo,
        h?.toDate,
        h?.to,
        h?.end,
        h?.holidayEnd,
        h?.end_date
      )
    ) || getHolidayStart(h)
  );
}

/* Half-day detection & rendering */
const normaliseAMPM = (v) => {
  const s = String(v || "").trim().toUpperCase();
  if (["AM", "A.M.", "MORNING"].includes(s)) return "AM";
  if (["PM", "P.M.", "AFTERNOON"].includes(s)) return "PM";
  return null;
};

function boolish(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = norm(v);
  return s === "true" || s === "1" || s === "yes";
}

/**
 * ✅ Updated to match the schema you now save from the app + web:
 * - startHalfDay: boolean
 * - startAMPM: "AM" | "PM" | null
 * - endHalfDay: boolean
 * - endAMPM: "AM" | "PM" | null
 */
function getHalfMeta(h) {
  const startHalfFlag = boolish(h.startHalfDay ?? h.startHalf ?? h.startHalfday);
  const endHalfFlag = boolish(h.endHalfDay ?? h.endHalf ?? h.endHalfday);

  const startAMPM = normaliseAMPM(h.startAMPM ?? h.startPeriod ?? h.halfDayPeriod ?? h.halfDayType);
  const endAMPM = normaliseAMPM(h.endAMPM ?? h.endPeriod);

  // legacy single-half flag (kept for backward compatibility)
  const legacySingleHalf =
    boolish(h.halfDay) || boolish(h.isHalfDay) || boolish(h.isHalf) || boolish(h.half);

  return { startHalfFlag, endHalfFlag, startAMPM, endAMPM, legacySingleHalf };
}

// Compute business-day length with half-day adjustments (excludes weekends + bank holidays)
function computeDays(h, isBankHolidayFn = null) {
  const s = getHolidayStart(h);
  const e = getHolidayEnd(h) || s;
  if (!s || !e) return 0;

  const { startHalfFlag, endHalfFlag, startAMPM, endAMPM, legacySingleHalf } = getHalfMeta(h);

  const businessDays = countBusinessDaysInclusive(s, e, isBankHolidayFn);

  // Single-day holiday
  const isSingle = s.toDateString() === e.toDateString();
  if (isSingle) {
    const isNonWorking =
      isWeekend(s) || (isBankHolidayFn ? isBankHolidayFn(s) : false);
    if (isNonWorking) return 0;

    const anyHalf =
      startHalfFlag ||
      endHalfFlag ||
      !!startAMPM ||
      !!endAMPM ||
      legacySingleHalf;

    return anyHalf ? 0.5 : 1;
  }

  // Multi-day holiday
  let reduction = 0;

  // Start day half = reduce 0.5 (only if start is a business day)
  if ((startHalfFlag || !!startAMPM) && businessDays > 0) {
    const startIsBusiness =
      !isWeekend(s) && !(isBankHolidayFn ? isBankHolidayFn(s) : false);
    if (startIsBusiness) reduction += 0.5;
  }

  // End day half = reduce 0.5 (only if end is a business day)
  if ((endHalfFlag || !!endAMPM) && businessDays > 0) {
    const endIsBusiness =
      !isWeekend(e) && !(isBankHolidayFn ? isBankHolidayFn(e) : false);
    if (endIsBusiness) reduction += 0.5;
  }

  // Legacy “halfDay” without start/end hint: apply a single 0.5 reduction
  if (reduction === 0 && legacySingleHalf && businessDays > 0) reduction += 0.5;

  return Math.max(0, Number((businessDays - reduction).toFixed(1)));
}

// Date cell text with AM/PM suffix if applicable
function renderDateWithHalf(d, which, h) {
  if (!d) return "—";
  const dateText = fmt(d);

  const { startHalfFlag, endHalfFlag, startAMPM, endAMPM, legacySingleHalf } = getHalfMeta(h);

  const s = getHolidayStart(h);
  const e = getHolidayEnd(h) || s;
  const isSingle = s && e && s.toDateString() === e.toDateString();

  if (which === "start") {
    if (startAMPM) return `${dateText} (${startAMPM})`;
    if (isSingle && (startHalfFlag || legacySingleHalf)) return `${dateText} (Half)`;
  }

  if (which === "end") {
    if (endAMPM) return `${dateText} (${endAMPM})`;
    if (isSingle && endHalfFlag) return `${dateText} (Half)`;
  }

  return dateText;
}

function displayTypeAndColor(h) {
  const displayType = getHolidayLeaveType(h);
  let typeColor = routeColors.hex_29bc5f_75jpdr;
  if (displayType === "Accrued") {
    typeColor = routeColors.hex_38bdf8_92tkol;
  } else if (displayType === "Unpaid") {
    typeColor = routeColors.hex_f87171_ohxdjs;
  }
  return { displayType, typeColor };
}

/* ───────────────────── Year helpers ───────────────────── */
function yearKey(y) {
  return String(y);
}

function numOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function getAllowanceForYear(emp, y) {
  const Y = yearKey(y);

  const holidayAllowances = emp?.holidayAllowances || emp?.holidayAllowanceByYear || {};
  const carryoverByYear = emp?.carryoverByYear || emp?.carryOverByYear || emp?.carriedOverByYear || {};

  // A configured value of 0 is meaningful. Only use the legacy fields when
  // this year has no entry at all; otherwise last year's value can leak into
  // the current-year totals.
  const allowance = hasOwn(holidayAllowances, Y)
    ? numOrZero(holidayAllowances[Y])
    : numOrZero(emp?.holidayAllowance);

  const carryOver = hasOwn(carryoverByYear, Y)
    ? numOrZero(carryoverByYear[Y])
    : emp?.carriedOverDays !== undefined && emp?.carriedOverDays !== null
      ? numOrZero(emp.carriedOverDays)
      : numOrZero(emp?.carryOverDays);

  return { allowance, carryOver };
}

function isRequestedStatus(status) {
  const st = norm(status);
  return (
    !st ||
    st === "requested" ||
    st === "request" ||
    st === "pending" ||
    st === "submitted" ||
    st.includes("awaiting")
  );
}

function isApprovedStatus(status) {
  const st = norm(status);
  return (
    st === "approved" ||
    st === "accept" ||
    st === "accepted" ||
    st === "confirmed" ||
    st === "authorised" ||
    st === "authorized" ||
    st.startsWith("approved")
  );
}

// Holidays belong to the leave year in which they start. Using an overlap
// check here caused leave beginning in the previous year to reappear in the
// current year's lists and totals.
/* ───────────────────────────── Component ───────────────────────────── */
export default function HolidayPage() {
  const router = useRouter();
  const { employee, user, isAuthed, loading } = useAuth();
  const companyId = String(employee?.companyId || "").trim();
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();

  const [employeeData, setEmployeeData] = useState(null);
  const { data: holidays, error: historyLoadError, withheldCount, historyComplete, refresh: refreshHolidays } = useHolidays();
  const historyError = historyLoadError?.message || ((withheldCount || !historyComplete) ? "Some historical leave needs office ownership review." : null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // ✅ Lock to current year only (no selector UI)
  const currentYear = new Date().getFullYear();
  const selectedYear = currentYear;

  // ✅ Bank holidays (UK Gov JSON) for current year
  const [bankHolidaySet, setBankHolidaySet] = useState(() => new Set());

  const isBankHoliday = useMemo(() => {
    return (d) => {
      if (!d) return false;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return bankHolidaySet.has(`${y}-${m}-${day}`);
    };
  }, [bankHolidaySet]);

  useEffect(() => {
    const controller = new AbortController();

    const loadBankHolidays = async () => {
      try {
        const REGION = "england-and-wales"; // "scotland" | "northern-ireland"
        const res = await fetch("https://www.gov.uk/bank-holidays.json", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Bank holidays fetch failed: ${res.status}`);
        const json = await res.json();
        const list = json?.[REGION]?.events || [];

        const set = new Set(
          list
            .map((ev) => {
              const d = parseYMD(ev?.date);
              if (!d) return null;
              if (d.getFullYear() !== Number(currentYear)) return null;
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              return `${y}-${m}-${day}`;
            })
            .filter(Boolean)
        );

        setBankHolidaySet(set);
      } catch (e) {
        if (e?.name === "AbortError") return;
        console.warn("Bank holidays unavailable:", e);
        setBankHolidaySet(new Set());
      }
    };

    loadBankHolidays();
    return () => controller.abort();
  }, [currentYear]);

  useEffect(() => {
    let mounted = true;
    setEmployeeData(null);

    const fetchData = async () => {
      if (loading || !isAuthed || !companyId) {
        setEmployeeData(null);
        return;
      }

      const snapshot = await getDoc(doc(db, "employees", employee.employeeId));
      if (mounted) setEmployeeData(snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null);

    };

    fetchData().catch(error => { if (mounted) console.warn("Employee profile unavailable:", error); });
    return () => { mounted = false; };
  }, [companyId, loading, isAuthed, employee, user]);

  const cancelHoliday = async (id) => {
    try {
      const record = holidays.find(row => row.id === id);
      await cancelEmployeeHoliday(user, employee, record);
      await refreshHolidays();
      alert("Holiday request cancelled");
    } catch (err) {
      console.error("Error cancelling holiday:", err.message, err);
      alert("Failed to cancel holiday: " + err.message);
    }
  };

  const holidaysForYear = useMemo(() => {
    return (holidays || []).filter((h) =>
      holidayBelongsToYear(h, selectedYear, getHolidayStart(h))
    );
  }, [holidays, selectedYear]);

  /* ✅ Summary calc (CURRENT YEAR ONLY) */
  const calc = () => {
    let paidBooked = 0,
      unpaid = 0,
      accruedTaken = 0,
      accruedEarned = 0;

    holidaysForYear.forEach((h) => {
      if (!isApprovedStatus(h.status)) return;

      const days = computeDays(h, isBankHoliday);
      const { displayType } = displayTypeAndColor(h);

      if (displayType === "Paid") paidBooked += days;
      else if (displayType === "Unpaid") unpaid += days;
      else if (displayType === "Accrued") accruedTaken += days;
    });

    const { allowance, carryOver } = getAllowanceForYear(employeeData, selectedYear);
    const marchEnd = new Date(selectedYear, 2, 31);
    const januaryStart = new Date(selectedYear, 0, 1);
    const paidUsedByApril = holidaysForYear.reduce((sum, h) => {
      if (!isApprovedStatus(h.status) || displayTypeAndColor(h).displayType !== "Paid") return sum;
      const start = getHolidayStart(h);
      const end = getHolidayEnd(h);
      if (!start || !end || start > marchEnd || end < januaryStart) return sum;
      const clippedStart = start > januaryStart ? start : januaryStart;
      const clippedEnd = end < marchEnd ? end : marchEnd;
      const half = getHalfMeta(h);
      return sum + countHolidayDays(clippedStart, clippedEnd, {
        bankHolidays: bankHolidaySet,
        startHalfDay: clippedStart.getTime() === start.getTime() && (half.startHalfFlag || !!half.startAMPM || half.legacySingleHalf),
        endHalfDay: clippedEnd.getTime() === end.getTime() && (half.endHalfFlag || !!half.endAMPM),
      });
    }, 0);
    const effectiveCarryOver = effectiveHolidayCarryOver(carryOver, paidUsedByApril, selectedYear);
    const totalAllowance = allowance + effectiveCarryOver;

    const accruedBalance = accruedEarned - accruedTaken;
    const allowanceBalance = totalAllowance - paidBooked;

    return {
      paidBooked,
      unpaid,
      accruedEarned,
      accruedTaken,
      accruedBalance,
      allowance,
      carryOver: effectiveCarryOver,
      totalAllowance,
      allowanceBalance,
    };
  };

  const {
    paidBooked,
    unpaid,
    totalAllowance,
    allowanceBalance,
  } = calc();

  // ✅ Make status filtering case-insensitive
  const requestedHolidays = holidaysForYear.filter((h) => {
    return isRequestedStatus(h.status);
  });

  const confirmedHolidays = holidaysForYear.filter((h) => isApprovedStatus(h.status));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingConfirmed = confirmedHolidays
    .filter((h) => {
      const end = getHolidayEnd(h) || getHolidayStart(h);
      return end && end >= today;
    })
    .sort((a, b) => getHolidayStart(a) - getHolidayStart(b));

  const pastConfirmed = confirmedHolidays
    .filter((h) => {
      const end = getHolidayEnd(h) || getHolidayStart(h);
      return end && end < today;
    })
    .sort((a, b) => getHolidayStart(a) - getHolidayStart(b));

  const pastPaidUsed = pastConfirmed.reduce((sum, h) => {
    const { displayType } = displayTypeAndColor(h);
    return displayType === "Paid" ? sum + computeDays(h, isBankHoliday) : sum;
  }, 0);

  const remainingAfterPast = totalAllowance - pastPaidUsed;
  const upcomingPaidBooked = Math.max(0, paidBooked - pastPaidUsed);

  // ✅ Notes field compatibility: app/web save "holidayReason", older UI might have "notes"
  const getNotes = (h) => {
    const v = h.holidayReason ?? h.notes ?? h.reason ?? "";
    return String(v || "").trim();
  };

  const toListItem = (h, trailingLabel, trailingValue) => {
    const s = getHolidayStart(h);
    const e = getHolidayEnd(h) || s;
    const { displayType, typeColor } = displayTypeAndColor(h);
    return {
      id: h.id,
      holiday: h,
      start: renderDateWithHalf(s, "start", h),
      end: renderDateWithHalf(e, "end", h),
      days: computeDays(h, isBankHoliday),
      type: displayType,
      typeColor,
      notes: getNotes(h),
      trailingLabel,
      trailingValue,
    };
  };

  const requestedItems = requestedHolidays
    .slice()
    .sort((a, b) => getHolidayStart(a) - getHolidayStart(b))
    .map((h) => toListItem(h, "Status", "Requested"));

  let projectedBalance = remainingAfterPast;
  const upcomingItems = upcomingConfirmed.map((h) => {
    const { displayType } = displayTypeAndColor(h);
    if (displayType === "Paid") projectedBalance -= computeDays(h, isBankHoliday);
    return toListItem(
      h,
      "Balance after",
      `${Number(projectedBalance.toFixed(1))} days`
    );
  });

  let pastBalance = totalAllowance;
  const pastItems = pastConfirmed.map((h) => {
    const { displayType } = displayTypeAndColor(h);
    if (displayType === "Paid") pastBalance -= computeDays(h, isBankHoliday);
    return toListItem(h, "Balance after", `${Number(pastBalance.toFixed(1))} days`);
  });

  const { isOverbooked, balanceValue, balanceLabel } =
    getHolidayBalancePresentation(allowanceBalance);
  const visiblePastItems = getVisibleHolidayHistory(pastItems, historyExpanded);
  const stackHolidayRows = shouldStackHolidayRows(width, fontScale);

  return (
    <PageShell
      appearance="grouped"
      header={{
        variant: "compact",
        eyebrow: "Leave",
        title: "Holiday",
        subtitle: employeeData?.name ? `${employeeData.name} · ${selectedYear}` : `Track leave and balances for ${selectedYear}.`,
        onBack: router.back,
        action: { label: "Request Holiday", icon: "plus", onPress: () => router.push("/holiday-request") },
        metadata: <View style={styles.heroMetaRow}>
              <View
                style={[
                  styles.heroMetaChip,
                  {
                    backgroundColor: withAlpha(colors.surfaceAlt, 0.82),
                    borderColor: withAlpha(colors.border, 0.82),
                  },
                ]}
              >
                <Icon name="pie-chart" size={12} color={colors.textMuted} />
                <Text tone={"primary"} style={[styles.heroMetaText]}>
                  Allowance: {Number(totalAllowance.toFixed(1))}
                </Text>
              </View>

              <View
                style={[
                  styles.heroMetaChip,
                  {
                    backgroundColor: isOverbooked
                      ? withAlpha(colors.danger, 0.13)
                      : withAlpha(colors.surfaceAlt, 0.82),
                    borderColor: isOverbooked
                      ? withAlpha(colors.danger, 0.45)
                      : withAlpha(colors.border, 0.82),
                  },
                ]}
              >
                <Icon
                  name={isOverbooked ? "alert-triangle" : "check-circle"}
                  size={12}
                  color={isOverbooked ? colors.danger : colors.textMuted}
                />
                <Text
                  tone={isOverbooked ? "danger" : "primary"} style={[styles.heroMetaText]}
                >
                  {balanceLabel}
                </Text>
              </View>
            </View>,
      }}
    >
      <>
        {historyError ? <Banner tone="warning" title="History needs attention">{historyError}</Banner> : null}

        {employeeData && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <Stat
                label="Paid used"
                value={Number(pastPaidUsed.toFixed(1))}
              />
              <Stat
                label="Paid booked"
                value={Number(upcomingPaidBooked.toFixed(1))}
              />
              <Stat
                label="Unpaid"
                value={Number(unpaid.toFixed(1))}
              />
            </View>

            {isOverbooked ? (
              <View
                style={[
                  styles.balanceWarning,
                  {
                    backgroundColor: withAlpha(colors.danger, 0.12),
                    borderColor: withAlpha(colors.danger, 0.42),
                  },
                ]}
              >
                <Icon name="alert-triangle" size={18} color={colors.danger} />
                <View style={styles.balanceWarningCopy}>
                  <Text tone={"danger"} style={[styles.balanceWarningTitle]}>
                    Paid leave exceeds allowance by {balanceValue} days
                  </Text>
                  <Text tone={"muted"} style={[styles.balanceWarningText]}>
                    Review upcoming bookings or contact the office.
                  </Text>
                </View>
              </View>
            ) : null}

            <HolidayTableSection
              title="Requests"
              count={requestedItems.length}
              items={requestedItems}
              emptyMessage="No holiday requests waiting for approval."
              colors={colors}
              stacked={stackHolidayRows}
              onCancel={(item) => cancelHoliday(item.holiday.id)}
            />

            <HolidayTableSection
              title="Upcoming confirmed"
              count={upcomingItems.length}
              items={upcomingItems}
              emptyMessage="No upcoming confirmed holidays."
              colors={colors}
              stacked={stackHolidayRows}
            />

            <HolidayTableSection
              title="Past holidays"
              count={pastItems.length}
              items={visiblePastItems}
              emptyMessage={`No confirmed holidays in ${selectedYear}.`}
              colors={colors}
              stacked={stackHolidayRows}
              muted
              footer={pastItems.length > 3 ? (
                <AppButton
                  label={historyExpanded ? "Show recent" : `View all ${pastItems.length}`}
                  variant="ghost"
                  size="small"
                  onPress={() => setHistoryExpanded((expanded) => !expanded)}
                />
              ) : null}
            />
          </>
        )}
      </>
    </PageShell>
  );
}

/* ─────────────────────────── UI subcomponent ─────────────────────────── */
function Stat({ label, value }) {

  return (
    <View style={styles.statBox}>
      <Text tone={"muted"} style={[styles.statLabel]}>{label}</Text>
      <Text tone={"primary"} style={[styles.statValue]}>{value}</Text>
    </View>
  );
}

function HolidayTableSection({ title, count, items, emptyMessage, colors, onCancel, muted = false, stacked = false, footer = null }) {
  const showTableHeader = items.length > 0 && !stacked;
  return (
    <View style={styles.tableSection}>
      <View style={styles.tableSectionHeader}>
        <Text tone={"primary"} style={[styles.tableSectionTitle]}>{title}</Text>
        <View
          style={[styles.tableCount, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        >
          <Text tone={"muted"} style={[styles.tableCountText]}>{count}</Text>
        </View>
      </View>

      <View
        style={[styles.holidayTable, getCardSurfaceStyle(colors)]}
      >
        {showTableHeader ? (
          <View
            style={[
              styles.holidayTableHeader,
              { backgroundColor: colors.surfaceAlt, borderBottomColor: colors.divider },
            ]}
          >
            <Text tone={"muted"} style={[styles.holidayTableHeading, styles.tableDateColumn]}>Date</Text>
            <Text tone={"muted"} style={[styles.holidayTableHeading, styles.tableDaysColumn]}>Days</Text>
            <Text tone={"muted"} style={[styles.holidayTableHeading, styles.tableTypeColumn]}>Type</Text>
            <Text
              tone={"muted"} style={[
                styles.holidayTableHeading,
                styles.tableTrailingColumn,
              ]}
            >
              {onCancel ? "Action" : "Balance"}
            </Text>
          </View>
        ) : null}

        {items.length === 0 ? (
          <View style={styles.tableEmptyRow}>
            <Icon name="calendar" size={17} color={colors.textMuted} />
            <Text tone={"muted"} style={[styles.tableEmptyText]}>{emptyMessage}</Text>
          </View>
        ) : (
          items.map((item) => {
            const numericBalance = Number.parseFloat(item.trailingValue);
            const negativeBalance = item.trailingLabel === "Balance after" && numericBalance < 0;
            return (
              <View
                key={item.id}
                style={[
                  styles.holidayTableRow,
                  stacked && styles.holidayTableRowStacked,
                  {
                    borderBottomColor: colors.divider,
                    opacity: muted ? 0.82 : 1,
                  },
                ]}
              >
                <View style={styles.tableDateColumn}>
                    <Text tone={"primary"} style={[styles.tableDateText]} numberOfLines={2}>
                      {item.start === item.end ? item.start : `${item.start} → ${item.end}`}
                    </Text>
                    {item.notes ? (
                      <Text tone={"muted"} style={[styles.tableNoteText]} numberOfLines={1}>
                        {item.notes}
                      </Text>
                    ) : null}
                </View>
                <View style={stacked ? styles.tableStackedMeta : styles.tableInlineMeta}>
                  <Text
                    tone={"primary"} style={[
                      styles.tableCellText,
                      !stacked && styles.tableDaysColumn,
                    ]}
                  >
                    {stacked ? `${item.days} ${item.days === 1 ? "day" : "days"}` : item.days}
                  </Text>
                  <Text
                      style={[
                        styles.tableCellText,
                        !stacked && styles.tableTypeColumn,
                        { color: item.typeColor },
                      ]}
                    >{item.type}</Text>
                    {onCancel ? (
                      <TouchableOpacity
                        style={[
                          styles.tableCancelButton,
                          !stacked && styles.tableTrailingColumn,
                          {
                            backgroundColor: withAlpha(colors.danger, 0.12),
                            borderColor: withAlpha(colors.danger, 0.35),
                          },
                        ]}
                        onPress={() => onCancel(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Cancel holiday request from ${item.start}`}
                      >
                        <Text tone={"danger"} style={[styles.tableCancelText]}>Cancel</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={stacked ? styles.tableStackedBalance : undefined}>
                        {stacked ? (
                          <Text tone={"muted"} style={[styles.tableStackedLabel]}>Balance</Text>
                        ) : null}
                        <Text
                          tone={negativeBalance ? "danger" : "primary"} style={[
                            styles.tableCellText,
                            !stacked && styles.tableTrailingColumn,
                          ]}
                        >
                          {Number.isFinite(numericBalance) ? numericBalance : "—"}
                        </Text>
                      </View>
                    )}
                </View>
              </View>
            );
          })
        )}
      </View>
      {footer ? <View style={styles.tableFooter}>{footer}</View> : null}
    </View>
  );
}

/* ────────────────────────────── Styles ────────────────────────────── */
