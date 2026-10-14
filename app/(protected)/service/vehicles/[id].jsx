import { routeColors } from "../../../../lib/design/routePresentation/service-vehicles-id-jsx.js";
import { styles } from "../../../../lib/design/screenStyles/service-vehicles-id-jsx.js";
import { AppText as Text, AppPressable as TouchableOpacity } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams,
  useRouter } from "expo-router";
import { doc,
  serverTimestamp,
  updateDoc } from "firebase/firestore";
import { useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { db } from "../../../../firebaseConfig";
import { useServiceCacheActions, useServiceCollection } from "../../../../hooks/useServiceData";
import {
  getVehicleInsuranceExpiry,
  getVehicleLastMot,
  getVehicleLastService,
  getVehicleManufacturer,
  getVehicleMileage,
  getVehicleName,
  getVehicleNextMot,
  getVehicleNextService,
  getVehicleRegistration,
  isVehicleActiveForMaintenance,
  isVehicleMotApplicable,
  isVehicleServiceApplicable,
} from "../../../../lib/fleetSchema";
import { useTheme } from "../../../../providers/ThemeProvider";
import { designTokens as t } from "../../../../lib/design/tokens";
import PageShell from "../../../../components/layout/PageShell";

/* ---------- CONSTANTS ---------- */

const SERVICE_DRAFTS_KEY = "serviceFormDrafts_v1";
const MINOR_SERVICE_DRAFTS_KEY = "minorServiceFormDrafts_v1";

/* ---------- DATE HELPERS ---------- */

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

function formatDateShort(value) {
  const d = toDateMaybe(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "object") {
    const d = typeof value.toDate === "function" ? value.toDate() : null;
    return d ? formatDateShort(d) : "—";
  }

  const text = String(value);
  const looksLikeDate =
    /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s].*)?$/.test(text) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text);

  if (looksLikeDate) return formatDateShort(text) || text;
  return text || "—";
}

function hasMeaningfulValue(value) {
  const display = formatFieldValue(value);
  return display !== "—" && display !== "";
}

function buildResolvedDefectRouteId(vehicleId, itemIndex = "") {
  return encodeURIComponent(["vehicles", vehicleId, itemIndex].join("|"));
}

function isRepairHistoryItem(item) {
  const type = String(item?.type || item?.serviceType || item?.recordType || "")
    .trim()
    .toLowerCase();
  return (
    type.includes("repair") ||
    !!item?.repairRecordId ||
    item?.recordType === "repair"
  );
}

