import { getCardSurfaceStyle } from "../../../../lib/design/cardSurface";
import { routeColors } from "../../../../lib/design/routePresentation/main-tabs-screens-homescreen-js.js";
import { styles } from "../../../../lib/design/screenStyles/main-tabs-screens-homescreen-js.js";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SectionCard, AppButton, AppModal, Avatar, Divider, ListRow, StatusChip, AppText as Text, AppPressable as TouchableOpacity, FormField, TextArea } from "../../../../components/ui/AppPrimitives";
// app/(protected)/screens/homescreen.js

import {
  useRouter } from "expo-router";
import { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Image as ExpoImage } from "expo-image";
import { SymbolView } from "expo-symbols";

import {
  doc,
  serverTimestamp,
  setDoc,
  } from "firebase/firestore";
import { getDownloadURL,
  ref,
  uploadBytesResumable } from "firebase/storage";

import { auth,
  db,
  storage } from "../../../../firebaseConfig";
import { useBookings,
  useHolidays,
  useVehicles } from "../../../../hooks/useOperationalData";
import { useResponsiveLayout } from "../../../../hooks/useResponsiveLayout";
import { useReducedMotion } from "../../../../hooks/useReducedMotion";
import { resolveWorkspaceAccess } from "../../../../lib/access";
import { isCrewedBooking } from "../../../../lib/bookingVisibility";
import { formatLongBookingDate } from "../../../../lib/dateDisplay";
import { formatISODateDDMMYYYY } from "../../../../lib/dateFormat";
import {
  collapseLinkedJobsForDay,
  displayJobNumber,
} from "../../../../lib/linkedBookingDays";
import { createDashboardCardStyles } from "../../../../lib/design/dashboard";
import { getDashboardGridColumns } from "../../../../lib/design/dashboardLayout";
import { getStatusColors } from "../../../../lib/design/semantics";
import { designTokens as t } from "../../../../lib/design/tokens";
import {
  getBookingVehicleReferences,
  getVehicleDisplayList,
  } from "../../../../lib/fleetSchema";
import {
  collapseInboxDuplicates,
  getInbox,
  subscribeToInbox,
  } from "../../../../lib/notificationInbox";
import { notificationVisibleToAccount } from "../../../../lib/notificationVisibility";
import { useStartupSnapshotCapture } from "../../../../hooks/useStartupSnapshotCapture";
import { useAuth } from "../../../../providers/AuthProvider";
import { useDataCache } from "../../../../providers/DataCacheProvider";
import { useTheme } from "../../../../providers/ThemeProvider";
import PageShell from "../../../../components/layout/PageShell";
import DashboardSkeleton from "../../../../components/DashboardSkeleton";
import AppleMaterialSurface from "../../../../components/ui/AppleMaterialSurface";

import {
  Image,
  Platform,
  StyleSheet,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";
import { withAlpha } from "../../../../lib/design/color";

const IMAGES_ONLY = ImagePicker.MediaTypeOptions.Images;

const buttons = [
  { label: "Schedule", shortDescription: "Call times", icon: "calendar", group: "Quick Actions" },
  { label: "Vehicle Maintenance", shortLabel: "Maintenance", shortDescription: "Fleet checks", icon: "settings", group: "Quick Actions" },
  { label: "Employee Contacts", shortLabel: "Contacts", shortDescription: "Crew phonebook", icon: "users", group: "Quick Actions" },
  { label: "Time Sheet", shortDescription: "Weekly hours", icon: "clock", group: "Quick Actions" },
  { label: "Holidays", icon: "briefcase", group: "More" },
  { label: "Work Diary", icon: "clipboard", group: "More" },
  { label: "Spec Sheets", icon: "file-text", group: "More" },
  { label: "Insurance & Compliance", icon: "shield", group: "More" },
];

const pagePadding = 14;
const gridGap = 10;

const ACTION_DESCRIPTIONS = {
  Schedule: "Call times & assignments",
  "Work Diary": "Upcoming production diary",
  "Vehicle Maintenance": "Fleet checks and issues",
  "Employee Contacts": "Crew phonebook",
  Holidays: "Leave and bank holidays",
  "Time Sheet": "Weekly hours & approval",
  "Spec Sheets": "Technical references",
  "Insurance & Compliance": "Policies and certificates",
  Settings: "Profile and app controls",
};

const ACTION_ROUTES = {
  Schedule: "screens/schedule",
  "Work Diary": "/work-diary",
  "Employee Contacts": "/contacts",
  Holidays: "/holidaypage",
  "Time Sheet": "/timesheet",
  "Vehicle Maintenance": "/maintenance",
  Settings: "/settings",
  "Spec Sheets": "/spec-sheets",
  "Insurance & Compliance": "/insurance",
};

const HOME_LOGO = require("../../../../assets/images/bickers-action-logo.png");

function actionTintForLabel(label, colors) {
  if (label === "Schedule") return routeColors.hex_4f7dd9_7y5i3e;
  if (label === "Work Diary") return routeColors.hex_2c95b8_6ski01;
  if (label === "Vehicle Maintenance") return routeColors.hex_c56a33_6rjvd3;
  if (label === "Employee Contacts") return routeColors.hex_2a8b86_6r8csh;
  if (label === "Holidays") return routeColors.hex_3b9a58_9w528y;
  if (label === "Time Sheet") return routeColors.hex_b1892d_7hs7ia;
  if (label === "Spec Sheets") return routeColors.hex_7577d8_6e9zug;
  if (label === "Insurance & Compliance") return routeColors.hex_667085_4l8fsc;
  if (label === "Settings") return routeColors.hex_c94b58_6zw5s7;
  return colors.accent;
}

/* ----------------------- shared helpers ----------------------- */

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

const toDateSafe = (v) => {
  if (!v) return null;
  if (v?.toDate && typeof v.toDate === "function") return v.toDate();

  const d = new Date(v);

  return Number.isNaN(d.getTime()) ? null : d;
};

const toISODate = (d) => {
  const date = d instanceof Date ? d : toDateSafe(d);
  if (!date) return null;

  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");

  return `${y}-${m}-${dd}`;
};

const fmtUK = (d) =>
  (d instanceof Date ? d : toDateSafe(d))?.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) ?? "";

const getTomorrow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const bookingDatesText = (arr) => {
  const list = Array.isArray(arr) ? arr : [];

  const mapped = list
    .map((x) => {
      if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)) return x;

      const iso = toISODate(x);
      return iso || null;
    })
    .filter(Boolean);

  return Array.from(new Set(mapped)).map(formatLongBookingDate).join(", ");
};

