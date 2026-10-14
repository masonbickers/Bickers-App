import { routeColors } from "../../../lib/design/routePresentation/service-equipment-list-js.js";
import { styles } from "../../../lib/design/screenStyles/service-equipment-list-js.js";
import { styles as fleetStyles } from "../../../lib/design/screenStyles/service-tabs-service-service-list-js.js";
import { getServiceOverviewState } from "../../../lib/serviceOverview";
import { matchesServiceSearch } from "../../../lib/serviceSearch";
import { AppText as Text, AppPressable as TouchableOpacity, FormField, StateView, Banner, AppButton } from "../../../components/ui/AppPrimitives";
import {
  getServiceStatusColors, servicePalette as COLORS } from "../../../lib/design/semantics";
import { useRouter } from "expo-router";
import { useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import PageShell from "../../../components/layout/PageShell";
import { designTokens as t } from "../../../lib/design/tokens";
import {
  getEquipmentCategory,
  getEquipmentLastInspection,
  getEquipmentName,
  getEquipmentNextInspection,
  getEquipmentStatus,
} from "../../../lib/fleetSchema";
import { useServiceCollection } from "../../../hooks/useServiceData";
import { useTheme } from "../../../providers/ThemeProvider";

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due-soon", label: "Due soon" },
  { key: "ok", label: "OK" },
  { key: "unknown", label: "No date" },
];

