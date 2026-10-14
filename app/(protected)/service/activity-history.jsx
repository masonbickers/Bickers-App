import { routeColors } from "../../../lib/design/routePresentation/service-activity-history-jsx.js";
import { styles } from "../../../lib/design/screenStyles/service-activity-history-jsx.js";
import { SectionCard, AppText as Text, AppPressable as TouchableOpacity, FormField } from "../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../lib/design/semantics";
import { useRouter } from "expo-router";
import { useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { useServiceCollection } from "../../../hooks/useServiceData";
import { getVehicleDisplayLabel } from "../../../lib/fleetSchema";
import { matchesServiceSearch } from "../../../lib/serviceSearch";
import { useTheme } from "../../../providers/ThemeProvider";
import { designTokens as t } from "../../../lib/design/tokens";
import PageShell from "../../../components/layout/PageShell";

const ACTIVITY_ICON_COLORS = {
  services: routeColors.hex_2563eb_6ywilf,
  repairs: routeColors.hex_d97706_6cn8pp,
  defects: COLORS.primaryAction,
  inspections: routeColors.hex_64748b_4jwrvh,
  mot: routeColors.hex_2563eb_6ywilf,
};

function toDateMaybe(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value === "string" || value instanceof String) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (value instanceof Date) return value;
  return null;
}

function formatDate(value) {
  const d = toDateMaybe(value);
  if (!d) return "No date";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normaliseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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
    item?.date ||
    null
  );
}

function getVehicleText(item, vehicles) {
  return getVehicleDisplayLabel(item, vehicles);
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

function buildResolvedDefectRouteId(source, docId, itemIndex = "") {
  return encodeURIComponent([source, docId, itemIndex].join("|"));
}

function getActivityIconColor(typeKey) {
  return ACTIVITY_ICON_COLORS[typeKey] || COLORS.primaryAction;
}

function buildActivityItems({
  serviceRecords,
  defectReports,
  vehicles,
  motPreChecks,
  equipmentInspections,
}) {
  const services = serviceRecords.map((record) => {
    const serviceType = record.serviceType || record.type || "Service";
    const key = normaliseKey(serviceType);
    const isRepair = record.recordType === "repair" || key.includes("repair");
    const isInterim = key.includes("interim") || key.includes("minor");

    return {
      id: `service-${record.id}`,
      icon: isRepair ? "tool" : isInterim ? "settings" : "clipboard",
      typeKey: isRepair ? "repairs" : "services",
      title: serviceType,
      subtitle: record.workSummary || record.repairSummary || record.extraNotes || "Service record completed",
      vehicle: getVehicleText(record, vehicles),
      technician: record.signedBy || record.completedBy || "",
      searchValues: [record.workSummary, record.repairSummary, record.extraNotes, record.notes],
      date: getActivityDate(record),
      route: record.id ? `/service/service-record/${record.id}` : null,
    };
  });

  const defects = defectReports.map((report) => ({
    id: `defect-${report.id}`,
    icon: report.status === "resolved" ? "check-circle" : "alert-triangle",
    typeKey: "defects",
    title: report.status === "resolved" ? "Defect resolved" : "Defect reported",
    subtitle:
      report.status === "resolved" && report.completionNote
        ? report.completionNote
        : report.description || report.category || report.notes || "Defect report logged",
    vehicle: getVehicleText(report, vehicles),
    technician: report.reportedBy || report.reporterName || report.driverName || "",
    searchValues: [report.description, report.category, report.notes, report.completionNote],
    date: getActivityDate(report),
    route:
      report.status === "resolved"
        ? `/service/resolved-defects/${buildResolvedDefectRouteId("defectReports", report.id)}`
        : `/service/defects/${buildResolvedDefectRouteId("defectReports", report.id)}`,
  }));

  const completedVehicleDefects = vehicles.flatMap((vehicle) => {
    const defectHistory = Array.isArray(vehicle?.defectHistory)
      ? vehicle.defectHistory
      : [];

    return defectHistory
      .filter((item) => item?.source !== "defectReports")
      .map((item, index) => ({
        id: `vehicle-defect-${vehicle.id || "vehicle"}-${item?.sourceDocId || index}-${item?.itemIndex ?? "item"}`,
        icon: "check-circle",
        typeKey: "defects",
        title: "Defect resolved",
        subtitle: item?.completionNote || item?.description || item?.title || item?.sourceLabel || "Defect resolved",
        vehicle: getVehicleText({
          vehicleName: vehicle?.name || vehicle?.vehicleName || item?.vehicleName,
          registration: vehicle?.registration || vehicle?.reg || item?.registration,
        }, vehicles),
        technician: item?.completedBy || item?.resolvedBy || item?.reporter || "",
        searchValues: [item?.completionNote, item?.description, item?.title, item?.sourceLabel],
        date: item?.completedAt || item?.resolvedAt || item?.recordedAt,
        route: `/service/resolved-defects/${buildResolvedDefectRouteId("vehicles", vehicle.id, index)}`,
      }));
  });

  const mot = motPreChecks.map((record) => ({
    id: `mot-${record.id}`,
    icon: "file-text",
    typeKey: "mot",
    title: "MOT pre-check",
    subtitle: record.status || record.motPrecheckStatus || record.summary || "MOT pre-check completed",
    vehicle: getVehicleText(record, vehicles),
    technician: record.signedBy || record.completedBy || "",
    searchValues: [record.status, record.motPrecheckStatus, record.summary, record.extraNotes],
    date: getActivityDate(record),
    route: null,
  }));

  const inspections = equipmentInspections.map((record) => ({
    id: `equipment-inspection-${record.id}`,
    icon: record.overallResult === "fail" ? "alert-circle" : "clipboard",
    typeKey: "inspections",
    title: "Equipment inspection",
    subtitle:
      record.findings ||
      record.recommendations ||
      record.extraNotes ||
      `${record.overallResult === "fail" ? "Failed" : "Passed"} equipment inspection`,
    vehicle: getEquipmentText(record),
    technician: record.signedBy || record.inspectedBy || "",
    searchValues: [record.findings, record.recommendations, record.extraNotes, record.overallResult],
    date: getActivityDate(record),
    route: record.id ? `/service/inspections/inspection-form/${record.id}` : null,
  }));

  return [...services, ...defects, ...completedVehicleDefects, ...mot, ...inspections]
    .map((item) => ({ ...item, dateObj: toDateMaybe(item.date) }))
    .sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));
}

