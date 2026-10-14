import { styles, quickStyles, summaryStyles } from "../../../../lib/design/screenStyles/service-tabs-service-home-js.js";
import { getServiceOverviewNotice, getServiceOverviewState } from "../../../../lib/serviceOverview";
import { AppText as Text, AppPressable as TouchableOpacity, AppButton, Banner, IconButton, StateView } from "../../../../components/ui/AppPrimitives";
// app/(protected)/service/home.js
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import PageHeaderCard from "../../../../components/PageHeaderCard";
import PageShell from "../../../../components/layout/PageShell";
import { useServiceCollection } from "../../../../hooks/useServiceData";
import { resolveWorkspaceAccess } from "../../../../lib/access";
import { createDashboardCardStyles } from "../../../../lib/design/dashboard";
import { servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
import { designTokens as t } from "../../../../lib/design/tokens";
import {
  getEquipmentNextInspection,
  getVehicleNextMot,
  getVehicleNextService,
  isVehicleActiveForMaintenance,
  isVehicleMotApplicable,
  isVehicleServiceApplicable,
} from "../../../../lib/fleetSchema";
import { countOpenMonitorItems } from "../../../../lib/serviceAdvisories";
import { isReportableCheckDefect } from "../../../../lib/dailyVehicleCheck";
import { useAuth } from "../../../../providers/AuthProvider";
import { useTheme } from "../../../../providers/ThemeProvider";

/* ---------- CONSTANTS & HELPERS ---------- */

const SERVICE_ROUTES = {
  settings: "/(protected)/service/settings",
  serviceList: "/(protected)/service/service-list",
  equipmentList: "/(protected)/service/equipment-list",
  defects: "/(protected)/service/defects",
  advisories: "/(protected)/service/advisories",
  activityHistory: "/(protected)/service/activity-history",
  mainApp: "/screens/homescreen",
};

const INITIAL_LOAD_MAX_MS = 4000;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toDateMaybe(value) {
  if (!value) return null;

  if (value?.toDate && typeof value.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string" || value instanceof String) {
    const raw = String(value).trim();
    if (!raw) return null;

    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function daysUntilDate(value) {
  const d = toDateMaybe(value);
  if (!d) return null;

  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = target.getTime() - start.getTime();

  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function classifyStatus(dateValue, windowDays = 30) {
  const days = daysUntilDate(dateValue);

  if (days === null) return { label: "No date", code: "unknown" };
  if (days < 0) {
    return {
      label: `Overdue by ${Math.abs(days)}d`,
      code: "overdue",
    };
  }
  if (days === 0) return { label: "Due today", code: "due-soon" };
  if (days <= windowDays) return { label: `Due in ${days}d`, code: "due-soon" };

  return { label: `In ${days}d`, code: "ok" };
}

function pickWorstStatusCode(motCode, serviceCode) {
  const codes = [motCode, serviceCode];

  if (codes.includes("overdue")) return "overdue";
  if (codes.includes("due-soon")) return "due-soon";
  if (codes.includes("ok")) return "ok";

  return "unknown";
}

function normaliseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isApprovedDefect(review) {
  const status = normaliseKey(review?.status);
  const category = normaliseKey(review?.category);

  return (
    status === "approved" &&
    (category === "general" || category === "immediate")
  );
}

function isOpenMaintenance(status) {
  const value = normaliseKey(status);

  return value !== "resolved" && value !== "complete" && value !== "completed";
}

function countOpenCheckDefects(checks) {
  return safeArray(checks).reduce((sum, check) => {
    const items = safeArray(check?.items);

    return (
      sum +
      items.filter(
        (item) =>
          isReportableCheckDefect(check, item) &&
          isOpenMaintenance(item?.maintenance?.status)
      ).length
    );
  }, 0);
}

function countOpenIssueDefects(issues) {
  return safeArray(issues).filter(
    (issue) =>
      isApprovedDefect(issue?.review) &&
      isOpenMaintenance(issue?.maintenance?.status)
  ).length;
}

function countOpenManualDefects(reports) {
  return safeArray(reports).filter((report) =>
    isOpenMaintenance(report?.status)
  ).length;
}

function countDueEquipment(records) {
  return safeArray(records).filter((record) => {
    const status = classifyStatus(getEquipmentNextInspection(record));

    return status.code === "overdue" || status.code === "due-soon";
  }).length;
}

function getActivityDate(item) {
  return (
    item?.completedAt ||
    item?.updatedAt ||
    item?.createdAt ||
    item?.inspectionDateISO ||
    item?.serviceDateOnly ||
    item?.serviceDate ||
    item?.completedDate ||
    item?.precheckDateOnly ||
    item?.precheckDateTime ||
    item?.prepDate ||
    item?.date ||
    null
  );
}

function getVehicleText(item) {
  return [
    item?.vehicleName || item?.vehicle || item?.name,
    item?.registration || item?.reg,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getEquipmentText(item) {
  return [
    item?.equipmentName || item?.name,
    item?.serialNumber || item?.equipmentId,
    item?.asset,
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildActivityItems({
  serviceRecords,
  defectReports,
  vehiclePrepRecords,
  motPreChecks,
  equipmentInspections,
}) {
  const services = safeArray(serviceRecords).map((record) => {
    const serviceType = record?.serviceType || record?.type || "Service";
    const isRepair =
      record?.recordType === "repair" ||
      normaliseKey(serviceType).includes("repair");

    return {
      id: `service-${record?.id || Math.random()}`,
      icon: isRepair ? "tool" : "clipboard",
      title: serviceType,
      subtitle:
        record?.workSummary ||
        record?.repairSummary ||
        record?.extraNotes ||
        "Service record completed",
      vehicle: getVehicleText(record),
      date: getActivityDate(record),
      route: record?.id
        ? `/(protected)/service/service-record/${record.id}`
        : null,
    };
  });

  const defects = safeArray(defectReports).map((report) => ({
    id: `defect-${report?.id || Math.random()}`,
    icon: report?.status === "resolved" ? "check-circle" : "alert-triangle",
    title: report?.status === "resolved" ? "Defect resolved" : "Defect reported",
    subtitle:
      report?.description ||
      report?.category ||
      report?.notes ||
      "Defect report logged",
    vehicle: getVehicleText(report),
    date: getActivityDate(report),
    route: SERVICE_ROUTES.defects,
  }));

  const prep = safeArray(vehiclePrepRecords).map((record) => ({
    id: `prep-${record?.id || Math.random()}`,
    icon: record?.completed ? "check-square" : "save",
    title: record?.completed ? "Vehicle prep completed" : "Vehicle prep saved",
    subtitle: record?.notes || "Vehicle prep record saved",
    vehicle: getVehicleText(record),
    date: getActivityDate(record),
    route: null,
  }));

  const mot = safeArray(motPreChecks).map((record) => ({
    id: `mot-${record?.id || Math.random()}`,
    icon: "file-text",
    title: "MOT pre-check",
    subtitle:
      record?.status ||
      record?.motPrecheckStatus ||
      record?.summary ||
      "MOT pre-check completed",
    vehicle: getVehicleText(record),
    date: getActivityDate(record),
    route: null,
  }));

  const inspections = safeArray(equipmentInspections).map((record) => ({
    id: `equipment-inspection-${record?.id || Math.random()}`,
    icon: record?.overallResult === "fail" ? "alert-circle" : "clipboard",
    title: "Equipment inspection",
    subtitle:
      record?.findings ||
      record?.recommendations ||
      record?.extraNotes ||
      `${
        record?.overallResult === "fail" ? "Failed" : "Passed"
      } equipment inspection`,
    vehicle: getEquipmentText(record),
    date: getActivityDate(record),
    route: record?.id
      ? `/(protected)/service/inspections/inspection-form/${record.id}`
      : null,
  }));

  return [...services, ...defects, ...prep, ...mot, ...inspections]
    .map((item) => ({ ...item, dateObj: toDateMaybe(item.date) }))
    .sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));
}

/* ---------- MAIN SCREEN ---------- */

export default function ServiceHomeScreen() {
  const router = useRouter();
  const { employee } = useAuth();

  const vehiclesResource = useServiceCollection("vehicles", { orderByField: "name" });
  const checksResource = useServiceCollection("vehicleChecks");
  const issuesResource = useServiceCollection("vehicleIssues");
  const serviceRecordsResource = useServiceCollection("serviceRecords");
  const defectsResource = useServiceCollection("defectReports");
  const prepResource = useServiceCollection("vehiclePrepRecords");
  const motResource = useServiceCollection("motPreChecks");
  const inspectionsResource = useServiceCollection("equipmentInspections");
  const equipmentResource = useServiceCollection("equipment", { orderByField: "name" });
  return <ServiceDashboardView router={router} employee={employee} resources={{ vehiclesResource, checksResource, issuesResource, serviceRecordsResource, defectsResource, prepResource, motResource, inspectionsResource, equipmentResource }} />;
}

export function ServiceDashboardView({ router, employee, resources }) {
  const { colors, colorScheme } = useTheme();
  const danger = getServiceStatusColors("danger", colorScheme);
  const warning = getServiceStatusColors("warning", colorScheme);
  const { vehiclesResource, checksResource, issuesResource, serviceRecordsResource, defectsResource, prepResource, motResource, inspectionsResource, equipmentResource } = resources;
  const vehicles = vehiclesResource.data;
  const vehicleChecks = checksResource.data;
  const vehicleIssues = issuesResource.data;
  const serviceRecords = serviceRecordsResource.data;
  const defectReports = defectsResource.data;
  const vehiclePrepRecords = prepResource.data;
  const motPreChecks = motResource.data;
  const equipmentInspections = inspectionsResource.data;
  const equipment = equipmentResource.data;
  const serviceResources = [
    vehiclesResource,
    checksResource,
    issuesResource,
    serviceRecordsResource,
    defectsResource,
    prepResource,
    motResource,
    inspectionsResource,
    equipmentResource,
  ];
  const [initialLoadTimedOut, setInitialLoadTimedOut] = useState(false);
  // Render progressively once any collection has resolved. Secondary badge and
  // activity listeners should not hold the entire dashboard behind a loader.
  const overviewState = getServiceOverviewState(serviceResources);
  const overviewNotice = getServiceOverviewNotice(serviceResources, initialLoadTimedOut);
  const allResourcesLoading = overviewState === "loading";
  const anyResourcesLoading = serviceResources.some((resource) => resource.isInitialLoading);
  const loading = allResourcesLoading;
  const refreshing =
    !loading && serviceResources.some((resource) => resource.isRefreshing);
  const refreshServiceHome = () =>
    Promise.all(serviceResources.map((resource) => resource.refresh()));

  useEffect(() => {
    if (!anyResourcesLoading) {
      setInitialLoadTimedOut(false);
      return undefined;
    }
    const timer = setTimeout(
      () => setInitialLoadTimedOut(true),
      INITIAL_LOAD_MAX_MS
    );
    return () => clearTimeout(timer);
  }, [anyResourcesLoading]);

  const workspaceAccess = useMemo(
    () => resolveWorkspaceAccess(employee),
    [employee]
  );

  const canSwitchToMainApp = workspaceAccess.user && workspaceAccess.service;

  const safePush = (href) => {
    if (!href) return;

    try {
      router.push(href);
    } catch (err) {
      console.error("Service Home navigation error:", href, err);
    }
  };

  const openDefectCount = useMemo(
    () =>
      countOpenCheckDefects(vehicleChecks) +
      countOpenIssueDefects(vehicleIssues) +
      countOpenManualDefects(defectReports),
    [defectReports, vehicleChecks, vehicleIssues]
  );

  const advisoryCount = useMemo(
    () =>
      countOpenMonitorItems(serviceRecords) +
      countOpenMonitorItems(equipmentInspections),
    [equipmentInspections, serviceRecords]
  );

  const equipmentDueCount = useMemo(() => countDueEquipment(equipment), [equipment]);

  const recentActivity = useMemo(
    () =>
      buildActivityItems({
        serviceRecords,
        defectReports,
        vehiclePrepRecords,
        motPreChecks,
        equipmentInspections,
      }).slice(0, 20),
    [
      defectReports,
      equipmentInspections,
      motPreChecks,
      serviceRecords,
      vehiclePrepRecords,
    ]
  );

  const processed = useMemo(() => {
    return safeArray(vehicles).map((v) => {
      const activeForMaintenance = isVehicleActiveForMaintenance(v);
      const motDateRaw = getVehicleNextMot(v);
      const serviceDateRaw = getVehicleNextService(v);

      const motStatus = activeForMaintenance && isVehicleMotApplicable(v)
        ? classifyStatus(motDateRaw)
        : { label: "Inactive", code: "not-applicable" };
      const serviceStatus = activeForMaintenance && isVehicleServiceApplicable(v)
        ? classifyStatus(serviceDateRaw)
        : { label: "Inactive", code: "not-applicable" };
      const defects = safeArray(v?.defects);
      const hasDefects = defects.length > 0;

      return {
        ...v,
        motStatus,
        serviceStatus,
        activeForMaintenance,
        motDateRaw,
        serviceDateRaw,
        defects,
        hasDefects,
        worstCode: pickWorstStatusCode(motStatus.code, serviceStatus.code),
      };
    });
  }, [vehicles]);

  const summary = useMemo(() => {
    const total = processed.length;

    const overdue = processed.filter(
      (v) =>
        v.motStatus.code === "overdue" || v.serviceStatus.code === "overdue"
    ).length;

    const dueSoon = processed.filter(
      (v) =>
        v.motStatus.code === "due-soon" || v.serviceStatus.code === "due-soon"
    ).length;

    const defects = openDefectCount;

    return { total, overdue, dueSoon, defects };
  }, [openDefectCount, processed]);

  return (
    <PageShell
      contentSpacing="compact"
      customHeader={
        <PageHeaderCard
          eyebrow="Workshop"
          title="Service & Maintenance"
          subtitle="Overview of MOT, servicing, defects and workshop activity."
          contentStyle={styles.headerContent}
          topSlot={
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Image
                  source={require("../../../../assets/images/bickers-action-logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {canSwitchToMainApp && (
                <IconButton
                  icon="grid"
                  label="Switch to main app"
                  size={21}
                  layoutStyle={{ marginLeft: t.spacing.sm }}
                  onPress={() => safePush(SERVICE_ROUTES.mainApp)}
                />
              )}

              <IconButton
                icon="user"
                label="Open service settings"
                size={22}
                layoutStyle={{ marginLeft: t.spacing.sm }}
                onPress={() => safePush(SERVICE_ROUTES.settings)}
              />
            </View>
          }
        />
      }
      customHeaderPlacement="scroll"
      refresh={{ refreshing, onRefresh: refreshServiceHome }}
    >
      {overviewState === "error" ? <StateView state="error" title="Couldn’t load fleet data" actionLabel="Retry fleet data" onAction={refreshServiceHome} /> : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary || COLORS.primaryAction}
          />
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            {initialLoadTimedOut ? "Fleet data is taking longer than usual…" : "Loading fleet data…"}
          </Text>
        </View>
      ) : (
        <>
          {overviewState === "partial" && overviewNotice ? <Banner tone={overviewNotice.tone} title={overviewNotice.title}>{overviewNotice.retry ? <AppButton label="Retry fleet data" variant="secondary" onPress={refreshServiceHome} /> : null}</Banner> : null}
          {/* FLEET SUMMARY */}
          <View style={styles.fleetOverview}>
            <Text
              tone={"primary"} style={[
                styles.infoTextTitle,
              ]}
            >
              Fleet Overview
            </Text>

            <View style={styles.summaryRow}>
              <SummaryItem
                label="Total vehicles"
                value={summary.total}
                color={colors.text || COLORS.textHigh}
                labelColor={colors.textMuted || COLORS.textMid}
              />
              <SummaryItem
                label="Overdue"
                value={summary.overdue}
                color={
                  summary.overdue > 0
                    ? danger.foreground
                    : colors.textMuted || COLORS.textMid
                }
                labelColor={colors.textMuted || COLORS.textMid}
              />
            </View>

            <View style={[styles.summaryRow, { marginTop: t.spacing.xs }]}>
              <SummaryItem
                label="Due soon (30d)"
                value={summary.dueSoon}
                color={
                  summary.dueSoon > 0
                    ? warning.foreground
                    : colors.textMuted || COLORS.textMid
                }
                labelColor={colors.textMuted || COLORS.textMid}
              />
              <SummaryItem
                label="With defects"
                value={summary.defects}
                color={
                  summary.defects > 0
                    ? danger.foreground
                    : colors.textMuted || COLORS.textMid
                }
                labelColor={colors.textMuted || COLORS.textMid}
              />
            </View>
          </View>

          {/* QUICK ACTIONS */}
          <View style={styles.sectionDivider}>
            <Text
              tone={"primary"} style={[
                styles.sectionTitle,
              ]}
            >
              Quick Actions
            </Text>
          </View>

          <View style={styles.quickRow}>
            <QuickActionCard
              icon="clipboard"
              title="All MOT & Service"
              subtitle="See full maintenance list"
              onPress={() => safePush(SERVICE_ROUTES.serviceList)}
              colors={colors}
            />
            <QuickActionCard
              icon="package"
              title="Equipment"
              subtitle={
                equipmentDueCount > 0
                  ? `${equipmentDueCount} due or overdue`
                  : "Inspection dates OK"
              }
              badgeCount={equipmentDueCount}
              badgeTone="warning"
              onPress={() => safePush(SERVICE_ROUTES.equipmentList)}
              colors={colors}
            />
          </View>

          <View style={styles.quickRow}>
            <QuickActionCard
              icon="alert-triangle"
              title="Defects & Issues"
              subtitle={
                openDefectCount > 0
                  ? `${openDefectCount} open defect${
                      openDefectCount === 1 ? "" : "s"
                    } need attention`
                  : "No open approved defects"
              }
              badgeCount={openDefectCount}
              badgeTone="danger"
              onPress={() => safePush(SERVICE_ROUTES.defects)}
              colors={colors}
            />
            <QuickActionCard
              icon="eye"
              title="Advisories"
              subtitle={
                advisoryCount > 0
                  ? `${advisoryCount} amber item${
                      advisoryCount === 1 ? "" : "s"
                    } to monitor`
                  : "No amber advisories"
              }
              badgeCount={advisoryCount}
              badgeTone="warning"
              onPress={() => safePush(SERVICE_ROUTES.advisories)}
              colors={colors}
            />
          </View>

          <View style={styles.quickRow}>
            <QuickActionCard
              icon="activity"
              title="Activity History"
              subtitle={
                recentActivity.length > 0
                  ? `${recentActivity.length} recent update${
                      recentActivity.length === 1 ? "" : "s"
                    }`
                  : "Services, repairs and defects"
              }
              badgeCount={recentActivity.length}
              badgeTone="success"
              onPress={() => safePush(SERVICE_ROUTES.activityHistory)}
              colors={colors}
            />
          </View>

        </>
      )}
    </PageShell>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function SummaryItem({ label, value, color, labelColor }) {
  return (
    <View style={summaryStyles.item}>
      <Text testID={`dashboard-summary-${label}`} style={[summaryStyles.value, { color }]}>{value}</Text>
      <Text style={[summaryStyles.label, { color: labelColor }]}>{label}</Text>
    </View>
  );
}

function QuickActionCard({
  icon,
  title,
  subtitle,
  badgeCount = 0,
  badgeTone = "neutral",
  onPress,
  colors,
}) {
  const { colorScheme } = useTheme();
  const badgePalette = getServiceStatusColors(badgeTone, colorScheme);
  const dashboardCards = createDashboardCardStyles({
    surface: colors.surface || COLORS.card,
    surfaceAlt: colors.surfaceAlt || COLORS.card,
    border: colors.border || COLORS.border,
  });

  return (
    <TouchableOpacity
      testID={`dashboard-action-${icon}`}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        quickStyles.card,
        dashboardCards.quickActionCard,
        {
          borderColor: colors.border,
          shadowOpacity: 0,
          elevation: 0,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[quickStyles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
        <Icon name={icon} size={18} color={colors.text} />
        {badgeCount > 0 && (
          <View style={[quickStyles.badge, { backgroundColor: badgePalette.background, borderColor: badgePalette.border }]}>
            <Text testID={`dashboard-badge-${icon}`} style={[quickStyles.badgeText, { color: badgePalette.onBackground }]}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        )}
      </View>

      <Text tone={"primary"} style={[quickStyles.title]}>
        {title}
      </Text>

      <Text
        tone={"muted"} style={[
          quickStyles.subtitle,
        ]}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------- STYLES ---------- */
