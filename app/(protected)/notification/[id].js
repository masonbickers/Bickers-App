import { getCardSurfaceStyle } from "../../../lib/design/cardSurface";
import { styles } from "../../../lib/design/screenStyles/notification-id-js.js";
import { AppText as Text, AppPressable as TouchableOpacity } from "../../../components/ui/AppPrimitives";
// app/(protected)/notification/[id].js
import {
  useLocalSearchParams,
  useRouter } from "expo-router";
import { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
    ActivityIndicator,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { useVehicles } from "../../../hooks/useOperationalData";
import { resolveNotificationVehicleBody } from "../../../lib/fleetSchema";
import { getBookingDayNote } from "../../../lib/bookingDayNotes";
import { getReceiptNotificationHref, isReceiptNotification } from "../../../lib/receipts/navigation";
import { getInbox, markRead } from "../../../lib/notificationInbox";
import { notificationVisibleToAccount } from "../../../lib/notificationVisibility";
import { formatDateDDMMYYYY } from "../../../lib/dateFormat";
import { isBookingVisibleToEmployee } from "../../../lib/bookingVisibility";
import {
  getTimesheetReminderHref,
  getTimesheetReminderWeekStart,
  isTimesheetReminder,
} from "../../../lib/timesheetNotification";
import { useAuth } from "../../../providers/AuthProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { withAlpha } from "../../../lib/design/color";
import { designTokens as t } from "../../../lib/design/tokens";
import PageShell from "../../../components/layout/PageShell";

function formatTime(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateSafe(v) {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISODate(v) {
  const d = v instanceof Date ? v : toDateSafe(v);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Try to pull a date from the notification payload (support multiple field names)
function extractISOFromNotificationData(data) {
  const d = data || {};
  const candidates = [
    d.dateISO,
    d.isoDate,
    d.date,
    d.jobDate,
    d.bookingDate,
    d.selectedDay,
    d.day,
  ];

  for (const c of candidates) {
    const iso = toISODate(c);
    if (iso) return iso;
  }
  return null;
}

function notificationBodySegments(body, vehicles) {
  return resolveNotificationVehicleBody(body, vehicles)
    .split("•")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export default function NotificationDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // /notification/[id]
  const { colors } = useTheme();
  const { user, employee } = useAuth();
  const account = { uid: user?.uid, personId: employee?.employeeId, companyId: employee?.companyId, employeeCode: employee?.userCode };
  const accountSignature = JSON.stringify(account), currentAccount = useRef(accountSignature);
  currentAccount.current = accountSignature;
  const vehiclesResource = useVehicles();

  const [storedItem, setItem] = useState(null);
  const item = storedItem && notificationVisibleToAccount(storedItem, account) ? storedItem : null;
  const [linkedBooking, setLinkedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navBusy, setNavBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getInbox();
      const found = list.find((n) => String(n.id) === String(id));
      if (currentAccount.current === accountSignature) setItem(found && notificationVisibleToAccount(found, JSON.parse(accountSignature)) ? found : null);
    } finally {
      setLoading(false);
    }
  }, [id, accountSignature]);

  useEffect(() => {
    setItem(null);
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    const bookingId = item?.data?.bookingId;

    if (!bookingId) {
      setLinkedBooking(null);
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, "bookings", String(bookingId)));
        const booking = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        if (active) {
          setLinkedBooking(
            booking && isBookingVisibleToEmployee(booking, employee) ? booking : null
          );
        }
      } catch (error) {
        console.warn("[notification-detail] booking load failed:", error?.message || error);
        if (active) setLinkedBooking(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [employee, item?.data?.bookingId]);

  useEffect(() => {
    // mark read when opened
    (async () => {
      if (!id || !item) return;
      await markRead(String(id));
      setItem((prev) => (prev ? { ...prev, read: true } : prev));
    })();
  }, [id, item?.id]);

  const typeLabel = useMemo(() => {
    const d = item?.data || {};
    if (isReceiptNotification(d)) return "Company-card receipt";
    if (isTimesheetReminder(d)) return "Timesheet";
    if (d.bookingId) return "Job";
    if (d.holidayId) return "Holiday";
    return "General";
  }, [item]);

  const iconName = useMemo(() => {
    const d = item?.data || {};
    if (isReceiptNotification(d)) return "file-text";
    if (isTimesheetReminder(d)) return "clock";
    if (d.bookingId) return "briefcase";
    if (d.holidayId) return "umbrella";
    return "info";
  }, [item]);

  const bodySegments = useMemo(
    () => notificationBodySegments(item?.body || "", vehiclesResource.data),
    [item?.body, vehiclesResource.data]
  );

  const jobDateISO = useMemo(
    () => extractISOFromNotificationData(item?.data),
    [item?.data]
  );
  const dayNotes = useMemo(
    () =>
      getBookingDayNote(linkedBooking, jobDateISO) ||
      getBookingDayNote(item?.data, jobDateISO),
    [item?.data, jobDateISO, linkedBooking]
  );

  const goToLinkedItem = useCallback(async () => {
    const d = item?.data || {};
    const receiptHref = getReceiptNotificationHref(d, { uid: user?.uid, personId: employee?.employeeId, companyId: employee?.companyId });
    if (receiptHref) { router.push(receiptHref); return; }
    const timesheetHref = getTimesheetReminderHref(d);
    if (timesheetHref) {
      router.push(timesheetHref);
      return;
    }

    if (d.bookingId) {
      try {
        setNavBusy(true);

        const snap = await getDoc(doc(db, "bookings", String(d.bookingId)));
        const booking = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        if (!booking || !isBookingVisibleToEmployee(booking, employee)) {
          router.replace("/notifications");
          return;
        }

        // 1) If notif already includes a date -> use it
        let iso = extractISOFromNotificationData(d);

        // 2) Otherwise fetch booking and use earliest booking date
        if (!iso) {
          const arr = Array.isArray(booking?.bookingDates) ? booking.bookingDates : [];
          iso = arr.length ? toISODate(arr[0]) : null;
        }

        // 3) Final fallback: today
        if (!iso) iso = toISODate(new Date());

        router.push({
          pathname: "/(protected)/screens/schedule",
          params: { date: iso },
        });
      } finally {
        setNavBusy(false);
      }
      return;
    }

    if (d.holidayId) {
      router.push("/holidaypage");
      return;
    }
  }, [employee, item, router, user?.uid]);

  return (
    <PageShell
      appearance="grouped"
      contentSpacing="compact"
      header={{
        variant: "compact",
        eyebrow: item ? typeLabel : "Inbox",
        title: "Notification",
        subtitle: item ? formatTime(item.createdAt) : "Inbox detail",
        onBack: router.back,
      }}
    >
      

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !item ? (
        <View style={styles.centerState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name="alert-circle" size={24} color={colors.textMuted} />
          </View>
          <Text tone={"primary"} style={[styles.emptyTitle]}>Notification unavailable</Text>
          <Text tone={"muted"} style={[styles.emptyText]}>
            This notification may have been cleared from your inbox.
          </Text>
        </View>
      ) : (
        <>
          <View
            style={[styles.summaryCard, getCardSurfaceStyle(colors)]}
          >
          <View style={styles.summary}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: withAlpha(colors.accent, 0.13),
                  borderColor: withAlpha(colors.accent, 0.3),
                },
              ]}
            >
              <Icon name={iconName} size={23} color={colors.accent} />
            </View>
            <View style={styles.summaryCopy}>
              <Text tone={"primary"} style={[styles.notificationTitle]}>
                {item.title}
              </Text>
              <Text style={[styles.typeLabel, { color: colors.accent }]}>{typeLabel}</Text>
            </View>
          </View>

          {bodySegments.length > 0 && (
            <View style={[styles.messageCard, { borderTopColor: colors.divider }]}>
              {bodySegments.map((segment, index) => (
                <View key={`${segment}-${index}`} style={styles.messageLine}>
                  <View style={[styles.messageDot, { backgroundColor: colors.accent }]} />
                  <Text tone={"primary"} style={[styles.body]}>{segment}</Text>
                </View>
              ))}
            </View>
          )}
          </View>

          <View
            style={[styles.detailCard, getCardSurfaceStyle(colors)]}
          >
            <DetailRow label="Received" value={formatTime(item.createdAt)} colors={colors} />

          {item.data?.bookingId ? (
            !!jobDateISO && (
              <DetailRow
                label="Job date"
                value={formatDateDDMMYYYY(jobDateISO)}
                colors={colors}
              />
            )
          ) : null}

            {dayNotes ? <DetailNote value={dayNotes} colors={colors} /> : null}

            {isTimesheetReminder(item.data) ? (
              <DetailRow
                label="Week commencing"
                value={formatDateDDMMYYYY(getTimesheetReminderWeekStart(item.data))}
                colors={colors}
              />
            ) : null}

            {!item.data?.bookingId && !isTimesheetReminder(item.data) ? (
              <DetailRow label="Status" value={item.read ? "Read" : "Unread"} colors={colors} />
            ) : null}
          </View>

          {(isReceiptNotification(item.data) || item.data?.bookingId ||
            item.data?.holidayId ||
            isTimesheetReminder(item.data)) && (
            <TouchableOpacity
              onPress={goToLinkedItem}
              activeOpacity={0.86}
              disabled={navBusy}
              style={[
                styles.cta,
                { backgroundColor: colors.accent, opacity: navBusy ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
            >
              <View style={styles.ctaContent}>
                {navBusy && <ActivityIndicator size="small" color={colors.textOnAccent} />}
                <Text style={[styles.ctaText, { color: colors.textOnAccent }]}>
                  {isReceiptNotification(item.data)
                    ? "Open company-card receipt"
                    : isTimesheetReminder(item.data)
                    ? "Open timesheet"
                    : item.data?.bookingId
                    ? "View job"
                    : "View holiday"}
                </Text>
              </View>
              <Icon name="arrow-up-right" size={19} color={colors.textOnAccent} />
            </TouchableOpacity>
          )}
        </>
      )}
    </PageShell>
  );
}

const DetailRow = ({ label, value, colors }) => (
  <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
    <Text tone={"muted"} style={[styles.detailLabel]}>{label}</Text>
    <Text tone={"primary"} style={[styles.detailValue]} selectable>
      {value}
    </Text>
  </View>
);

const DetailNote = ({ value, colors }) => (
  <View style={[styles.detailNote, { borderBottomColor: colors.border }]}> 
    <Text tone={"muted"} style={[styles.detailLabel]}>Day notes</Text>
    <Text tone={"primary"} style={[styles.detailNoteValue]} selectable>
      {value}
    </Text>
  </View>
);