function useCollectionRows(collectionName, onErrorLabel) {
  const { rows } = useServiceCollection(collectionName, {
    label: onErrorLabel,
  });
  return rows;
}

export default function ActivityHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const serviceRecords = useCollectionRows("serviceRecords", "service activity");
  const defectReports = useCollectionRows("defectReports", "defect activity");
  const vehicles = useCollectionRows("vehicles", "vehicle defect history");
  const motPreChecks = useCollectionRows("motPreChecks", "MOT pre-check activity");
  const equipmentInspections = useCollectionRows("equipmentInspections", "equipment inspection activity");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const activity = useMemo(
    () =>
      buildActivityItems({
        serviceRecords,
        defectReports,
        vehicles,
        motPreChecks,
        equipmentInspections,
      }),
    [defectReports, equipmentInspections, motPreChecks, serviceRecords, vehicles]
  );

  const summary = useMemo(() => {
    const repairs = activity.filter((item) =>
      normaliseKey(item.title).includes("repair")
    ).length;
    const services = activity.filter((item) =>
      ["service", "interim", "minor"].some((key) => normaliseKey(item.title).includes(key))
    ).length;
    const defects = activity.filter((item) =>
      normaliseKey(item.title).includes("defect")
    ).length;
    const inspections = activity.filter((item) => item.typeKey === "inspections").length;

    return { total: activity.length, services, repairs, defects, inspections };
  }, [activity]);

  const filteredActivity = useMemo(() => {
    const queryText = normaliseKey(searchText);
    const now = new Date();

    return activity.filter((item) => {
      if (typeFilter !== "all" && item.typeKey !== typeFilter) return false;

      if (dateFilter !== "all") {
        if (!item.dateObj) return false;
        const diffDays =
          (now.getTime() - item.dateObj.getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === "today" && diffDays > 1) return false;
        if (dateFilter === "7d" && diffDays > 7) return false;
        if (dateFilter === "30d" && diffDays > 30) return false;
      }

      if (!queryText) return true;
      return matchesServiceSearch(queryText, [
        item.title,
        item.subtitle,
        item.vehicle,
        item.technician,
        ...item.searchValues,
      ]);
    });
  }, [activity, dateFilter, searchText, typeFilter]);

  return (
    <PageShell header={{
      variant: "compact",
      title: "Activity History",
      subtitle: "Recent services, repairs, defects and inspections.",
      onBack: router.back,
    }}>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.accent || COLORS.primaryAction}
          />
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            Loading activity...
          </Text>
        </View>
      ) : (
        <>
          <View
            style={styles.summaryCard}
          >
            <SummaryItem label="Total" value={summary.total} colors={colors} />
            <SummaryItem label="Services" value={summary.services} colors={colors} />
            <SummaryItem label="Repairs" value={summary.repairs} colors={colors} />
            <SummaryItem label="Defects" value={summary.defects} colors={colors} />
            <SummaryItem label="Inspections" value={summary.inspections} colors={colors} />
          </View>

          <View
            style={styles.filterCard}
          >
            <FormField
              label="Search"
              placeholder="Search vehicle, equipment, reg, notes, technician..."
              value={searchText}
              onChangeText={setSearchText}
              inputProps={{ returnKeyType: "search" }}
            />

            <FilterRow
              label="Type"
              horizontal
              value={typeFilter}
              options={[
                ["all", "All"],
                ["services", "Services"],
                ["repairs", "Repairs"],
                ["defects", "Defects"],
                ["inspections", "Inspections"],
                ["mot", "MOT"],
              ]}
              onChange={setTypeFilter}
              colors={colors}
            />

            <FilterRow
              label="Date"
              value={dateFilter}
              options={[
                ["all", "All"],
                ["today", "Today"],
                ["7d", "7 days"],
                ["30d", "30 days"],
              ]}
              onChange={setDateFilter}
              colors={colors}
            />
          </View>

          {filteredActivity.length === 0 ? (
            <SectionCard
              tone="subtle" layoutStyle={styles.emptyState}
            >
              <Icon
                name="activity"
                size={30}
                color={colors.textMuted || COLORS.textMid}
              />
              <Text tone={"primary"} style={[styles.emptyTitle]}>
                {searchText.trim() || typeFilter !== "all" || dateFilter !== "all" ? "No matching activity" : "No activity yet"}
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.emptySubtitle,
                ]}
              >
                {searchText.trim() || typeFilter !== "all" || dateFilter !== "all"
                  ? "Try clearing the search or changing the filters."
                  : "Completed services, repairs, MOT pre-checks, inspections and defects will appear here."}
              </Text>
            </SectionCard>
          ) : (
            filteredActivity.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.activityCard,
                  {
                    backgroundColor: colors.surfaceAlt || COLORS.card,
                    borderColor: colors.border || COLORS.border,
                  },
                ]}
                activeOpacity={item.route ? 0.85 : 1}
                onPress={() => {
                  if (item.route) router.push(item.route);
                }}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: getActivityIconColor(item.typeKey) },
                  ]}
                >
                  <Icon name={item.icon} size={18} color={COLORS.textHigh} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.activityHeaderRow}>
                    <Text
                      tone={"primary"} style={[
                        styles.activityTitle,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      tone={"muted"} style={[
                        styles.activityDate,
                      ]}
                    >
                      {formatDate(item.date)}
                    </Text>
                  </View>
                  {!!item.vehicle && (
                    <Text
                      tone={"muted"} style={[
                        styles.activityVehicle,
                      ]}
                    >
                      {item.vehicle}
                    </Text>
                  )}
                  {!!item.subtitle && (
                    <Text
                      tone={"muted"} style={[
                        styles.activitySubtitle,
                      ]}
                      numberOfLines={2}
                    >
                      {item.subtitle}
                    </Text>
                  )}
                  {!!item.route && (
                    <Icon
                      name="chevron-right"
                      size={16}
                      color={colors.textMuted || COLORS.textLow}
                      style={styles.cardChevron}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </>
      )}
    </PageShell>
  );
}