/* ---------- MAIN SCREEN ---------- */

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { patchServiceRow } = useServiceCacheActions();
  const vehiclesResource = useServiceCollection("vehicles");

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    setVehicle(
      vehiclesResource.data.find((row) => String(row.id) === String(id)) || null
    );
    setLoading(vehiclesResource.isInitialLoading);
  }, [id, vehiclesResource.data, vehiclesResource.isInitialLoading]);

  const motStatus = useMemo(() => {
    if (!vehicle) return null;
    if (!isVehicleMotApplicable(vehicle)) {
      return { label: "N/A", code: "not-applicable", display: "N/A" };
    }
    const raw = getVehicleNextMot(vehicle);
    const base = classifyStatus(raw);
    return {
      ...base,
      display: base.label + (raw ? ` · ${formatDateShort(raw)}` : ""),
    };
  }, [vehicle]);

  const serviceStatus = useMemo(() => {
    if (!vehicle) return null;
    if (!isVehicleServiceApplicable(vehicle)) {
      return { label: "N/A", code: "not-applicable", display: "N/A" };
    }
    const raw = getVehicleNextService(vehicle);
    const base = classifyStatus(raw);
    return {
      ...base,
      display: base.label + (raw ? ` · ${formatDateShort(raw)}` : ""),
    };
  }, [vehicle]);

  const taxStatus = vehicle?.taxStatus || "Unknown";
  const insuranceStatus = vehicle?.insuranceStatus || "Unknown";
  const insuranceExpiry = getVehicleInsuranceExpiry(vehicle);
  const mileageValue = getVehicleMileage(vehicle);
  const mileageDisplay =
    typeof mileageValue === "number"
      ? `${mileageValue.toLocaleString("en-GB")} mi`
      : mileageValue || "—";
  const activeForMaintenance = vehicle
    ? isVehicleActiveForMaintenance(vehicle)
    : true;

  const isLorry = useMemo(() => {
    const cat = (vehicle?.category || "").toLowerCase();
    return cat.includes("lorry") || cat.includes("lorries");
  }, [vehicle]);

  // serviceHistory can be an array (old style) or a string summary (new web edit)
  const serviceHistory = useMemo(() => {
    if (Array.isArray(vehicle?.serviceHistory)) {
      return [...vehicle.serviceHistory]
        .filter((item) => !isRepairHistoryItem(item))
        .sort((a, b) => {
          const da =
            toDateMaybe(a?.completedDate || a?.date || a?.recordedAt)?.getTime() ||
            0;
          const db =
            toDateMaybe(b?.completedDate || b?.date || b?.recordedAt)?.getTime() ||
            0;
          return db - da;
        });
    }
    return [];
  }, [vehicle]);

  const serviceHistorySummary =
    !Array.isArray(vehicle?.serviceHistory) &&
    typeof vehicle?.serviceHistory === "string"
      ? vehicle.serviceHistory
      : null;

  const repairHistory = useMemo(() => {
    const fromRepairs = Array.isArray(vehicle?.repairHistory)
      ? vehicle.repairHistory
      : [];
    const legacyRepairs = Array.isArray(vehicle?.serviceHistory)
      ? vehicle.serviceHistory.filter(isRepairHistoryItem)
      : [];

    return [...fromRepairs, ...legacyRepairs].sort((a, b) => {
      const da =
        toDateMaybe(a?.completedDate || a?.date || a?.recordedAt)?.getTime() || 0;
      const db =
        toDateMaybe(b?.completedDate || b?.date || b?.recordedAt)?.getTime() || 0;
      return db - da;
    });
  }, [vehicle]);

  const defectHistory = useMemo(() => {
    if (!Array.isArray(vehicle?.defectHistory)) return [];
    return vehicle.defectHistory.map((item, index) => ({ ...item, historyIndex: index })).sort((a, b) => {
      const da =
        toDateMaybe(a?.completedAt || a?.resolvedAt || a?.recordedAt)?.getTime() || 0;
      const db =
        toDateMaybe(b?.completedAt || b?.resolvedAt || b?.recordedAt)?.getTime() || 0;
      return db - da;
    });
  }, [vehicle]);

  const paperworkRows = useMemo(() => {
    if (!vehicle) return [];

    return [
      ["V5 status", vehicle.v5Present || vehicle.v5Status],
      ["V5 reference", vehicle.v5Reference],
      ["Certificates", vehicle.certificatesSummary || vehicle.certificateType],
      ["DVLA status", vehicle.dvlaStatus],
      ["DVLA reference", vehicle.dvlaRef],
      ["DVLA contact", vehicle.dvlaContact],
      ["DVLA notes", vehicle.dvlaNotes || vehicle.dlvaNotes],
      ["Warranty", vehicle.warranty || vehicle.warrantyProvider],
      [
        "Warranty expiry",
        vehicle.warrantyExpiry ? formatDateShort(vehicle.warrantyExpiry) : "",
      ],
    ].filter(([, value]) => hasMeaningfulValue(value));
  }, [vehicle]);

  const hasPaperworkFiles =
    Array.isArray(vehicle?.v5Files) && vehicle.v5Files.length > 0 ||
    Array.isArray(vehicle?.dvlaFiles) && vehicle.dvlaFiles.length > 0;
  const hasPaperwork = paperworkRows.length > 0 || hasPaperworkFiles;
  const hasMaintenanceStatusPills =
    activeForMaintenance &&
    ((!!motStatus && motStatus.code !== "unknown") ||
      (!!serviceStatus && serviceStatus.code !== "unknown"));
  const preChecksText =
    (typeof vehicle?.preChecksSummary === "string" && vehicle.preChecksSummary) ||
    (typeof vehicle?.preChecksNotes === "string" && vehicle.preChecksNotes) ||
    (typeof vehicle?.preChecks === "string" && vehicle.preChecks) ||
    "";
  const hasPreChecks =
    !!preChecksText ||
    (Array.isArray(vehicle?.preChecksFiles) && vehicle.preChecksFiles.length > 0);
  const hasVehicleNotes = !!String(vehicle?.notes || "").trim();

  /* ---------- ACTION HANDLERS ---------- */

  const handleStartFullService = async () => {
    if (!vehicle) return;

    const nextServiceRaw = getVehicleNextService(vehicle);

    const days = daysUntilDate(nextServiceRaw);

    const proceed = async () => {
      try {
        const raw = await AsyncStorage.getItem(SERVICE_DRAFTS_KEY);
        const allDrafts = raw ? JSON.parse(raw) || {} : {};

        const existingEntry = Object.entries(allDrafts).find(
          ([, draft]) => draft.selectedVehicleId === vehicle.id
        );

        if (existingEntry) {
          const [existingId] = existingEntry;
          router.push(`/service/service-form/${existingId}`);
          return;
        }

        const formId = `svc-${vehicle.id}-${Date.now()}`;

        const newDraft = {
          selectedVehicleId: vehicle.id,
          vehicleName: getVehicleName(vehicle) || "",
          registration: getVehicleRegistration(vehicle) || "",
          serviceType: "Full service",
          serviceDate: undefined,
          serviceTime: undefined,
          odometer: "",
          workSummary: "",
          partsUsed: "",
          extraNotes: "",
          signedBy: "",
          checks: {},
          checkRatings: {},
          checkNA: {},
          photoURIs: [],
        };

        allDrafts[formId] = newDraft;
        await AsyncStorage.setItem(
          SERVICE_DRAFTS_KEY,
          JSON.stringify(allDrafts)
        );

        router.push(`/service/service-form/${formId}`);
      } catch (err) {
        console.error("Failed to start full service form:", err);
      }
    };

    if (days !== null && days > 30) {
      Alert.alert(
        "Service not due yet",
        `This vehicle is not due a service for ${days} days. Are you sure you want to start a full service?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Start anyway", style: "destructive", onPress: proceed },
        ]
      );
    } else {
      proceed();
    }
  };

  const handleStartMinorService = async () => {
    if (!vehicle) return;

    try {
      const raw = await AsyncStorage.getItem(MINOR_SERVICE_DRAFTS_KEY);
      const allDrafts = raw ? JSON.parse(raw) || {} : {};

      const existingEntry = Object.entries(allDrafts).find(
        ([, draft]) => draft.selectedVehicleId === vehicle.id
      );

      if (existingEntry) {
        const [existingId] = existingEntry;
        router.push(`/service/minor-service/${existingId}`);
        return;
      }

      const formId = `minor-${vehicle.id}-${Date.now()}`;

      const newDraft = {
        selectedVehicleId: vehicle.id,
        vehicleName: getVehicleName(vehicle) || "",
        registration: getVehicleRegistration(vehicle) || "",
        serviceType: "Interim / minor service",
        serviceDate: undefined,
        serviceTime: undefined,
        odometer: "",
        workSummary: "",
        partsUsed: "",
        extraNotes: "",
        signedBy: "",
        checks: {},
        checkRatings: {},
        checkNA: {},
        photoURIs: [],
      };

      allDrafts[formId] = newDraft;
      await AsyncStorage.setItem(
        MINOR_SERVICE_DRAFTS_KEY,
        JSON.stringify(allDrafts)
      );

      router.push(`/service/minor-service/${formId}`);
    } catch (err) {
      console.error("Failed to start minor service form:", err);
    }
  };

  const handleViewAllServiceHistory = () => {
    if (!vehicle) return;
    router.push({
      pathname: "/service/service-history/[vehicleId]",
      params: {
        vehicleId: vehicle.id,
        name: getVehicleName(vehicle) || "",
        registration: getVehicleRegistration(vehicle) || "",
      },
    });
  };

  const handleViewTimeline = () => {
    if (!vehicle) return;
    router.push({
      pathname: "/service/vehicle-timeline/[id]",
      params: {
        id: vehicle.id,
        name: getVehicleName(vehicle) || "",
        registration: getVehicleRegistration(vehicle) || "",
      },
    });
  };

  const handleSetMaintenanceStatus = async (nextStatus) => {
    if (!vehicle?.id || savingStatus) return;

    const nextActive = nextStatus === "Active";
    const update = {
      operationalStatus: nextStatus,
      fleetStatus: nextStatus,
      vehicleStatus: nextStatus,
      active: nextActive,
      inactive: !nextActive,
      updatedAt: serverTimestamp(),
    };

    setSavingStatus(true);
    try {
      await updateDoc(doc(db, "vehicles", String(vehicle.id)), update);
      await patchServiceRow("vehicles", vehicle.id, update);
      setVehicle((prev) => (prev ? { ...prev, ...update } : prev));
    } catch (err) {
      console.error("Failed to update vehicle maintenance status:", err);
      Alert.alert("Could not update status", "Please try again.");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <PageShell header={{
      variant: "compact",
      title: vehicle ? getVehicleName(vehicle) || "Unnamed vehicle" : "Vehicle overview",
      titleLines: 2,
      subtitle: "Maintenance, history and documents.",
      onBack: router.back,
    }}>
      {/* HEADER */}


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryAction} />
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            Loading vehicle…
          </Text>
        </View>
      ) : !vehicle ? (
        <View style={styles.loadingContainer}>
          <Text
            tone={"primary"} style={[
              styles.loadingText,
            ]}
          >
            Vehicle not found.
          </Text>
        </View>
      ) : (
        <>
          {/* VEHICLE OVERVIEW */}
          <View style={styles.sectionContent}>
            <View style={styles.overviewHeaderRow}>
              <View style={{ flex: 1 }}>
                {!!getVehicleRegistration(vehicle) && (
                  <Text
                    tone={"muted"} style={[
                      styles.reg,
                    ]}
                  >
                    {getVehicleRegistration(vehicle)}
                  </Text>
                )}

                {(getVehicleManufacturer(vehicle) || vehicle.model) && (
                  <Text
                    tone={"muted"} style={[
                      styles.sub,
                    ]}
                  >
                    {getVehicleManufacturer(vehicle)}
                    {getVehicleManufacturer(vehicle) && vehicle.model ? " · " : ""}
                    {vehicle.model}
                  </Text>
                )}
              </View>

              <View style={{ alignItems: "flex-end" }}>
                {vehicle.category && (
                  <View style={styles.chip}>
                    <Icon
                      name="truck"
                      size={12}
                      color={COLORS.textMid}
                      style={{ marginRight: t.spacing.xxs }}
                    />
                    <Text style={styles.chipText}>{vehicle.category}</Text>
                  </View>
                )}
                <View style={[styles.chip, { marginTop: t.spacing.xxs }]}>
                  <Icon
                    name="activity"
                    size={12}
                    color={COLORS.textMid}
                    style={{ marginRight: t.spacing.xxs }}
                  />
                  <Text style={styles.chipText}>{mileageDisplay}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statusControlRow}>
            <View>
              <Text
                tone={"primary"} style={[
                  styles.statusControlTitle,
                ]}
              >
                Maintenance status
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.statusControlSub,
                ]}
              >
                {activeForMaintenance
                  ? "Active vehicles appear in MOT and service attention."
                  : "Inactive vehicles are hidden from MOT and service attention."}
              </Text>
            </View>

            <View style={styles.statusToggle} accessibilityRole="radiogroup">
              {["Active", "Inactive"].map((option) => {
                const selected =
                  option === "Active" ? activeForMaintenance : !activeForMaintenance;
                return (
                  <TouchableOpacity
                    key={option}
                    accessibilityRole="radio"
                    accessibilityLabel={`${option} for maintenance attention`}
                    accessibilityState={{ selected, disabled: savingStatus || selected }}
                    style={[
                      styles.statusToggleButton,
                      selected && styles.statusToggleButtonActive,
                    ]}
                    onPress={() => handleSetMaintenanceStatus(option)}
                    disabled={savingStatus || selected}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.statusToggleText,
                        selected && styles.statusToggleTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View full vehicle timeline"
            style={[
              styles.timelineButton,
              {
                borderColor: colors.border || COLORS.border,
                backgroundColor: colors.surfaceAlt || COLORS.card,
              },
            ]}
            activeOpacity={0.9}
            onPress={handleViewTimeline}
          >
            <View style={styles.timelineIconWrap}>
              <Icon name="clock" size={18} color={COLORS.textHigh} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                tone={"primary"} style={[
                  styles.timelineButtonTitle,
                ]}
              >
                View full timeline
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.timelineButtonSub,
                ]}
              >
                Services, repairs, defects, MOT checks and prep history
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={18}
              color={colors.textMuted || COLORS.textMid}
            />
          </TouchableOpacity>

          {/* QUICK ACTIONS – SERVICE BUTTONS */}
          <SectionHeader label="Quick maintenance actions" colors={colors} />
          <View style={styles.sectionContent}>
            <Text
              tone={"muted"} style={[
                styles.actionsHint,
              ]}
            >
              Start a service form for this vehicle. If a draft already exists,
              we’ll open it.
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Start full service"
                style={[styles.actionButton, styles.actionFull]}
                activeOpacity={0.9}
                onPress={handleStartFullService}
              >
                <Icon
                  name="tool"
                  size={16}
                  color={COLORS.textHigh}
                  style={{ marginRight: t.spacing.xxs }}
                />
                <View>
                  <Text style={styles.actionLabel}>Full service</Text>
                  <Text style={styles.actionSub}>
                    Full checklist, parts & notes
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Start minor or interim service"
                style={[styles.actionButton, styles.actionMinor]}
                activeOpacity={0.9}
                onPress={handleStartMinorService}
              >
                <Icon
                  name="refresh-ccw"
                  size={16}
                  color={COLORS.textHigh}
                  style={{ marginRight: t.spacing.xxs }}
                />
                <View>
                  <Text style={styles.actionLabel}>Minor / interim</Text>
                  <Text style={styles.actionSub}>
                    Oil, filters & safety checks
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* MAINTENANCE SECTION */}
          <SectionHeader label="Maintenance" colors={colors} />
          <View style={styles.sectionContent}>
            {hasMaintenanceStatusPills && (
              <>
                <View style={styles.statusRow}>
                  <StatusPill label="MOT" status={motStatus} />
                  <StatusPill label="Service" status={serviceStatus} />
                </View>

                <View style={styles.divider} />
              </>
            )}

            <Field
              label="Last MOT"
              value={getVehicleLastMot(vehicle) || "—"}
              colors={colors}
            />
            <Field
              label="Next MOT"
              value={isVehicleMotApplicable(vehicle) ? getVehicleNextMot(vehicle) || "—" : "N/A"}
              colors={colors}
            />
            <Field
              label="Last service"
              value={getVehicleLastService(vehicle) || "—"}
              colors={colors}
            />
            <Field
              label="Next service"
              value={isVehicleServiceApplicable(vehicle) ? getVehicleNextService(vehicle) || "—" : "N/A"}
              colors={colors}
            />
          </View>

          {/* SERVICE HISTORY */}
          <SectionHeader label="Service history" colors={colors} />

          <View style={styles.sectionContent}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleViewAllServiceHistory}
              style={styles.viewAllButton}
              activeOpacity={0.9}
            >
              <Icon
                name="list"
                size={16}
                color={COLORS.textHigh}
                style={{ marginRight: t.spacing.xs }}
              />
              <Text style={styles.viewAllButtonText}>
                View all service history
              </Text>
            </TouchableOpacity>

            {(serviceHistorySummary || serviceHistory.length > 0) && (
              <>
                {serviceHistorySummary && (
                  <Text
                    tone={"muted"} style={[
                      styles.notesText,
                      {
                        marginBottom: t.spacing.xs,
                      },
                    ]}
                  >
                    {serviceHistorySummary}
                  </Text>
                )}
                {serviceHistory.map((item, index) => {
                  const dateValue =
                    item?.completedDate || item?.date || item?.recordedAt;
                  const dateLabel = dateValue
                    ? formatDateShort(dateValue)
                    : "No date";
                  const odoLabel =
                    typeof item?.odometer === "number"
                      ? `${item.odometer.toLocaleString("en-GB")} mi`
                      : item?.odometer || null;
                  const summaryText = item?.summary || item?.notes;

                  return (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyHeaderRow}>
                        <Text
                          tone={"primary"} style={[
                            styles.historyTitle,
                          ]}
                        >
                          {item?.type || "Service"}
                        </Text>
                        <Text
                          tone={"muted"} style={[
                            styles.historyMeta,
                          ]}
                        >
                          {dateLabel}
                          {odoLabel ? ` · ${odoLabel}` : ""}
                        </Text>
                      </View>
                      {!!summaryText && (
                        <Text
                          tone={"muted"} style={[
                            styles.historySummary,
                          ]}
                          numberOfLines={2}
                        >
                          {summaryText}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            <AttachmentList
              label="Service history files"
              files={vehicle.serviceHistoryFiles}
              colors={colors}
            />
          </View>

          {/* REPAIR HISTORY */}
          {repairHistory.length > 0 && (
            <>
              <SectionHeader label="Repair history" colors={colors} />
              <View style={styles.sectionContent}>
                {repairHistory.slice(0, 5).map((item, index) => {
                const dateValue =
                  item?.completedDate || item?.date || item?.recordedAt;
                const dateLabel = dateValue
                  ? formatDateShort(dateValue)
                  : "No date";
                const odoLabel =
                  typeof item?.odometer === "number"
                    ? `${item.odometer.toLocaleString("en-GB")} mi`
                    : item?.odometer || null;
                const summaryText =
                  item?.summary ||
                  item?.repairSummary ||
                  item?.notes ||
                  item?.reason ||
                  "";
                const partsText = item?.partsUsed ? `Parts: ${item.partsUsed}` : "";

                return (
                  <View
                    key={`${item?.repairRecordId || item?.serviceRecordId || index}-${index}`}
                    style={styles.historyItem}
                  >
                    <View style={styles.historyHeaderRow}>
                      <Text
                        tone={"primary"} style={[
                          styles.historyTitle,
                        ]}
                      >
                        {item?.type || "General repair"}
                      </Text>
                      <Text
                        tone={"muted"} style={[
                          styles.historyMeta,
                        ]}
                      >
                        {dateLabel}
                        {odoLabel ? ` · ${odoLabel}` : ""}
                      </Text>
                    </View>
                    {!!summaryText && (
                      <Text
                        tone={"muted"} style={[
                          styles.historySummary,
                        ]}
                        numberOfLines={2}
                      >
                        {summaryText}
                      </Text>
                    )}
                    {!!partsText && (
                      <Text
                        tone={"muted"} style={[
                          styles.historySummary,
                        ]}
                        numberOfLines={2}
                      >
                        {partsText}
                      </Text>
                    )}
                  </View>
                );
                })}
              </View>
            </>
          )}

          {/* DEFECT HISTORY */}
          <SectionHeader label="Defect history" colors={colors} />
          <View style={styles.sectionContent}>
            {defectHistory.length > 0 ? (
              defectHistory.slice(0, 5).map((item, index) => {
                const dateValue =
                  item?.completedAt || item?.resolvedAt || item?.recordedAt;
                const dateLabel = dateValue
                  ? formatDateShort(dateValue)
                  : "No date";
                const category =
                  item?.category === "immediate" ? "Immediate" : "General";
                const summaryText =
                  item?.completionNote ||
                  item?.description ||
                  item?.notes ||
                  item?.sourceLabel ||
                  "";

                return (
                  <TouchableOpacity
                    key={`${item?.sourceDocId || index}-${index}`}
                    style={styles.historyItem}
                    activeOpacity={0.85}
                    onPress={() => {
                      router.push(
                        `/service/resolved-defects/${buildResolvedDefectRouteId(
                          vehicle.id,
                          item.historyIndex
                        )}`
                      );
                    }}
                  >
                    <View style={styles.historyHeaderRow}>
                      <Text
                        tone={"primary"} style={[
                          styles.historyTitle,
                        ]}
                      >
                        {item?.title || "Resolved defect"}
                      </Text>
                      <Text
                        tone={"muted"} style={[
                          styles.historyMeta,
                        ]}
                      >
                        {category} · {dateLabel}
                      </Text>
                    </View>
                    {!!summaryText && (
                        <Text
                          tone={"muted"} style={[
                            styles.historySummary,
                          ]}
                          numberOfLines={2}
                        >
                          {summaryText}
                        </Text>
                      )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text
                tone={"muted"} style={[
                  styles.notesText,
                ]}
              >
                No completed defects recorded for this vehicle.
              </Text>
            )}
          </View>

          {/* PRE-CHECKS / DAILY INSPECTIONS */}
          {hasPreChecks && (
            <>
              <SectionHeader
                label="Pre-checks & daily inspections"
                colors={colors}
              />
              <View style={styles.sectionContent}>
                {!!preChecksText && (
                  <Text
                    tone={"muted"} style={[
                      styles.notesText,
                    ]}
                  >
                    {preChecksText}
                  </Text>
                )}

                <AttachmentList
                  label="Pre-checks attachments"
                  files={vehicle.preChecksFiles}
                  colors={colors}
                />
              </View>
            </>
          )}

          {/* PAPERWORK / CERTIFICATES / V5 / DVLA / WARRANTY */}
          {hasPaperwork && (
            <>
              <SectionHeader label="Paperwork & certificates" colors={colors} />
              <View style={styles.sectionContent}>
                {paperworkRows.map(([label, value]) => (
                  <Field key={label} label={label} value={value} colors={colors} />
                ))}

                <AttachmentList
                  label="V5 & certificate files"
                  files={vehicle.v5Files}
                  colors={colors}
                />
                <AttachmentList
                  label="DVLA paperwork files"
                  files={vehicle.dvlaFiles}
                  colors={colors}
                />
              </View>
            </>
          )}

          {/* LORRY-ONLY: INSPECTIONS + TACHO CALIBRATION */}
          {isLorry && (
            <>
              <SectionHeader label="Lorry inspections & tacho" colors={colors} />
              <View style={styles.sectionContent}>
                <Field
                  label="Inspection interval (weeks)"
                  value={
                    typeof vehicle.lorryInspectionFreq === "number"
                      ? String(vehicle.lorryInspectionFreq)
                      : vehicle.lorryInspectionFreq ||
                        (typeof vehicle.inspectionIntervalWeeks === "number"
                          ? String(vehicle.inspectionIntervalWeeks)
                          : vehicle.inspectionIntervalWeeks || "—")
                  }
                  colors={colors}
                />
                <Field
                  label="Last inspection"
                  value={
                    vehicle.lastLorryInspection
                      ? formatDateShort(vehicle.lastLorryInspection)
                      : vehicle.lastInspectionDate
                      ? formatDateShort(vehicle.lastInspectionDate)
                      : "—"
                  }
                  colors={colors}
                />
                <Field
                  label="Next inspection"
                  value={
                    vehicle.nextLorryInspection
                      ? formatDateShort(vehicle.nextLorryInspection)
                      : vehicle.nextInspectionDate
                      ? formatDateShort(vehicle.nextInspectionDate)
                      : "—"
                  }
                  colors={colors}
                />

                <View style={styles.divider} />

                <Field
                  label="Last tacho calibration"
                  value={
                    vehicle.lastTachoCalibration
                      ? formatDateShort(vehicle.lastTachoCalibration)
                      : vehicle.tachoLastCalibration
                      ? formatDateShort(vehicle.tachoLastCalibration)
                      : "—"
                  }
                  colors={colors}
                />
                <Field
                  label="Next tacho calibration"
                  value={
                    vehicle.nextTachoCalibration
                      ? formatDateShort(vehicle.nextTachoCalibration)
                      : vehicle.tachoNextCalibration
                      ? formatDateShort(vehicle.tachoNextCalibration)
                      : "—"
                  }
                  colors={colors}
                />

                <AttachmentList
                  label="Tacho calibration files"
                  files={vehicle.tachoCalibrationFiles}
                  colors={colors}
                />
                <AttachmentList
                  label="Lorry inspection files"
                  files={vehicle.lorryInspectionFiles}
                  colors={colors}
                />
              </View>
            </>
          )}

          {/* STATUS SECTION */}
          <SectionHeader label="Status & compliance" colors={colors} />
          <View style={styles.sectionContent}>
            <Field label="Tax status" value={taxStatus} colors={colors} />
            <Field
              label="Insurance status"
              value={insuranceStatus}
              colors={colors}
            />
            <Field
              label="Insurance expiry"
              value={insuranceExpiry ? formatDateShort(insuranceExpiry) : "—"}
              colors={colors}
            />
            <Field
              label="MOT frequency (weeks)"
              value={
                typeof vehicle.motFreq === "number"
                  ? String(vehicle.motFreq)
                  : vehicle.motFreq || "—"
              }
              colors={colors}
            />
          </View>

          {/* NOTES SECTION */}
          {hasVehicleNotes && (
            <>
              <SectionHeader label="Notes" colors={colors} />
              <View style={styles.sectionContent}>
                <Text
                  tone={"muted"} style={[
                    styles.notesText,
                  ]}
                >
                  {vehicle.notes}
                </Text>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </>
      )}
    </PageShell>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function SectionHeader({ label, colors }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text
        accessibilityRole="header"
        style={[
          styles.sectionTitle,
          { color: colors?.text || COLORS.textHigh },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function Field({ label, value, colors }) {
  const display = formatFieldValue(value);

  return (
    <View style={styles.fieldRow} accessible accessibilityLabel={`${label}, ${display}`}>
      <Text
        style={[
          styles.fieldLabel,
          { color: colors?.textMuted || COLORS.textLow },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.fieldValue,
          { color: colors?.text || COLORS.textHigh },
        ]}
      >
        {display}
      </Text>
    </View>
  );
}

function StatusPill({ label, status }) {
  const { colorScheme } = useTheme();
  if (!status) return null;

  const code = status.code;
  if (code === "unknown") return null;

  const tone = { overdue: "danger", "due-soon": "warning", ok: "success" }[code] || "neutral";
  const { background: bg, onBackground: fg } = getServiceStatusColors(tone, colorScheme);

  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <Text style={[styles.statusPillText, { color: fg }]}>
        {label}: {status.display}
      </Text>
    </View>
  );
}

function AttachmentList({ label, files, colors }) {
  const list = Array.isArray(files) ? files : [];
  const router = useRouter();

  if (!list.length) return null;

  const handlePress = (file) => {
    if (!file?.url) return;

    router.push({
      pathname: "/service/vehicles/file-viewer",
      params: {
        url: file.url,
        name: file.name || "",
      },
    });
  };

  return (
    <View style={{ marginTop: t.spacing.sm }}>
      <Text
        style={[
          styles.attachmentsLabel,
          { color: colors?.textMuted || COLORS.textLow },
        ]}
      >
        {label}
      </Text>
      {list.map((file, idx) => (
        <TouchableOpacity
          key={`${file.url || idx}`}
          style={[
            styles.attachmentButton,
            {
              backgroundColor: colors?.surfaceAlt || routeColors.hex_191919_acxwha,
              borderColor: colors?.border || COLORS.border,
            },
          ]}
          onPress={() => handlePress(file)}
          activeOpacity={0.85}
        >
          <View style={styles.attachmentIconWrap}>
            <Icon name="file-text" size={16} color={COLORS.textHigh} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.attachmentName,
                { color: colors?.text || COLORS.textHigh },
              ]}
              numberOfLines={1}
            >
              {file.name || `File ${idx + 1}`}
            </Text>
            <Text
              style={[
                styles.attachmentSub,
                { color: colors?.textMuted || COLORS.textLow },
              ]}
            >
              Tap to open
            </Text>
          </View>

          <Icon
            name="chevron-right"
            size={16}
            color={colors?.textMuted || COLORS.textMid}
            style={styles.attachmentChevron}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ---------- STYLES ---------- */
