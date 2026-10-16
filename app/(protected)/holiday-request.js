import { fetchEmployeeHistory } from "../../lib/hrHistoryApi";
import { routeColors } from "../../lib/design/routePresentation/holiday-request-js.js";
import { styles } from "../../lib/design/screenStyles/holiday-request-js.js";
import { AppButton, AppText as Text, Banner, Checkbox, FormStep, SegmentedControl, TextArea } from "../../components/ui/AppPrimitives";
// app/holiday-request.js
import {
  useRouter } from "expo-router";
import { collection,
  doc,
  getDocs,
  query,
  where,
  setDoc } from "firebase/firestore";
import { useEffect,
  useMemo,
  useState } from "react";
import {
  View } from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/Feather";

import { db } from "../../firebaseConfig";
import { formatISODateDDMMYYYY } from "../../lib/dateFormat";
import { countHolidayDays, holidayDateKeysFromRange, isReviewableHolidayRange } from "../../lib/holidayRequestParity";
import { getHolidayLeaveType } from "../../lib/holidayPresentation";
import { holidayOwnership } from "../../lib/holidayOwnership";
import { designTokens as t } from "../../lib/design/tokens";
import { runOrQueueFirestoreMutation } from "../../lib/sync/firestoreQueue";
import { useAuth } from "../../providers/AuthProvider";
import { useDataCache } from "../../providers/DataCacheProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { withAlpha } from "../../lib/design/color";
import PageShell from "../../components/layout/PageShell";

