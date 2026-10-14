import Field from "../../../../components/ui/RecordDetailRow";
import { routeColors } from "../../../../lib/design/routePresentation/service-service-record-id-jsx.js";
import { styles } from "../../../../lib/design/screenStyles/service-service-record-id-jsx.js";
import { Divider, AppText as Text, AppPressable as TouchableOpacity } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS } from "../../../../lib/design/semantics";
// app/(protected)/service/service-record/[id].jsx
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams,
  useRouter } from "expo-router";
import { deleteDoc,
  deleteField,
  doc,
  getDoc,
  updateDoc } from "firebase/firestore";
import { useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  View } from "react-native";

import { db } from "../../../../firebaseConfig";
import { useServiceCacheActions, useServiceCollection } from "../../../../hooks/useServiceData";
import {
  findVehicleRecord,
  getVehicleDisplayName,
  getVehicleRegistration,
} from "../../../../lib/fleetSchema";
import { useTheme } from "../../../../providers/ThemeProvider";
import { designTokens as t } from "../../../../lib/design/tokens";
import { formatServiceRecordDate } from "../../../../lib/serviceRecordDate";
import PageShell from "../../../../components/layout/PageShell";

const CHECK_STATUS_META = {
  green: { label: "Green", color: routeColors.hex_22c55e_740if4 },
  amber: { label: "Amber", color: routeColors.hex_f59e0b_4zbh7f },
  red: { label: "Red", color: routeColors.hex_ef4444_4oizhh },
};

const WHEEL_POSITIONS = [
  { key: "frontLeft", label: "Front left", shortLabel: "FL" },
  { key: "frontRight", label: "Front right", shortLabel: "FR" },
  { key: "rearLeft", label: "Rear left", shortLabel: "RL" },
  { key: "rearRight", label: "Rear right", shortLabel: "RR" },
];

const DEFECT_ACTION_LABELS = {
  repaired: "Repaired",
  replaced: "Replaced",
  not_repaired: "Not repaired",
};

function normalizeCheckStatus(value) {
  if (typeof value === "string") {
    const status = value.trim().toLowerCase();
    if (CHECK_STATUS_META[status]) return status;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 4) return "green";
    if (value >= 2) return "amber";
    return "red";
  }

  return "";
}

function normalizeWheelInspection(value) {
  return WHEEL_POSITIONS.reduce((acc, wheel) => {
    const source = value?.[wheel.key] || {};
    acc[wheel.key] = {
      tread: source.tread !== undefined && source.tread !== null ? String(source.tread) : "",
      pressure:
        source.pressure !== undefined && source.pressure !== null ? String(source.pressure) : "",
      brakeWear:
        source.brakeWear !== undefined && source.brakeWear !== null
          ? String(source.brakeWear)
          : "",
      note: source.note !== undefined && source.note !== null ? String(source.note) : "",
    };
    return acc;
  }, {});
}

function hasWheelInspectionData(value) {
  return WHEEL_POSITIONS.some((wheel) => {
    const item = value?.[wheel.key] || {};
    return ["tread", "pressure", "brakeWear", "note"].some((field) =>
      String(item[field] || "").trim()
    );
  });
}

function parseMetricNumber(value) {
  const cleaned = String(value || "").replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTreadStatus(value) {
  const tread = parseMetricNumber(value);
  if (tread === null) return "";
  if (tread >= 4) return "green";
  if (tread >= 2) return "amber";
  return "red";
}

function getBrakeWearStatus(value) {
  const wear = parseMetricNumber(value);
  if (wear === null) return "";
  if (wear < 60) return "green";
  if (wear < 80) return "amber";
  return "red";
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "object") {
    return formatServiceRecordDate(value) || "—";
  }

  const text = String(value);
  const looksLikeDate =
    /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s].*)?$/.test(text) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text);

  if (looksLikeDate) return formatServiceRecordDate(text) || text;
  return text || "—";
}

