import { routeColors } from "../../../lib/design/routePresentation/service-index-js.js";
import { styles, quickStyles, summaryStyles } from "../../../lib/design/screenStyles/service-index-js.js";
import { getServiceOverviewState } from "../../../lib/serviceOverview";
import { selectServiceAttention } from "../../../lib/serviceAttention";
import { AppText as Text, AppPressable as TouchableOpacity, AppButton, Banner, StateView } from "../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../lib/design/semantics";
// app/(protected)/service/index.jsx
import { useRouter } from "expo-router";
import { useMemo } from "react";
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

export default function ServiceOverviewScreen() {
  const router = useRouter();

  const resource = useServiceCollection("vehicles", {
    label: "vehicles for service overview",
    orderByField: "name",
  });
  return <ServiceLandingView resource={resource} router={router} />;
}

export function ServiceLandingView({ resource, router }) {
  const { colors, colorScheme } = useTheme();
  const danger = getServiceStatusColors("danger", colorScheme);
  const warning = getServiceStatusColors("warning", colorScheme);
  const { rows: vehicles, loading } = resource;
  const dataState = getServiceOverviewState([resource]);

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
    const defects = processed.filter((v) => v.hasDefects).length;

    return { total, overdue, dueSoon, defects };
  }, [processed]);

  const attentionVehicles = useMemo(() => selectServiceAttention(processed), [processed]);

  return (
    <PageShell customHeader={<View
        style={[
          styles.header,
          { borderBottomColor: colors.border || COLORS.border },
        ]}
      >
        <Text
          tone={"primary"} style={[
            styles.pageTitle,
          ]}
        >
          Service & Maintenance
        </Text>
        <Text
          tone={"muted"} style={[
            styles.pageSubtitle,
          ]}
        >
          Overview of MOT, servicing, defects and workshop activity.
        </Text>
      </View>} customHeaderPlacement="fixed">
      {/* HEADER */}


      {dataState === "error" ? <StateView state="error" title="Couldn’t load fleet data" actionLabel="Retry fleet data" onAction={resource.refresh} /> : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryAction} />
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            Loading fleet data…
          </Text>
        </View>
      ) : (
        <>
          {dataState === "partial" ? <Banner tone="warning" title="Fleet data may be out of date"><AppButton label="Retry fleet data" variant="secondary" onPress={resource.refresh} /></Banner> : null}
          {/* FLEET SUMMARY CARD */}
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
              onPress={() => router.push("/service/service-list")}
            />
            <QuickActionCard
              icon="alert-triangle"
              title="Defects & Issues"
              subtitle="View reported problems"
              onPress={() => router.push("/service/defects")}
            />
          </View>

          <View style={[styles.quickRow, { marginTop: t.spacing.xs }]}>
            <QuickActionCard
              icon="tool"
              title="Book Workshop"
              subtitle="Off-road, repairs, tyres, etc."
              onPress={() => router.push("/service/book-work")}
            />
          </View>

          {/* ATTENTION NEEDED */}
          <View style={styles.sectionDivider}>
            <Text
              tone={"primary"} style={[
                styles.sectionTitle,
              ]}
            >
              Attention Needed
            </Text>
          </View>

          {attentionVehicles.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                name="check-circle"
                size={30}
                color={colors.textMuted || COLORS.textMid}
              />
              <Text
                tone={"primary"} style={[
                  styles.emptyTitle,
                ]}
              >
                Nothing urgent
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.emptySubtitle,
                ]}
              >
                No MOT or service items are overdue or due soon.
              </Text>
            </View>
          ) : (
            attentionVehicles.map((v) => {
              const name = getVehicleName(v) || "Unnamed vehicle";
              const reg = getVehicleRegistration(v);
              const worstCode = v.worstCode;

              let borderAccent = COLORS.border;
              if (worstCode === "overdue") borderAccent = routeColors.hex_ed1c25_4py4qa;
              else if (worstCode === "due-soon") borderAccent = routeColors.hex_ff9500_5c3jxm;

              return (
                <TouchableOpacity
                  key={v.id}
                  testID={`attention-${v.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${name}`}
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

                  <View style={styles.statusRow}>
                    <StatusPill label="MOT" status={v.motStatus} />
                    <StatusPill label="Service" status={v.serviceStatus} />
                    {v.hasDefects && (
                      <View style={[styles.defectPill, { backgroundColor: danger.background }]}>
                        <Icon
                          name="alert-triangle"
                          size={14}
                          color={danger.onBackground}
                          style={{ marginRight: t.spacing.xxs }}
                        />
                        <Text testID="landing-defect-count" style={[styles.defectText, { color: danger.onBackground }]}>
                          {v.defects.length} defect
                          {v.defects.length > 1 ? "s" : ""}
                        </Text>
                      </View>
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

/* Small components */

function SummaryItem({ label, value, color, labelColor }) {
  return (
    <View style={summaryStyles.item}>
      <Text testID={`landing-summary-${label}`} style={[summaryStyles.value, { color }]}>{value}</Text>
      <Text style={[summaryStyles.label, { color: labelColor || COLORS.textMid }]}>
        {label}
      </Text>
    </View>
  );
}

function QuickActionCard({ icon, title, subtitle, onPress }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity testID={`quick-${icon}`} accessibilityRole="button" accessibilityLabel={title} style={[quickStyles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[quickStyles.iconWrap, { backgroundColor: colors.surface }]}>
        <Icon name={icon} size={18} color={colors.text} />
      </View>
      <Text tone={"primary"} style={[quickStyles.title]}>{title}</Text>
      <Text tone={"muted"} style={[quickStyles.subtitle]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function StatusPill({ label, status }) {
  const { colorScheme } = useTheme();
  const tone = status.code === "overdue" ? "danger" : status.code === "due-soon" ? "warning" : status.code === "ok" ? "success" : "neutral";
  const { background: bg, onBackground: fg } = getServiceStatusColors(tone, colorScheme);

  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <Text testID={`landing-status-${label}`} style={[styles.statusPillText, { color: fg }]}>
        {label}: {status.label}
      </Text>
    </View>
  );
}

/* Styles */