export default function HolidayRequestPage() {
  const router = useRouter();
  const { employee, user, isAuthed, loading } = useAuth();
  const companyId = String(employee?.companyId || "").trim();
  const { invalidate } = useDataCache();
  const { colors } = useTheme();

  const [startDate, setStartDate] = useState(null); // "YYYY-MM-DD"
  const [endDate, setEndDate] = useState(null); // "YYYY-MM-DD"

  // Paid | Unpaid | Accrued
  const [paidStatus, setPaidStatus] = useState("Paid");

  const [notes, setNotes] = useState("");

  // UI extras
  const [halfDay, setHalfDay] = useState(false); // single-day only
  const [halfDayPeriod, setHalfDayPeriod] = useState("AM"); // AM | PM

  // Resolve employee record
  const [empRecord, setEmpRecord] = useState(null);
  const [empLoading, setEmpLoading] = useState(true);

  // Existing data (for validation)
  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [holidaysError, setHolidaysError] = useState(null);
  const [bankHolidaySet, setBankHolidaySet] = useState(() => new Set());

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [holidayConflictMsg, setHolidayConflictMsg] = useState("");
  const [jobConflictMsg, setJobConflictMsg] = useState("");

  const isSingleDay = !!startDate && (endDate ?? startDate) === startDate;

  useEffect(() => {
    const controller = new AbortController();
    fetch("https://www.gov.uk/bank-holidays.json", { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`Bank holidays fetch failed: ${response.status}`);
        return response.json();
      })
      .then((data) => setBankHolidaySet(new Set(
        (data?.["england-and-wales"]?.events || []).map((event) => event.date).filter(Boolean)
      )))
      .catch((error) => {
        if (error?.name !== "AbortError") console.warn("Bank holidays unavailable:", error);
      });
    return () => controller.abort();
  }, []);

  // If user extends selection to multi-day, disable half-day automatically (UI only)
  useEffect(() => {
    if (!isSingleDay && halfDay) setHalfDay(false);
  }, [isSingleDay, halfDay]);

  /* ---------------- helpers ---------------- */
  const norm = (v) => String(v ?? "").trim().toLowerCase();

  const toDate = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
    // supports "YYYY-MM-DD" or ISO
    const d = new Date(v);
    return Number.isNaN(+d) ? null : d;
  };

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const sameYMD = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const fmt = (d) => {
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Half-day rules for single-day same date:
  // - Full day conflicts with anything on that date
  // - AM conflicts with AM/full, PM conflicts with PM/full
  const halfDayOverlaps = (newHalf, newWhen, oldHalf, oldWhen) => {
    if (!newHalf || !oldHalf) return true; // if either is full-day => overlap
    if (!newWhen || !oldWhen) return true;
    return String(newWhen).toUpperCase() === String(oldWhen).toUpperCase();
  };

  // ✅ strict paid detection (same intention as web HR page)
  const isPaidHoliday = (h = {}) => {
    return getHolidayLeaveType(h) === "Paid";
  };

  const requestedDays = useMemo(() => {
    return countHolidayDays(startDate, endDate || startDate, {
      bankHolidays: bankHolidaySet,
      startHalfDay: isSingleDay && halfDay,
    });
  }, [startDate, endDate, halfDay, isSingleDay, bankHolidaySet]);

  /* ---------------- employee resolve ---------------- */
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (loading || !isAuthed || !companyId) {
        if (mounted) {
          setEmpRecord(null);
          setEmpLoading(false);
        }
        return;
      }
      setEmpLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "employees"), where("companyId", "==", companyId)));
        const employees = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const byCode =
          employee?.userCode &&
          employees.find((e) => e.userCode === employee.userCode);

        const emailToMatch = (employee?.email || user?.email || "").toLowerCase();
        const byEmail =
          !byCode &&
          emailToMatch &&
          employees.find((e) => (e.email || "").toLowerCase() === emailToMatch);

        const resolved = byCode || byEmail || null;
        if (mounted) setEmpRecord(resolved);
      } catch (e) {
        if (mounted) setEmpRecord(null);
        console.warn("Failed to resolve employee:", e);
      } finally {
        if (mounted) setEmpLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [companyId, loading, isAuthed, employee?.userCode, employee?.email, user?.email]);

  /* ---------------- load existing holidays + bookings ---------------- */
  useEffect(() => {
    let mounted = true;

    const loadHolidays = async () => {
      setHolidaysLoading(true);
      setHolidaysError(null);
      try {
        const result = await fetchEmployeeHistory(user, employee, "holidays");
        const all = result.records;
        if (mounted) {
          setHolidays(all);
          if (result.withheldCount || !result.historyComplete) setHolidaysError(new Error("Some historical leave ownership needs office review before your allowance can be verified."));
        }
      } catch (e) {
        console.warn("Failed to load holidays:", e);
        if (mounted) setHolidaysError(e);
        if (mounted) setHolidays([]);
      } finally {
        if (mounted) setHolidaysLoading(false);
      }
    };

    const loadBookings = async () => {
      setBookingsLoading(true);
      try {
        // ✅ If your collection is not "bookings", change it here.
        const snap = await getDocs(query(collection(db, "bookings"), where("companyId", "==", companyId)));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (mounted) setBookings(all);
      } catch (e) {
        // if no bookings collection in this app build, don’t crash
        console.warn("Failed to load bookings:", e);
        if (mounted) setBookings([]);
      } finally {
        if (mounted) setBookingsLoading(false);
      }
    };

    if (isAuthed && !loading && companyId) {
      loadHolidays();
      loadBookings();
    } else {
      setHolidays([]);
      setBookings([]);
      setHolidaysLoading(false);
      setBookingsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [companyId, isAuthed, loading, employee, user]);

  /* ---------------- allowance calc (paid remaining) ---------------- */
  const allowanceInfo = useMemo(() => {
    const yr = startDate ? toDate(startDate)?.getFullYear() : new Date().getFullYear();
    const name = empRecord?.name || employee?.name || user?.displayName || user?.email || "";

    const daysForHoliday = (h) => {
      return countHolidayDays(h.startDate, h.endDate || h.startDate, {
        bankHolidays: bankHolidaySet,
        startHalfDay: h.startHalfDay === true || norm(h.startHalfDay) === "true",
        endHalfDay: h.endHalfDay === true || norm(h.endHalfDay) === "true",
      });
    };

    // allowance: holidayAllowances[year] preferred, else legacy holidayAllowance
    const yrKey = String(yr);
    const allowance =
      typeof empRecord?.holidayAllowances?.[yrKey] === "number"
        ? empRecord.holidayAllowances[yrKey]
        : typeof empRecord?.holidayAllowance === "number"
        ? empRecord.holidayAllowance
        : 0;

    const usedPaidApproved = holidays
      .filter((h) => {
        const st = String(h.status || "").toLowerCase();
        if (st !== "approved") return false;

        const hs = toDate(h.startDate);
        const he = toDate(h.endDate) || hs;
        if (!hs || !he) return false;
        if (hs.getFullYear() !== yr || he.getFullYear() !== yr) return false;

        return isPaidHoliday(h);
      })
      .reduce((acc, h) => acc + daysForHoliday(h), 0);

    const remainingPaid = Number((allowance - usedPaidApproved).toFixed(2));

    return {
      year: yr,
      name,
      allowance: Number(allowance || 0),
      usedPaidApproved: Number(usedPaidApproved.toFixed(2)),
      remainingPaid,
    };
  }, [startDate, empRecord, employee?.name, user?.displayName, user?.email, holidays, bankHolidaySet]);

  // Force unpaid if no paid left
  useEffect(() => {
    if (allowanceInfo.remainingPaid <= 0 && paidStatus === "Paid") {
      setPaidStatus("Unpaid");
    }
  }, [allowanceInfo.remainingPaid, paidStatus]);

  /* ---------------- holiday overlap conflict ---------------- */
  const holidayConflict = useMemo(() => {
    setHolidayConflictMsg("");

    const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
      if (!aStart || !aEnd || !bStart || !bEnd) return false;
      const as = startOfDay(aStart).getTime();
      const ae = endOfDay(aEnd).getTime();
      const bs = startOfDay(bStart).getTime();
      const be = endOfDay(bEnd).getTime();
      return as <= be && bs <= ae;
    };

    const name = allowanceInfo.name;
    if (!name) return null;
    if (!startDate) return null;

    const s = toDate(startDate);
    const e = toDate(endDate || startDate);
    if (!s || !e) return null;

    const conflicts = holidays.filter((h) => {
      if (String(h.employee || "").trim() !== String(name).trim()) return false;

      const st = String(h.status || "").toLowerCase();
      if (st === "declined" || st === "cancelled" || st === "canceled") return false;

      const hs = toDate(h.startDate);
      const he = toDate(h.endDate) || hs;
      if (!hs || !he) return false;

      if (!rangesOverlap(s, e, hs, he)) return false;

      // Allow AM+PM split only if both are single-day and same date
      const newSingle = sameYMD(s, e);
      const oldSingle = sameYMD(hs, he);

      if (newSingle && oldSingle && sameYMD(s, hs)) {
        const newIsHalf = !!halfDay;
        const newWhen = newIsHalf ? halfDayPeriod : null;

        const oldIsHalf =
          h.startHalfDay === true ||
          h.halfDay === true ||
          norm(h.startHalfDay) === "true" ||
          norm(h.halfDay) === "true";

        const oldWhen = String(h.startAMPM || h.halfDayPeriod || h.halfDayType || "")
          .toUpperCase()
          .trim();

        return halfDayOverlaps(newIsHalf, newWhen, oldIsHalf, oldWhen);
      }

      return true;
    });

    if (!conflicts.length) return null;

    const h = conflicts[0];
    return {
      id: h.id,
      from: toDate(h.startDate),
      to: toDate(h.endDate) || toDate(h.startDate),
      type: String(h.paidStatus || h.leaveType || "Holiday"),
      status: String(h.status || "requested"),
    };
  }, [allowanceInfo.name, startDate, endDate, holidays, halfDay, halfDayPeriod]);

  useEffect(() => {
    if (!holidayConflict) {
      setHolidayConflictMsg("");
      return;
    }
    setHolidayConflictMsg(
      `⚠️ You already have a holiday that overlaps: ${fmt(holidayConflict.from)} → ${fmt(
        holidayConflict.to
      )} (${holidayConflict.type}, ${holidayConflict.status}).`
    );
  }, [holidayConflict]);

  /* ---------------- booking/job conflict ---------------- */
  const jobConflict = useMemo(() => {
    setJobConflictMsg("");

    const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
      if (!aStart || !aEnd || !bStart || !bEnd) return false;
      const as = startOfDay(aStart).getTime();
      const ae = endOfDay(aEnd).getTime();
      const bs = startOfDay(bStart).getTime();
      const be = endOfDay(bEnd).getTime();
      return as <= be && bs <= ae;
    };

    const bookingIsActive = (b) => {
      const st = norm(b.status || b.bookingStatus || b.state);
      if (st.includes("cancel")) return false;
      if (st.includes("declin")) return false;
      return true;
    };

    const bookingHasEmployee = (b, empName) => {
      const target = norm(empName);
      if (!target) return false;

      const candidates = [
        b.employees,
        b.crew,
        b.staff,
        b.assignedEmployees,
        b.employeeNames,
        b.people,
      ];

      for (const c of candidates) {
        if (!c) continue;

        if (Array.isArray(c)) {
          if (c.some((x) => norm(x?.name ?? x) === target)) return true;
        }

        if (typeof c === "object" && !Array.isArray(c)) {
          const keys = Object.keys(c);
          if (keys.some((k) => norm(k) === target)) return true;
          const vals = Object.values(c);
          if (vals.some((v) => norm(v?.name ?? v) === target)) return true;
        }
      }

      if (typeof b.employee === "string" && norm(b.employee) === target) return true;

      return false;
    };

    const bookingRange = (b) => {
      const s = toDate(b.startDate) || toDate(b.date) || null;
      const e = toDate(b.endDate) || toDate(b.date) || null;

      if (s && e) return { start: s, end: e };

      if (Array.isArray(b.dates) && b.dates.length) {
        const parsed = b.dates.map(toDate).filter(Boolean);
        if (!parsed.length) return { start: null, end: null };
        parsed.sort((a, b) => +a - +b);
        return { start: parsed[0], end: parsed[parsed.length - 1] };
      }

      return { start: null, end: null };
    };

    const name = allowanceInfo.name;
    if (!name) return null;
    if (!startDate) return null;

    const s = toDate(startDate);
    const e = toDate(endDate || startDate);
    if (!s || !e) return null;

    const conflicts = bookings.filter((b) => {
      if (!bookingIsActive(b)) return false;
      if (!bookingHasEmployee(b, name)) return false;

      const r = bookingRange(b);
      if (!r.start || !r.end) return false;

      return rangesOverlap(s, e, r.start, r.end);
    });

    if (!conflicts.length) return null;

    const b = conflicts[0];
    const r = bookingRange(b);

    const title =
      b.jobNumber ||
      b.jobNo ||
      b.job ||
      b.title ||
      b.production ||
      b.client ||
      "Job";

    const where = b.location || b.toLocation || b.fromLocation || "";

    return { id: b.id, title: String(title), where: String(where || ""), from: r.start, to: r.end };
  }, [allowanceInfo.name, startDate, endDate, bookings]);

  useEffect(() => {
    if (!jobConflict) {
      setJobConflictMsg("");
      return;
    }
    setJobConflictMsg(
      `⚠️ You are booked on a job during these dates: ${jobConflict.title}${
        jobConflict.where ? ` (${jobConflict.where})` : ""
      } — ${fmt(jobConflict.from)} → ${fmt(jobConflict.to)}.`
    );
  }, [jobConflict]);

  /* ---------------- calendar marks ---------------- */
  const markedDates = useMemo(() => {
    const m = {};
    if (startDate) {
      m[startDate] = {
        startingDay: true,
        color: colors.accent,
        textColor: routeColors.hex_fff_yhjmu8,
      };
    }

    const last = endDate || startDate;
    if (last) {
      m[last] = { ...(m[last] || {}), endingDay: true, color: colors.accent, textColor: routeColors.hex_fff_yhjmu8 };
    }

    if (startDate && last) {
      let cur = new Date(startDate);
      const endD = new Date(last);
      while (cur <= endD) {
        const s = cur.toISOString().split("T")[0];
        if (!m[s]) m[s] = { color: withAlpha(colors.accent, 0.45), textColor: routeColors.hex_fff_yhjmu8 };
        cur.setDate(cur.getDate() + 1);
      }
      if (isSingleDay && halfDay && startDate) {
        m[startDate] = { ...(m[startDate] || {}), color: withAlpha(colors.accent, 0.8), textColor: routeColors.hex_fff_yhjmu8 };
      }
    }

    return m;
  }, [startDate, endDate, isSingleDay, halfDay, colors.accent]);

  const handleDayPress = (day) => {
    const d = day.dateString;
    if (!startDate || (startDate && endDate)) {
      setStartDate(d);
      setEndDate(null);
      setHalfDay(false);
      setHalfDayPeriod("AM");
    } else if (startDate && !endDate) {
      if (new Date(d) < new Date(startDate)) {
        setEndDate(startDate);
        setStartDate(d);
      } else {
        setEndDate(d);
      }
    }
  };

  /* ---------------- submit ---------------- */
  const submitRequest = async () => {
    if (loading || !isAuthed || !companyId) return alert("Please sign in first.");
    if (empLoading) return;
    if (holidaysLoading || bookingsLoading) return alert("Loading validation data… please try again.");
    if (holidaysError) return alert("Unable to verify your existing holiday requests. Reconnect and reload before submitting.");

    const name = allowanceInfo.name;

    if (!name) return alert("Your employee profile is incomplete.");
    if (!startDate) return alert("Please pick a start date.");

    const startStr = startDate;
    const endStr = endDate || startDate;

    if (!notes.trim()) return alert("Please enter a reason for the holiday.");

    const s = new Date(startStr);
    const eDate = new Date(endStr);
    if (isNaN(+s) || isNaN(+eDate) || s > eDate) {
      return alert("End date must be the same or after start date.");
    }
    if (!isReviewableHolidayRange(startStr, endStr)) {
      return alert("Choose dates in the same calendar year so the office can review your request.");
    }

    // Block: holiday overlap
    if (holidayConflict) return alert(holidayConflictMsg || "Holiday overlaps an existing request.");

    // Block: job overlap
    if (jobConflict) return alert(jobConflictMsg || "Holiday overlaps a job you are booked on.");

    // Paid allowance rules
    const remainingPaid = allowanceInfo.remainingPaid;
    if (paidStatus === "Paid") {
      if (remainingPaid <= 0) return alert("No paid holiday remaining — you can only book unpaid holiday.");
      if (requestedDays > remainingPaid) {
        return alert(
          `Not enough paid holiday remaining.\nRemaining: ${remainingPaid} day(s)\nThis request: ${requestedDays} day(s)\n\nBook as Unpaid or shorten/split the request.`
        );
      }
    }

    // Normalised flags
    const isUnpaid = paidStatus === "Unpaid";
    const isAccrued = paidStatus === "Accrued";
    const paid = paidStatus === "Paid";
    const leaveType = paidStatus;

    try {
      // ✅ Save half-day fields for single-day (so web + conflict rules stay consistent)
      const single = startStr === endStr;
      const holidayRef = doc(collection(db, "holidays"));
      const holidayId = holidayRef.id;

      const holidayData = {
        ...holidayOwnership(employee),
        employee: name,
        employeeName: name,
        employeeCode: employee?.userCode || empRecord?.userCode || null,
        userCode: employee?.userCode || empRecord?.userCode || null,
        employeeEmail: employee?.email || empRecord?.email || user?.email || null,

        // keep as strings (your web + HR parser supports these)
        startDate: startStr,
        endDate: endStr,
        holidayYear: s.getFullYear(),
        holidayDateKeys: holidayDateKeysFromRange(startStr, endStr),
        companyId: employee?.companyId || empRecord?.companyId || null,

        // ✅ optional, but recommended for consistency:
        startHalfDay: single ? !!halfDay : false,
        startAMPM: single && halfDay ? halfDayPeriod : null,
        endHalfDay: false,
        endAMPM: null,

        holidayReason: notes,
        paidStatus,
        isUnpaid,
        unpaid: isUnpaid,
        isAccrued,
        paid,
        isPaid: paid,
        leaveType,

        createdAt: new Date(),
        status: "requested",
      };

      const { queued } = await runOrQueueFirestoreMutation({
        run: () => setDoc(holidayRef, holidayData, { merge: false }),
        mutation: {
          operation: "set",
          docPath: `holidays/${holidayId}`,
          data: holidayData,
          options: { merge: false },
          entityType: "holiday",
          entityId: holidayId,
          meta: { employeeCode: employee?.userCode || null },
        },
      });
      await Promise.all([
        invalidate("collection:holidays"),
        invalidate("holidays:employee:"),
        invalidate("me-dashboard:"),
      ]);

      if (queued) {
        alert("📥 Holiday request queued offline. It will sync automatically.");
      } else {
        alert("✅ Holiday request submitted!");
      }
      router.back();
    } catch (err) {
      console.error("Holiday submit failed:", err);
      alert(`❌ Error submitting request\n${(err.code || "")} ${(err.message || "")}`.trim());
    }
  };

  const paidAllowed = allowanceInfo.remainingPaid > 0;

  /* ---------------- loading gate ---------------- */
  if (loading || empLoading) {
    return (
      <PageShell appearance="grouped" mode="form" width="form" header={{ variant: "compact", title: "Request Holiday", onBack: router.back }}>
        <View style={{ padding: t.spacing.md }}>
          <Text tone={"muted"}>Loading…</Text>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell appearance="grouped" mode="form" width="form" header={{ variant: "compact", title: "Request Holiday", onBack: router.back }}>
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroMetaRow}>
              <View
                style={[
                  styles.heroMetaChip,
                  {
                    backgroundColor: withAlpha(colors.surfaceAlt, 0.75),
                    borderColor: withAlpha(colors.border, 0.75),
                  },
                ]}
              >
                <Icon name="clock" size={12} color={colors.textMuted} />
                <Text tone={"primary"} style={[styles.heroMetaText]}>
                  {startDate ? `${requestedDays} day(s)` : "Pick dates"}
                </Text>
              </View>
              <View
                style={[
                  styles.heroMetaChip,
                  {
                    backgroundColor: withAlpha(colors.surfaceAlt, 0.75),
                    borderColor: withAlpha(colors.border, 0.75),
                  },
                ]}
              >
                <Icon name="briefcase" size={12} color={colors.textMuted} />
                <Text tone={"primary"} style={[styles.heroMetaText]}>
                  {paidStatus}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <FormStep fullWidth number="1" title="Choose dates" hint="Select the first and last day of leave">
          <View style={[styles.calendarCard, { backgroundColor: colors.groupedSurface }]}>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={markedDates}
            markingType="period"
            theme={{
              calendarBackground: colors.groupedSurface,
              dayTextColor: colors.text,
              monthTextColor: colors.text,
              arrowColor: colors.accent,
              selectedDayBackgroundColor: colors.accent,
              selectedDayTextColor: routeColors.hex_fff_yhjmu8,
              todayTextColor: colors.accent,
            }}
          />
          </View>

        <View style={{ gap: t.spacing.xxs, marginTop: t.spacing.sm }}>
          <Text tone={"muted"}>
            Start:{" "}
            <Text tone={"primary"}>{startDate ? formatISODateDDMMYYYY(startDate) : "Not selected"}</Text>
            {isSingleDay && halfDay ? <Text style={{ color: routeColors.hex_86efac_dg95e1 }}> ({halfDayPeriod} half)</Text> : null}
          </Text>
          <Text tone={"muted"}>
            End: <Text tone={"primary"}>{endDate || startDate ? formatISODateDDMMYYYY(endDate || startDate) : "Not selected"}</Text>
          </Text>
        </View>
        </FormStep>

        {/* Allowance + request size */}
        {startDate ? (
          <Banner title={`Allowance check (${allowanceInfo.year})`} tone="info" presentation="card" layoutStyle={styles.requestNotice}>
            <Text tone={"muted"}>
              Allowance: <Text tone={"primary"} variant="bodyStrong" style={null}>{allowanceInfo.allowance}</Text>{" "}
              • Used (approved paid):{" "}
              <Text tone={"primary"} variant="bodyStrong" style={null}>{allowanceInfo.usedPaidApproved}</Text>{" "}
              • Remaining paid:{" "}
              <Text tone={"primary"} variant="bodyStrong" style={null}>{allowanceInfo.remainingPaid}</Text>
            </Text>
            <Text tone={"muted"} style={{ marginTop: t.spacing.xxs }}>
              This request: <Text tone={"primary"} variant="bodyStrong" style={null}>{requestedDays}</Text> day(s) (weekends and bank holidays excluded)
            </Text>

            {allowanceInfo.remainingPaid <= 0 ? (
              <Text variant="bodyStrong" tone={"danger"} style={{ marginTop: t.spacing.xs }}>
                No paid holiday remaining — you can only book unpaid holiday.
              </Text>
            ) : null}
          </Banner>
        ) : null}

        {/* Conflict warnings */}
        {holidayConflictMsg ? (
          <Banner title="Holiday conflict" tone="danger" presentation="card" layoutStyle={styles.requestNotice}>
            <Text tone={"muted"} style={{ marginTop: t.spacing.xxs }}>{holidayConflictMsg}</Text>
          </Banner>
        ) : null}

        {jobConflictMsg ? (
          <Banner title="Job conflict" tone="warning" presentation="card" layoutStyle={styles.requestNotice}>
            <Text tone={"muted"} style={{ marginTop: t.spacing.xxs }}>{jobConflictMsg}</Text>
          </Banner>
        ) : null}

        {startDate && endDate && !isReviewableHolidayRange(startDate, endDate) ? (
          <Banner title="Choose one calendar year" tone="warning" presentation="card" layoutStyle={styles.requestNotice}>
            <Text>The office reviews each year separately. Please make two requests.</Text>
          </Banner>
        ) : null}

        {/* Leave Type – Paid / Unpaid / Accrued */}
        <FormStep fullWidth number="2" title="Leave type" hint="Choose how this leave is recorded">

          <SegmentedControl
            pill
            subtle
            density="compact"
            accessibilityLabel="Leave type"
            selectionRole="radio"
            value={paidStatus}
            onChange={setPaidStatus}
            options={[
              { value: "Paid", label: paidAllowed ? "Paid holiday" : "Paid unavailable", disabled: !paidAllowed },
              { value: "Unpaid", label: "Unpaid holiday" },
            ]}
          />

          {paidStatus === "Paid" && paidAllowed && requestedDays > allowanceInfo.remainingPaid ? (
            <Text variant="bodyStrong" tone={"danger"} style={{ marginTop: t.spacing.xs }}>
              Not enough paid remaining for this request — choose Unpaid or shorten/split.
            </Text>
          ) : null}
        </FormStep>

        {/* Half-day (single only) */}
        <FormStep fullWidth number="3" title="Half day" hint="Available for single-day requests">

          <Checkbox
            checked={halfDay}
            onChange={setHalfDay}
            disabled={!isSingleDay}
            label={isSingleDay ? "Book as half day" : "Half-day only available for a single day"}
          />

          {isSingleDay && halfDay && (
            <SegmentedControl
              pill
              subtle
              density="compact"
              accessibilityLabel="Half-day period"
              selectionRole="radio"
              value={halfDayPeriod}
              onChange={setHalfDayPeriod}
              options={[{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }]}
            />
          )}

          <Text tone={"muted"} style={{ marginTop: t.spacing.xs, fontSize: t.typography.metadata.fontSize }}>
            Half-days are only for a single-day request.
          </Text>
        </FormStep>

        {/* Notes */}
        <FormStep fullWidth number="4" title="Notes" hint="Optional context for the approver" last>
          <TextArea
            label="Notes / Reason"
            placeholder="Add notes or reason..."
            value={notes}
            onChangeText={setNotes}
          />
        </FormStep>

        {/* Submit */}
        <AppButton
          label={holidaysLoading || bookingsLoading ? "Loading…" : "Submit Request"}
          onPress={submitRequest}
          disabled={!!holidayConflict || !!jobConflict || !!(startDate && endDate && !isReviewableHolidayRange(startDate, endDate))}
          loading={holidaysLoading || bookingsLoading}
          fullWidth
        />
    </PageShell>
  );
}