const STATUS_SECTIONS = [
  {
    key: "overdue",
    title: "Overdue - inspect today",
    description: "Next inspection date is in the past. Prioritise this equipment.",
  },
  {
    key: "due-soon",
    title: "Due in next 30 days",
    description: "Inspection is coming up within 30 days.",
  },
  {
    key: "ok",
    title: "OK / future",
    description: "Inspection date is not due soon.",
  },
  {
    key: "unknown",
    title: "No date recorded",
    description: "Missing next inspection date - update the equipment record.",
  },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateMaybe(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch.map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  const ukMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ukMatch) {
    const [, dd, mm, yyyy] = ukMatch.map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntilDate(value) {
  const d = toDateMaybe(value);
  if (!d) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

function classifyStatus(dateValue, windowDays = 30) {
  const days = daysUntilDate(dateValue);
  if (days === null) return { label: "No date", code: "unknown" };
  if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, code: "overdue" };
  if (days === 0) return { label: "Due today", code: "due-soon" };
  if (days <= windowDays) return { label: `Due in ${days}d`, code: "due-soon" };
  return { label: `In ${days}d`, code: "ok" };
}

function formatDateShort(value) {
  const d = toDateMaybe(value);
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

export default function EquipmentListScreen() {
  const router = useRouter();
  const resource = useServiceCollection("equipment", { label: "equipment list", orderByField: "name" });
  return <EquipmentListView resource={resource} router={router} />;
}

// The real screen view is also rendered with deterministic resources in visual QA.
export function EquipmentListView({ resource, router, embedded = false }) {
  const { colors, colorScheme } = useTheme();
  const { rows: equipment, loading } = resource;
  const dataState = getServiceOverviewState([resource]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedStatus, setExpandedStatus] = useState({
    overdue: true,
    "due-soon": true,
    ok: true,
    unknown: true,
  });

  const processed = useMemo(() => {
    return equipment.map((item) => {
      const nextInspectionRaw = getEquipmentNextInspection(item);
      const inspectionStatus = classifyStatus(nextInspectionRaw);
      return {
        ...item,
        nextInspectionRaw,
        inspectionStatus,
        worstCode: inspectionStatus.code,
      };
    });
  }, [equipment]);

  const summaryCounts = useMemo(() => {
    const counts = { overdue: 0, "due-soon": 0, ok: 0, unknown: 0 };
    processed.forEach((item) => {
      if (counts[item.worstCode] !== undefined) counts[item.worstCode] += 1;
    });
    return counts;
  }, [processed]);

  const filtered = useMemo(() => {
    let list = [...processed];
    if (search.trim()) {
      list = list.filter((item) => matchesServiceSearch(search, [
          getEquipmentName(item),
          item.label,
          item.serialNumber,
          item.asset,
          item.notes,
          getEquipmentStatus(item),
          getEquipmentCategory(item),
          item.location,
        ]));
    }
    if (statusFilter !== "all") {
      list = list.filter((item) => item.worstCode === statusFilter);
    }
    return list;
  }, [processed, search, statusFilter]);

  const byStatus = useMemo(() => {
    const acc = { overdue: [], "due-soon": [], ok: [], unknown: [] };
    filtered.forEach((item) => {
      const key = acc[item.worstCode] ? item.worstCode : "unknown";
      acc[key].push(item);
    });
    Object.keys(acc).forEach((key) => {
      acc[key].sort((a, b) =>
        String(getEquipmentName(a)).localeCompare(String(getEquipmentName(b)), "en", {
          sensitivity: "base",
        })
      );
    });
    return acc;
  }, [filtered]);

  const hasAnyEquipment =
    byStatus.overdue.length ||
    byStatus["due-soon"].length ||
    byStatus.ok.length ||
    byStatus.unknown.length;

  const toggleStatusSection = (key) => {
    setExpandedStatus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startInspection = (equipmentDocId) => {
    router.push({
      pathname: `/service/inspections/inspection-form/new-${Date.now()}`,
      params: { equipmentDocId },
    });
  };

  const content = (
    <>
      {dataState === "error" ? <StateView state="error" title="Couldn’t load equipment" actionLabel="Retry equipment" onAction={resource.refresh} /> : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.danger || COLORS.primaryAction} />
          <Text tone={"muted"} style={[styles.loadingText]}>
            Loading equipment data...
          </Text>
        </View>
      ) : (
        <>
          {dataState === "partial" ? <Banner tone="warning" title="Equipment data may be out of date"><AppButton label="Retry equipment" variant="secondary" onPress={resource.refresh} /></Banner> : null}
          <View style={fleetStyles.summaryStrip}>
            <SummaryPill label="Overdue" value={summaryCounts.overdue} tone="danger" />
            <SummaryPill label="Due soon" value={summaryCounts["due-soon"]} tone="warning" />
            <SummaryPill label="OK" value={summaryCounts.ok} tone="success" />
            <SummaryPill label="No date" value={summaryCounts.unknown} tone="muted" />
          </View>

          <View style={fleetStyles.controlsContainer}>
            <FormField
              label="Search equipment"
              placeholder="Search by name, serial, asset, category..."
              value={search}
              onChangeText={setSearch}
              inputProps={{ returnKeyType: "search" }}
            />

            <Text tone={"muted"} style={[fleetStyles.filterLabel]}>Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={fleetStyles.filterRow}
            >
              {FILTER_OPTIONS.map((opt) => {
                const active = statusFilter === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter: ${opt.label}`}
                    accessibilityState={{ selected: active }}
                    style={[
                      fleetStyles.filterChip,
                      {
                        borderColor: active
                          ? COLORS.primaryAction
                          : colors.border || COLORS.border,
                        backgroundColor: active
                          ? getServiceStatusColors("danger", colorScheme).background
                          : colors.surface || COLORS.card,
                      },
                    ]}
                    onPress={() => setStatusFilter(opt.key)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        fleetStyles.filterChipText,
                        {
                          color: active
                            ? getServiceStatusColors("danger", colorScheme).onBackground
                            : colors.textMuted || COLORS.textMid,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <>
            {!hasAnyEquipment ? (
              <View style={styles.emptyState}>
                <Icon name="package" size={26} color={colors.textMuted || COLORS.textMid} />
                <Text tone={"primary"} style={[styles.emptyTitle]}>
                  No equipment matches this view
                </Text>
                <Text tone={"muted"} style={[styles.emptySubtitle]}>
                  Try clearing the search or changing the status filter.
                </Text>
              </View>
            ) : (
              STATUS_SECTIONS.map((section) => {
                const list = byStatus[section.key] || [];
                if (list.length === 0) return null;
                const expanded = expandedStatus[section.key] ?? true;

                let accentColour = colors.border || COLORS.border;
                if (section.key === "overdue") accentColour = colors.danger || routeColors.hex_ed1c25_4py4qa;
                else if (section.key === "due-soon") accentColour = routeColors.hex_ff9500_5c3jxm;
                else if (section.key === "ok") accentColour = colors.success || routeColors.hex_34c759_8tm7fd;

                return (
                  <View key={section.key} testID={`maintenance-section-${section.key}`} style={fleetStyles.sectionBlock}>
                    <TouchableOpacity
                      style={fleetStyles.sectionHeaderRow}
                      accessibilityRole="button"
                      accessibilityLabel={`${expanded ? "Hide" : "Show"} ${section.title}`}
                      accessibilityState={{ expanded }}
                      onPress={() => toggleStatusSection(section.key)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <Icon
                          name={expanded ? "chevron-down" : "chevron-right"}
                          size={16}
                          color={accentColour}
                          style={{ marginRight: t.spacing.xxs }}
                        />
                        <Text tone={"primary"} style={[fleetStyles.sectionTitle]}>
                          {section.title}
                        </Text>
                      </View>
                      <Text tone={"muted"} style={[fleetStyles.sectionCount]}>
                        {list.length} item{list.length !== 1 ? "s" : ""}
                      </Text>
                    </TouchableOpacity>

                    <Text tone={"muted"} style={[fleetStyles.sectionDescription]}>
                      {section.description}
                    </Text>

                    {expanded &&
                      list.map((item) => {
                        const name = getEquipmentName(item) || "Unnamed equipment";
                        const category = getEquipmentCategory(item) || "Uncategorised";
                        const status = getEquipmentStatus(item);
                        const lastInspection = getEquipmentLastInspection(item);
                        const serialOrAsset = [item.serialNumber, item.asset].filter(Boolean).join(" · ");
                        const inspectionStatusWithDate = {
                          ...item.inspectionStatus,
                          label:
                            item.inspectionStatus.label +
                            (item.nextInspectionRaw ? ` · ${formatDateShort(item.nextInspectionRaw)}` : ""),
                        };

                        let borderAccent = colors.border || COLORS.border;
                        if (item.worstCode === "overdue") borderAccent = colors.danger || routeColors.hex_ed1c25_4py4qa;
                        else if (item.worstCode === "due-soon") borderAccent = routeColors.hex_ff9500_5c3jxm;
                        else if (item.worstCode === "ok") borderAccent = colors.success || routeColors.hex_34c759_8tm7fd;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Inspect ${name}`}
                            style={[
                              fleetStyles.vehicleCard,
                              {
                                borderLeftColor: borderAccent,
                                backgroundColor: colors.surfaceAlt || COLORS.card,
                                borderColor: colors.border || COLORS.border,
                              },
                            ]}
                            activeOpacity={0.85}
                            onPress={() => startInspection(item.id)}
                          >
                            <View style={fleetStyles.vehicleHeaderRow}>
                              <Text tone={"primary"} style={[fleetStyles.vehicleTitle]}>
                                {name}
                              </Text>
                              <Text tone={"muted"} style={[fleetStyles.vehicleIdentity]}>
                                {[serialOrAsset, category, item.location].filter(Boolean).join(" · ")}
                              </Text>
                            </View>

                            <View style={fleetStyles.statusRow}>
                              <StatusPill label="Inspection" status={inspectionStatusWithDate} />
                              {!!status && <StatusPill label="Status" status={{ code: "unknown", label: status }} />}
                            </View>

                            <Text tone={"muted"} style={[fleetStyles.metaSummary]}>
                              {[
                                `Last inspection: ${formatDateShort(lastInspection) || "No date"}`,
                                `Frequency: ${item.inspectionFrequency ? `${item.inspectionFrequency} wk` : "Not set"}`,
                                `Category: ${category}`,
                              ].join(" · ")}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                );
              })
            )}

          </>
        </>
      )}
    </>
  );
  if (embedded) return <View>{content}</View>;
  return (
    <PageShell header={{
      variant: "hero",
      eyebrow: "Workshop",
      title: "Equipment Inspections",
      subtitle: "Prioritise overdue equipment, then tap to start the inspection form.",
    }}>
      {content}
    </PageShell>
  );
}

function StatusPill({ label, status }) {
  const { colors, colorScheme } = useTheme();
  const tone = { overdue: "danger", "due-soon": "warning", ok: "success" }[status.code] || "neutral";
  const { foreground: fg } = getServiceStatusColors(tone, colorScheme);

  return (
    <View style={[fleetStyles.statusPill, { backgroundColor: colors.surfaceElevated }]}>
      <Text style={[fleetStyles.statusPillText, { color: fg }]}>
        {label}: {status.label}
      </Text>
    </View>
  );
}

function SummaryPill({ label, value, tone }) {
  const { colorScheme } = useTheme();
  const fg = getServiceStatusColors(tone, colorScheme).foreground;

  return (
    <View style={fleetStyles.summaryPill}>
      <Text style={[fleetStyles.summaryValue, { color: fg }]}>{value}</Text>
      <Text tone={"muted"} style={[fleetStyles.summaryLabel]}>
        {label}
      </Text>
    </View>
  );
}
