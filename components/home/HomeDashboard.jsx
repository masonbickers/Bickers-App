import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SymbolView } from "expo-symbols";
import Icon from "react-native-vector-icons/Feather";
import { AppText as Text, AppPressable as TouchableOpacity, SectionCard } from "../ui/AppPrimitives";
import AppleMaterialSurface from "../ui/AppleMaterialSurface";
import { styles } from "../../lib/design/screenStyles/main-tabs-screens-homescreen-js";
import { routeColors } from "../../lib/design/routePresentation/main-tabs-screens-homescreen-js";
import { getCardSurfaceStyle } from "../../lib/design/cardSurface";
import { createDashboardCardStyles } from "../../lib/design/dashboard";
import { getHomeActionSurfaces, getHomeCountSurface } from "../../lib/design/homeDashboard";
import { designTokens as t } from "../../lib/design/tokens";
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

const HOME_LOGO = require("../../assets/images/bickers-action-logo.png");

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


/** Home presentation only. Data, permissions and navigation stay with the caller. */
export default function HomeDashboard({ colors, reduceMotion = false, gridColumnCount = 2,
  account, timeOfDay, dateLabel, userInitials = "", notificationSummary = {unread:0},
  lastUpdatedAt = new Date(), selectedDate, todayCount = 0, todayContent, planningContent,
  goPrevDay, goNextDay, onOpenNotifications, onOpenAccount, onAction,
  workDiaryAccess = false, refreshingAccess = false, refreshUnavailable = false, savedAt = null,
}) {
  const dashboardCards = createDashboardCardStyles(colors, "grouped");
  const groups = buttons.reduce((result, button) => {
    (result[button.group] ||= []).push(button);
    return result;
  }, {});
  const renderActionGroup = ([groupName, groupItems]) => {
    const filteredItems = groupItems.filter((btn) => {
      if (btn.label !== "Work Diary") return true;

      return workDiaryAccess === true;
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
                <TouchableOpacity disabled={refreshingAccess} disabledAppearance="preserve"
                  key={btn.label}
                  style={[
                    styles.moreActionRow,
                    index < filteredItems.length - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  activeOpacity={0.86}
                  onPress={() => onAction?.(ACTION_ROUTES[btn.label])}
                  accessibilityRole="button"
                  accessibilityLabel={btn.label}
                  accessibilityHint={actionDescription}
                >
                  <View
                    style={[
                      styles.moreActionIcon,
                      getHomeActionSurfaces(actionTint).moreIcon,
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
                  <TouchableOpacity disabled={refreshingAccess} disabledAppearance="preserve"
                    key={`${btn.label}-${index}`}
                    style={[
                      styles.button,
                      !isLastVisibleColumn && styles.gridItemSpacing,
                      getCardSurfaceStyle(colors, { borderAccent: getHomeActionSurfaces(actionTint).quickBorder }),
                    ]}
                    activeOpacity={0.86}
                    onPress={() => onAction?.(ACTION_ROUTES[btn.label])}
                    accessibilityRole="button"
                    accessibilityLabel={btn.label}
                    accessibilityHint={actionDescription}
                  >
                    <View
                      style={[
                        styles.buttonIconWrap,
                        getHomeActionSurfaces(actionTint).quickIcon,
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

 return <>
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
                {dateLabel}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity disabled={refreshingAccess} disabledAppearance="preserve"
                style={({ pressed }) => [
                  styles.notificationButton,
                  {
                    backgroundColor: "transparent",
                    borderColor: colors.glassBorder,
                  },
                  pressed && !reduceMotion && { transform: [{ scale: t.materials.pressScale }] },
                ]}
                onPress={onOpenNotifications}
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

              <TouchableOpacity disabled={refreshingAccess} disabledAppearance="preserve"
                style={({ pressed }) => [
                  styles.userIcon,
                  {
                    backgroundColor: "transparent",
                    borderColor: colors.glassBorder,
                  },
                  pressed && !reduceMotion && { transform: [{ scale: t.materials.pressScale }] },
                ]}
                onPress={onOpenAccount}
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
                {account.userCode ? `Code ${account.userCode}` : "Account"}
              </Text>
            </View>

            <View style={styles.heroUpdateStatus}>
              <Icon name={refreshingAccess ? "clock" : "refresh-cw"} size={12} color={colors.textMuted} />
              <Text tone={"muted"} style={[styles.heroUpdateText]}>
                {refreshUnavailable ? "Update unavailable" : refreshingAccess
                  ? (savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Checking account…")
                  : `Updated ${lastUpdatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
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

            {todayCount > 0 ? (
              <View
                style={[
                  styles.countPill,
                  getHomeCountSurface(colors),
                ]}
              >
                <Text style={[styles.countPillText, { color: colors.accent }]}>
                  {todayCount}
                </Text>
              </View>
            ) : null}
          </View>

          {todayContent}
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
              <TouchableOpacity disabled={refreshingAccess} disabledAppearance="preserve"
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

              <TouchableOpacity disabled={refreshingAccess} disabledAppearance="preserve"
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

          {planningContent}
        </View>
        {Object.entries(groups).map(renderActionGroup)}
        </View>
</>;
}
