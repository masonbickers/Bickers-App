import { EmptyState, LoadingState } from "../../components/AsyncState";
import { styles } from "../../lib/design/screenStyles/notifications-js.js";
import { getReceiptNotificationHref, isReceiptNotification } from "../../lib/receipts/navigation";
import { groupNotificationItems } from "../../lib/notificationGroups";
import { AppText as Text, AppPressable as TouchableOpacity, AppButton, Banner } from "../../components/ui/AppPrimitives";
// app/(protected)/notifications.js
import {
  useRouter } from "expo-router";
import { useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import { useVehicles } from "../../hooks/useOperationalData";
import { resolveNotificationVehicleBody } from "../../lib/fleetSchema";
import { syncRemoteNotificationsToInbox } from "../../lib/remoteNotifications";
import {
  collapseInboxDuplicates,
  clearInbox,
  getInbox,
  markAllRead,
  markRead,
  subscribeToInbox,
} from "../../lib/notificationInbox";
import { notificationVisibleToAccount } from "../../lib/notificationVisibility";
import {
  getTimesheetReminderHref,
  isTimesheetReminder,
} from "../../lib/timesheetNotification";
import { useTheme } from "../../providers/ThemeProvider";
import { useAuth } from "../../providers/AuthProvider";
import { withAlpha } from "../../lib/design/color";
import { getStatusColors } from "../../lib/design/semantics";
import { designTokens as t } from "../../lib/design/tokens";
import PageShell from "../../components/layout/PageShell";

function formatTime(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "";
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (elapsedMinutes < 1) return "now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;
  return `${Math.floor(elapsedHours / 24)}d`;
}

function notificationPresentation(data = {}) {
  if (isReceiptNotification(data)) return { icon: "file-text", label: "Company-card receipt" };
  if (isTimesheetReminder(data)) return { icon: "clock", label: "Timesheet" };
  if (data?.bookingId) return { icon: "briefcase", label: "Job" };
  if (data?.holidayId) return { icon: "umbrella", label: "Holiday" };
  return { icon: "info", label: "General" };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, employee } = useAuth();
  const vehiclesResource = useVehicles();

  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const account = useMemo(() => ({ uid: user?.uid, personId: employee?.employeeId, companyId: employee?.companyId, employeeCode: employee?.userCode }), [user?.uid, employee?.employeeId, employee?.companyId, employee?.userCode]);
  const displayItems = useMemo(() => collapseInboxDuplicates(items.filter((item) => notificationVisibleToAccount(item, account))), [items, account]);

  const unreadCount = useMemo(
    () => displayItems.filter((n) => !n.read).length,
    [displayItems]
  );
  const load = useCallback(async () => {
    const list = await getInbox();
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch(() => { setError(true); setLoading(false); });
    const unsubscribe = subscribeToInbox((inbox) => {
      if (active) setItems(inbox);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    try {
      await syncRemoteNotificationsToInbox({ user, employee }).catch((error) =>
        setError(true)
      );
      await load();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employee, load, user]);

  const onTap = useCallback(
    async (n) => {
      if (!notificationVisibleToAccount(n, account)) return;
      // mark read immediately
      await markRead(n.id);
      await load();

      const receiptHref = getReceiptNotificationHref(n.data, account);
      if (receiptHref) { router.push(receiptHref); return; }
      const timesheetHref = getTimesheetReminderHref(n.data);
      if (timesheetHref) {
        router.push(timesheetHref);
        return;
      }

      router.push(`/(protected)/notification/${n.id}`);
    },
    [router, load, account]
  );

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead((item) => notificationVisibleToAccount(item, account));
    await load();
  }, [account, load]);

  const handleClearAll = useCallback(async () => {
    await clearInbox((item) => notificationVisibleToAccount(item, account));
    await load();
  }, [account, load]);

  const confirmClearAll = useCallback(() => {
    if (displayItems.length === 0) return;
    Alert.alert(
      "Clear notifications?",
      "This removes every notification from your inbox.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear all", style: "destructive", onPress: handleClearAll },
      ]
    );
  }, [handleClearAll, displayItems.length]);

  const openInboxActions = useCallback(() => {
    Alert.alert("Inbox actions", undefined, [
      ...(unreadCount > 0
        ? [{ text: "Mark all as read", onPress: handleMarkAllRead }]
        : []),
      ...(displayItems.length > 0
        ? [{ text: "Clear notifications", style: "destructive", onPress: confirmClearAll }]
        : []),
      { text: "Cancel", style: "cancel" },
    ]);
  }, [confirmClearAll, handleMarkAllRead, displayItems.length, unreadCount]);

  return <NotificationsView displayItems={displayItems} unreadCount={unreadCount} vehicles={vehiclesResource.data} loading={loading} error={error} refreshing={refreshing} onRefresh={onRefresh} onTap={onTap} onBack={router.back} openInboxActions={openInboxActions} />;
}