export default function ServiceRecordViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { removeServiceRow } = useServiceCacheActions();
  const recordsResource = useServiceCollection("serviceRecords");
  const vehiclesResource = useServiceCollection("vehicles");

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setRecord(
      recordsResource.data.find((row) => String(row.id) === String(id)) || null
    );
    setLoading(recordsResource.isInitialLoading);
  }, [id, recordsResource.data, recordsResource.isInitialLoading]);

  const title = record?.serviceType || "Service record";
  const matchedVehicle = findVehicleRecord(record, vehiclesResource.data);
  const vehicleName = getVehicleDisplayName(
    matchedVehicle || record,
    vehiclesResource.data
  );
  const reg = getVehicleRegistration(matchedVehicle || record) || "";
  const serviceFormNumber = record?.serviceFormNumber || "";
  const wheelInspection = normalizeWheelInspection(record?.wheelInspection);
  const hasWheelInspection = hasWheelInspectionData(wheelInspection);
  const serviceDefectActions = record?.serviceDefectActions || {};
  const serviceDefectActionList = Object.values(serviceDefectActions).filter(
    (item) => item?.title
  );
  const monitorReport = Array.isArray(record?.monitorReport) ? record.monitorReport : [];
  const serviceDateDisplay = [
    record?.serviceDateOnly,
    record?.serviceDate,
    record?.date,
    record?.completedDate,
    record?.completedAt,
  ].map((value) => formatServiceRecordDate(value)).find(Boolean) || "Not recorded";

  // ---- Build full checklist items from stored maps -----------------
  const checklistItems = useMemo(() => {
    if (!record) return [];
    const checks = record.checks || {};
    const ratings = record.checkRatings || {};
    const na = record.checkNA || {};
    const notes = record.checkNotes || {};
    const checkPhotoURIs = record.checkPhotoURIs || record.checkPhotoURLs || {};

    const labelsSet = new Set([
      ...Object.keys(checks),
      ...Object.keys(ratings),
      ...Object.keys(na),
      ...Object.keys(notes),
      ...Object.keys(checkPhotoURIs),
    ]);

    return Array.from(labelsSet)
      .sort((a, b) => a.localeCompare(b))
      .map((label) => {
        const photosForLabel = checkPhotoURIs[label];
        return {
          label,
          checked: !!checks[label],
          rating: ratings[label] ?? null,
          status: normalizeCheckStatus(ratings[label]),
          na: !!na[label],
          note: typeof notes[label] === "string" ? notes[label] : "",
          photos: Array.isArray(photosForLabel) ? photosForLabel : [],
        };
      });
  }, [record]);

  const handleDeleteRecord = () => {
    if (!record?.id) return;

    Alert.alert(
      "Delete service record?",
      "This will permanently delete this record from the service history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const recordId = String(record.id);

              if (record.vehicleId) {
                const vehicleRef = doc(db, "vehicles", String(record.vehicleId));
                const vehicleSnap = await getDoc(vehicleRef);

                if (vehicleSnap.exists()) {
                  const vehicle = vehicleSnap.data() || {};
                  const updatePayload = {};

                  if (Array.isArray(vehicle.serviceHistory)) {
                    updatePayload.serviceHistory = vehicle.serviceHistory.filter(
                      (item) =>
                        item?.serviceRecordId !== recordId &&
                        item?.repairRecordId !== recordId
                    );
                  }

                  if (Array.isArray(vehicle.repairHistory)) {
                    updatePayload.repairHistory = vehicle.repairHistory.filter(
                      (item) =>
                        item?.serviceRecordId !== recordId &&
                        item?.repairRecordId !== recordId
                    );
                  }

                  if (vehicle.lastRepair?.serviceRecordId === recordId) {
                    updatePayload.lastRepair = deleteField();
                  }

                  if (Object.keys(updatePayload).length > 0) {
                    await updateDoc(vehicleRef, updatePayload);
                  }
                }
              }

              await deleteDoc(doc(db, "serviceRecords", recordId));
              await removeServiceRow("serviceRecords", recordId);

              Alert.alert("Deleted", "The service record has been deleted.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err) {
              console.error("Failed to delete service record:", err);
              Alert.alert("Error", "Could not delete this service record.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <PageShell header={{
      variant: "compact",
      title,
      subtitle: [reg, vehicleName].filter(Boolean).join(" · "),
      onBack: router.back,
      action: record
        ? {
            label: "Edit service record",
            icon: "edit-3",
            variant: "secondary",
            onPress: () =>
              router.push({
                pathname: "/service/service-form/[id]",
                params: {
                  id: `edit-${record.id}`,
                  recordId: record.id,
                },
              }),
          }
        : undefined,
    }}>
      {/* HEADER */}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.textMuted || COLORS.textMid}
          />
          <Text
            tone={"muted"} style={[
              styles.loadingText,
            ]}
          >
            Loading service record…
          </Text>
        </View>
      ) : !record ? (
        <View style={styles.loadingContainer}>
          <Text
            tone={"primary"} style={[
              styles.loadingText,
            ]}
          >
            Service record not found.
          </Text>
        </View>
      ) : (
        <>
          {/* SERVICE DETAILS */}
          <View style={styles.section}>
            <View className="summaryHeader" style={styles.summaryHeader}>
              <View style={{ flex: 1 }}>
                <Text tone={"primary"} style={[styles.sectionTitle]}>
                  Service details
                </Text>
              </View>
              {typeof record.odometer === "number" && (
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.surface || COLORS.chipBg,
                      borderColor: colors.border || COLORS.border,
                    },
                  ]}
                >
                  <Feather
                    name="activity"
                    size={12}
                    color={colors.textMuted || COLORS.textMid}
                    style={{ marginRight: t.spacing.xxs }}
                  />
                  <Text tone={"muted"} style={[styles.chipText]}>
                    {record.odometer.toLocaleString("en-GB")} mi
                  </Text>
                </View>
              )}
            </View>

            <Divider variant="record" layoutStyle={styles.divider} />

            <Field
              label="Vehicle"
              value={formatFieldValue(`${vehicleName}${reg ? ` · ${reg}` : ""}`)}
            />
            <Field label="Service form no." value={formatFieldValue(serviceFormNumber || "—")} />
            <Field label="Service type" value={formatFieldValue(record.serviceType)} />
            <Field label="Service date" value={formatFieldValue(serviceDateDisplay)} />
            <Field
              label="Next service due"
              value={formatFieldValue(formatServiceRecordDate(record.nextService || record.nextServiceDate) || "Not recorded")}
            />
            <Field
              label="Technician"
              value={formatFieldValue(record.signedBy || "Not recorded")}
            />
          </View>

          {/* WORKSHOP NOTES */}
          <View style={styles.section}>
            <Text tone={"primary"} style={[styles.sectionTitle]}>
              Workshop notes
            </Text>
            <NoteField
              label="Work carried out"
              value={record.workSummary || "—"}
            />
            <NoteField label="Parts used" value={record.partsUsed || "—"} />
            <NoteField
              label="Extra notes"
              value={record.extraNotes || "No additional notes."}
            />
          </View>

          {/* TYRES & BRAKES FOOTPRINT */}
          <View style={styles.section}>
            <Text tone={"primary"} style={[styles.sectionTitle]}>
              Tyres & brakes footprint
            </Text>
            {!hasWheelInspection ? (
              <Text tone={"muted"} style={[styles.checkSummaryText]}>
                No wheel inspection data saved for this service.
              </Text>
            ) : (
              <View style={styles.wheelGrid}>
                {WHEEL_POSITIONS.map((wheel) => {
                  const item = wheelInspection[wheel.key] || {};
                  return (
                    <View
                      key={wheel.key}
                      style={[
                        styles.wheelRecordCard,
                        {
                          backgroundColor: colors.surface || COLORS.card,
                          borderColor: colors.border || COLORS.border,
                        },
                      ]}
                    >
                      <View style={styles.wheelRecordHeader}>
                        <View style={styles.wheelRecordBadge}>
                          <Text style={styles.wheelRecordBadgeText}>{wheel.shortLabel}</Text>
                        </View>
                        <Text tone={"primary"} style={[styles.wheelRecordTitle]}>
                          {wheel.label}
                        </Text>
                      </View>
                      <WheelRecordMetric
                        label="Tread"
                        value={item.tread}
                        suffix="mm"
                        status={getTreadStatus(item.tread)}
                      />
                      <WheelRecordMetric label="Pressure" value={item.pressure} suffix="psi" />
                      <WheelRecordMetric
                        label="Brake wear"
                        value={item.brakeWear}
                        suffix="%"
                        status={getBrakeWearStatus(item.brakeWear)}
                      />
                      {item.note ? (
                        <Text
                          tone={"muted"} style={[
                            styles.wheelRecordNote,
                            {
                              borderTopColor: colors.border || COLORS.border,
                            },
                          ]}
                        >
                          {item.note}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* MONITOR REPORT */}
          {monitorReport.length > 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceAlt || COLORS.card,
                  borderColor: colors.border || COLORS.border,
                },
              ]}
            >
              <Text tone={"primary"} style={[styles.sectionTitle]}>
                Monitor report
              </Text>
              {monitorReport.map((item) => (
                <View
                  key={item.key}
                  style={[
                    styles.monitorRecordRow,
                    { borderBottomColor: colors.border || COLORS.border },
                  ]}
                >
                  <View style={styles.monitorRecordBadge}>
                    <Text style={styles.monitorRecordBadgeText}>M</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text tone={"primary"} style={[styles.monitorRecordTitle]}>
                      {item.title}
                    </Text>
                    <Text tone={"muted"} style={[styles.monitorRecordDetails]}>
                      {item.details}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* DEFECT ACTIONS */}
          {serviceDefectActionList.length > 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceAlt || COLORS.card,
                  borderColor: colors.border || COLORS.border,
                },
              ]}
            >
              <Text tone={"primary"} style={[styles.sectionTitle]}>
                Defect report actions
              </Text>
              {serviceDefectActionList.map((item) => (
                <View
                  key={item.key}
                  style={[
                    styles.defectActionRecordRow,
                    { borderBottomColor: colors.border || COLORS.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text tone={"primary"} style={[styles.defectActionRecordTitle]}>
                      {item.title}
                    </Text>
                    <Text tone={"muted"} style={[styles.defectActionRecordMeta]}>
                      {item.value}
                      {item.unit} recorded
                      {item.defectReportId ? ` · Report ${item.defectReportId}` : ""}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.defectActionRecordBadge,
                      { color: colors.textMuted || COLORS.textMid },
                      item.action === "not_repaired" && { color: COLORS.primaryAction },
                    ]}
                  >
                    {DEFECT_ACTION_LABELS[item.action] || "Not marked"}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* FULL CHECKLIST DETAILS */}
          <View
            style={[
              checklistItems.length > 0 ? styles.card : styles.emptyCard,
              {
                backgroundColor: checklistItems.length > 0
                  ? colors.surfaceAlt || COLORS.card
                  : "transparent",
                borderColor: colors.border || COLORS.border,
              },
            ]}
          >
            <Text tone={"primary"} style={[styles.sectionTitle]}>
              Checklist details
            </Text>
            {checklistItems.length === 0 ? (
              <Text tone={"muted"} style={[styles.checkSummaryText]}>
                No checklist data saved for this service.
              </Text>
            ) : (
              checklistItems.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.checkRowWrapper,
                    { borderBottomColor: colors.border || COLORS.border },
                  ]}
                >
                  {/* Row: tick / N/A / label + status */}
                  <View style={styles.checkRowTop}>
                    {/* Left: icon + label */}
                    <View style={styles.checkLeft}>
                      <View style={styles.checkIconWrap}>
                        {item.na ? (
                          <View style={styles.naIcon}>
                            <Text style={styles.naIconText}>N/A</Text>
                          </View>
                        ) : item.checked ? (
                          <View
                            style={[
                              styles.checkIconFilled,
                              item.status && {
                                backgroundColor: CHECK_STATUS_META[item.status].color,
                              },
                            ]}
                          >
                            <Feather
                              name="check"
                              size={16}
                              color={COLORS.textHigh}
                            />
                          </View>
                        ) : (
                          <View style={styles.checkIconEmpty} />
                        )}
                      </View>
                      <Text tone={"muted"} style={[styles.checkLabel]}>
                        {item.label}
                      </Text>
                    </View>

                    {/* Right: status */}
                    <View style={styles.checkRight}>
                      {item.na ? (
                        <Text tone={"muted"} style={[styles.checkRightText]}>
                          N/A
                        </Text>
                      ) : item.status ? (
                        <Text
                          style={[
                            styles.checkRightText,
                            { color: CHECK_STATUS_META[item.status].color },
                          ]}
                        >
                          {CHECK_STATUS_META[item.status].label}
                        </Text>
                      ) : (
                        <Text tone={"muted"} style={[styles.checkRightText]}>
                          No status
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Note for this check */}
                  {item.note ? (
                    <Text tone={"muted"} style={[styles.checkNoteText]}>
                      {item.note}
                    </Text>
                  ) : null}

                  {/* Photos for this check */}
                  {Array.isArray(item.photos) && item.photos.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: t.spacing.xxs }}
                    >
                      {item.photos.map((uri) => (
                        <View
                          key={uri}
                          style={styles.checkPhotoThumbWrapper}
                        >
                          <Image
                            source={{ uri }}
                            style={styles.checkPhotoThumb}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ))
            )}
          </View>

          {/* PHOTOS — OVERALL */}
          {Array.isArray(record.photoURIs || record.photoURLs) &&
            (record.photoURIs || record.photoURLs).length > 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceAlt || COLORS.card,
                  borderColor: colors.border || COLORS.border,
                },
              ]}
            >
              <Text tone={"primary"} style={[styles.sectionTitle]}>
                Photos
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: t.spacing.xs }}
              >
                {(record.photoURIs || record.photoURLs).map((uri) => (
                  <View key={uri} style={styles.photoThumbWrapper}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.deleteButton,
              { borderColor: COLORS.primaryAction },
              deleting && styles.deleteButtonDisabled,
            ]}
            onPress={handleDeleteRecord}
            activeOpacity={0.85}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primaryAction}
                style={{ marginRight: t.spacing.xs }}
              />
            ) : (
              <Feather
                name="trash-2"
                size={17}
                color={COLORS.primaryAction}
                style={{ marginRight: t.spacing.xs }}
              />
            )}
            <Text style={styles.deleteButtonText}>
              {deleting ? "Deleting..." : "Delete service record"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </>
      )}
    </PageShell>
  );
}

/* SMALL REUSABLE FIELD */



function NoteField({ label, value }) {


  return (
    <View style={styles.noteField}>
      <Text tone={"muted"} style={[styles.noteLabel]}>
        {label}
      </Text>
      <Text tone={"primary"} style={[styles.noteValue]}>
        {formatFieldValue(value)}
      </Text>
    </View>
  );
}

function WheelRecordMetric({ label, value, suffix, status }) {

  const displayValue = String(value || "").trim();
  const statusMeta = CHECK_STATUS_META[status] || null;

  return (
    <View style={styles.wheelRecordMetric}>
      <View style={styles.wheelRecordMetricLabelRow}>
        <Text tone={"muted"} style={[styles.wheelRecordMetricLabel]}>
          {label}
        </Text>
        {statusMeta ? (
          <View style={[styles.wheelRecordStatusDot, { backgroundColor: statusMeta.color }]} />
        ) : null}
      </View>
      <Text tone={"primary"} style={[styles.wheelRecordMetricValue]}>
        {displayValue ? `${displayValue} ${suffix}` : "—"}
      </Text>
    </View>
  );
}

/* STYLES */
