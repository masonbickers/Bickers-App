import { routeColors } from "../../../lib/design/routePresentation/service-service-js.js";
import { styles } from "../../../lib/design/screenStyles/service-service-js.js";
import { AppText as Text, AppPressable as TouchableOpacity } from "../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../lib/design/semantics";
// app/protected/service.jsx

import { useRouter } from "expo-router";
import { useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import {
  getVehicleName,
  getVehicleNextMot,
  getVehicleNextService,
  getVehicleRegistration,
  isVehicleMotApplicable,
  isVehicleServiceApplicable,
} from "../../../lib/fleetSchema";
import { useServiceCollection } from "../../../hooks/useServiceData";
import { useTheme } from "../../../providers/ThemeProvider";
import { designTokens as t } from "../../../lib/design/tokens";
import PageShell from "../../../components/layout/PageShell";

/* ---------- CONSTANTS & HELPERS ---------- */

const FILTERS = [
  { key: "all", label: "All" },
  { key: "due-soon", label: "Due Soon" },
  { key: "overdue", label: "Overdue" },
  { key: "mot", label: "MOT" },
  { key: "service", label: "Service" },
  { key: "defects", label: "Defects" },
];

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

/* ---------- MAIN SCREEN ---------- */

export default function ServiceScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const { rows: vehicles, loading } = useServiceCollection("vehicles", {
    label: "vehicles",
    orderByField: "name",
  });
  const [filter, setFilter] = useState("all");

  const processed = useMemo(() => {
    return vehicles.map((v) => {
      const motStatus = isVehicleMotApplicable(v)
        ? classifyStatus(getVehicleNextMot(v))
        : { label: "N/A", code: "not-applicable" };
      const serviceStatus = isVehicleServiceApplicable(v)
        ? classifyStatus(getVehicleNextService(v))
        : { label: "N/A", code: "not-applicable" };
      const defects = Array.isArray(v.defects) ? v.defects : [];
      const hasDefects = defects.length > 0;

      return {
        ...v,
        motStatus,
        serviceStatus,
        defects,
        hasDefects,
        worstCode: pickWorstStatusCode(motStatus.code, serviceStatus.code),
      };
    });
  }, [vehicles]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "due-soon":
        return processed.filter(
          (v) =>
            v.motStatus.code === "due-soon" ||
            v.serviceStatus.code === "due-soon"
        );
      case "overdue":
        return processed.filter(
          (v) =>
            v.motStatus.code === "overdue" ||
            v.serviceStatus.code === "overdue"
        );
      case "mot":
        return processed.filter(
          (v) =>
            v.motStatus.code === "due-soon" ||
            v.motStatus.code === "overdue"
        );
      case "service":
        return processed.filter(
          (v) =>
            v.serviceStatus.code === "due-soon" ||
            v.serviceStatus.code === "overdue"
        );
      case "defects":
        return processed.filter((v) => v.hasDefects);
      case "all":
      default:
        return processed;
    }
  }, [processed, filter]);

  const overdueCount = processed.filter(
    (v) =>
      v.motStatus.code === "overdue" || v.serviceStatus.code === "overdue"
  ).length;
  const dueSoonCount = processed.filter(
    (v) =>
      v.motStatus.code === "due-soon" || v.serviceStatus.code === "due-soon"
  ).length;
  const defectCount = processed.filter((v) => v.hasDefects).length;

  return (
    <PageShell header={{
      variant: "compact",
      title: "Service & MOT",
      onBack: router.back,
    }}>
      {/* HEADER */}


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
            Loading vehicle maintenance...
          </Text>
        </View>
      ) : (
        <>
          {/* SUMMARY CARD */}
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.surfaceAlt || COLORS.card,
                borderColor: colors.border || COLORS.border,
                borderLeftColor: colors.accent || COLORS.primaryAction,
              },
            ]}
          >
            <Text
              tone={"primary"} style={[
                styles.infoTextTitle,
              ]}
            >
              Fleet Overview
            </Text>
            <Text
              tone={"muted"} style={[
                styles.infoTextDetail,
              ]}
            >
              Vehicles: {processed.length}
            </Text>
            <Text
              tone={overdueCount > 0 ? "danger" : "muted"} style={[
                styles.infoTextDetail,
              ]}
            >
              Overdue: {overdueCount}
            </Text>
            <Text
              style={[
                styles.infoTextDetail,
                {
                  color:
                    dueSoonCount > 0
                      ? routeColors.hex_ff9500_5c3jxm
                      : colors.textMuted || COLORS.textMid,
                },
              ]}
            >
              Due Soon (30 days): {dueSoonCount}
            </Text>
            <Text
              tone={defectCount > 0 ? "danger" : "muted"} style={[
                styles.infoTextDetail,
              ]}
            >
              Vehicles with Defects: {defectCount}
            </Text>
          </View>

          {/* FILTERS */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: active
                        ? colors.accent || COLORS.primaryAction
                        : colors.border || COLORS.lightGray,
                      backgroundColor: active
                        ? colors.accent || COLORS.primaryAction
                        : colors.surfaceAlt || COLORS.card,
                    },
                  ]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color: active
                          ? COLORS.textHigh
                          : colors.textMuted || COLORS.textMid,
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SECTION TITLE */}
          <View style={styles.sectionDivider}>
            <Text
              tone={"primary"} style={[
                styles.sectionTitle,
              ]}
            >
              Upcoming Services & MOTs
            </Text>
          </View>

          {/* EMPTY STATE */}
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                name="check-circle"
                size={36}
                color={colors.textMuted || COLORS.textMid}
              />
              <Text
                tone={"primary"} style={[
                  styles.emptyTitle,
                ]}
              >
                Nothing to action
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.emptySubtitle,
                ]}
              >
                No vehicles match this filter. Try switching to another view.
              </Text>
            </View>
          ) : (
            filtered.map((v) => {
              const name = getVehicleName(v) || "Unnamed vehicle";
              const reg = getVehicleRegistration(v);
              const { motStatus, serviceStatus, hasDefects, defects, worstCode } =
                v;

              const borderAccent =
                worstCode === "overdue"
                  ? routeColors.hex_ed1c25_4py4qa
                  : worstCode === "due-soon"
                  ? routeColors.hex_ff9500_5c3jxm
                  : colors.border || COLORS.border;

              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleCard,
                    {
                      backgroundColor: colors.surfaceAlt || COLORS.card,
                      borderLeftColor: borderAccent,
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/service/vehicles/${v.id}`)}
                >
                  {/* Top row */}
                  <View style={styles.vehicleHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        tone={"primary"} style={[
                          styles.vehicleTitle,
                        ]}
                      >
                        {name}
                      </Text>
                      {!!reg && (
                        <Text
                          tone={"muted"} style={[
                            styles.vehicleReg,
                          ]}
                        >
                          {reg}
                        </Text>
                      )}
                    </View>
                    <Icon
                      name="chevron-right"
                      size={18}
                      color={colors.textMuted || COLORS.textMid}
                    />
                  </View>

                  {/* Status pills */}
                  <View style={styles.statusRow}>
                    <StatusPill label="MOT" status={motStatus} />
                    <StatusPill label="Service" status={serviceStatus} />
                    {hasDefects && (
                      <View style={styles.defectPill}>
                        <Icon
                          name="alert-triangle"
                          size={14}
                          color={COLORS.textHigh}
                          style={{ marginRight: t.spacing.xxs }}
                        />
                        <Text style={styles.defectText}>
                          {defects.length} defect
                          {defects.length > 1 ? "s" : ""}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom meta row */}
                  <View style={styles.metaRow}>
                    {typeof v.mileage === "number" && (
                      <Text
                        tone={"muted"} style={[
                          styles.metaText,
                        ]}
                      >
                        Mileage: {v.mileage.toLocaleString()} miles
                      </Text>
                    )}
                    {!!v.location && (
                      <Text
                        tone={"muted"} style={[
                          styles.metaText,
                        ]}
                      >
                        Location: {v.location}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </>
      )}
    </PageShell>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function StatusPill({ label, status }) {
  const { colorScheme } = useTheme();
  const code = status.code;
  const tone = { overdue: "danger", "due-soon": "warning", ok: "success" }[code] || "neutral";
  const { background: bg, onBackground: fg } = getServiceStatusColors(tone, colorScheme);

  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <Text style={[styles.statusPillText, { color: fg }]}>
        {label}: {status.label}
      </Text>
    </View>
  );
}

/* ---------- STYLES (MATCHING RECCE STYLE) ---------- */