function SummaryItem({ label, value, colors }) {
  return (
    <View style={styles.summaryItem}>
      <Text tone={"primary"} style={[styles.summaryValue]}>
        {value}
      </Text>
      <Text tone={"muted"} style={[styles.summaryLabel]}>
        {label}
      </Text>
    </View>
  );
}

function FilterRow({ label, value, options, onChange, colors, horizontal = false }) {
  const chips = options.map(([optionValue, optionLabel]) => {
    const active = value === optionValue;
    return (
      <TouchableOpacity
        key={optionValue}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${optionLabel}`}
        accessibilityState={{ selected: active }}
        style={[
          styles.filterChip,
          {
            borderColor: active
              ? COLORS.primaryAction
              : colors.border || COLORS.border,
            backgroundColor: active
              ? getServiceStatusColors("danger").background
              : colors.surface || COLORS.card,
          },
        ]}
        onPress={() => onChange(optionValue)}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.filterChipText,
            {
              color: active
                ? getServiceStatusColors("danger").onBackground
                : colors.textMuted || COLORS.textMid,
            },
          ]}
        >
          {optionLabel}
        </Text>
      </TouchableOpacity>
    );
  });
  return (
    <View style={styles.filterBlock}>
      <Text
        tone={"muted"} style={[
          styles.filterLabel,
        ]}
      >
        {label}
      </Text>
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterChipsContent, styles.filterChipsSingleLine]}
        >
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.filterChipsContent}>{chips}</View>
      )}
    </View>
  );
}
