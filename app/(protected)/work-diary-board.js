import { getCardSurfaceStyle } from "../../lib/design/cardSurface";
import { routeColors } from "../../lib/design/routePresentation/work-diary-board-js.js";
import { styles } from "../../lib/design/screenStyles/work-diary-board-js.js";
import { AppModal, AppText as Text, AppPressable as TouchableOpacity } from "../../components/ui/AppPrimitives";
import { useLocalSearchParams, useRouter } from "expo-router";
import WorkDiaryAccessGate from "../../components/WorkDiaryAccessGate";
import { collection,
  getDocs, query, where } from "firebase/firestore";
import { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  useWindowDimensions } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { db } from "../../firebaseConfig";
import { getVehicleDisplayLabel } from "../../lib/fleetSchema";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { withAlpha } from "../../lib/design/color";
import { designTokens as t } from "../../lib/design/tokens";
import PageShell from "../../components/layout/PageShell";
import {
  getBookingLifecycle,
  getBookingLifecycleLabel,
  shouldShowDiaryBooking,
} from "../../lib/bookingLifecycle";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const COL_WIDTH = 290;
const HEADER_HEIGHT = 42;
const ROW_HEIGHT = 260;

let cachedBoardData = null;
let boardDataRequest = null;
let boardDataRequestCompanyId = null;
let boardDataRequestIdentity = null;

function getISO(value) {
  if (!value) return null;
  if (value?.toDate && typeof value.toDate === "function") {
    return value.toDate().toISOString().split("T")[0];
  }
  if (value instanceof Date) return value.toISOString().split("T")[0];
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function mondayFor(value) {
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysISO(iso, amount) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + amount);
  return isoFromDate(d);
}

