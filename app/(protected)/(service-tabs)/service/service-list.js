import { routeColors } from "../../../../lib/design/routePresentation/service-tabs-service-service-list-js.js";
import { styles } from "../../../../lib/design/screenStyles/service-tabs-service-service-list-js.js";
import { getServiceOverviewState } from "../../../../lib/serviceOverview";
import { matchesServiceSearch } from "../../../../lib/serviceSearch";
import { AppText as Text, AppPressable as TouchableOpacity, FormField, StateView, Banner, AppButton, SegmentedControl } from "../../../../components/ui/AppPrimitives";
import {
  getServiceStatusColors, servicePalette as COLORS } from "../../../../lib/design/semantics";
// app/(protected)/service-list.jsx
import { useRouter } from "expo-router";
import { useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import PageShell from "../../../../components/layout/PageShell";
import { designTokens as t } from "../../../../lib/design/tokens";
import {
  getVehicleOperationalStatus,
  getVehicleManufacturer,
  getVehicleName,
  getVehicleNextMot,
  getVehicleNextService,
  getVehicleRegistration,
  isVehicleActiveForMaintenance,
  isVehicleMotApplicable,
  isVehicleServiceApplicable,
} from "../../../../lib/fleetSchema";
import { useServiceCollection } from "../../../../hooks/useServiceData";
import { useTheme } from "../../../../providers/ThemeProvider";
import { EquipmentListView } from "../../service/equipment-list";

/* ---------- CONSTANTS & HELPERS ---------- */

function toDateMaybe(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate(); // Firestore Timestamp
  if (typeof value === "string" || value instanceof String) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (value instanceof Date) return value;
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
  if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, code: "overdue" };
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

function formatDateShort(value) {
  const d = toDateMaybe(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/* ---------- FILTER HELPERS ---------- */

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due-soon", label: "Due soon" },
  { key: "ok", label: "OK" },
  { key: "unknown", label: "No date" },
  { key: "inactive", label: "Inactive" },
];

const STATUS_SECTIONS = [
  {
    key: "overdue",
    title: "Overdue – book today",
    description: "MOT or service date is in the past. Prioritise these vehicles.",
  },
  {
    key: "due-soon",
    title: "Due in next 30 days",
    description: "MOT or service coming up within 30 days.",
  },
  {
    key: "ok",
    title: "OK / future",
    description: "Nothing due soon. Keep an eye on mileage and upcoming dates.",
  },
  {
    key: "unknown",
    title: "No date recorded",
    description: "Missing MOT or service dates – update vehicle records.",
  },
  {
    key: "inactive",
    title: "Inactive vehicles",
    description: "Hidden from MOT and service attention until marked active again.",
  },
];

/* ---------- MAIN SCREEN ---------- */

export default function ServiceListScreen() {
  const router = useRouter();
  const resource = useServiceCollection("vehicles", { label: "vehicles for service list", orderByField: "name" });
  const equipmentResource = useServiceCollection("equipment", { label: "equipment for fleet", orderByField: "name" });
  return <ServiceListView resource={resource} equipmentResource={equipmentResource} router={router} />;
}

// The real screen view is also rendered with deterministic resources in visual QA.
export function ServiceListView({ resource, equipmentResource, router }) {
  const { colors, colorScheme } = useTheme();
  const [assetType, setAssetType] = useState("vehicles");
  const { rows: vehicles, loading } = resource;
  const dataState = getServiceOverviewState([resource]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedStatus, setExpandedStatus] = useState({
    overdue: true,
    "due-soon": true,
    ok: true,
    unknown: true,
    inactive: true,
  });

  const processed = useMemo(() => {
    return vehicles.map((v) => {
      const activeForMaintenance = isVehicleActiveForMaintenance(v);
      const motDateRaw = getVehicleNextMot(v);
      const serviceDateRaw = getVehicleNextService(v);

      const motStatus = !activeForMaintenance ? { label: "Inactive", code: "inactive" }
        : isVehicleMotApplicable(v) ? classifyStatus(motDateRaw) : { label: "Not applicable", code: "not-applicable" };
      const serviceStatus = !activeForMaintenance ? { label: "Inactive", code: "inactive" }
        : isVehicleServiceApplicable(v) ? classifyStatus(serviceDateRaw) : { label: "Not applicable", code: "not-applicable" };
      const worstCode = activeForMaintenance
        ? pickWorstStatusCode(motStatus.code, serviceStatus.code)
        : "inactive";

      return {
        ...v,
        activeForMaintenance,
        motStatus,
        serviceStatus,
        motDateRaw,
        serviceDateRaw,
        worstCode,
      };
    });
  }, [vehicles]);

  const summaryCounts = useMemo(() => {
    const counts = {
      overdue: 0,
      "due-soon": 0,
      ok: 0,
      unknown: 0,
      inactive: 0,
    };
    processed.forEach((v) => {
      if (counts[v.worstCode] !== undefined) {
        counts[v.worstCode] += 1;
      }
    });
    return counts;
  }, [processed]);

  const filtered = useMemo(() => {
    let list = [...processed];

    if (search.trim()) {
      list = list.filter((v) => matchesServiceSearch(search, [
        getVehicleName(v),
        getVehicleRegistration(v),
        getVehicleManufacturer(v),
        v.model,
      ]));
    }

    if (statusFilter !== "all") {
      list = list.filter((v) => v.worstCode === statusFilter);
    }

    return list;
  }, [processed, search, statusFilter]);

  // Group by status code for separate sections
  const byStatus = useMemo(() => {
    const acc = {
      overdue: [],
      "due-soon": [],
      ok: [],
      unknown: [],
      inactive: [],
    };

    filtered.forEach((v) => {
      const key = acc[v.worstCode] ? v.worstCode : "unknown";
      acc[key].push(v);
    });

    // Sort each list by vehicle name for consistency
    Object.keys(acc).forEach((key) => {
      acc[key].sort((a, b) =>
        String(getVehicleName(a)).localeCompare(String(getVehicleName(b)), "en", {
          sensitivity: "base",
        })
      );
    });

    return acc;
  }, [filtered]);

  const toggleStatusSection = (key) => {
    setExpandedStatus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const hasAnyVehicles =
    byStatus.overdue.length ||
    byStatus["due-soon"].length ||
    byStatus.ok.length ||
    byStatus.unknown.length ||
    byStatus.inactive.length;

  return (
    <PageShell
      header={{
        variant: "compact",
        eyebrow: "Workshop",
        title: "Fleet",
        subtitle: "Vehicles, equipment and upcoming maintenance.",
      }}
    >
      <SegmentedControl
        pill
        options={[{ value: "vehicles", label: "Vehicles" }, { value: "equipment", label: "Equipment" }]}
        value={assetType}
        onChange={setAssetType}
        style={styles.assetSwitch}
      />
      {assetType === "equipment" ? (
        <EquipmentListView resource={equipmentResource} router={router} embedded />
      ) : (
      dataState === "error" ? <StateView state="error" title="Couldn’t load maintenance data" actionLabel="Retry maintenance" onAction={resource.refresh} /> : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.danger || COLORS.primaryAction} />
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            Loading maintenance data…
          </Text>
        </View>
      ) : (
        <>
          {dataState === "partial" ? <Banner tone="warning" title="Maintenance data may be out of date"><AppButton label="Retry maintenance" variant="secondary" onPress={resource.refresh} /></Banner> : null}
          {/* QUICK SUMMARY STRIP */}
          <View style={styles.summaryStrip}>
            <SummaryPill
              label="Overdue"
              value={summaryCounts.overdue}
              tone="danger"
            />
            <SummaryPill
              label="Due soon"
              value={summaryCounts["due-soon"]}
              tone="warning"
            />
            <SummaryPill
              label="OK"
              value={summaryCounts.ok}
              tone="success"
            />
            <SummaryPill
              label="No date"
              value={summaryCounts.unknown}
              tone="muted"
            />
            <SummaryPill
              label="Inactive"
              value={summaryCounts.inactive}
              tone="muted"
            />
          </View>

          {/* SEARCH + FILTERS */}
          <View style={styles.controlsContainer}>
            <FormField
              label="Search vehicles"
              placeholder="Search by name, reg, manufacturer, model…"
              value={search}
              onChangeText={setSearch}
              inputProps={{ returnKeyType: "search" }}
            />

            <Text tone={"muted"} style={[styles.filterLabel]}>Status</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
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
                      styles.filterChip,
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
                        styles.filterChipText,
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

          {/* LIST SECTIONS */}
          <>
            {!hasAnyVehicles ? (
              <View style={styles.emptyState}>
                <Icon
                  name="file-text"
                  size={26}
                  color={colors.textMuted || COLORS.textMid}
                />
                <Text
                  tone={"primary"} style={[
                    styles.emptyTitle,
                  ]}
                >
                  No vehicles match this view
                </Text>
                <Text
                  tone={"muted"} style={[
                    styles.emptySubtitle,
                  ]}
                >
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
                else if (section.key === "inactive") accentColour = colors.textMuted || COLORS.textLow;

                return (
                  <View key={section.key} testID={`maintenance-section-${section.key}`} style={styles.sectionBlock}>
                    {/* Section header */}
                    <TouchableOpacity
                      style={styles.sectionHeaderRow}
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
                        <Text
                          tone={"primary"} style={[
                            styles.sectionTitle,
                          ]}
                        >
                          {section.title}
                        </Text>
                      </View>
                      <Text
                        tone={"muted"} style={[
                          styles.sectionCount,
                        ]}
                      >
                        {list.length} vehicle{list.length !== 1 ? "s" : ""}
                      </Text>
                    </TouchableOpacity>

                    <Text
                      tone={"muted"} style={[
                        styles.sectionDescription,
                      ]}
                    >
                      {section.description}
                    </Text>

                    {/* Vehicles in this status */}
                    {expanded &&
                      list.map((v) => {
                        const name = getVehicleName(v) || "Unnamed vehicle";
                        const reg = getVehicleRegistration(v);
                        const manufacturer = getVehicleManufacturer(v);
                        const model = v.model || "";
                        const taxStatus = v.taxStatus || "Unknown";
                        const insuranceStatus = v.insuranceStatus || "Unknown";

                        const motStatusWithDate = {
                          ...v.motStatus,
                          label:
                            v.motStatus.label +
                            (v.motDateRaw
                              ? ` · ${formatDateShort(v.motDateRaw)}`
                              : ""),
                        };
                        const serviceStatusWithDate = {
                          ...v.serviceStatus,
                          label:
                            v.serviceStatus.label +
                            (v.serviceDateRaw
                              ? ` · ${formatDateShort(v.serviceDateRaw)}`
                              : ""),
                        };

                        let borderAccent = colors.border || COLORS.border;
                        if (v.worstCode === "overdue")
                          borderAccent = colors.danger || routeColors.hex_ed1c25_4py4qa;
                        else if (v.worstCode === "due-soon")
                          borderAccent = routeColors.hex_ff9500_5c3jxm;
                        else if (v.worstCode === "ok")
                          borderAccent = colors.success || routeColors.hex_34c759_8tm7fd;
                        else if (v.worstCode === "inactive")
                          borderAccent = colors.textMuted || COLORS.textLow;

                        return (
                          <TouchableOpacity
                            key={v.id}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${name}`}
                            style={[
                              styles.vehicleCard,
                              {
                                borderLeftColor: borderAccent,
                                backgroundColor:
                                  colors.surfaceAlt || COLORS.card,
                                borderColor: colors.border || COLORS.border,
                              },
                            ]}
                            activeOpacity={0.85}
                            onPress={() =>
                              router.push(`/service/vehicles/${v.id}`)
                            }
                          >
                            <View style={styles.vehicleHeaderRow}>
                              <Text
                                tone={"primary"} style={[
                                  styles.vehicleTitle,
                                ]}
                              >
                                {name}
                              </Text>
                              <Text
                                tone={"muted"} style={[
                                  styles.vehicleIdentity,
                                ]}
                              >
                                {[
                                  reg,
                                  [manufacturer, model].filter(Boolean).join(" · "),
                                ].filter(Boolean).join(" · ")}
                              </Text>
                            </View>

                            <View style={styles.statusRow}>
                              {v.worstCode === "inactive" ? (
                                <StatusPill
                                  label="Status"
                                  status={{
                                    code: "inactive",
                                    label: getVehicleOperationalStatus(v) || "Inactive",
                                  }}
                                />
                              ) : (
                                <>
                                  <StatusPill label="MOT" status={motStatusWithDate} />
                                  <StatusPill
                                    label="Service"
                                    status={serviceStatusWithDate}
                                  />
                                </>
                              )}
                            </View>

                            <Text
                              tone={"muted"} style={[styles.metaSummary]}
                            >
                              {[
                                `Tax: ${taxStatus}`,
                                `Insurance: ${insuranceStatus}`,
                                typeof v.mileage === "number"
                                  ? `${v.mileage.toLocaleString("en-GB")} mi`
                                  : null,
                              ].filter(Boolean).join(" · ")}
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
      )
      )}
    </PageShell>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function StatusPill({ label, status }) {
  const { colors, colorScheme } = useTheme();
  const tone = { overdue: "danger", "due-soon": "warning", ok: "success" }[status.code] || "neutral";
  const { foreground: fg } = getServiceStatusColors(tone, colorScheme);

  return (
    <View style={[styles.statusPill, { backgroundColor: colors.surfaceElevated }]}>
      <Text style={[styles.statusPillText, { color: fg }]}>
        {label}: {status.label}
      </Text>
    </View>
  );
}

function SummaryPill({ label, value, tone }) {
  const { colorScheme } = useTheme();
  const fg = getServiceStatusColors(tone, colorScheme).foreground;

  return (
    <View style={styles.summaryPill}>
      <Text style={[styles.summaryValue, { color: fg }]}>{value}</Text>
      <Text
        tone={"muted"} style={[
          styles.summaryLabel,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/* ---------- STYLES ---------- */
