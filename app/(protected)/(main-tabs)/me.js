import { getCardSurfaceStyle } from "../../../lib/design/cardSurface";
import { routeColors } from "../../../lib/design/routePresentation/main-tabs-me-js.js";
import { styles } from "../../../lib/design/screenStyles/main-tabs-me-js.js";
import { AppButton, AppText as Text, AppPressable as TouchableOpacity, Checkbox, FormField, IconButton, SegmentedControl } from "../../../components/ui/AppPrimitives";
// app/(protected)/me.js
import {
  useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
  } from "firebase/firestore";
import { useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import {
  Alert,
  View } from "react-native";
import { Calendar } from "react-native-calendars";
import Icon from "react-native-vector-icons/Feather";

import {
  EmptyState,
  LoadingState,
} from "../../../components/AsyncState";
import PageShell from "../../../components/layout/PageShell";
import { createDashboardCardStyles } from "../../../lib/design/dashboard";
import {
  calculateRemainingHolidayAllowance,
  holidayBelongsToYear,
} from "../../../lib/holidayYear";
import { employeeMatchesHoliday } from "../../../lib/holidayOwnership";
import { computeTimesheetWeekHours } from "../../../lib/timesheetHours";
import { getBalanceStatusTone } from "../../../lib/design/semantics";
import {
  useEmployeeTimesheets,
  useEmployees,
  useHolidays,
  useTimesheetQueries,
} from "../../../hooks/useOperationalData";

// 🔑 Provider + Firebase
import { auth, db } from "../../../firebaseConfig";
import { useAuth } from "../../../providers/AuthProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { useDataCache } from "../../../providers/DataCacheProvider";
import { withAlpha } from "../../../lib/design/color";

const ME_CACHE_TTL_MS = 10 * 60 * 1000;

function formatTimesheetHours(hours) {
  const totalMinutes = Math.max(0, Math.round(toNumber(hours, 0) * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export default function MePage() {
  const router = useRouter();
  const { user, employee, isAuthed, loading } = useAuth();
  const companyId = String(employee?.companyId || "").trim();
  const { colors, colorScheme } = useTheme();
  const neutralSurface = colorScheme === "dark" ? colors.groupedSurface : colors.surface;
  const employeesResource = useEmployees();
  const holidaysResource = useHolidays();
  const timesheetsResource = useEmployeeTimesheets();
  const queriesResource = useTimesheetQueries();
  const employeeRows = employeesResource.data;
  const holidayRows = holidaysResource.data;
  const employeeTimesheets = timesheetsResource.data;
  const employeeTimesheetQueries = queriesResource.data;
  const refreshEmployees = employeesResource.refresh;
  const refreshHolidays = holidaysResource.refresh;
  const refreshEmployeeTimesheets = timesheetsResource.refresh;
  const refreshEmployeeTimesheetQueries = queriesResource.refresh;
  const dashboardCards = useMemo(() => createDashboardCardStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(true);
  const [personalError, setPersonalError] = useState(null);
  const [hasPersonalContent, setHasPersonalContent] = useState(false);

  // Personal data blocks
  const [myHolidays, setMyHolidays] = useState([]);
  const [nextHoliday, setNextHoliday] = useState(null);
  const [pendingHolidayCount, setPendingHolidayCount] = useState(0);

  // Allowance + used + booked + remaining (CURRENT YEAR)
  const [holidayAllowance, setHolidayAllowance] = useState(0); // totalAllowance (allowance + carryover)
  const [holidayUsedDays, setHolidayUsedDays] = useState(0);
  const [holidayBookedDays, setHolidayBookedDays] = useState(0);
  const [holidayRemaining, setHolidayRemaining] = useState(0);

  const [timesheetStats, setTimesheetStats] = useState({
    weekHours: 0,
    pending: 0,
    lastSubmitted: null,
  });

  // latest manager query on a timesheet
  const [latestTimesheetQuery, setLatestTimesheetQuery] = useState(null);

  const [noteStartDate, setNoteStartDate] = useState(() => isoDate(new Date()));
  const [noteEndDate, setNoteEndDate] = useState("");
  const [noteDateMode, setNoteDateMode] = useState("single");
  const [activeNoteDateField, setActiveNoteDateField] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [noteBlocksBookings, setNoteBlocksBookings] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteHistoryOpen, setNoteHistoryOpen] = useState(false);
  const [noteHistoryLoading, setNoteHistoryLoading] = useState(false);
  const [sentNotes, setSentNotes] = useState([]);
  const [deletingNoteKey, setDeletingNoteKey] = useState("");

  // ✅ Bank holidays (UK Gov JSON) for current year
  const currentYear = new Date().getFullYear();
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

  // Account card
  const firebaseUser = user ?? auth.currentUser;
  const isAnon = !!firebaseUser?.isAnonymous;

  const account = employee
    ? {
        name: employee.name || employee.displayName || "Employee",
        email: employee.email || "No email",
        userCode: employee.userCode || "N/A",
      }
    : firebaseUser && !isAnon
    ? {
        name: firebaseUser.displayName || "Manager",
        email: firebaseUser.email || "No email",
        userCode: "N/A",
      }
      : { name: "Unknown User", email: "No email", userCode: "N/A" };
  const dataCache = useDataCache();

  const hydrateDashboardState = useCallback((payload) => {
    const safePayload = payload || {};

    setMyHolidays(Array.isArray(safePayload.myHolidays) ? safePayload.myHolidays : []);
    setNextHoliday(safePayload.nextHoliday || null);
    setPendingHolidayCount(safePayload.pendingHolidayCount || 0);
    setHolidayAllowance(safePayload.holidayAllowance || 0);
    setHolidayUsedDays(safePayload.holidayUsedDays || 0);
    setHolidayBookedDays(safePayload.holidayBookedDays || 0);
    setHolidayRemaining(safePayload.holidayRemaining || 0);
    setTimesheetStats(
      safePayload.timesheetStats && typeof safePayload.timesheetStats === "object"
        ? {
            weekHours: safePayload.timesheetStats.weekHours || 0,
            pending: safePayload.timesheetStats.pending || 0,
            lastSubmitted: safePayload.timesheetStats.lastSubmitted || null,
          }
        : { weekHours: 0, pending: 0, lastSubmitted: null }
    );
    setLatestTimesheetQuery(safePayload.latestTimesheetQuery || null);
  }, []);

  const loadPersonal = useCallback(async (options = {}) => {
    const forceRefresh = Boolean(options?.forceRefresh);
    const cacheKey = employee?.userCode || employee?.employeeId || user?.uid || "";
    const cacheRecordKey = cacheKey ? `me-dashboard:v3:${cacheKey}` : "";
    let cachedRecord = null;

    if (cacheRecordKey && dataCache?.read) {
      try {
        cachedRecord = await dataCache.read(cacheRecordKey);
        if (!forceRefresh && cachedRecord && !dataCache.isExpired(cachedRecord, ME_CACHE_TTL_MS)) {
          hydrateDashboardState(cachedRecord.data || {});
          setHasPersonalContent(true);
          setPersonalError(null);
          setBusy(false);
          return;
        }

        if (cachedRecord?.data) {
          hydrateDashboardState(cachedRecord.data || {});
          setHasPersonalContent(true);
        }
      } catch (err) {
        console.warn("Failed to read dashboard cache:", err);
      }
    }

    setBusy(!cachedRecord?.data);
    setPersonalError(null);
    try {
      const userCode = employee?.userCode || "";
      const empName = employee?.name || employee?.displayName || "";
      const email = employee?.email || user?.email || "";

      if (!userCode && !empName && !email) {
        setMyHolidays([]);
        setNextHoliday(null);
        setPendingHolidayCount(0);
        setHolidayAllowance(0);
        setHolidayUsedDays(0);
        setHolidayBookedDays(0);
        setHolidayRemaining(0);
        setTimesheetStats({ weekHours: 0, pending: 0, lastSubmitted: null });
        setLatestTimesheetQuery(null);
        return;
      }

      // ============================================================
      // 1) Find employee record (same approach as HolidayPage)
      // ============================================================
      const empRecord = employeeRows.find((candidate) => {
        const candidateCode = String(candidate.userCode || "").trim();
        const candidateEmail = String(candidate.email || "").trim().toLowerCase();
        const candidateName = String(candidate.name || candidate.displayName || "")
          .trim()
          .toLowerCase();
        return (
          (!!userCode && candidateCode === String(userCode).trim()) ||
          (!!email && candidateEmail === String(email).trim().toLowerCase()) ||
          (!!empName && candidateName === String(empName).trim().toLowerCase())
        );
      }) || null;

      // ============================================================
      // 2) Load my holidays (filter like HolidayPage: name OR code)
      // ============================================================
      const mine = holidayRows.filter((holiday) =>
        employeeMatchesHoliday(holiday, empRecord, employee, user)
      );
      const mineForYear = mine.filter((holiday) =>
        holidayBelongsToYear(holiday, currentYear, getHolidayStart(holiday))
      );

      setMyHolidays(mineForYear);

      // ============================================================
      // 3) CURRENT YEAR allowance (match HolidayPage maps)
      // ============================================================
      const { allowance, carryOver } = getAllowanceForYear(empRecord, currentYear);
      const totalAllowance = (allowance || 0) + (carryOver || 0);

      setHolidayAllowance(roundToHalf(totalAllowance));

      // ============================================================
      // 4) CURRENT YEAR taken / available (Paid only, approved only)
      //    - assigns the full holiday to the year in which it starts
      //    - ✅ supports half-days
      //    - ✅ excludes weekends + bank holidays
      // ============================================================
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let paidTaken = 0;
      let paidBooked = 0;

      for (const h of mineForYear) {
        if (!isApproved(h)) continue;

        const { displayType } = displayTypeAndColor(h);
        if (displayType !== "Paid") continue;

        const origS = getHolidayStart(h);
        const origE = getHolidayEnd(h) || origS;
        if (!origS) continue;

        const days = computeBusinessDaysClamped(h, origS, origE, origS, origE, isBankHoliday);
        if (origE < today) paidTaken += days;
        else paidBooked += days;
      }

      const used = roundToHalf(paidTaken);
      const booked = roundToHalf(paidBooked);
      const remaining = roundToHalf(
        calculateRemainingHolidayAllowance(totalAllowance, used, booked)
      );

      setHolidayUsedDays(used);
      setHolidayBookedDays(booked);
      setHolidayRemaining(remaining);

      // ============================================================
      // 5) Next holiday + pending count (simple, based on mine)
      // ============================================================
      const pendingCount = mineForYear.filter((h) => {
        return isRequestedHoliday(h);
      }).length;
      setPendingHolidayCount(pendingCount);

      const upcomingApproved = mineForYear
        .filter((h) => isApproved(h))
        .filter((h) => {
          const end = getHolidayEnd(h) || getHolidayStart(h);
          return end && end >= today;
        })
        .sort((a, b) => {
          const as = getHolidayStart(a) ?? new Date(8640000000000000);
          const bs = getHolidayStart(b) ?? new Date(8640000000000000);
          return as - bs;
        });

      const nextHolidayValue = upcomingApproved[0] || null;
      setNextHoliday(nextHolidayValue);

      // ============================================================
      // 6) Timesheet stats (unchanged)
      // ============================================================
      const tsMine = userCode ? employeeTimesheets : [];

      const mondayKey = mondayISO(new Date());
      const thisWeek = tsMine.find((t) => (t.weekStart || t.weekISO) === mondayKey);
      const weekHours = computeTimesheetWeekHours(thisWeek);

      const pending = tsMine.filter((t) => {
        const submitted = !!t.submitted;
        const status = safeStr(t.status);
        return submitted && (!status || status === "pending");
      }).length;

      const lastSubmitted =
        tsMine
          .filter((t) => !!t.submittedAt)
          .map((t) => toDateSafe(t.submittedAt)?.toISOString() || null)
          .filter(Boolean)
          .sort((a, b) => (a > b ? -1 : 1))[0] || null;

      setTimesheetStats({ weekHours, pending, lastSubmitted });

      // ============================================================
      // 7) Latest timesheet query (unchanged)
      // ============================================================
      let latestQuery = null;
      if (userCode) {
        const allQueries = employeeTimesheetQueries;

        const openUnapproved = allQueries.filter((qObj) => {
          const qStatus = safeStr(qObj.status || "open");
          const isOpen = !qStatus || qStatus === "open" || qStatus === "pending";
          if (!isOpen) return false;

          const tsForQuery =
            tsMine.find((t) => t.id === qObj.timesheetId) ||
            (qObj.weekStart
              ? tsMine.find((t) => safeStr(t.weekStart) === safeStr(qObj.weekStart))
              : null);

          const tsApproved =
            tsForQuery &&
            (safeStr(tsForQuery.status) === "approved" ||
              tsForQuery.approved === true ||
              !!tsForQuery.approvedAt);

          return !tsApproved;
        });

        openUnapproved.sort((a, b) => {
          const da = toDateSafe(a.createdAt) ?? new Date(0);
          const dbb = toDateSafe(b.createdAt) ?? new Date(0);
          return dbb - da;
        });

        latestQuery = openUnapproved[0] || null;
      }
      setLatestTimesheetQuery(latestQuery);
      setHasPersonalContent(true);

      if (cacheRecordKey && dataCache?.write) {
        await dataCache.write(
          cacheRecordKey,
          {
            myHolidays: mineForYear,
            nextHoliday: nextHolidayValue,
            pendingHolidayCount: pendingCount,
            holidayAllowance: roundToHalf(totalAllowance),
            holidayUsedDays: used,
            holidayBookedDays: booked,
            holidayRemaining: remaining,
            timesheetStats: {
              weekHours,
              pending,
              lastSubmitted,
            },
            latestTimesheetQuery: latestQuery,
          },
          ME_CACHE_TTL_MS
        );
      }
    } catch (err) {
      setPersonalError(err);
      if (cachedRecord?.data) {
        hydrateDashboardState(cachedRecord.data || {});
        setHasPersonalContent(true);
      } else {
        setHasPersonalContent(false);
        setMyHolidays([]);
        setNextHoliday(null);
        setPendingHolidayCount(0);
        setHolidayAllowance(0);
        setHolidayUsedDays(0);
        setHolidayBookedDays(0);
        setHolidayRemaining(0);
        setTimesheetStats({ weekHours: 0, pending: 0, lastSubmitted: null });
        setLatestTimesheetQuery(null);
      }
      console.warn("Failed to load dashboard data:", err);
    } finally {
      setBusy(false);
    }
  }, [
    dataCache,
    employee,
    employeeRows,
    employeeTimesheetQueries,
    employeeTimesheets,
    holidayRows,
    user,
    currentYear,
    isBankHoliday,
    hydrateDashboardState,
  ]);

  useEffect(() => {
    loadPersonal({ forceRefresh: true });
  }, [loadPersonal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshEmployees(),
        refreshHolidays(),
        refreshEmployeeTimesheets(),
        refreshEmployeeTimesheetQueries(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    refreshEmployeeTimesheetQueries,
    refreshEmployeeTimesheets,
    refreshEmployees,
    refreshHolidays,
  ]);

  const noteTone = routeColors.hex_0f766e_adtgo2;
  const noteMarkedDates = useMemo(() => {
    const marks = {};
    const start = parseYMD(noteStartDate);
    const end = parseYMD(noteDateMode === "multi" ? noteEndDate || noteStartDate : noteStartDate);

    if (!start || !end) return marks;

    eachDateInclusive(start, end).forEach((day) => {
      const date = isoDate(day);
      marks[date] = {
        color: withAlpha(noteTone, 0.42),
        textColor: routeColors.hex_fff_yhjmu8,
      };
    });

    marks[noteStartDate] = {
      ...(marks[noteStartDate] || {}),
      startingDay: true,
      color: noteTone,
      textColor: routeColors.hex_fff_yhjmu8,
    };

    const endDate = noteDateMode === "multi" ? noteEndDate || noteStartDate : noteStartDate;
    marks[endDate] = {
      ...(marks[endDate] || {}),
      endingDay: true,
      color: noteTone,
      textColor: routeColors.hex_fff_yhjmu8,
    };

    return marks;
  }, [noteStartDate, noteEndDate, noteDateMode, noteTone]);

  const handleNoteDayPress = (day) => {
    const selected = day?.dateString;
    if (!selected) return;

    if (activeNoteDateField === "end") {
      if (noteStartDate && parseYMD(selected) < parseYMD(noteStartDate)) {
        setNoteEndDate(noteStartDate);
        setNoteStartDate(selected);
      } else {
        setNoteEndDate(selected === noteStartDate ? "" : selected);
      }
      setActiveNoteDateField(null);
      return;
    }

    if (noteEndDate && parseYMD(selected) > parseYMD(noteEndDate)) {
      setNoteStartDate(selected);
      setNoteEndDate("");
      setActiveNoteDateField(null);
      return;
    }

    setNoteStartDate(selected);
    setActiveNoteDateField(null);
  };

  if (loading || !isAuthed) return null;

  const queryCard = latestTimesheetQuery;
  const queryWeekLabel = queryCard?.weekStart ? formatWeekLabel(queryCard.weekStart) : null;
  const queryFieldLabel = fieldLabel(queryCard?.field);
  const queryDay = queryCard?.day;
  const profileTone = colorScheme === "dark" ? colors.textMuted : routeColors.hex_64748b_4jwrvh;
  const holidayTone = routeColors.hex_16a34a_a5i1hi;
  const holidayBalanceTone = getBalanceStatusTone(holidayRemaining) === "danger"
    ? colors.danger
    : holidayTone;
  const holidayUsageProgress = holidayAllowance > 0
    ? Math.min(1, Math.max(0, (holidayUsedDays + holidayBookedDays) / holidayAllowance))
    : 0;
  const profileInitials = String(account.name || "")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const currentNoteEmployeeName = String(
    employee?.name ||
      employee?.displayName ||
      user?.displayName ||
      (account.name === "Unknown User" ? "" : account.name) ||
      ""
  ).trim();
  const currentNoteCreatorId = user?.uid || employee?.employeeId || "";
  const currentNoteAuditEmail = String(
    user?.email ||
      employee?.email ||
      (account.email === "No email" ? "" : account.email) ||
      ""
  ).trim();

  const loadSentNotes = async () => {
    if (loading || !isAuthed || !companyId) {
      setSentNotes([]);
      return;
    }
    const noteMap = new Map();
    const lookups = [];

    if (currentNoteCreatorId) {
      lookups.push(
        query(collection(db, "notes"), where("companyId", "==", companyId), where("createdByUid", "==", currentNoteCreatorId), limit(120))
      );
    }
    if (currentNoteEmployeeName) {
      lookups.push(
        query(collection(db, "notes"), where("companyId", "==", companyId), where("employee", "==", currentNoteEmployeeName), limit(120)),
        query(collection(db, "notes"), where("companyId", "==", companyId), where("employeeName", "==", currentNoteEmployeeName), limit(120))
      );
    }

    if (lookups.length === 0) {
      setSentNotes([]);
      return;
    }

    setNoteHistoryLoading(true);
    try {
      const snaps = await Promise.all(lookups.map((qRef) => getDocs(qRef)));
      snaps.forEach((snap) => {
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const isMine =
            (currentNoteCreatorId && data.createdByUid === currentNoteCreatorId) ||
            (data.source === "mobile" &&
              currentNoteEmployeeName &&
              [data.employee, data.employeeName, data.createdByName].includes(currentNoteEmployeeName));

          if (isMine) noteMap.set(docSnap.id, { id: docSnap.id, ...data });
        });
      });

      setSentNotes(groupSentNotes(Array.from(noteMap.values())));
    } catch (error) {
      console.warn("Failed to load sent notes:", error);
      Alert.alert("Could not load notes", "Please try again.");
    } finally {
      setNoteHistoryLoading(false);
    }
  };

  const toggleNoteHistory = async () => {
    const nextOpen = !noteHistoryOpen;
    setNoteHistoryOpen(nextOpen);
    if (nextOpen) await loadSentNotes();
  };

  const deleteSentNote = (noteGroup) => {
    Alert.alert("Delete note", "Remove this sent note from the dashboard?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingNoteKey(noteGroup.key);
          try {
            const batch = writeBatch(db);
            noteGroup.docIds.forEach((id) => {
              batch.delete(doc(db, "notes", id));
            });
            await batch.commit();
            setSentNotes((prev) => prev.filter((item) => item.key !== noteGroup.key));
          } catch (error) {
            console.warn("Failed to delete sent note:", error);
            Alert.alert("Could not delete note", "Please try again.");
          } finally {
            setDeletingNoteKey("");
          }
        },
      },
    ]);
  };

  const submitNote = async () => {
    const text = noteText.trim();
    const start = parseYMD(noteStartDate);
    const end = parseYMD(noteDateMode === "multi" ? noteEndDate || noteStartDate : noteStartDate);
    const employeeName = currentNoteEmployeeName;
    const auditEmail = currentNoteAuditEmail;

    if (!start) {
      Alert.alert("Check date", "Select a valid start date.");
      return;
    }
    if (!end) {
      Alert.alert("Check date", "Select a valid end date, or leave it blank.");
      return;
    }
    if (end < start) {
      Alert.alert("Check date", "End date cannot be before the start date.");
      return;
    }
    if (!text) {
      Alert.alert("Add note", "Write the note you want to send.");
      return;
    }
    if (noteBlocksBookings && !employeeName) {
      Alert.alert("Missing employee", "Your employee name is needed to block bookings.");
      return;
    }

    const days = eachDateInclusive(start, end);
    if (days.length > 366) {
      Alert.alert("Date range too long", "Please send notes for one year or less at a time.");
      return;
    }

    const startISO = isoDate(start);
    const endISO = isoDate(end);
    const isMultiDay = days.length > 1;
    const noteBatchId = doc(collection(db, "notes")).id;

    setSavingNote(true);
    try {
      const batch = writeBatch(db);

      days.forEach((day) => {
        const date = isoDate(day);
        const ref = doc(collection(db, "notes"));
        batch.set(ref, {
          employee: employeeName,
          employeeName,
          blocksEmployeeBooking: noteBlocksBookings,
          date,
          text,
          noteBatchId,
          isMultiDay,
          ...(isMultiDay ? { startDate: startISO, endDate: endISO } : {}),
          createdAt: serverTimestamp(),
          createdByUid: user?.uid || employee?.employeeId || null,
          createdByEmail: auditEmail || null,
          createdByName: employeeName,
          source: "mobile",
        });
      });

      await batch.commit();
      setNoteText("");
      setNoteEndDate("");
      if (noteHistoryOpen) await loadSentNotes();
      Alert.alert("Note sent", isMultiDay ? "Your notes have been added for each day." : "Your note has been added.");
    } catch (error) {
      console.warn("Failed to submit profile note:", error);
      Alert.alert("Could not send note", "Please try again.");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <PageShell
      appearance="grouped"
      refresh={{ refreshing, onRefresh }}
      state={{
        resources: [
          employeesResource,
          holidaysResource,
          timesheetsResource,
          queriesResource,
          {
            isInitialLoading: busy,
            isRefreshing: refreshing,
            error: personalError,
          },
        ],
        hasContent: hasPersonalContent,
        onRetry: onRefresh,
        loadingLabel: "Loading your profile…",
      }}
    >
          {/* Compact profile identity */}
          <View
            style={[
              styles.sectionCard,
              dashboardCards.sectionCard,
              styles.profileCard,
            ]}
          >
            <View style={styles.profileIdentityRow}>
              <View
                style={[
                  styles.profileAvatar,
                  {
                    backgroundColor: colorScheme === "dark" ? colors.surfaceAlt : withAlpha(profileTone, 0.14),
                    borderColor: colorScheme === "dark" ? colors.border : withAlpha(profileTone, 0.42),
                  },
                ]}
              >
                <Text style={[styles.profileAvatarText, { color: profileTone }]}>
                  {profileInitials || "ME"}
                </Text>
              </View>
              <View style={styles.profileIdentityCopy}>
                <Text tone={"primary"} style={[styles.profileTitle]} numberOfLines={1}>
                  {account.name}
                </Text>
                <Text tone={"muted"} style={[styles.profileMeta]} numberOfLines={1}>
                  {account.email}
                </Text>
                <Text tone={"muted"} style={[styles.profileCode]}>Code {account.userCode}</Text>
              </View>
              <View style={styles.profileActionRow}>
                <IconButton
                  icon="settings"
                  label="Open settings"
                  onPress={() => router.push("/settings")}
                />

                <AppButton
                  label="Edit"
                  icon="edit-2"
                  variant="secondary"
                  pill
                  density="compact"
                  size="small"
                  onPress={() => router.push("/edit-profile")}
                  accessibilityLabel="Edit my profile"
                />
              </View>
            </View>
          </View>

          {/* Availability */}
          <View
            style={[
              styles.sectionCard,
              dashboardCards.sectionCard,
              styles.flatSectionCard,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text tone={"primary"} style={[styles.sectionTitle]}>Availability</Text>
                <Text tone={"muted"} style={[styles.sectionSubTitle]}>
                  Tell the office when you cannot be booked
                </Text>
              </View>
              <View style={styles.availabilityActions}>
                <AppButton
                  label={noteComposerOpen ? "Close" : "Add"}
                  icon={noteComposerOpen ? "x" : "plus"}
                  variant="secondary"
                  pill
                  density="compact"
                  size="small"
                  selected={noteComposerOpen}
                  onPress={() => setNoteComposerOpen((open) => !open)}
                  accessibilityLabel={noteComposerOpen ? "Close availability form" : "Add availability"}
                  accessibilityState={{ expanded: noteComposerOpen }}
                />
                <AppButton
                  label="History"
                  icon="clock"
                  variant="ghost"
                  size="small"
                  onPress={toggleNoteHistory}
                  accessibilityLabel={noteHistoryOpen ? "Hide sent note history" : "Show sent note history"}
                  accessibilityState={{ expanded: noteHistoryOpen }}
                />
              </View>
            </View>

            {noteComposerOpen ? <View
              style={[styles.sectionPanel, styles.notePanelCompact, getCardSurfaceStyle(colors)]}
            >
              <SegmentedControl
                pill subtle density="compact" selectionRole="radio"
                accessibilityLabel="Availability date range"
                style={styles.noteModeLayout}
                value={noteDateMode}
                options={[{ value: "single", label: "Single day" }, { value: "multi", label: "Multi day" }]}
                onChange={(mode) => {
                  setNoteDateMode(mode);
                  setActiveNoteDateField(null);
                  if (mode === "single") setNoteEndDate("");
                }}
              />

              <View style={styles.dateSelectRow}>
                <TouchableOpacity
                  style={[
                    styles.dateSelectButton,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor:
                        activeNoteDateField === "start" ? noteTone : colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    setActiveNoteDateField((field) => (field === "start" ? null : "start"))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Select note start date, ${formatDateCompact(noteStartDate) || "not selected"}`}
                  accessibilityState={{ expanded: activeNoteDateField === "start" }}
                >
                  <Text tone={"muted"} style={[styles.inputLabel]}>Start</Text>
                  <View style={styles.dateSelectValueRow}>
                    <Text tone={"primary"} style={[styles.dateSelectValue]}>
                      {formatDateCompact(noteStartDate) || "Select date"}
                    </Text>
                    <Icon name="calendar" size={15} color={noteTone} />
                  </View>
                </TouchableOpacity>

                {noteDateMode === "multi" ? (
                  <TouchableOpacity
                    style={[
                      styles.dateSelectButton,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: activeNoteDateField === "end" ? noteTone : colors.border,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      setActiveNoteDateField((field) => (field === "end" ? null : "end"))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Select note end date, ${formatDateCompact(noteEndDate || noteStartDate) || "not selected"}`}
                    accessibilityState={{ expanded: activeNoteDateField === "end" }}
                  >
                    <Text tone={"muted"} style={[styles.inputLabel]}>End</Text>
                    <View style={styles.dateSelectValueRow}>
                      <Text tone={"primary"} style={[styles.dateSelectValue]}>
                        {formatDateCompact(noteEndDate || noteStartDate) || "Select date"}
                      </Text>
                      <Icon name="calendar" size={15} color={noteTone} />
                    </View>
                  </TouchableOpacity>
                ) : null}
              </View>

              {activeNoteDateField ? (
                <View
                  style={[
                    styles.calendarWrap,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Calendar
                    current={
                      activeNoteDateField === "end"
                        ? noteEndDate || noteStartDate
                        : noteStartDate
                    }
                    onDayPress={handleNoteDayPress}
                    markedDates={noteMarkedDates}
                    markingType="period"
                    theme={{
                      calendarBackground: colors.surfaceAlt,
                      dayTextColor: colors.text,
                      monthTextColor: colors.text,
                      arrowColor: noteTone,
                      selectedDayBackgroundColor: noteTone,
                      selectedDayTextColor: routeColors.hex_fff_yhjmu8,
                      todayTextColor: noteTone,
                    }}
                  />
                </View>
              ) : null}

              <FormField
                label="Note"
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Short note"
                hint="Enter a short note for the office"
              />

              <View style={styles.noteFooterRow}>
                <Checkbox
                  checked={noteBlocksBookings}
                  onChange={setNoteBlocksBookings}
                  label="Block bookings"
                  layoutStyle={styles.noteCheckboxLayout}
                />

                <AppButton
                  label={savingNote ? "Sending" : "Send"}
                  pill
                  icon="send"
                  variant="secondary"
                  onPress={submitNote}
                  disabled={savingNote}
                  loading={savingNote}
                  accessibilityLabel="Send availability note"
                />
              </View>
            </View> : null}

            {noteHistoryOpen ? (
              <View
                style={[styles.noteHistoryPanel, getCardSurfaceStyle(colors)]}
              >
                {noteHistoryLoading ? (
                  <LoadingState label="Loading notes…" compact />
                ) : sentNotes.length === 0 ? (
                  <EmptyState
                    icon="message-square"
                    title="No sent notes"
                    message="Notes sent to the office will appear here."
                    compact
                  />
                ) : (
                  sentNotes.map((item) => (
                    <View
                      key={item.key}
                      style={[
                        styles.noteHistoryItem,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.noteHistoryTextWrap}>
                        <Text tone="secondary" style={styles.noteHistoryDate}>
                          {formatNoteHistoryRange(item)}
                        </Text>
                        <Text
                          tone={"primary"} style={[styles.noteHistoryText]}
                        >
                          {item.text}
                        </Text>
                      </View>
                      <IconButton
                        icon="trash-2"
                        tone="danger"
                        onPress={() => deleteSentNote(item)}
                        disabled={deletingNoteKey === item.key}
                        loading={deletingNoteKey === item.key}
                        label={`Delete note for ${formatNoteHistoryRange(item)}`}
                      />
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </View>

          {/* Timesheet Snapshot */}
          <View
            style={[
              styles.sectionCard,
              dashboardCards.sectionCard,
              styles.flatSectionCard,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text tone={"primary"} style={[styles.sectionTitle]}>Timesheet</Text>
                <Text tone={"muted"} style={[styles.sectionSubTitle]}>
                  Weekly hours and approvals
                </Text>
              </View>
            </View>

            <View
              style={[styles.sectionPanel, getCardSurfaceStyle(colors)]}
            >
              {(
                <>
                  <TouchableOpacity
                    style={styles.summaryLink}
                    onPress={() => router.navigate("/timesheet")}
                    accessibilityRole="button"
                    accessibilityLabel="Open timesheets"
                    accessibilityHint="View weekly hours and approvals"
                  >
                    <View style={styles.statRow}>
                      <View style={[styles.statCard, styles.flatStatCard]}>
                        <Text tone={"muted"} style={[styles.statLabel]} numberOfLines={1}>This Week</Text>
                        <Text tone={"primary"} style={[styles.statValue]}>
                          {formatTimesheetHours(timesheetStats.weekHours)}
                        </Text>
                      </View>

                      <View style={[styles.statCard, styles.flatStatCard]}>
                        <Text tone={"muted"} style={[styles.statLabel]} numberOfLines={1}>Pending</Text>
                        <Text tone={"primary"} style={[styles.statValue]}>{timesheetStats.pending}</Text>
                      </View>

                      <View style={[styles.statCard, styles.flatStatCard]}>
                        <Text tone={"muted"} style={[styles.statLabel]} numberOfLines={1}>Last Submitted</Text>
                        <Text tone={"primary"} style={[styles.statValue]}>
                          {formatDateShort(timesheetStats.lastSubmitted) || "—"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.summaryChevron} pointerEvents="none">
                      <Icon name="chevron-right" size={18} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>

                  {queryCard && (
                    <TouchableOpacity
                      style={[styles.queryCard, getCardSurfaceStyle(colors, { borderAccent: routeColors.hex_f97316_oh807u })]}
                      activeOpacity={0.9}
                      onPress={() => router.push(`/(protected)/query/${queryCard.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel="Open manager timesheet query"
                      accessibilityHint="Review the queried week and respond"
                    >
                      <View style={styles.queryIcon}>
                        <Icon name="alert-circle" size={16} color={routeColors.hex_f97316_oh807u} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text tone={"primary"} style={[styles.queryTitle]}>
                          Manager queried your timesheet
                        </Text>

                        <Text tone={"muted"} style={[styles.querySubtitle]}>
                          {queryWeekLabel
                            ? `Week of ${queryWeekLabel}${queryDay ? ` – ${queryDay}` : ""}`
                            : "Recent submission"}
                        </Text>

                        <Text tone={"primary"} style={[styles.queryBody]} numberOfLines={2}>
                          “{queryCard.note || "Please review this week’s times."}”
                          {queryFieldLabel ? ` (about ${queryFieldLabel})` : ""}
                        </Text>

                        <View style={styles.queryFooterRow}>
                          <Text tone={"muted"} style={[styles.queryFooterText]}>
                            Tap to view preview & respond
                          </Text>
                          <Icon name="chevron-right" size={14} color={colors.textMuted} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}

                </>
              )}
            </View>
          </View>

          {/* Expenses and company-card receipts */}
          <View
            style={[
              styles.sectionCard,
              dashboardCards.sectionCard,
              styles.flatSectionCard,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text tone={"primary"} style={[styles.sectionTitle]}>Expenses & Receipts</Text>
                <Text tone={"muted"} style={[styles.sectionSubTitle]}>Job costs and company-card receipts</Text>
              </View>
            </View>

            <View style={[styles.sectionPanel, getCardSurfaceStyle(colors)]}>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[
                    styles.actionTile,
                    { backgroundColor: withAlpha(routeColors.hex_3b82f6_9w6unh, 0.13), borderColor: withAlpha(routeColors.hex_3b82f6_9w6unh, 0.4) },
                  ]}
                  onPress={() => router.push("/expenses")}
                  accessibilityRole="button"
                  accessibilityLabel="Open expenses"
                >
                  <Icon name="credit-card" size={18} color={routeColors.hex_3b82f6_9w6unh} />
                  <Text tone={"primary"} style={[styles.actionTileTitle]}>Expenses</Text>
                  <Text tone={"muted"} style={[styles.actionTileSubtitle]}>Job costs</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionTile,
                    { backgroundColor: withAlpha(routeColors.hex_3b82f6_9w6unh, 0.13), borderColor: withAlpha(routeColors.hex_3b82f6_9w6unh, 0.4) },
                  ]}
                  onPress={() => router.push("/receipts")}
                  accessibilityRole="button"
                  accessibilityLabel="Open company-card receipts"
                >
                  <Icon name="file-text" size={18} color={routeColors.hex_3b82f6_9w6unh} />
                  <Text tone={"primary"} style={[styles.actionTileTitle]}>Company-card receipts</Text>
                  <Text tone={"muted"} style={[styles.actionTileSubtitle]}>Send purchase receipts</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Holidays Snapshot (CURRENT YEAR, allowance includes carryover) */}
          <View
            style={[
              styles.sectionCard,
              dashboardCards.sectionCard,
              styles.flatSectionCard,
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text tone={"primary"} style={[styles.sectionTitle]}>Holidays</Text>
                <Text tone={"muted"} style={[styles.sectionSubTitle]}>
                  Allowance, usage and requests
                </Text>
              </View>
              <View
                style={[
                  styles.sectionCountPill,
                  {
                    backgroundColor: withAlpha(holidayTone, 0.13),
                    borderColor: withAlpha(holidayTone, 0.4),
                  },
                ]}
              >
                <Text style={[styles.sectionCountText, { color: holidayTone }]}>
                  {currentYear}
                </Text>
              </View>
            </View>

            <View
              style={[styles.sectionPanel, getCardSurfaceStyle(colors)]}
            >
              {myHolidays.length === 0 ? (
                <EmptyState
                  icon="umbrella"
                  title="No holiday records"
                  message="Approved and pending holiday requests will appear here."
                  compact
                  style={styles.holidayEmptyState}
                />
              ) : (
                <>
                  <View style={styles.statRow}>
                    <View style={[styles.statCard, styles.flatStatCard]}>
                      <Text tone={"muted"} style={[styles.statLabel]}>Allowance</Text>
                      <Text tone={"primary"} style={[styles.statValue]}>{fmtHalf(holidayAllowance)}</Text>
                    </View>

                    <View style={[styles.statCard, styles.flatStatCard]}>
                      <Text tone={"muted"} style={[styles.statLabel]}>Taken</Text>
                      <Text tone={"primary"} style={[styles.statValue]}>{fmtHalf(holidayUsedDays)}</Text>
                    </View>

                    <View style={[styles.statCard, styles.flatStatCard]}>
                      <Text tone={"muted"} style={[styles.statLabel]}>Booked</Text>
                      <Text tone={"primary"} style={[styles.statValue]}>{fmtHalf(holidayBookedDays)}</Text>
                    </View>

                    <View style={[styles.statCard, styles.flatStatCard]}>
                      <Text tone={"muted"} style={[styles.statLabel]}>Available</Text>
                      <Text
                        style={styles.statValue}
                        tone={holidayRemaining < 0 ? "danger" : "primary"}
                      >
                        {fmtHalf(holidayRemaining)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.holidayProgressRow}>
                    <View
                      style={[
                        styles.holidayProgressTrack,
                        { backgroundColor: withAlpha(holidayBalanceTone, 0.14) },
                      ]}
                    >
                      <View
                        style={[
                          styles.holidayProgressFill,
                          {
                            backgroundColor: holidayBalanceTone,
                            width: `${holidayUsageProgress * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={styles.holidayProgressText}
                      tone={holidayRemaining < 0 ? "danger" : "secondary"}
                    >
                      {fmtHalf(holidayRemaining)} remaining
                    </Text>
                  </View>

                  <View style={styles.cardRow}>
                    <Icon name="calendar" size={16} color={colors.textMuted} />
                    <Text tone={"primary"} style={[styles.cardRowText]}>
                      Next: {formatHoliday(nextHoliday) || "—"}
                    </Text>
                  </View>

                  <View style={styles.cardRow}>
                    <Icon name="alert-circle" size={16} color={colors.textMuted} />
                    <Text tone={"primary"} style={[styles.cardRowText]}>
                      Pending requests: {pendingHolidayCount}
                    </Text>
                  </View>

                  <AppButton
                    label="Manage Holidays"
                    icon="briefcase"
                    variant="secondary"
                    size="small"
                    layoutStyle={styles.holidayActionLayout}
                    onPress={() => router.push("/holidaypage")}
                    accessibilityLabel="Manage holidays"
                  />
                </>
              )}
            </View>
          </View>

    </PageShell>
  );
}

/* ───────────────────────── Helpers (match HolidayPage) ───────────────────────── */
function safeStr(v) {
  return String(v ?? "").trim().toLowerCase();
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function roundToHalf(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 2) / 2;
}

function fmtHalf(n) {
  const x = roundToHalf(n);
  return String(x).includes(".") ? String(x).replace(/\.0$/, "") : String(x);
}

function numOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}
function yearKey(y) {
  return String(y);
}
function getAllowanceForYear(emp, y) {
  const Y = yearKey(y);

  const holidayAllowances = emp?.holidayAllowances || emp?.holidayAllowanceByYear || {};
  const carryoverByYear =
    emp?.carryoverByYear || emp?.carryOverByYear || emp?.carriedOverByYear || {};

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

/** Parse "YYYY-MM-DD" safely at local midnight (no TZ shift). */
function parseYMD(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const [, Y, M, D] = m.map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

/** Safer Firestore -> Date conversion (prefers strict YMD strings). */
function toDateSafe(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const strict = parseYMD(val);
    if (strict) return strict;
    const d = new Date(val);
    return Number.isNaN(+d) ? null : d;
  }
  if (val?.toDate && typeof val.toDate === "function") return val.toDate();
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getHolidayStart(h) {
  return toDateSafe(
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
    toDateSafe(
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

function isoDate(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function mondayISO(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return isoDate(date);
}
function toNumber(n, fallback = 0) {
  const num = Number(n);
  return Number.isNaN(num) ? fallback : num;
}
/* ---------- business days + half-days (matches HolidayPage schema) ---------- */
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

function eachDateInclusive(start, end) {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) out.push(new Date(d));
  return out;
}

function countBusinessDaysInclusive(start, end, isBankHolidayFn = null) {
  return eachDateInclusive(start, end).filter((d) => {
    if (isWeekend(d)) return false;
    if (isBankHolidayFn && isBankHolidayFn(d)) return false;
    return true;
  }).length;
}

const normaliseAMPM = (v) => {
  const s = String(v || "").trim().toUpperCase();
  if (["AM", "A.M.", "MORNING"].includes(s)) return "AM";
  if (["PM", "P.M.", "AFTERNOON"].includes(s)) return "PM";
  return null;
};

function boolish(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = safeStr(v);
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function getHalfMeta(h) {
  const startHalfFlag = boolish(h.startHalfDay ?? h.startHalf ?? h.startHalfday);
  const endHalfFlag = boolish(h.endHalfDay ?? h.endHalf ?? h.endHalfday);

  const startAMPM = normaliseAMPM(
    h.startAMPM ?? h.startPeriod ?? h.halfDayPeriod ?? h.halfDayType
  );
  const endAMPM = normaliseAMPM(h.endAMPM ?? h.endPeriod);

  const legacySingleHalf =
    boolish(h.halfDay) || boolish(h.isHalfDay) || boolish(h.isHalf) || boolish(h.half);

  return { startHalfFlag, endHalfFlag, startAMPM, endAMPM, legacySingleHalf };
}

/**
 * ✅ Clamp-safe business-day length with half-day adjustments
 * Excludes weekends + bank holidays. Applies 0.5 reduction ONLY when clamped boundary equals original boundary.
 */
function computeBusinessDaysClamped(h, clampS, clampE, origS, origE, isBankHolidayFn = null) {
  if (!clampS || !clampE) return 0;

  const days = countBusinessDaysInclusive(clampS, clampE, isBankHolidayFn);
  if (days <= 0) return 0;

  const { startHalfFlag, endHalfFlag, startAMPM, endAMPM, legacySingleHalf } = getHalfMeta(h);

  const origStart = origS || getHolidayStart(h);
  const origEnd = origE || getHolidayEnd(h) || origStart;

  const origSingle =
    origStart && origEnd && origStart.toDateString() === origEnd.toDateString();

  const clampSingle = clampS.toDateString() === clampE.toDateString();
  if (clampSingle) {
    const nonWorking =
      isWeekend(clampS) || (isBankHolidayFn ? isBankHolidayFn(clampS) : false);
    if (nonWorking) return 0;

    const anyHalf =
      startHalfFlag || endHalfFlag || !!startAMPM || !!endAMPM || legacySingleHalf;

    if (origSingle && anyHalf) return 0.5;

    const isOrigStartDay = origStart && clampS.toDateString() === origStart.toDateString();
    const isOrigEndDay = origEnd && clampS.toDateString() === origEnd.toDateString();

    if ((isOrigStartDay && (startHalfFlag || !!startAMPM)) || (isOrigEndDay && (endHalfFlag || !!endAMPM))) {
      return 0.5;
    }

    return 1;
  }

  let reduction = 0;

  if (
    origStart &&
    clampS.toDateString() === origStart.toDateString() &&
    (startHalfFlag || !!startAMPM)
  ) {
    const startIsBusiness =
      !isWeekend(clampS) && !(isBankHolidayFn ? isBankHolidayFn(clampS) : false);
    if (startIsBusiness) reduction += 0.5;
  }

  if (
    origEnd &&
    clampE.toDateString() === origEnd.toDateString() &&
    (endHalfFlag || !!endAMPM)
  ) {
    const endIsBusiness =
      !isWeekend(clampE) && !(isBankHolidayFn ? isBankHolidayFn(clampE) : false);
    if (endIsBusiness) reduction += 0.5;
  }

  if (reduction === 0 && legacySingleHalf && origSingle) {
    if (
      origStart &&
      origEnd &&
      clampS.toDateString() === origStart.toDateString() &&
      clampE.toDateString() === origEnd.toDateString()
    ) {
      reduction += 0.5;
    }
  }

  return roundToHalf(Math.max(0, days - reduction));
}

function displayTypeAndColor(h) {
  let displayType = "Other";
  let typeColor = routeColors.hex_22d3ee_74my7l;
  const typeStr = (h.leaveType || h.paidStatus || h.type || h.holidayType || "").toLowerCase();

  if (h.isAccrued || typeStr.includes("accrued") || typeStr.includes("toil")) {
    displayType = "Accrued";
    typeColor = routeColors.hex_38bdf8_92tkol;
  } else if (h.isUnpaid || typeStr.includes("unpaid") || h.paid === false) {
    displayType = "Unpaid";
    typeColor = routeColors.hex_f87171_ohxdjs;
  } else if (h.paid || typeStr.includes("paid")) {
    displayType = "Paid";
    typeColor = routeColors.hex_29bc5f_75jpdr;
  } else {
    displayType = "Paid";
    typeColor = routeColors.hex_29bc5f_75jpdr;
  }
  return { displayType, typeColor };
}

function isApproved(h) {
  const s = safeStr(h.status || h.Status);
  return (
    s === "approved" ||
    s === "accept" ||
    s === "accepted" ||
    s === "confirmed" ||
    s === "authorised" ||
    s === "authorized" ||
    s.startsWith("approved")
  );
}

function isRequestedHoliday(h) {
  const s = safeStr(h.status || h.Status);
  return (
    !s ||
    s === "requested" ||
    s === "request" ||
    s === "pending" ||
    s === "submitted" ||
    s.includes("awaiting")
  );
}

function formatDateShort(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatDateCompact(iso) {
  const d = parseYMD(iso);
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function noteCreatedMillis(note) {
  const value = note?.createdAt;
  if (value?.toDate && typeof value.toDate === "function") return value.toDate().getTime();
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
}

function groupSentNotes(notes) {
  const groups = new Map();

  notes.forEach((note) => {
    const groupKey =
      note.noteBatchId ||
      `${note.text || ""}::${note.startDate || note.date || ""}::${note.endDate || note.date || ""}::${
        note.createdByUid || ""
      }`;
    const existing =
      groups.get(groupKey) || {
        key: groupKey,
        text: note.text || "",
        startDate: note.startDate || note.date,
        endDate: note.endDate || note.date,
        docIds: [],
        createdAtMs: 0,
        blocksEmployeeBooking: !!note.blocksEmployeeBooking,
      };

    existing.docIds.push(note.id);
    existing.createdAtMs = Math.max(existing.createdAtMs, noteCreatedMillis(note));
    existing.blocksEmployeeBooking =
      existing.blocksEmployeeBooking || !!note.blocksEmployeeBooking;
    if (note.date && (!existing.startDate || note.date < existing.startDate)) {
      existing.startDate = note.date;
    }
    if (note.date && (!existing.endDate || note.date > existing.endDate)) {
      existing.endDate = note.date;
    }
    groups.set(groupKey, existing);
  });

  return Array.from(groups.values())
    .sort((a, b) => {
      const aDate = a.startDate || "";
      const bDate = b.startDate || "";
      if (aDate !== bDate) return aDate > bDate ? -1 : 1;
      return b.createdAtMs - a.createdAtMs;
    })
    .slice(0, 20);
}

function formatNoteHistoryRange(note) {
  const start = formatDateCompact(note.startDate);
  const end = formatDateCompact(note.endDate);
  if (!start) return "No date";
  if (!end || end === start) return start;
  return `${start} - ${end}`;
}

function formatHoliday(h) {
  if (!h) return null;
  const s = getHolidayStart(h);
  const e = getHolidayEnd(h);
  if (!s) return null;
  const sTxt = s.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const eTxt = e ? e.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : null;
  return eTxt ? `${sTxt} → ${eTxt}` : sTxt;
}

function formatWeekLabel(weekStartISO) {
  const d = new Date(weekStartISO);
  if (Number.isNaN(d.getTime())) return weekStartISO;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fieldLabel(field) {
  const f = safeStr(field || "");
  if (!f) return "";
  if (f === "travel") return "travel times";
  if (f === "onset" || f === "on-set") return "on-set times";
  if (f === "yard") return "yard times";
  if (f === "notes") return "notes";
  if (f === "holiday") return "holiday / day off";
  return "this day";
}
