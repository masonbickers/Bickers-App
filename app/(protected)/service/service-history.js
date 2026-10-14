import { routeColors } from "../../../lib/design/routePresentation/service-service-history-js.js";
import { styles, summaryStyles } from "../../../lib/design/screenStyles/service-service-history-js.js";
import { SectionCard, AppText as Text, AppPressable as TouchableOpacity } from "../../../components/ui/AppPrimitives";

// app/(protected)/service-history.jsx
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import {
  getVehicleLastMot,
  getVehicleLastService,
  getVehicleManufacturer,
  getVehicleName,
  getVehicleNextMot,
  getVehicleNextService,
  getVehicleRegistration,
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

function formatDateShort(value) {
  const d = toDateMaybe(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function wasRecently(dateValue, daysWindow = 60) {
  const d = toDateMaybe(dateValue);
  if (!d) return false;
  const today = new Date();
  const diffMs = today.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= daysWindow;
}

export default function ServiceHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const { rows: vehicles, loading } = useServiceCollection("vehicles", {
    label: "vehicles for service history",
    orderByField: "name",
  });

  const processed = useMemo(() => {
    return vehicles
      .map((v) => {
        const lastMOT = getVehicleLastMot(v);
        const nextMOT = getVehicleNextMot(v);
        const lastService = getVehicleLastService(v);
        const nextService = getVehicleNextService(v);

        const recentMOT = wasRecently(lastMOT, 365); // within last year
        const recentService = wasRecently(lastService, 365);
        const latestCompletedDate =
          [lastService, lastMOT]
            .map((value) => toDateMaybe(value))
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime())[0] || null;

        return {
          ...v,
          lastMOT,
          nextMOT,
          lastService,
          nextService,
          recentMOT,
          recentService,
          latestCompletedDate,
        };
      })
      .sort((a, b) => {
        const aTime = a.latestCompletedDate?.getTime() || 0;
        const bTime = b.latestCompletedDate?.getTime() || 0;
        if (aTime !== bTime) return bTime - aTime;

        const aName = a.name || a.vehicleName || "";
        const bName = b.name || b.vehicleName || "";
        return aName.localeCompare(bName);
      });
  }, [vehicles]);

  const summary = useMemo(() => {
    const total = processed.length;
    const withMOTHistory = processed.filter((v) => v.lastMOT).length;
    const withServiceHistory = processed.filter((v) => v.lastService).length;
    const recentMOTs = processed.filter((v) => v.recentMOT).length;
    const recentServices = processed.filter((v) => v.recentService).length;
    return {
      total,
      withMOTHistory,
      withServiceHistory,
      recentMOTs,
      recentServices,
    };
  }, [processed]);

  const handleOpenVehicleHistory = (vehicle) => {
    const name = getVehicleName(vehicle) || "";
    const reg = getVehicleRegistration(vehicle) || "";

    router.push({
      pathname: "/service/service-history/[vehicleId]",
      params: {
        vehicleId: vehicle.id,
        name,
        registration: reg,
      },
    });
  };

  return (
    <PageShell header={{
      variant: "compact",
      title: "Service History",
      subtitle: "Last MOT and service dates for each vehicle in the fleet.",
      onBack: router.back,
    }}>
      {/* HEADER */}


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.accent || colors.accent}
          />
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            Loading service history…
          </Text>
        </View>
      ) : (
        <>
          {/* SUMMARY CARD */}
          <SectionCard
            tone="subtle" layoutStyle={styles.summaryCard}
          >
            <Text
              tone={"primary"} style={[
                styles.summaryTitle,
              ]}
            >
              Fleet Summary
            </Text>
            <View style={styles.summaryRow}>
              <SummaryItem label="Vehicles" value={summary.total} />
              <SummaryItem
                label="With MOT history"
                value={summary.withMOTHistory}
              />
            </View>
            <View style={styles.summaryRow}>
              <SummaryItem
                label="With service history"
                value={summary.withServiceHistory}
              />
              <SummaryItem
                label="MOT in last 12m"
                value={summary.recentMOTs}
              />
            </View>
            <View style={styles.summaryRow}>
              <SummaryItem
                label="Service in last 12m"
                value={summary.recentServices}
              />
            </View>
          </SectionCard>

          {/* VEHICLE CARDS */}
          {processed.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon
                name="file-text"
                size={26}
                color={colors.textMuted}
              />
              <Text
                tone={"primary"} style={[
                  styles.emptyTitle,
                ]}
              >
                No vehicles found
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.emptySubtitle,
                ]}
              >
                Add vehicles in the main system to see service history here.
              </Text>
            </View>
          ) : (
            processed.map((v) => {
              const name = getVehicleName(v) || "Unnamed vehicle";
              const reg = getVehicleRegistration(v);
              const manufacturer = getVehicleManufacturer(v);
              const model = v.model || "";

              const lastMOTText = formatDateShort(v.lastMOT);
              const nextMOTText = formatDateShort(v.nextMOT);
              const lastServiceText = formatDateShort(v.lastService);
              const nextServiceText = formatDateShort(v.nextService);

              const hasHistory = v.lastMOT || v.lastService;
              const borderAccent = hasHistory
                ? colors.accent || colors.accent
                : colors.border;

              return (
                <View
                  key={v.id}
                  style={[
                    styles.vehicleCard,
                    {
                      borderLeftColor: borderAccent,
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
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
                      {(manufacturer || model) && (
                        <Text
                          tone={"muted"} style={[
                            styles.vehicleSub,
                          ]}
                        >
                          {manufacturer}
                          {manufacturer && model ? " · " : ""}
                          {model}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.historyBlock}>
                    <Text
                      tone={"muted"} style={[
                        styles.blockTitle,
                      ]}
                    >
                      MOT
                    </Text>
                    <HistoryRow label="Last MOT" value={lastMOTText} />
                    <HistoryRow label="Next MOT" value={nextMOTText} />
                  </View>

                  <View style={styles.historyBlock}>
                    <Text
                      tone={"muted"} style={[
                        styles.blockTitle,
                      ]}
                    >
                      Service
                    </Text>
                    <HistoryRow
                      label="Last service"
                      value={lastServiceText}
                    />
                    <HistoryRow
                      label="Next service"
                      value={nextServiceText}
                    />
                  </View>

                  {typeof v.mileage === "number" && (
                    <View style={styles.historyBlock}>
                      <Text
                        tone={"muted"} style={[
                          styles.blockTitle,
                        ]}
                      >
                        Odometer
                      </Text>
                      <HistoryRow
                        label="Current"
                        value={`${v.mileage.toLocaleString("en-GB")} mi`}
                      />
                    </View>
                  )}

                  {v.notes ? (
                    <View style={styles.notesBlock}>
                      <Text
                        tone={"muted"} style={[
                          styles.notesLabel,
                        ]}
                      >
                        Notes
                      </Text>
                      <Text
                        tone={"muted"} style={[
                          styles.notesText,
                        ]}
                      >
                        {v.notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* View full history button */}
                  <TouchableOpacity
                    style={[
                      styles.viewHistoryButton,
                      {
                        backgroundColor: colors.surface || routeColors.hex_1f2933_8in7ju,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleOpenVehicleHistory(v)}
                  >
                    <Text
                      tone={"primary"} style={[
                        styles.viewHistoryText,
                      ]}
                    >
                      View full history
                    </Text>
                    <Icon
                      name="chevron-right"
                      size={14}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </>
      )}
    </PageShell>
  );
}

function SummaryItem({ label, value }) {

  return (
    <View style={summaryStyles.item}>
      <Text
        tone={"primary"} style={[
          summaryStyles.value,
        ]}
      >
        {value}
      </Text>
      <Text
        tone={"muted"} style={[
          summaryStyles.label,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function HistoryRow({ label, value }) {

  return (
    <View style={styles.historyRow}>
      <Text
        tone={"muted"} style={[
          styles.historyLabel,
        ]}
      >
        {label}
      </Text>
      <Text
        tone={"primary"} style={[
          styles.historyValue,
        ]}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

/* ---------- STYLES ---------- */

