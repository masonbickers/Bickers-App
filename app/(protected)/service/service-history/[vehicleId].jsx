import { styles } from "../../../../lib/design/screenStyles/service-service-history-vehicleId-jsx.js";
import { SectionCard, AppText as Text, AppPressable as TouchableOpacity } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS } from "../../../../lib/design/semantics";
// app/(protected)/service/service-history/[vehicleId].jsx
import { useLocalSearchParams,
  useRouter } from "expo-router";
import { useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import {
  getVehicleLastService,
  getVehicleMileage,
  getVehicleNextService,
} from "../../../../lib/fleetSchema";
import { useServiceCollectionReader } from "../../../../hooks/useServiceData";
import { useTheme } from "../../../../providers/ThemeProvider";
import { designTokens as t } from "../../../../lib/design/tokens";
import PageShell from "../../../../components/layout/PageShell";

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

function getServiceDateValue(item) {
  return (
    item?.completedDate ||
    item?.date ||
    item?.recordedAt ||
    item?.serviceDateOnly ||
    item?.serviceDate ||
    item?.completedAt ||
    item?.createdAt ||
    null
  );
}

function buildMetaLine(parts) {
  return parts.filter(Boolean).join(" · ");
}

export default function ServiceHistoryListScreen() {
  const { vehicleId, name, registration } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const readServiceCollection = useServiceCollectionReader();

  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [serviceForms, setServiceForms] = useState([]);

  useEffect(() => {
    if (!vehicleId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [vehicles, serviceRecords] = await Promise.all([
          readServiceCollection("vehicles", { orderByField: "name" }),
          readServiceCollection("serviceRecords"),
        ]);
        setVehicle(
          vehicles.find((item) => String(item.id) === String(vehicleId)) || null
        );
        const forms = serviceRecords.filter(
          (record) => String(record.vehicleId || "") === String(vehicleId)
        );
        setServiceForms(forms);
      } catch (err) {
        console.error("Failed to load vehicle/service history:", err);
        setVehicle((prev) => prev ?? null);
        setServiceForms([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [readServiceCollection, vehicleId]);

  const fromForms = useMemo(() => {
    if (!serviceForms || serviceForms.length === 0) return [];

    return serviceForms
      .map((f) => {
        const date = getServiceDateValue(f);
        const odo = f.odometer ?? f.mileage ?? null;
        const summary =
          f.workSummary || f.extraNotes || f.summary || f.notes || "";
        const type = f.serviceType || f.type || "Service";

        return {
          id: f.id,
          date,
          odometer: odo,
          summary,
          type,
        };
      })
      .sort((a, b) => {
        const da = toDateMaybe(a.date)?.getTime() || 0;
        const db = toDateMaybe(b.date)?.getTime() || 0;
        return db - da; // newest first
      });
  }, [serviceForms]);

  const fromEmbedded = useMemo(() => {
    if (!vehicle || !Array.isArray(vehicle.serviceHistory)) return [];
    return [...vehicle.serviceHistory]
      .map((item, idx) => {
        if (typeof item === "string") {
          return {
            id: `embedded-${idx}`,
            date: null,
            odometer: null,
            summary: item,
            type: "Service",
          };
        }
        return {
          id: item.id || item.serviceRecordId || `embedded-${idx}`,
          date: getServiceDateValue(item),
          odometer: item.odometer ?? null,
          summary: item.notes || item.summary || "",
          type: item.type || "Service",
        };
      })
      .sort((a, b) => {
        const da = toDateMaybe(a.date)?.getTime() || 0;
        const db = toDateMaybe(b.date)?.getTime() || 0;
        return db - da;
      });
  }, [vehicle]);

  // Prefer standalone service records; fallback to embedded array
  const serviceHistory = fromForms.length > 0 ? fromForms : fromEmbedded;

  const headerName =
    vehicle?.name || vehicle?.vehicleName || name || "Vehicle";
  const headerReg = vehicle?.registration || vehicle?.reg || registration || "";

  const latestRecord = serviceHistory[0] || null;
  const totalServices = serviceHistory.length;
  const lastServiceDate = latestRecord?.date
    ? formatDateShort(latestRecord.date)
    : null;
  const lastServiceOdo =
    typeof latestRecord?.odometer === "number"
      ? `${latestRecord.odometer.toLocaleString("en-GB")} mi`
      : latestRecord?.odometer || null;
  const mileageValue = getVehicleMileage(vehicle);
  const vehicleLastService = getVehicleLastService(vehicle);
  const vehicleNextService = getVehicleNextService(vehicle);

  const handleOpenRecord = (id) => {
    router.push(`/service/service-record/${id}`);
  };

  return (
    <PageShell header={{
      variant: "compact",
      title: "Service history",
      subtitle: [headerReg, headerName].filter(Boolean).join(" · "),
      onBack: router.back,
    }}>
      {/* HEADER */}


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.textMuted || COLORS.textMid} />
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            Loading services…
          </Text>
        </View>
      ) : !vehicle ? (
        <View style={styles.loadingContainer}>
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            Vehicle not found.
          </Text>
        </View>
      ) : (
        <>
          {/* VEHICLE SUMMARY */}
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleRowTop}>
              <View style={{ flex: 1 }}>
                <Text
                  tone={"primary"} style={[
                    styles.vehicleNameText,
                  ]}
                  numberOfLines={1}
                >
                  {headerName}
                </Text>
                {!!headerReg && (
                  <Text
                    tone={"muted"} style={[
                      styles.vehicleRegText,
                    ]}
                  >
                    {headerReg}
                  </Text>
                )}
              </View>
              {typeof mileageValue === "number" && (
                <View style={styles.mileageChip}>
                  <Icon
                    name="activity"
                    size={12}
                    color={COLORS.textMid}
                    style={{ marginRight: t.spacing.xxs }}
                  />
                  <Text style={styles.mileageChipText}>
                    {mileageValue.toLocaleString("en-GB")} mi
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.vehicleMetaRow}>
              <View style={styles.metaItem}>
                <Text tone={"muted"} style={[styles.metaLabel]}>
                  Last service
                </Text>
                <Text tone={"primary"} style={[styles.metaValue]}>
                  {vehicleLastService
                    ? formatDateShort(vehicleLastService)
                    : lastServiceDate || "—"}
                </Text>
              </View>
              <View
                style={[
                  styles.metaDivider,
                  { backgroundColor: colors.border || COLORS.border },
                ]}
              />
              <View style={styles.metaItem}>
                <Text tone={"muted"} style={[styles.metaLabel]}>
                  Next service
                </Text>
                <Text tone={"primary"} style={[styles.metaValue]}>
                  {vehicleNextService
                    ? formatDateShort(vehicleNextService)
                    : "—"}
                </Text>
              </View>
            </View>
          </View>

          {/* SERVICE TOTALS */}
          <View style={styles.statsStrip}>
            <View style={styles.statsItem}>
              <Text tone={"muted"} style={[styles.statsLabel]}>
                Total services
              </Text>
              <Text tone={"primary"} style={[styles.statsValue]}>
                {totalServices || 0}
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text tone={"muted"} style={[styles.statsLabel]}>
                Last date
              </Text>
              <Text tone={"primary"} style={[styles.statsValue]}>
                {lastServiceDate || "—"}
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text tone={"muted"} style={[styles.statsLabel]}>
                Last mileage
              </Text>
              <Text tone={"primary"} style={[styles.statsValue]}>
                {lastServiceOdo || "—"}
              </Text>
            </View>
          </View>

          {/* HISTORY LIST */}
          <SectionCard
            tone="subtle" layoutStyle={styles.card}
          >
            {serviceHistory.length === 0 ? (
              <Text style={styles.emptyText}>
                No service entries recorded for this vehicle yet.
              </Text>
            ) : (
              serviceHistory.map((item, index) => {
                const dateLabel = item.date ? formatDateShort(item.date) : "";
                const odoLabel =
                  typeof item.odometer === "number"
                    ? `${item.odometer.toLocaleString("en-GB")} mi`
                    : item.odometer || null;
                const metaLine = buildMetaLine([dateLabel, odoLabel]);

                const isMostRecent = index === 0;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.row}
                    activeOpacity={0.85}
                    onPress={() => handleOpenRecord(item.id)}
                  >
                    <View style={styles.rowHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowTitleRow}>
                          <View style={styles.typePill}>
                            <Icon
                              name="tool"
                              size={12}
                              color={COLORS.textHigh}
                              style={{ marginRight: t.spacing.xxs }}
                            />
                            <Text style={styles.typePillText}>
                              {item.type || "Service"}
                            </Text>
                          </View>
                          {isMostRecent && (
                            <View style={styles.recentPill}>
                              <Text style={styles.recentPillText}>
                                Most recent
                              </Text>
                            </View>
                          )}
                        </View>

                        {!!metaLine && (
                          <Text
                            tone={"muted"} style={[
                              styles.rowMeta,
                            ]}
                          >
                            {metaLine}
                          </Text>
                        )}
                      </View>
                      <Icon
                        name="chevron-right"
                        size={18}
                        color={colors.textMuted || COLORS.textLow}
                      />
                    </View>

                    {!!item.summary && (
                      <Text
                        tone={"muted"} style={[
                          styles.rowSummary,
                        ]}
                        numberOfLines={2}
                      >
                        {item.summary}
                      </Text>
                    )}

                    <Text
                      tone={"muted"} style={[
                        styles.tapHint,
                      ]}
                    >
                      Tap to view full checklist
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </SectionCard>

          <View style={{ height: 24 }} />
        </>
      )}
    </PageShell>
  );
}