function formatDayHeader(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DAY_NAMES[(d.getDay() + 6) % 7]} ${d.getDate()}`;
}

function formatVehicle(vehicle, vehicleDirectory = []) {
  return getVehicleDisplayLabel(vehicle, vehicleDirectory);
}

function toArray(val) {
  return Array.isArray(val) ? val : val ? [val] : [];
}

function formatPeople(val) {
  return toArray(val)
    .map((x) =>
      typeof x === "string"
        ? x
        : x?.name || x?.fullName || x?.label || x?.userCode || x?.email || "Unknown"
    )
    .filter(Boolean);
}

function extractBookingDates(job) {
  const set = new Set();
  if (Array.isArray(job?.bookingDates)) {
    job.bookingDates.map(getISO).filter(Boolean).forEach((d) => set.add(d));
  }

  const single = getISO(job?.date);
  const start = getISO(job?.startDate);
  const end = getISO(job?.endDate);
  if (single) set.add(single);

  if (start && end) {
    let cursor = start;
    let guard = 0;
    while (cursor <= end && guard < 180) {
      set.add(cursor);
      cursor = addDaysISO(cursor, 1);
      guard += 1;
    }
  } else if (start) {
    set.add(start);
  }

  return Array.from(set).sort();
}

function shouldShowBoardJob(job) {
  const status = String(job?.status || "").trim().toLowerCase();
  if (!status) return false;

  return (
    status.includes("confirmed") ||
    status.includes("complete") ||
    status.includes("first pencil") ||
    status.includes("second pencil")
  );
}

function overlapSpan(jobDates, weekDates) {
  const indexes = jobDates
    .map((date) => weekDates.indexOf(date))
    .filter((idx) => idx >= 0)
    .sort((a, b) => a - b);

  if (!indexes.length) return null;
  return { start: indexes[0], end: indexes[indexes.length - 1] };
}

function cardTone(job) {
  const status = String(job?.status || "").toLowerCase();
  const type = String(job?.bookingType || job?.type || "").toLowerCase();
  const isMaintenance =
    job?.isMaintenance === true ||
    !!job?.maintenanceType ||
    type === "maintenance" ||
    status === "maintenance";

  if (isMaintenance) {
    return {
      bg: routeColors.hex_a7d091_7z1amk,
      border: routeColors.hex_6e9d5e_48qwvs,
      text: routeColors.hex_142214_a6j16u,
    };
  }

  if (status.includes("complete")) {
    return {
      bg: routeColors.hex_a7d091_7z1amk,
      border: routeColors.hex_6e9d5e_48qwvs,
      text: routeColors.hex_142214_a6j16u,
    };
  }

  if (status.includes("confirmed")) {
    return {
      bg: routeColors.hex_f5f57a_4xffkg,
      border: routeColors.hex_a9a944_8bjrly,
      text: routeColors.hex_232323_72yy4n,
    };
  }

  if (status.includes("first pencil")) {
    return {
      bg: routeColors.hex_cfe7ff_8cg5td,
      border: routeColors.hex_7fa9d6_7g0531,
      text: routeColors.hex_1c2a3a_8m3it1,
    };
  }

  if (status.includes("second pencil")) {
    return {
      bg: routeColors.hex_f6c9cc_4y74y4,
      border: routeColors.hex_d28790_63pgd2,
      text: routeColors.hex_3a1e23_9vcdmp,
    };
  }

  return {
    bg: routeColors.hex_e9edf3_5qi9vy,
    border: routeColors.hex_98a6bb_f7qsvk,
    text: routeColors.hex_1d2430_8jyunq,
  };
}

function buildRows(items) {
  const sorted = [...items].sort((a, b) => {
    if (a.span.start !== b.span.start) return a.span.start - b.span.start;
    return b.span.end - a.span.end;
  });

  const rows = [];
  const placed = [];

  for (const item of sorted) {
    let rowIndex = 0;
    while (true) {
      const row = rows[rowIndex] || [];
      const overlaps = row.some(
        (existing) =>
          !(item.span.end < existing.span.start || item.span.start > existing.span.end)
      );
      if (!overlaps) {
        row.push(item);
        rows[rowIndex] = row;
        placed.push({ ...item, row: rowIndex });
        break;
      }
      rowIndex += 1;
    }
  }

  return { placed, rowCount: Math.max(rows.length, 1) };
}

function dayNotesFor(job, weekDates) {
  const notes = job?.notesByDate || {};
  return weekDates
    .map((date) => {
      const raw = notes?.[date];
      if (!raw) return null;
      const label =
        typeof raw === "string"
          ? raw
          : String(raw?.label || raw?.value || raw?.note || "").trim();
      if (!label) return null;
      const d = new Date(`${date}T00:00:00`);
      const short = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" }).toUpperCase();
      return `${short}: ${label}`;
    })
    .filter(Boolean);
}

function compactTags(job) {
  const tags = [];
  const crew = formatPeople(job?.employees);
  if (crew.length) tags.push(`${crew.length} crew`);
  const vehicles = toArray(job?.vehicles || job?.vehicle).map(formatVehicle).filter(Boolean);
  if (vehicles.length) tags.push(`${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`);
  if (job?.location) tags.push("location");
  return tags.slice(0, 3);
}

function firstText(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function titleForJob(job) {
  return firstText(job?.client, job?.production, job?.title, "Untitled Booking");
}

function formatDateLabel(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatDateRange(dates) {
  const clean = toArray(dates).map(getISO).filter(Boolean).sort();
  if (!clean.length) return "";
  if (clean.length === 1) return formatDateLabel(clean[0]);
  return `${formatDateLabel(clean[0])} - ${formatDateLabel(clean[clean.length - 1])}`;
}

function formatObjectMap(value, formatter = (v) => String(v ?? "").trim()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .map(([key, raw]) => {
      const text = formatter(raw);
      return text ? `${formatDateLabel(getISO(key) || key)}: ${text}` : "";
    })
    .filter(Boolean);
}

function formatNoteValue(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) return raw.map(formatNoteValue).filter(Boolean).join(", ");
  return firstText(raw.label, raw.value, raw.note, raw.notes, raw.text);
}

function formatTimeValue(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();
  return firstText(raw.callTime, raw.call, raw.value, raw.label);
}

function DetailRow({ icon, label, value, colors }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <View
        style={[
          styles.detailIcon,
          {
            backgroundColor: withAlpha(colors.surfaceAlt, 0.9),
            borderColor: withAlpha(colors.border, 0.8),
          },
        ]}
      >
        <Icon name={icon} size={14} color={colors.textMuted} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text tone={"muted"} style={[styles.detailLabel]}>{label}</Text>
        <Text tone={"primary"} style={[styles.detailValue]}>{value}</Text>
      </View>
    </View>
  );
}

export default function WorkDiaryBoardPage() {
  return <WorkDiaryAccessGate><WorkDiaryBoardContent /></WorkDiaryAccessGate>;
}

function WorkDiaryBoardContent() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, employee, isAuthed, loading: authLoading } = useAuth();
  const companyId = String(employee?.companyId || "").trim();
  const boardIdentity = !authLoading && isAuthed && user?.uid && companyId
    ? `${user.uid}:${companyId}`
    : "";
  const boardIdentityRef = useRef(boardIdentity);
  boardIdentityRef.current = boardIdentity;
  const { colors } = useTheme();
  const scrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const mountedRef = useRef(true);
  const { width: screenWidth } = useWindowDimensions();

  const [weekStart, setWeekStart] = useState(() => isoFromDate(mondayFor(new Date())));
  const [bookings, setBookings] = useState(() => (boardIdentity && cachedBoardData?.identity === boardIdentity ? cachedBoardData.bookings : []));
  const [vehicleDirectory, setVehicleDirectory] = useState(
    () => (boardIdentity && cachedBoardData?.identity === boardIdentity ? cachedBoardData.vehicles : [])
  );
  const [loading, setLoading] = useState(() => !cachedBoardData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(
    () => String(params.includeInactive || "") === "1"
  );

  const applyBoardData = useCallback((data) => {
    setBookings(data.bookings);
    setVehicleDirectory(data.vehicles);
  }, []);

  const loadBookings = useCallback(async ({ force = false } = {}) => {
    if (!boardIdentity) {
      applyBoardData({ bookings: [], vehicles: [] });
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (cachedBoardData?.identity === boardIdentity && !force) {
      applyBoardData(cachedBoardData);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let request = null;
    try {
      setError("");
      if (!cachedBoardData) setLoading(true);

      if (!boardDataRequest || boardDataRequestCompanyId !== companyId || boardDataRequestIdentity !== boardIdentity || force) {
        boardDataRequestCompanyId = companyId;
        boardDataRequestIdentity = boardIdentity;
        boardDataRequest = Promise.all([
          getDocs(query(collection(db, "bookings"), where("companyId", "==", companyId))),
          getDocs(query(collection(db, "vehicles"), where("companyId", "==", companyId))),
        ]);
      }

      request = boardDataRequest;
      const [bookingSnap, vehiclesSnap] = await request;
      if (!mountedRef.current || boardIdentityRef.current !== boardIdentity) return;
      const rows = bookingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const vehicles = vehiclesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const nextData = { companyId, identity: boardIdentity, bookings: rows, vehicles };
      cachedBoardData = nextData;
      if (mountedRef.current) applyBoardData(nextData);
    } catch (e) {
      console.error("work diary board load failed", e);
      if (mountedRef.current && boardIdentityRef.current === boardIdentity) setError("Could not load work diary board.");
    } finally {
      if (boardDataRequest === request) {
        boardDataRequest = null;
        boardDataRequestCompanyId = null;
        boardDataRequestIdentity = null;
      }
      if (mountedRef.current && boardIdentityRef.current === boardIdentity) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [applyBoardData, companyId, boardIdentity]);

  useEffect(() => {
    mountedRef.current = true;
    loadBookings();
    return () => {
      mountedRef.current = false;
    };
  }, [loadBookings]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysISO(weekStart, index)),
    [weekStart]
  );

  const boardItems = useMemo(() => {
    const matches = bookings
      .filter((job) => shouldShowDiaryBooking(job, includeInactive))
      .filter(
        (job) =>
          shouldShowBoardJob(job) ||
          (includeInactive && getBookingLifecycle(job) !== "active")
      )
      .map((job) => {
        const dates = extractBookingDates(job);
        const span = overlapSpan(dates, weekDates);
        if (!span) return null;
        return { job, dates, span };
      })
      .filter(Boolean);

    return buildRows(matches);
  }, [bookings, includeInactive, weekDates]);

  const inactiveCount = useMemo(
    () => bookings.filter((job) => getBookingLifecycle(job) !== "active").length,
    [bookings]
  );

  const boardHeight = HEADER_HEIGHT + boardItems.rowCount * ROW_HEIGHT;
  const boardWidth = COL_WIDTH * 7;
  const initialZoomScale = Math.min(1, Math.max(0.35, (screenWidth - 32) / boardWidth));
  const shiftWeek = (delta) => setWeekStart((prev) => addDaysISO(prev, delta * 7));

  const selectedJobDetails = useMemo(() => {
    if (!selectedJob) return null;

    const dates = extractBookingDates(selectedJob);
    const vehicles = toArray(selectedJob?.vehicles || selectedJob?.vehicle)
      .map((vehicle) => formatVehicle(vehicle, vehicleDirectory))
      .filter(Boolean);
    const people = formatPeople(selectedJob?.employees);
    const callTimes = formatObjectMap(
      selectedJob?.callTimes || selectedJob?.callTimesByDate || selectedJob?.callTimeByDate,
      formatTimeValue
    );
    const crewByDate = formatObjectMap(
      selectedJob?.employeesByDate || selectedJob?.employeeAssignmentsByDate,
      (raw) => formatPeople(raw).join(", ")
    );
    const notesByDate = formatObjectMap(selectedJob?.notesByDate, formatNoteValue);
    const dayNotes = dayNotesFor(selectedJob, dates);
    const equipment = toArray(selectedJob?.equipment || selectedJob?.kit)
      .map((item) =>
        typeof item === "string"
          ? item
          : firstText(item?.name, item?.label, item?.title, item?.description)
      )
      .filter(Boolean);

    return {
      dates,
      vehicles,
      people,
      callTimes,
      crewByDate,
      equipment,
      notes: [...new Set([...notesByDate, ...dayNotes])],
      generalNotes: firstText(selectedJob?.notes, selectedJob?.note, selectedJob?.description),
    };
  }, [selectedJob, vehicleDirectory]);

  useEffect(() => {
    requestAnimationFrame(() => {
      verticalScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });
  }, [weekStart, loading]);

  return (
    <PageShell
      appearance="grouped"
      header={{
        variant: "compact",
        eyebrow: "Operations",
        title: "Work Diary Board",
        onBack: router.back,
      }}
      refresh={{
        refreshing,
        onRefresh: () => {
          setRefreshing(true);
          loadBookings({ force: true });
        },
      }}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            <TouchableOpacity
              onPress={() => setWeekStart(isoFromDate(mondayFor(new Date())))}
              activeOpacity={0.85}
              style={[styles.todayBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text tone={"primary"} style={[styles.todayText]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIncludeInactive((value) => !value)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: includeInactive }}
              style={[
                styles.todayBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                includeInactive && {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accent,
                },
              ]}
            >
              <Icon
                name={includeInactive ? "eye-off" : "eye"}
                size={14}
                color={includeInactive ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.todayText, { color: includeInactive ? colors.accent : colors.textMuted }]}>
                {includeInactive ? "Hide inactive" : `Show inactive (${inactiveCount})`}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toolbarRight}>
            <TouchableOpacity
              onPress={() => shiftWeek(-1)}
              activeOpacity={0.85}
              style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Icon name="arrow-left" size={14} color={colors.text} />
              <Text tone={"primary"} style={[styles.navText]}>Previous Week</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => shiftWeek(1)}
              activeOpacity={0.85}
              style={[styles.navBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text tone={"primary"} style={[styles.navText]}>Next Week</Text>
              <Icon name="arrow-right" size={14} color={colors.text} />
            </TouchableOpacity>

          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text tone={"muted"} style={[styles.stateText]}>Loading weekly board…</Text>
          </View>
        ) : error ? (
          <View style={[styles.errorCard, getCardSurfaceStyle(colors, {"borderTone":"danger"})]}>
            <Text tone={"danger"} style={[styles.errorText]}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setRefreshing(true);
                loadBookings({ force: true });
              }}
              style={[styles.retryBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text tone={"primary"} style={[styles.retryText]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              style={styles.boardViewport}
              horizontal
              contentOffset={{ x: 0, y: 0 }}
              contentContainerStyle={styles.horizontalContent}
              showsHorizontalScrollIndicator
              nestedScrollEnabled
              bounces={false}
              alwaysBounceHorizontal={false}
              overScrollMode="never"
              minimumZoomScale={0.2}
              maximumZoomScale={1.5}
              zoomScale={initialZoomScale}
              bouncesZoom={false}
              pinchGestureEnabled
            >
              <View style={[styles.boardWrap, { width: boardWidth, backgroundColor: colors.surface }]}>
                <View style={[styles.boardGrid, { borderColor: colors.border, height: boardHeight }]}>
                  {weekDates.map((date, index) => (
                    <View
                      key={date}
                      style={[
                        styles.dayColumn,
                        {
                          left: index * COL_WIDTH,
                          width: COL_WIDTH,
                          height: boardHeight,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dayHeader,
                          {
                            backgroundColor: date === isoFromDate(new Date()) ? withAlpha(colors.accent, 0.18) : colors.surface,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <Text tone={"primary"} style={[styles.dayHeaderText]}>{formatDayHeader(date)}</Text>
                      </View>
                    </View>
                  ))}

                  {boardItems.placed.map(({ job, span, row }) => {
                    const tone = cardTone(job);
                    const lifecycle = getBookingLifecycle(job);
                    const inactive = lifecycle !== "active";
                    const notes = dayNotesFor(job, weekDates).slice(0, 3);
                    const employees = formatPeople(job?.employees).slice(0, 3).join(", ");
                    const vehicles = toArray(job?.vehicles || job?.vehicle)
                      .map((vehicle) => formatVehicle(vehicle, vehicleDirectory))
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(" • ");
                    const top = HEADER_HEIGHT + row * ROW_HEIGHT + 6;
                    const left = span.start * COL_WIDTH + 6;
                    const width = (span.end - span.start + 1) * COL_WIDTH - 12;

                    return (
                      <TouchableOpacity
                        key={job.id}
                        activeOpacity={0.9}
                        onPress={() => setSelectedJob(job)}
                        style={[
                          styles.bookingCard,
                          {
                            top,
                            left,
                            width,
                            backgroundColor: tone.bg,
                            borderColor: tone.border,
                            opacity: inactive ? 0.72 : 1,
                          },
                        ]}
                      >
                        <View style={styles.bookingTopRow}>
                          <View style={styles.initialsWrap}>
                            <Text style={[styles.initialsText, { color: tone.text }]}>
                              {formatPeople(job?.employees)
                                .map((name) => String(name).trim().split(" ").map((part) => part[0]).join(""))
                                .filter(Boolean)
                                .join(", ") || "BK"}
                            </Text>
                          </View>

                          <View style={styles.statusWrap}>
                            <Text style={[styles.statusText, { color: tone.text }]}>
                              {inactive
                                ? getBookingLifecycleLabel(job).toUpperCase()
                                : String(job?.status || "").toLowerCase().includes("confirmed")
                                  ? "CONFIRMED"
                                  : String(job?.status || "BOOKED").toUpperCase()}
                            </Text>
                            <Text style={[styles.statusText, { color: tone.text }]}>
                              {String(job?.status || "").toLowerCase().includes("crewed") ? "CREWED" : employees ? "CREWED" : ""}
                            </Text>
                          </View>

                          <View style={styles.jobNumberPill}>
                            <Text style={styles.jobNumberText}>{job.jobNumber || "----"}</Text>
                          </View>
                        </View>

                        <Text style={[styles.bookingTitle, { color: tone.text }]} numberOfLines={2}>
                          {job.client || job.production || "Untitled Booking"}
                        </Text>

                        {job.callTime ? (
                          <Text style={[styles.bookingLine, { color: tone.text }]}>CT {job.callTime}</Text>
                        ) : null}

                        {vehicles ? (
                          <Text style={[styles.bookingLine, { color: tone.text }]} numberOfLines={2}>
                            {vehicles}
                          </Text>
                        ) : null}

                        {job.location ? (
                          <Text style={[styles.bookingLine, { color: tone.text }]} numberOfLines={2}>
                            {job.location}
                          </Text>
                        ) : null}

                        <View style={styles.notesBlock}>
                          {notes.map((note) => (
                            <Text key={note} style={[styles.noteText, { color: withAlpha(tone.text, 0.72) }]} numberOfLines={1}>
                              {note}
                            </Text>
                          ))}
                        </View>

                        <View style={styles.tagsRow}>
                          {compactTags(job).map((tag) => (
                            <View key={tag} style={styles.tagPill}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </>
        )}

        <AppModal
          visible={!!selectedJob}
          title={selectedJob ? titleForJob(selectedJob) : "Booking details"}
          onRequestClose={() => setSelectedJob(null)}
          scrollable
        >
              {selectedJob && selectedJobDetails ? (
                <>
                  <View style={styles.detailHeader}>
                    <View style={{ flex: 1 }}>
                      <Text tone={"muted"} style={[styles.detailJobNumber]}>
                        {selectedJob.jobNumber || "Booking"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailModalContent}>
                    <View style={styles.detailPillRow}>
                      {selectedJob.status ? (
                        <View
                          style={[
                            styles.detailPill,
                            {
                              backgroundColor: withAlpha(cardTone(selectedJob).border, 0.16),
                              borderColor: withAlpha(cardTone(selectedJob).border, 0.45),
                            },
                          ]}
                        >
                          <Text tone={"primary"} style={[styles.detailPillText]}>
                            {String(selectedJob.status).toUpperCase()}
                          </Text>
                        </View>
                      ) : null}
                      {selectedJob.bookingType || selectedJob.type ? (
                        <View
                          style={[
                            styles.detailPill,
                            {
                              backgroundColor: withAlpha(colors.surfaceAlt, 0.9),
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text tone={"primary"} style={[styles.detailPillText]}>
                            {selectedJob.bookingType || selectedJob.type}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <DetailRow
                      icon="calendar"
                      label="Dates"
                      value={formatDateRange(selectedJobDetails.dates)}
                      colors={colors}
                    />
                    <DetailRow
                      icon="clock"
                      label="Call time"
                      value={firstText(
                        selectedJob.callTime,
                        selectedJob.calltime,
                        selectedJob.call_time,
                        selectedJobDetails.callTimes.join("\n")
                      )}
                      colors={colors}
                    />
                    <DetailRow
                      icon="map-pin"
                      label="Location"
                      value={firstText(selectedJob.location, selectedJob.address, selectedJob.site)}
                      colors={colors}
                    />
                    <DetailRow
                      icon="users"
                      label="Crew"
                      value={selectedJobDetails.people.join(", ")}
                      colors={colors}
                    />
                    <DetailRow
                      icon="truck"
                      label="Vehicles"
                      value={selectedJobDetails.vehicles.join("\n")}
                      colors={colors}
                    />
                    <DetailRow
                      icon="briefcase"
                      label="Production"
                      value={firstText(selectedJob.production, selectedJob.client)}
                      colors={colors}
                    />
                    <DetailRow
                      icon="user"
                      label="Contact"
                      value={[
                        firstText(selectedJob.contactName, selectedJob.contact, selectedJob.booker),
                        firstText(selectedJob.contactPhone, selectedJob.phone, selectedJob.mobile),
                        firstText(selectedJob.contactEmail, selectedJob.email),
                      ]
                        .filter(Boolean)
                        .join("\n")}
                      colors={colors}
                    />
                    <DetailRow
                      icon="calendar"
                      label="Crew by date"
                      value={selectedJobDetails.crewByDate.join("\n")}
                      colors={colors}
                    />
                    <DetailRow
                      icon="box"
                      label="Equipment"
                      value={selectedJobDetails.equipment.join("\n")}
                      colors={colors}
                    />
                    <DetailRow
                      icon="file-text"
                      label="Notes"
                      value={[selectedJobDetails.generalNotes, ...selectedJobDetails.notes]
                        .filter(Boolean)
                        .join("\n")}
                      colors={colors}
                    />
                  </View>
                </>
              ) : null}
        </AppModal>
      </View>
    </PageShell>
  );
}