function getEmployeesForDate(job, isoDate, allEmployees) {
  const byDate = job.employeesByDate || job.employeeAssignmentsByDate || null;
  const byCodeDate =
    job.employeeCodesByDate || job.assignedEmployeeCodesByDate || null;

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
    ...(Array.isArray(codeList)
      ? codeList.map((code) => ({ userCode: code }))
      : []),
  ];

  const mapped = list.map((e) => {
    if (typeof e === "string") {
      const value = String(e || "").trim();

      const matchByName = allEmployees.find(
        (x) => safeStr(x.name) === safeStr(value)
      );

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
          displayName:
            matchByCode.name || matchByCode.displayName || `Code ${value}`,
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
      resolveEmployeeByCode(
        allEmployees,
        e.userCode || e.employeeCode || e.code
      )?.userCode ||
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

/* ----------------------- holiday helpers ----------------------- */

const isBankHolidayEntry = (h) => {
  const type = safeStr(h?.type || h?.holidayType || h?.category || h?.scope);
  const name = safeStr(h?.name || h?.holidayName || h?.title || h?.label);

  return (
    h?.isBankHoliday === true ||
    h?.bankHoliday === true ||
    h?.isPublicHoliday === true ||
    ["bank", "bankholiday", "bank holiday", "public", "public holiday"].includes(
      type
    ) ||
    name.includes("bank holiday") ||
    name.includes("public holiday")
  );
};

const isTruthy = (v) =>
  v === true ||
  v === 1 ||
  String(v ?? "").trim().toLowerCase() === "true" ||
  String(v ?? "").trim().toLowerCase() === "yes";

function getHolidayPayStatus(h) {
  if (isTruthy(h?.paid) || isTruthy(h?.isPaid)) return "Paid";

  const paidStatus = safeStr(h?.paidStatus || h?.payStatus || h?.payType);

  if (paidStatus === "paid") return "Paid";
  if (paidStatus === "unpaid") return "Unpaid";

  const type = safeStr(h?.type || h?.holidayType || h?.category);
  const name = safeStr(h?.name || h?.holidayName || h?.title || h?.label);
  const bucket = `${type} ${name}`;

  if (bucket.includes("unpaid")) return "Unpaid";
  if (bucket.includes("paid")) return "Paid";

  return "Paid";
}

function getHolidayInfoForDate(h, employee, targetISO) {
  if (isBankHolidayEntry(h)) {
    const start = toDateSafe(h.startDate || h.from || h.date);
    const end = toDateSafe(h.endDate || h.to || start);

    if (!start) return null;

    const sISO = toISODate(start);
    const eISO = toISODate(end || start);

    if (!sISO || !eISO) return null;

    if (sISO <= targetISO && eISO >= targetISO) {
      return {
        kind: "bank",
        label: (h?.name || h?.title || h?.holidayName || "Bank Holiday").toString(),
      };
    }

    return null;
  }

  if (!employee) return null;

  const statusStr = safeStr(h.status);
  if (statusStr !== "approved") return null;

  const meCode = canonicalEmployeeCode(employee.userCode);
  const meName = safeStr(employee.name || employee.displayName);

  if (!meCode && !meName) return null;

  const codeMatch =
    !!meCode && [h.employeeCode, h.userCode].some((code) => codesEqual(code, meCode));

  const nameMatch =
    !!meName && [h.employee, h.name].map(safeStr).includes(meName);

  if (!codeMatch && !nameMatch) return null;

  const start = toDateSafe(h.startDate || h.from);
  const end = toDateSafe(h.endDate || h.to || start);

  if (!start) return null;

  const sISO = toISODate(start);
  const eISO = toISODate(end || start);

  if (!sISO || !eISO) return null;

  if (!(sISO <= targetISO && eISO >= targetISO)) return null;

  return {
    kind: "personal",
    pay: getHolidayPayStatus(h),
    label: h?.reason || h?.holidayReason || h?.notes || "",
  };
}

function pickHolidayInfoForDate(holidaysRaw, employee, targetISO) {
  let bank = null;
  let personal = null;

  for (const h of holidaysRaw || []) {
    const info = getHolidayInfoForDate(h, employee, targetISO);

    if (!info) continue;

    if (info.kind === "personal") personal = info;
    if (info.kind === "bank") bank = info;
  }

  return personal || bank || null;
}

const getCallTime = (job, dateISO) => {
  const byDate =
    job.callTimes?.[dateISO] ||
    job.callTimeByDate?.[dateISO] ||
    job.call_times?.[dateISO];

  const single = job.callTime || job.calltime || job.call_time;

  const fromNotes =
    job.notesByDate?.[`${dateISO}-callTime`] || job.notesByDate?.[dateISO]?.callTime;

  return byDate || single || fromNotes || null;
};

const getDayNote = (job, dateISO) => {
  const nb = job?.notesByDate || {};
  const raw = nb?.[dateISO];

  if (!raw) return null;

  if (raw === "Other") {
    const other = nb?.[`${dateISO}-other`];

    if (typeof other === "string" && other.trim()) return other.trim();

    return "Other";
  }

  if (typeof raw === "string" && raw.trim()) return raw.trim();

  return null;
};

const getJobNote = (job) => {
  if (typeof job?.notes === "string" && job.notes.trim()) return job.notes.trim();

  return null;
};

const isRecceDay = (job, dateISO) =>
  /\b(recce\s*day)\b/i.test(getDayNote(job, dateISO) || "");

export default function HomeScreen() {
  const router = useRouter();

  const { signOutAccount, user, employee, reloadSession } = useAuth();
  const { invalidate } = useDataCache();
  const { colors, colorScheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const responsive = useResponsiveLayout();
  const bookingsResource = useBookings();
  const holidaysResource = useHolidays();
  const vehiclesResource = useVehicles();

  const dashboardCards = useMemo(() => createDashboardCardStyles(colors, "grouped"), [colors]);

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const [todayJobs, setTodayJobs] = useState([]);
  const [todayHolidayInfo, setTodayHolidayInfo] = useState(null);

  const [selectedDate, setSelectedDate] = useState(getTomorrow);

  const [dayJobs, setDayJobs] = useState([]);
  const [dayHolidayInfo, setDayHolidayInfo] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());

  const planningDataRef = useRef({ jobs: [], holidaysRaw: [], allEmployees: [] });
  const [planningVersion, setPlanningVersion] = useState(0);

  const [recceOpen, setRecceOpen] = useState(false);
  const [recceJob, setRecceJob] = useState(null);
  const [recceDateISO, setRecceDateISO] = useState(null);
  const [savingRecce, setSavingRecce] = useState(false);
  const [reccePhotos, setReccePhotos] = useState([]);
  const recceDocId = null;

  const [recceForm, setRecceForm] = useState({
    lead: "",
    locationName: "",
    address: "",
    parking: "",
    access: "",
    hazards: "",
    power: "",
    measurements: "",
    recommendedKit: "",
    notes: "",
    createdAt: null,
    createdBy: null,
  });

  const loadAccountNotifications = useCallback(async () => {
    try {
      const inbox = await getInbox();
      setNotificationItems(inbox);
    } catch (error) {
      console.warn("[home] notification inbox load failed:", error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getInbox()
      .then((inbox) => {
        if (active) setNotificationItems(inbox);
      })
      .catch((error) =>
        console.warn("[home] notification inbox load failed:", error)
      );
    const unsubscribe = subscribeToInbox((inbox) => {
      if (active) setNotificationItems(inbox);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const notificationSummary = useMemo(() => {
    const visible = collapseInboxDuplicates(notificationItems.filter((item) => notificationVisibleToAccount(item, { uid: user?.uid, personId: employee?.employeeId, companyId: employee?.companyId, employeeCode: employee?.userCode })));
    const unread = visible.filter((item) => item?.read !== true).length;
    return { total: visible.length, unread, latest: visible[0] || null };
  }, [notificationItems, user?.uid, employee?.employeeId, employee?.companyId, employee?.userCode]);

  const planningDates = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();

    tomorrow.setDate(today.getDate() + 1);

    return Array.from(
      new Set(
        [toISODate(today), toISODate(tomorrow), toISODate(selectedDate)].filter(Boolean)
      )
    );
  }, [selectedDate]);

  const groups = useMemo(() => {
    return buttons.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }, []);

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

  const workspaceAccess = useMemo(() => resolveWorkspaceAccess(employee), [employee]);
  const canSwitchToService = workspaceAccess.user && workspaceAccess.service;
  const companyId = employee?.companyId || "";

  const openServiceWorkspace = useCallback(() => {
    if (!canSwitchToService) return;
    router.push("/service/home");
  }, [canSwitchToService, router]);

  const userInitials = (account.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeOfDay = useMemo(() => {
    const h = new Date().getHours();

    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";

    return "Good Evening";
  }, []);

  const todayISO = toISODate(new Date());

  const selectedISO = useMemo(() => toISODate(selectedDate), [selectedDate]);

  const gridColumnCount = getDashboardGridColumns(
    responsive.width,
    responsive.fontScale
  );

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        "sessionRole",
        "sessionIsService",
        "sessionUserAccess",
        "sessionServiceAccess",
        "sessionCompanyId",
        "displayName",
        "employeeId",
        "employeeEmail",
        "employeeUserCode",
        "userCode",
        "timesheetYardStart",
        "timesheetYardEnd",
        "timesheetOfficeStart",
        "timesheetOfficeEnd",
        "timesheetWorkshopStart",
        "timesheetWorkshopEnd",
        "timesheetDefaultType",
      ]);

      global.employee = null;
      await signOutAccount();
      await reloadSession();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const vehicleDisplayList = useCallback(
    (vehicles) => getVehicleDisplayList(vehicles, vehiclesResource.data),
    [vehiclesResource.data]
  );

  const vehiclesText = useCallback(
    (vehicles) => vehicleDisplayList(vehicles).join(", "),
    [vehicleDisplayList]
  );

  const loadPlanningData = useCallback(() => {
    if (!employee || !companyId) return null;
    const next = {
      jobs: bookingsResource.data.filter(isCrewedBooking).filter((job) => {
        const dates = Array.isArray(job.bookingDates) ? job.bookingDates : [];
        return dates.some((date) => planningDates.includes(toISODate(date)));
      }),
      holidaysRaw: holidaysResource.data,
      allEmployees: bookingsResource.employees,
    };
    planningDataRef.current = next;
    setPlanningVersion((prev) => prev + 1);
    return next;
  }, [
    bookingsResource.data,
    bookingsResource.employees,
    companyId,
    employee,
    holidaysResource.data,
    planningDates,
  ]);

  useEffect(() => {
    if (!employee) return;
    loadPlanningData();
  }, [employee, loadPlanningData]);

  const buildJobsForDate = useCallback(
    (dateISO, source = planningDataRef.current) => {
      if (!employee || !dateISO) return [];

      const meCode = canonicalEmployeeCode(employee.userCode);
      const meName = safeStr(employee.name || employee.displayName);

      const jobs = Array.isArray(source?.jobs) ? source.jobs : [];
      const allEmployees = Array.isArray(source?.allEmployees)
        ? source.allEmployees
        : [];

      const dayJobsList = [];

      for (const job of jobs) {
        const dates = Array.isArray(job.bookingDates) ? job.bookingDates : [];
        if (!dates.length) continue;

        for (const d of dates) {
          const dStr = toISODate(d);

          if (!dStr || dStr !== dateISO) continue;

          const todaysEmps = getEmployeesForDate(job, dStr, allEmployees);

          const isMineToday =
            (!!meCode && todaysEmps.some((r) => codesEqual(r.code, meCode))) ||
            (!!meName && todaysEmps.some((r) => safeStr(r.name) === meName));

          if (!isMineToday) continue;

          dayJobsList.push({
            ...job,
            employees: todaysEmps.map((r) => r.displayName).filter(Boolean),
          });

          break;
        }
      }

      return collapseLinkedJobsForDay(dayJobsList, dateISO);
    },
    [employee]
  );

  const startupJobs = useMemo(() => planningDates.flatMap(dateISO =>
    buildJobsForDate(dateISO, { jobs: bookingsResource.data.filter(isCrewedBooking), allEmployees: bookingsResource.employees }).map(job => ({
      id: job.id, dateISO, title: job.title || job.production || '', jobNumber: String(displayJobNumber(job) || ''), callTime: getCallTime(job, dateISO) || '', location: job.location || '',
    }))
  ), [planningDates, buildJobsForDate, bookingsResource.data, bookingsResource.employees]);
  useStartupSnapshotCapture({ route: 'home', selectedDateISO: selectedISO, selectedJobId: selectedJob?.id, jobs: startupJobs, completeDates: planningDates,
    enabled: !bookingsResource.isInitialLoading && !bookingsResource.error && !!bookingsResource.lastUpdatedAt });

  const holidayForDate = useCallback(
    (dateISO, source = planningDataRef.current) => {
      if (!dateISO) return null;

      const holidaysRaw = Array.isArray(source?.holidaysRaw)
        ? source.holidaysRaw
        : [];

      return pickHolidayInfoForDate(holidaysRaw, employee, dateISO);
    },
    [employee]
  );

  const loadDayStatus = useCallback(
    (date, source = planningDataRef.current) => {
      if (!employee) {
        setDayJobs([]);
        setDayHolidayInfo(null);
        return;
      }

      const dateISO = toISODate(date);

      if (!dateISO) {
        setDayJobs([]);
        setDayHolidayInfo(null);
        return;
      }

      const dayJobsList = buildJobsForDate(dateISO, source);

      setDayJobs(dayJobsList);

      const info = holidayForDate(dateISO, source);

      setDayHolidayInfo(dayJobsList.length === 0 ? info : null);
    },
    [employee, buildJobsForDate, holidayForDate]
  );

  useEffect(() => {
    loadDayStatus(selectedDate);
  }, [selectedDate, loadDayStatus, planningVersion]);

  const loadHeaderStatus = useCallback(
    (source = planningDataRef.current) => {
      if (!employee) {
        setTodayJobs([]);
        setTodayHolidayInfo(null);
        return;
      }

      const today = new Date();

      const todayDateISO = toISODate(today);

      const todaysJobsList = buildJobsForDate(todayDateISO, source);

      setTodayJobs(todaysJobsList);

      const todayInfo = holidayForDate(todayDateISO, source);

      setTodayHolidayInfo(todaysJobsList.length === 0 ? todayInfo : null);
    },
    [employee, buildJobsForDate, holidayForDate]
  );

  useEffect(() => {
    loadHeaderStatus();
  }, [loadHeaderStatus, planningVersion]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        bookingsResource.refresh(),
        holidaysResource.refresh(),
        vehiclesResource.refresh(),
      ]);
      setLastUpdatedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [
    bookingsResource,
    holidaysResource,
    vehiclesResource,
  ]);

  const goPrevDay = useCallback(() => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 1);
      return nd;
    });
  }, []);

  const goNextDay = useCallback(() => {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 1);
      return nd;
    });
  }, []);

  /* --------------------- recce helpers --------------------- */

  const ensureFileUri = async (uri) => {
    if (!uri) return null;

    try {
      const manip = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      return manip?.uri || null;
    } catch {
      return uri;
    }
  };

  const uploadReccePhotos = async (bookingId, dateISO, items) => {
    const urls = [];
    const uid = auth.currentUser?.uid || "public";

    for (let i = 0; i < items.length; i++) {
      const fileUri = await ensureFileUri(items[i].uri);

      if (!fileUri) continue;

      const filename = `${Date.now()}_${i}.jpg`;
      const path = `recce-photos/${uid}/${bookingId}/${dateISO}/${filename}`;
      const storageRef = ref(storage, path);

      const resp = await fetch(fileUri);
      const blob = await resp.blob();

      await new Promise((resolve, reject) =>
        uploadBytesResumable(storageRef, blob, {
          contentType: "image/jpeg",
        }).on("state_changed", undefined, reject, resolve)
      );

      urls.push(await getDownloadURL(storageRef));
    }

    return urls;
  };

  const pickPhotos = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        selectionLimit: 8,
        mediaTypes: IMAGES_ONLY,
        quality: 1,
      });

      if (res.canceled) return;

      const assets = res.assets ?? [];

      setReccePhotos((prev) =>
        [...prev, ...assets.map((a) => ({ uri: a.uri }))].slice(0, 8)
      );
    } catch (e) {
      console.warn("pickPhotos error:", e);
    }
  };

  const openRecceFor = useCallback(
    (job, recceDayISO) => {
      router.push({
        pathname: "/recce-form",
        params: {
          jobId: job.id,
          dateISO: recceDayISO,
          jobNumber: job.jobNumber || "N/A",
          locationName: job.location || "",
        },
      });
    },
    [router]
  );

  const saveRecce = async () => {
    if (!recceJob || !recceDateISO) return;

    try {
      setSavingRecce(true);

      const keepUrls = reccePhotos
        .filter((p) => p?.remote || (p?.uri || "").startsWith("http"))
        .map((p) => p.uri);

      const newLocals = reccePhotos.filter(
        (p) => !p?.remote && !(p?.uri || "").startsWith("http")
      );

      const uploaded = await uploadReccePhotos(recceJob.id, recceDateISO, newLocals);
      const finalPhotos = [...keepUrls, ...uploaded];

      const payload = {
        ...recceForm,
        photos: finalPhotos,
        createdAt: recceForm.createdAt || new Date().toISOString(),
        createdBy: employee?.userCode || "N/A",
        dateISO: recceDateISO,
      };

      await setDoc(
        doc(db, "bookings", recceJob.id),
        { recceForms: { [recceDateISO]: payload } },
        { merge: true }
      );

      const key =
        recceDocId ||
        `${recceJob.id}__${recceDateISO}__${employee?.userCode || "N/A"}`;

      await setDoc(
        doc(db, "recces", key),
        {
          bookingId: recceJob.id,
          jobNumber: recceJob.jobNumber || null,
          client: recceJob.client || null,
          dateISO: recceDateISO,
          status: "submitted",
          answers: payload,
          notes: payload.notes || "",
          photos: finalPhotos,
          createdAt: recceForm.createdAt ? recceForm.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: employee?.userCode || "N/A",
          lead: payload.lead || "",
          locationName: payload.locationName || "",
        },
        { merge: true }
      );
      await invalidate("collection:bookings");

      setRecceOpen(false);
      setRecceJob(null);
      setRecceDateISO(null);
      setReccePhotos([]);
    } catch (e) {
      console.error("Error saving recce form:", e);
    } finally {
      setSavingRecce(false);
    }
  };

  const renderStatusFallback = useCallback(
    (holidayInfo, dateObj, { upcoming = false } = {}) => {
      let label = "Yard Based";
      let icon = "home";

      if (holidayInfo?.kind === "personal") {
        label = holidayInfo.pay === "Unpaid" ? "Holiday (Unpaid)" : "Holiday (Paid)";
        icon = holidayInfo.pay === "Unpaid" ? "alert-triangle" : "sun";
      } else if (holidayInfo?.kind === "bank") {
        label = "Bank Holiday";
        icon = "briefcase";
      } else if (dateObj && [0, 6].includes(dateObj.getDay())) {
        label = "Off";
        icon = "moon";
      }

      return (
        <View
          accessibilityRole="summary"
          style={[styles.statusSummary, getCardSurfaceStyle(colors)]}
        >
          <View
            style={[
              styles.statusSummaryIcon,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Icon name={icon} size={18} color={colors.textMuted} />
          </View>
          <View style={styles.statusSummaryCopy}>
            <Text tone={"primary"} style={[styles.statusSummaryTitle]}>
              {label}
            </Text>
            <Text tone={"muted"} style={[styles.statusSummaryText]}>
              {upcoming
                ? "No job assigned."
                : "No assigned job details for today."}
            </Text>
          </View>
        </View>
      );
    },
    [colors]
  );

  const renderJobCard = useCallback(
    (job, dateISO) => {
      const dayNote = getDayNote(job, dateISO);
      const jobNote = getJobNote(job);
      const showRecce = isRecceDay(job, dateISO);
      const callTime = getCallTime(job, dateISO);
      const statusText = String(job.status || "");
      const statusLower = statusText.toLowerCase();

      const semanticStatus = statusLower.includes("cancel") || statusLower.includes("postpon")
        ? "neutral"
        : statusLower.includes("first pencil")
        ? "first pencil"
        : statusLower.includes("second pencil")
        ? "second pencil"
        : statusText;
      const statusTone = getStatusColors(semanticStatus, colorScheme).border;

      return (
        <TouchableOpacity
          key={job.id}
          onPress={() => setSelectedJob(job)}
          activeOpacity={0.86}
          accessibilityRole="button"
          accessibilityLabel={`Open job ${displayJobNumber(job)}${job.client ? ` for ${job.client}` : ""}`}
        >
          <SectionCard
            tone="grouped"
            layoutStyle={styles.jobCard}
          >
            <View style={[styles.jobAccent, { borderColor: statusTone }]} />
            <View style={styles.jobContent}>
              <View style={styles.titleRow}>
                <Text
                  tone={"primary"} style={[styles.jobTitle]}
                  numberOfLines={1}
                >
                  Job #{displayJobNumber(job)}
                </Text>

                {callTime ? (
                  <View
                    style={[
                      styles.callTimePill,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Icon name="clock" size={12} color={colors.textMuted} />
                    <Text tone={"primary"} style={[styles.callTime]}>
                      {callTime}
                    </Text>
                  </View>
                ) : null}
              </View>

              {job.client ? (
                <DetailLine
                  label="Production"
                  value={job.client}
                  colors={colors}
                />
              ) : null}

              {job.location ? (
                <DetailLine
                  label="Location"
                  value={job.location}
                  colors={colors}
                />
              ) : null}

              {Array.isArray(job.bookingDates) && job.bookingDates.length > 0 ? (
                <DetailLine
                  label="Dates"
                  value={bookingDatesText(job.bookingDates)}
                  colors={colors}
                />
              ) : null}

              {Array.isArray(job.employees) && job.employees.length > 0 ? (
                <DetailLine
                  label="Crew"
                  value={job.employees.join(", ")}
                  colors={colors}
                />
              ) : null}

              {getBookingVehicleReferences(job).length > 0 ? (
                <DetailLine
                  label="Vehicles"
                  value={vehiclesText(getBookingVehicleReferences(job))}
                  colors={colors}
                />
              ) : null}

              {Array.isArray(job.equipment) && job.equipment.length > 0 ? (
                <DetailLine
                  label="Equipment"
                  value={job.equipment.join(", ")}
                  colors={colors}
                />
              ) : null}

              <View style={styles.jobFooterRow}>
                {statusText ? (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: withAlpha(statusTone, 0.12),
                        borderColor: withAlpha(statusTone, 0.4),
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusTone }]}>
                      {statusText}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.jobOpenHint}>
                  <Text tone={"muted"} style={[styles.jobOpenText]}>
                    Details
                  </Text>
                  <Icon name="chevron-right" size={14} color={colors.textMuted} />
                </View>
              </View>

              {(dayNote || jobNote) ? (
                <View
                  style={[
                    styles.notesBox,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {dayNote ? (
                    <DetailLine label="Day Note" value={dayNote} colors={colors} />
                  ) : null}

                  {jobNote ? (
                    <DetailLine label="Job Note" value={jobNote} colors={colors} />
                  ) : null}
                </View>
              ) : null}

              {showRecce ? (
                <TouchableOpacity
                  style={[styles.recceBtn, { backgroundColor: colors.accent }]}
                  onPress={() => openRecceFor(job, dateISO)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={`Fill recce form for job ${job.jobNumber || ""}`.trim()}
                >
                  <Icon name="file-text" size={14} color={routeColors.hex_fff_yhjmu8} />
                  <Text style={styles.recceBtnText}>Fill Recce Form</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </SectionCard>
        </TouchableOpacity>
      );
    },
    [colorScheme, colors, openRecceFor, vehiclesText]
  );

  const renderActionGroup = ([groupName, groupItems]) => {
    const filteredItems = groupItems.filter((btn) => {
      if (btn.label !== "Work Diary") return true;

      return employee?.workDiaryAccess === true;
    });

    if (!filteredItems.length) return null;

    if (groupName === "More") {
      return (
        <View key={groupName} style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <Text tone={"primary"} style={[styles.groupTitle]}>
              {groupName}
            </Text>
            <View
              style={[
                styles.groupDividerLine,
                { backgroundColor: colors.border, opacity: 0.7 },
              ]}
            />
          </View>

          <SectionCard tone="grouped" layoutStyle={styles.moreList}>
            {filteredItems.map((btn, index) => {
              const actionTint = actionTintForLabel(btn.label, colors);
              const actionDescription =
                ACTION_DESCRIPTIONS[btn.label] || "Open section";
              return (
                <TouchableOpacity
                  key={btn.label}
                  style={[
                    styles.moreActionRow,
                    index < filteredItems.length - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  activeOpacity={0.86}
                  onPress={() => {
                    const route = ACTION_ROUTES[btn.label];
                    if (route === "/timesheet") router.navigate(route);
                    else if (route) router.push(route);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={btn.label}
                  accessibilityHint={actionDescription}
                >
                  <View
                    style={[
                      styles.moreActionIcon,
                      {
                        backgroundColor: withAlpha(actionTint, 0.08),
                        borderColor: withAlpha(actionTint, 0.24),
                      },
                    ]}
                  >
                    <Icon name={btn.icon} size={18} color={actionTint} />
                  </View>
                  <View style={styles.moreActionCopy}>
                    <Text tone={"primary"} style={[styles.moreActionTitle]}>
                      {btn.label}
                    </Text>
                    <Text
                      tone={"muted"} style={[styles.moreActionMeta]}
                      numberOfLines={1}
                    >
                      {actionDescription}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </SectionCard>
        </View>
      );
    }

    const quickActionColumns = Math.min(gridColumnCount, 2);
    const colCount = Math.min(quickActionColumns, filteredItems.length);
    const rows = [];

    for (let i = 0; i < filteredItems.length; i += colCount) {
      rows.push(filteredItems.slice(i, i + colCount));
    }

    return (
      <View key={groupName} style={styles.groupSection}>
        <View style={styles.groupHeader}>
          <Text tone={"primary"} style={[styles.groupTitle]}>
            {groupName}
          </Text>

          <View
            style={[
              styles.groupDividerLine,
              {
                backgroundColor: colors.border,
                opacity: 0.7,
              },
            ]}
          />
        </View>

        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View
              key={`${groupName}-row-${rowIndex}`}
              style={[
                styles.gridRow,
                rowIndex === rows.length - 1 && styles.gridRowLast,
              ]}
            >
              {row.map((btn, index) => {
                const actionTint = actionTintForLabel(btn.label, colors);
                const actionDescription =
                  ACTION_DESCRIPTIONS[btn.label] || "Open section";
                const isLastVisibleColumn = index === row.length - 1;

                return (
                  <TouchableOpacity
                    key={`${btn.label}-${index}`}
                    style={[
                      styles.button,
                      !isLastVisibleColumn && styles.gridItemSpacing,
                      getCardSurfaceStyle(colors, { borderAccent: withAlpha(actionTint, 0.14) }),
                    ]}
                    activeOpacity={0.86}
                    onPress={() => {
                      const route = ACTION_ROUTES[btn.label];
                      if (route === "/timesheet") router.navigate(route);
                      else if (route) router.push(route);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={btn.label}
                    accessibilityHint={actionDescription}
                  >
                    <View
                      style={[
                        styles.buttonIconWrap,
                        {
                          backgroundColor: withAlpha(actionTint, 0.06),
                          borderColor: withAlpha(actionTint, 0.18),
                        },
                      ]}
                    >
                      <Icon name={btn.icon} size={20} color={actionTint} />
                    </View>

                    <View style={styles.buttonTextWrap}>
                      <Text tone={"primary"} style={[styles.buttonText]}>
                        {btn.shortLabel || btn.label}
                      </Text>
                      <Text
                        numberOfLines={1}
                        tone={"muted"} style={[styles.buttonMeta]}
                      >
                        {btn.shortDescription}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      <PageShell
        appearance="grouped"
        contentSpacing="compact"
        refresh={{ refreshing, onRefresh }}
        state={{
          resources: [bookingsResource, holidaysResource, vehiclesResource],
          hasContent:
            bookingsResource.data.length > 0 || holidaysResource.data.length > 0,
          onRetry: onRefresh,
          loadingLabel: "Loading your dashboard…",
          loadingContent: <DashboardSkeleton columns={gridColumnCount} />,
        }}
        scrollProps={{ showsVerticalScrollIndicator: false }}
      >
        <View
          style={[
            styles.heroCard,
            dashboardCards.heroCard,
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.heroIntro}>
              <ExpoImage
                source={HOME_LOGO}
                style={styles.heroLogo}
                contentFit="contain"
                accessibilityLabel="Bickers Action logo"
              />

              <Text tone={"muted"} style={[styles.heroEyebrow]}>
                {timeOfDay}
              </Text>

              <Text tone={"primary"} style={[styles.heroTitle]}>
                {account.name}
              </Text>

              <Text tone={"muted"} style={[styles.heroSubtitle]}>
                {fmtUK(new Date())}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={({ pressed }) => [
                  styles.notificationButton,
                  {
                    backgroundColor: "transparent",
                    borderColor: colors.glassBorder,
                  },
                  pressed && !reduceMotion && { transform: [{ scale: t.materials.pressScale }] },
                ]}
                onPress={() => router.push("/notifications")}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  notificationSummary.unread > 0
                    ? `Open notifications, ${notificationSummary.unread} unread`
                    : "Open notifications"
                }
              >
                {({ pressed }) => (
                  <>
                    <AppleMaterialSurface pressed={pressed} style={styles.headerButtonMaterial} />
                    {Platform.OS === "ios" ? (
                      <SymbolView name="bell" size={20} weight="regular" tintColor={colors.text} />
                    ) : (
                      <Icon name="bell" size={19} color={colors.text} />
                    )}
                    {notificationSummary.unread > 0 ? (
                      <View
                        style={[
                          styles.userNotificationBadge,
                          {
                            backgroundColor: colors.accent,
                            borderColor: colors.background,
                          },
                        ]}
                      >
                        <Text style={styles.userNotificationBadgeText}>
                          {notificationSummary.unread > 99 ? "99+" : notificationSummary.unread}
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={({ pressed }) => [
                  styles.userIcon,
                  {
                    backgroundColor: "transparent",
                    borderColor: colors.glassBorder,
                  },
                  pressed && !reduceMotion && { transform: [{ scale: t.materials.pressScale }] },
                ]}
                onPress={() => {
                  loadAccountNotifications();
                  setShowAccountModal(true);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Open my account"
              >
                {({ pressed }) => (
                  <>
                    <AppleMaterialSurface pressed={pressed} style={styles.headerButtonMaterial} />
                    <Text tone={"primary"} style={[styles.userInitials]}> 
                      {userInitials}
                    </Text>

                    <View
                      style={[
                        styles.userPresence,
                        {
                          backgroundColor: colors.success,
                          borderColor: colors.background,
                        },
                      ]}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View
              style={[
                styles.heroMetaChip,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon name="hash" size={12} color={colors.textMuted} />
              <Text tone={"primary"} style={[styles.heroMetaText]}>
                Code {account.userCode}
              </Text>
            </View>

            <View style={styles.heroUpdateStatus}>
              <Icon name="refresh-cw" size={12} color={colors.textMuted} />
              <Text tone={"muted"} style={[styles.heroUpdateText]}>
                Updated {lastUpdatedAt.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.dashboardBody}>
        <View
          style={[
            styles.block,
            styles.flatSectionBlock,
            {
              backgroundColor: "transparent",
              borderColor: "transparent",
            },
          ]}
        >
          <View style={styles.blockHeadRow}>
            <View style={styles.blockTitleWrap}>
              <Text tone={"primary"} style={[styles.blockTitle]}>
                Today&apos;s Work
              </Text>

              <Text tone={"muted"} style={[styles.blockSubTitle]}>
                Assigned jobs and notes
              </Text>
            </View>

            {todayJobs.length > 0 ? (
              <View
                style={[
                  styles.countPill,
                  {
                    backgroundColor: withAlpha(colors.accent, 0.15),
                    borderColor: withAlpha(colors.accent, 0.45),
                  },
                ]}
              >
                <Text style={[styles.countPillText, { color: colors.accent }]}>
                  {todayJobs.length}
                </Text>
              </View>
            ) : null}
          </View>

          {todayJobs.length > 0
            ? todayJobs.map((job) => renderJobCard(job, todayISO))
            : renderStatusFallback(todayHolidayInfo, new Date())}
        </View>

        <View
          style={[
            styles.block,
            styles.flatSectionBlock,
            {
              backgroundColor: "transparent",
              borderColor: "transparent",
            },
          ]}
        >
          <View style={styles.blockHeadRow}>
            <View style={styles.blockTitleWrap}>
              <Text tone={"primary"} style={[styles.blockTitle]}>
                Plan Ahead
              </Text>

              <Text tone={"muted"} style={[styles.blockSubTitle]}>
                {selectedDate.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "2-digit",
                  month: "short",
                })}
              </Text>
            </View>

            <View style={styles.dayHeader}>
              <TouchableOpacity
                style={[
                  styles.dayNavBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={goPrevDay}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Previous planning day"
                hitSlop={4}
              >
                <Icon
                  name="arrow-left"
                  size={16}
                  color={colors.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dayNavBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={goNextDay}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Next planning day"
                hitSlop={4}
              >
                <Icon name="arrow-right" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {dayJobs.length > 0
            ? dayJobs.map((job) => renderJobCard(job, selectedISO))
            : renderStatusFallback(dayHolidayInfo, selectedDate, {
                upcoming: true,
              })}
        </View>
        {Object.entries(groups).map(renderActionGroup)}
        </View>
      </PageShell>

      <JobDetailsModal
        visible={!!selectedJob}
        job={selectedJob}
        colors={colors}
        onClose={() => setSelectedJob(null)}
        vehiclesText={vehiclesText}
      />

      <AccountModal
        visible={showAccountModal}
        account={account}
        colors={colors}
        notificationSummary={notificationSummary}
        canSwitchToService={canSwitchToService}
        onClose={() => setShowAccountModal(false)}
        onLogout={handleLogout}
        onSwitchToService={() => {
          setShowAccountModal(false);
          openServiceWorkspace();
        }}
        onViewProfile={() => {
          setShowAccountModal(false);
          router.push("/edit-profile");
        }}
        onViewNotifications={() => {
          setShowAccountModal(false);
          router.push("/notifications");
        }}
      />

      <RecceModal
        visible={recceOpen}
        colors={colors}
        recceDateISO={recceDateISO}
        recceJob={recceJob}
        recceForm={recceForm}
        setRecceForm={setRecceForm}
        reccePhotos={reccePhotos}
        setReccePhotos={setReccePhotos}
        savingRecce={savingRecce}
        onPickPhotos={pickPhotos}
        onCancel={() => {
          setRecceOpen(false);
          setRecceJob(null);
          setRecceDateISO(null);
        }}
        onSave={saveRecce}
      />
    </>
  );
}

/* ----------------------------- Components ----------------------------- */

const DetailLine = ({ label, value, colors }) => {
  if (!value) return null;

  return (
    <Text tone={"muted"} style={[styles.jobDetail]}>
      <Text tone={"primary"} style={[styles.jobLabel]}>{label}: </Text>
      {value}
    </Text>
  );
};

const BaseModal = ({ visible, children, onClose, contentStyle, scrollable = false, actions }) => (
  <AppModal
    visible={visible}
    onRequestClose={onClose}
    style={contentStyle}
    scrollable={scrollable}
    actions={actions}
  >
    {children}
  </AppModal>
);

const JobDetailsModal = ({ visible, job, colors, onClose, vehiclesText }) => {
  if (!job) return null;

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      actions={(
        <TouchableOpacity
          style={[styles.modalPrimaryButton, { backgroundColor: colors.accent, flex: 1 }]}
          onPress={onClose}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Close job details"
        >
          <Text style={styles.modalPrimaryButtonText}>Close</Text>
        </TouchableOpacity>
      )}
    >
      <View style={styles.modalHandle} />

      <Text tone={"primary"} style={[styles.modalTitle]}>
        Job #{displayJobNumber(job)}
      </Text>

      <View style={styles.modalInfoBox}>
        {job.client ? (
          <ModalDetail icon="briefcase" label="Production" value={job.client} colors={colors} />
        ) : null}

        {job.location ? (
          <ModalDetail icon="map-pin" label="Location" value={job.location} colors={colors} />
        ) : null}

        {Array.isArray(job.bookingDates) && job.bookingDates.length > 0 ? (
          <ModalDetail
            icon="calendar"
            label="Dates"
            value={bookingDatesText(job.bookingDates)}
            colors={colors}
          />
        ) : null}

        {Array.isArray(job.employees) && job.employees.length > 0 ? (
          <ModalDetail
            icon="users"
            label="Crew"
            value={job.employees.join(", ")}
            colors={colors}
          />
        ) : null}

        {getBookingVehicleReferences(job).length > 0 ? (
          <ModalDetail
            icon="truck"
            label="Vehicles"
            value={vehiclesText(getBookingVehicleReferences(job))}
            colors={colors}
          />
        ) : null}

        {Array.isArray(job.equipment) && job.equipment.length > 0 ? (
          <ModalDetail
            icon="tool"
            label="Equipment"
            value={job.equipment.join(", ")}
            colors={colors}
          />
        ) : null}

        {job.notes ? (
          <ModalDetail
            icon="file-text"
            label="Job Note"
            value={String(job.notes)}
            colors={colors}
          />
        ) : null}
      </View>

    </BaseModal>
  );
};

const AccountModal = ({
  visible,
  account,
  notificationSummary,
  canSwitchToService,
  onClose,
  onLogout,
  onSwitchToService,
  onViewProfile,
  onViewNotifications,
}) => {
  const insets = useSafeAreaInsets();
  return (
  <AppModal
    visible={visible}
    title="My Account"
    presentation="adaptive"
    style={{ paddingBottom: insets.bottom }}
    scrollable
    onRequestClose={onClose}
    closeLabel="Close account"
    actions={(
      <>
        <AppButton pill label="Log out" icon="log-out" variant="secondary" onPress={onLogout} layoutStyle={styles.accountFooterButton} />
        <AppButton pill label="Done" onPress={onClose} layoutStyle={styles.accountFooterButton} />
      </>
    )}
  >
    <View style={styles.accountIdentity}>
      <Avatar
        initials={(account.name || "U").split(" ").map((name) => name[0]).join("").toUpperCase().slice(0, 2)}
        label={account.name}
      />
      <View style={styles.accountIdentityCopy}>
        <Text variant="sectionTitle">{account.name}</Text>
        <Text variant="metadata" tone="secondary">Code {account.userCode}</Text>
        <Text variant="body" tone="secondary" selectable>{account.email || "Email not set"}</Text>
      </View>
    </View>
    <Divider />
    <View>
      <ListRow
        leadingIcon="edit-3"
        title="View Profile"
        subtitle="Your personal details"
        onPress={onViewProfile}
        accessibilityLabel="View profile"
        divider
      />
      <ListRow
        leadingIcon="bell"
        title="Notifications"
        subtitle={notificationSummary?.latest?.title || "You're all caught up"}
        status={notificationSummary?.unread > 0 ? <StatusChip label={`${notificationSummary.unread} unread`} tone="neutral" /> : null}
        onPress={onViewNotifications}
        accessibilityLabel={`Open notifications, ${notificationSummary?.unread || 0} unread`}
        divider={canSwitchToService}
      />
      {canSwitchToService ? (
        <ListRow
          leadingIcon="repeat"
          title="Switch to Service"
          subtitle="Workshop workspace"
          onPress={onSwitchToService}
          accessibilityLabel="Switch to Service workspace"
        />
      ) : null}
    </View>
  </AppModal>
  );
};

const RecceModal = ({
  visible,
  colors,
  recceDateISO,
  recceJob,
  recceForm,
  setRecceForm,
  reccePhotos,
  setReccePhotos,
  savingRecce,
  onPickPhotos,
  onCancel,
  onSave,
}) => (
  <AppModal
    visible={visible}
    title="Recce Form"
    onRequestClose={onCancel}
    scrollable
    busy={savingRecce}
    actions={
      <>
        <AppButton label="Cancel" variant="secondary" onPress={onCancel} disabled={savingRecce} />
        <AppButton label={savingRecce ? "Saving…" : "Save Recce"} icon="save" onPress={onSave} loading={savingRecce} />
      </>
    }
  >
        <Text
          tone={"muted"} style={[
            styles.modalSubtitle,
          ]}
        >
          {formatISODateDDMMYYYY(recceDateISO)} · Job #{recceJob?.jobNumber || "N/A"}
          {recceJob?.client ? ` · ${recceJob.client}` : ""}
        </Text>

        <View style={styles.recceScrollContent}>
          <Label colors={colors}>Recce Lead</Label>
          <FormField label=""

            value={recceForm.lead}
            onChangeText={(text) => setRecceForm((f) => ({ ...f, lead: text }))}
            placeholder="Your name"
          />

          <Label colors={colors}>Location Name</Label>
          <FormField label=""

            value={recceForm.locationName}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, locationName: text }))
            }
            placeholder="e.g. Richmond Park — Gate A"
          />

          <Label colors={colors}>Address</Label>
          <FormField label=""

            value={recceForm.address}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, address: text }))
            }
            placeholder="Street, City, Postcode"
          />

          <Label colors={colors}>Parking</Label>
          <TextArea label=""

            value={recceForm.parking}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, parking: text }))
            }
            placeholder="Where can we park? Permits? Height limits?"

          />

          <Label colors={colors}>Access</Label>
          <TextArea label=""

            value={recceForm.access}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, access: text }))
            }
            placeholder="Route in/out, gate codes, load-in distance…"

          />

          <Label colors={colors}>Hazards</Label>
          <TextArea label=""

            value={recceForm.hazards}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, hazards: text }))
            }
            placeholder="Slopes, public areas, water, overheads…"

          />

          <Label colors={colors}>Power Availability</Label>
          <FormField label=""

            value={recceForm.power}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, power: text }))
            }
            placeholder="Mains? Generator required? Distances?"
          />

          <Label colors={colors}>Measurements</Label>
          <FormField label=""

            value={recceForm.measurements}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, measurements: text }))
            }
            placeholder="Clearances, widths, distances…"
          />

          <Label colors={colors}>Recommended Vehicle/Kit</Label>
          <FormField label=""

            value={recceForm.recommendedKit}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, recommendedKit: text }))
            }
            placeholder="Vehicle type, rigging, radios, PPE…"
          />

          <Label colors={colors}>Photos</Label>

          <View style={styles.photoButtonRow}>
            <TouchableOpacity
              style={[
                styles.photoButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
              onPress={onPickPhotos}
              activeOpacity={0.9}
            >
              <Icon name="image" size={15} color={colors.text} />
              <Text tone={"primary"} style={[styles.photoButtonText]}>
                Library
              </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.photoGrid}>
            {reccePhotos.map((p, idx) => (
              <View key={`${p.uri}-${idx}`} style={styles.photoWrap}>
                <Image source={{ uri: p.uri }} style={styles.photoThumb} />

                <TouchableOpacity
                  onPress={() =>
                    setReccePhotos((prev) => prev.filter((_, i) => i !== idx))
                  }
                  style={styles.photoRemove}
                >
                  <Text style={styles.photoRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            {reccePhotos.length === 0 ? (
              <Text tone={"muted"} style={[styles.emptyPhotosText]}>
                No photos yet.
              </Text>
            ) : null}
          </View>

          <Label colors={colors}>Notes</Label>
          <TextArea label=""

            value={recceForm.notes}
            onChangeText={(text) =>
              setRecceForm((f) => ({ ...f, notes: text }))
            }
            placeholder="Anything else"

          />

          <View style={{ height: 10 }} />
        </View>
  </AppModal>
);

const ModalDetail = ({ icon, label, value, colors }) => {
  if (!value) return null;

  return (
    <View style={styles.modalDetailRow}>
      <Icon name={icon} size={15} color={colors.textMuted} />

      <View style={styles.modalDetailTextWrap}>
        <Text tone={"muted"} style={[styles.modalDetailLabel]}>
          {label}
        </Text>

        <Text tone={"primary"} style={[styles.modalDetailValue]}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const Label = ({ children, colors }) => (
  <Text
    tone={"muted"} style={[
      styles.inputLabel,
    ]}
  >
    {children}
  </Text>
);