export function NotificationsView({ displayItems, unreadCount, vehicles, loading, error, refreshing, onRefresh, onTap, onBack, openInboxActions }) {
  const { colors, colorScheme } = useTheme();
  const accentStatus = getStatusColors("danger", colorScheme);
  const [filter, setFilter] = useState("all");
  const visibleItems = useMemo(() => {
    if (filter === "unread") return displayItems.filter((item) => !item.read);
    if (filter === "jobs") return displayItems.filter((item) => item.data?.bookingId);
    if (filter === "timesheets") return displayItems.filter((item) => isTimesheetReminder(item.data));
    if (filter === "holidays") return displayItems.filter((item) => item.data?.holidayId);
    return displayItems;
  }, [displayItems, filter]);
  const listItems = useMemo(
    () => groupNotificationItems(visibleItems).flatMap((group) => [
      { type: "heading", id: `heading:${group.label}`, label: group.label, count: group.items.length },
      ...group.items.map((notification, index) => ({
        type: "notification",
        id: notification.id,
        notification,
        showDivider: index < group.items.length - 1,
      })),
    ]),
    [visibleItems]
  );

  const filters = [
    { key: "all", label: "All" },
    { key: "unread", label: `Unread ${unreadCount}` },
    { key: "jobs", label: "Jobs" },
    { key: "timesheets", label: "Timesheets" },
    { key: "holidays", label: "Holidays" },
  ];

  const filterBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
      style={styles.filtersScroll}
    >
      {filters.map((option) => {
        const selected = filter === option.key;
        return (
          <TouchableOpacity
            key={option.key}
            onPress={() => setFilter(option.key)}
            activeOpacity={0.84}
            style={[
              styles.filterChip,
              {
                backgroundColor: selected ? accentStatus.background : colors.surfaceAlt,
                borderColor: selected ? accentStatus.border : withAlpha(colors.border, 0.72),
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.filterText, { color: selected ? accentStatus.foreground : colors.text }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderItem = ({ item }) => {
    if (item.type === "heading") {
      return (
        <View style={styles.groupHeading}>
          <Text tone={"primary"} style={[styles.groupTitle]}>{item.label}</Text>
          <Text tone={"muted"} style={[styles.groupCount]}>{item.count}</Text>
        </View>
      );
    }
    const notification = item.notification;
    const unread = !notification.read;
    const presentation = notificationPresentation(notification.data);
    const body = resolveNotificationVehicleBody(notification.body, vehicles);
    return (
                  <TouchableOpacity
                    key={notification.id}
                    testID={`notification-row-${notification.id}`}
                    onPress={() => onTap(notification)}
                    activeOpacity={0.78}
                    style={[
                      styles.notificationRow,
                      item.showDivider && {
                        borderBottomColor: colors.divider,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${notification.title}, ${formatTime(
                      notification.createdAt
                    )}`}
                  >
                    <View
                      style={[
                        styles.notificationIcon,
                        {
                          backgroundColor: unread
                            ? withAlpha(colors.accent, 0.13)
                            : colors.surfaceAlt,
                          borderColor: unread
                            ? withAlpha(colors.accent, 0.3)
                            : withAlpha(colors.border, 0.72),
                        },
                      ]}
                    >
                      <Icon
                        name={presentation.icon}
                        size={20}
                        color={unread ? colors.accent : colors.textMuted}
                      />
                      {unread && (
                        <View
                          style={[
                            styles.notificationUnreadDot,
                            {
                              backgroundColor: colors.accent,
                              borderColor: colors.background,
                            },
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.notificationCopy}>
                      <View style={styles.notificationTitleRow}>
                        <Text
                          tone={"primary"} style={[styles.notificationTitle]}
                        >
                          {notification.title}
                        </Text>
                        <Text tone={"muted"} style={[styles.notificationTime]}>
                          {formatTime(notification.createdAt)}
                        </Text>
                      </View>
                      {!!body && (
                        <Text
                          tone={"muted"} style={[styles.notificationBody]}
                          numberOfLines={2}
                        >
                          {body}
                        </Text>
                      )}
                      <View style={styles.notificationMetaRow}>
                        <Text tone={"muted"} style={[styles.notificationType]}>
                          {presentation.label}
                        </Text>
                        {unread && (
                          <Text style={[styles.unreadLabel, { color: accentStatus.foreground }]}>New</Text>
                        )}
                      </View>
                    </View>

                    <Icon name="chevron-right" size={21} color={colors.textMuted} />
                  </TouchableOpacity>
    );
  };

  const emptyState = loading && displayItems.length === 0
    ? <LoadingState label="Loading notifications…" presentation="grouped" />
    : (
      <EmptyState
        presentation="grouped"
        icon="bell"
        title={displayItems.length === 0 ? "No notifications" : "Nothing here yet"}
        message={displayItems.length === 0
          ? "Job, holiday and timesheet updates will appear here."
          : "Try another filter to see your other notifications."}
      />
    );

  return (
    <PageShell
      appearance="grouped"
      mode="list"
      contentSpacing="none"
      gutter="compact"
      header={{
        variant: "compact",
        title: "Notifications",
        subtitle: loading ? "Loading inbox…" : error ? "Refresh needed" : unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up",
        onBack,
        action: { label: "Actions", icon: "more-horizontal", onPress: openInboxActions },
      }}
      refresh={{ refreshing, onRefresh }}
      listHeader={
        <>
          {error ? <Banner tone="warning" title="Notifications may be out of date"><AppButton label="Retry notifications" variant="secondary" onPress={onRefresh} /></Banner> : null}
          {filterBar}
        </>
      }
      listEmpty={emptyState}
      listProps={{
        data: listItems,
        renderItem,
        keyExtractor: (item) => item.id,
        maintainVisibleContentPosition: { minIndexForVisible: 0 },
        initialNumToRender: 12,
        maxToRenderPerBatch: 12,
        windowSize: 7,
      }}
    />
  );
}
