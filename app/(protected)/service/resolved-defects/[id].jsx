import Field from "../../../../components/ui/RecordDetailRow";
import { routeColors } from "../../../../lib/design/routePresentation/service-resolved-defects-id-jsx.js";
import { styles } from "../../../../lib/design/screenStyles/service-resolved-defects-id-jsx.js";
import { Divider, SectionCard, AppButton, AppModal, AppText as Text, AppPressable as TouchableOpacity, TextArea } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS } from "../../../../lib/design/semantics";
import { useLocalSearchParams,
  useRouter } from "expo-router";
import { doc,
  getDoc,
  serverTimestamp,
  writeBatch } from "firebase/firestore";
import { useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { db } from "../../../../firebaseConfig";
import { getVehicleDisplayLabel } from "../../../../lib/fleetSchema";
import { designTokens as t } from "../../../../lib/design/tokens";
import PageShell from "../../../../components/layout/PageShell";

function parseRouteId(value) {
  try {
    const decoded = decodeURIComponent(String(value || ""));
    const [source, docId, itemIndexRaw] = decoded.split("|");
    return {
      source,
      docId,
      itemIndex:
        itemIndexRaw !== undefined && itemIndexRaw !== ""
          ? Number(itemIndexRaw)
          : null,
    };
  } catch {
    return { source: "", docId: "", itemIndex: null };
  }
}

function toDateMaybe(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDateMaybe(value);
  if (!date) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVehicleText(record, fallback = {}) {
  return [
    record?.vehicleName || record?.vehicle || record?.name || fallback.vehicleName,
    record?.registration || record?.reg || fallback.registration,
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildManualResolvedDefect(report) {
  return {
    source: "defectReports",
    title: report.category || report.title || "Resolved defect",
    description: report.description || report.note || report.summary || report.notes || "",
    completionNote: report.completionNote || "",
    vehicle: getVehicleText(report),
    sourceLabel: "Defect report",
    category: report.severity || report.priority || "",
    reporter: report.reportedBy || report.reporterName || report.driverName || "",
    jobNumber: report.jobNumber || "",
    reportedAt: report.createdAt || report.dateISO || report.date,
    completedAt: report.completedAt || report.updatedAt,
  };
}

function buildVehicleResolvedDefect(vehicle, item) {
  return {
    source: "vehicles",
    sourceDocId: item?.sourceDocId || "",
    sourceItemIndex: item?.itemIndex,
    sourceCollection: item?.source || "",
    title: item?.title || "Resolved defect",
    description: item?.description || "",
    completionNote: item?.completionNote || "",
    vehicle: getVehicleText(vehicle, item),
    sourceLabel: item?.sourceLabel || "Vehicle defect",
    category: item?.category || "",
    reporter: item?.reporter || "",
    jobNumber: item?.jobNumber || "",
    reportedAt: item?.reportedAt,
    completedAt: item?.completedAt || item?.resolvedAt || item?.recordedAt,
  };
}

export default function ResolvedDefectDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const route = useMemo(() => parseRouteId(Array.isArray(id) ? id[0] : id), [id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defect, setDefect] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editCompletionNote, setEditCompletionNote] = useState("");

  useEffect(() => {
    const loadDefect = async () => {
      if (!route.source || !route.docId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (route.source === "defectReports") {
          const snap = await getDoc(doc(db, "defectReports", route.docId));
          if (!snap.exists()) {
            setDefect(null);
            return;
          }
          const report = snap.data() || {};
          let vehicle = null;
          if (report.vehicleId || report.vehicleDocId) {
            const vehicleSnap = await getDoc(
              doc(db, "vehicles", String(report.vehicleId || report.vehicleDocId))
            );
            if (vehicleSnap.exists()) {
              vehicle = { id: vehicleSnap.id, ...vehicleSnap.data() };
            }
          }
          setDefect({
            ...buildManualResolvedDefect(report),
            vehicle: getVehicleDisplayLabel(vehicle || report, vehicle ? [vehicle] : []),
          });
          return;
        }

        if (route.source === "vehicles") {
          const snap = await getDoc(doc(db, "vehicles", route.docId));
          if (!snap.exists()) {
            setDefect(null);
            return;
          }
          const vehicle = { id: snap.id, ...snap.data() };
          const history = Array.isArray(vehicle.defectHistory)
            ? vehicle.defectHistory
            : [];
          const item = history[route.itemIndex];
          setDefect(item ? buildVehicleResolvedDefect(vehicle, item) : null);
          return;
        }

        setDefect(null);
      } catch (err) {
        console.error("Failed to load resolved defect:", err);
        setDefect(null);
      } finally {
        setLoading(false);
      }
    };

    loadDefect();
  }, [route.docId, route.itemIndex, route.source]);

  const openEdit = () => {
    setEditCompletionNote(defect?.completionNote || "");
    setEditModalVisible(true);
  };

  const saveCompletionNote = async () => {
    if (!defect) return;
    const trimmedNote = editCompletionNote.trim();
    if (!trimmedNote) {
      Alert.alert("Completion note required", "Add a short note explaining what was done.");
      return;
    }

    setSaving(true);
    try {
      const batch = writeBatch(db);

      if (route.source === "defectReports") {
        batch.update(doc(db, "defectReports", route.docId), {
          completionNote: trimmedNote,
          updatedAt: serverTimestamp(),
        });
      } else if (route.source === "vehicles") {
        const vehicleRef = doc(db, "vehicles", route.docId);
        const snap = await getDoc(vehicleRef);
        if (!snap.exists()) throw new Error("Vehicle no longer exists.");

        const vehicle = snap.data();
        const defectHistory = Array.isArray(vehicle.defectHistory)
          ? [...vehicle.defectHistory]
          : [];
        if (!defectHistory[route.itemIndex]) {
          throw new Error("Resolved defect history item no longer exists.");
        }

        const originalHistoryItem = defectHistory[route.itemIndex];
        defectHistory[route.itemIndex] = {
          ...originalHistoryItem,
          completionNote: trimmedNote,
          updatedAt: new Date().toISOString(),
        };
        batch.update(vehicleRef, { defectHistory });

        if (originalHistoryItem?.source === "vehicleIssues" && originalHistoryItem?.sourceDocId) {
          batch.update(doc(db, "vehicleIssues", originalHistoryItem.sourceDocId), {
            "maintenance.completionNote": trimmedNote,
            updatedAt: serverTimestamp(),
          });
        }

        if (
          originalHistoryItem?.source === "vehicleChecks" &&
          originalHistoryItem?.sourceDocId &&
          Number.isInteger(originalHistoryItem?.itemIndex)
        ) {
          const checkRef = doc(db, "vehicleChecks", originalHistoryItem.sourceDocId);
          const checkSnap = await getDoc(checkRef);
          if (checkSnap.exists()) {
            const check = checkSnap.data();
            const items = Array.isArray(check.items) ? [...check.items] : [];
            if (items[originalHistoryItem.itemIndex]) {
              items[originalHistoryItem.itemIndex] = {
                ...items[originalHistoryItem.itemIndex],
                maintenance: {
                  ...(items[originalHistoryItem.itemIndex].maintenance || {}),
                  completionNote: trimmedNote,
                },
              };
              batch.update(checkRef, {
                items,
                updatedAt: serverTimestamp(),
              });
            }
          }
        }
      }

      await batch.commit();
      setDefect((current) =>
        current ? { ...current, completionNote: trimmedNote } : current
      );
      setEditModalVisible(false);
    } catch (err) {
      console.error("Failed to update resolved defect:", err);
      Alert.alert("Error", "Could not update this resolved defect.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell header={{
      variant: "compact",
      title: "Resolved Defect",
      subtitle: "View what was reported and what was done.",
      onBack: router.back,
    }}>


      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryAction} />
        </View>
      ) : !defect ? (
        <View style={styles.center}>
          <Icon name="alert-circle" size={28} color={COLORS.textMid} />
          <Text tone={"primary"} style={[styles.emptyTitle]}>
            Defect not available
          </Text>
          <Text
            tone={"muted"} style={[
              styles.emptyText,
            ]}
          >
            The resolved defect could not be found.
          </Text>
        </View>
      ) : (
        <>
          <SectionCard
            tone="subtle" layoutStyle={styles.card}
          >
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text tone={"primary"} style={[styles.title]}>
                  {defect.title}
                </Text>
                {!!defect.vehicle && (
                  <Text
                    tone={"muted"} style={[
                      styles.vehicleText,
                    ]}
                  >
                    {defect.vehicle}
                  </Text>
                )}
              </View>
              <View style={styles.resolvedBadge}>
                <Icon name="check-circle" size={14} color={COLORS.primaryAction} />
                <Text style={styles.resolvedBadgeText}>Resolved</Text>
              </View>
            </View>

            {!!defect.completionNote && (
              <NoteField label="Work completed" value={defect.completionNote} />
            )}

            {!!defect.description && (
              <NoteField label="Original defect" value={defect.description} />
            )}

            <Divider variant="record" layoutStyle={styles.divider} />

            <Field label="Source" value={defect.sourceLabel || "-"} />
            {!!defect.category && <Field label="Priority" value={defect.category} />}
            {!!defect.reporter && <Field label="Reporter" value={defect.reporter} />}
            {!!defect.jobNumber && <Field label="Job number" value={defect.jobNumber} />}
            <Field label="Reported" value={formatDate(defect.reportedAt) || "-"} />
            <Field label="Completed" value={formatDate(defect.completedAt) || "-"} />
          </SectionCard>

          <TouchableOpacity
            style={[
              styles.editButton,
              { borderColor: COLORS.primaryAction },
              saving && { opacity: 0.6 },
            ]}
            onPress={openEdit}
            disabled={saving}
            activeOpacity={0.9}
          >
            <Icon
              name="edit-2"
              size={17}
              color={COLORS.primaryAction}
              style={{ marginRight: t.spacing.xs }}
            />
            <Text style={styles.editButtonText}>Edit completion note</Text>
          </TouchableOpacity>

          <AppModal
            visible={editModalVisible}
            title="Edit completion note"
            busy={saving}
            onRequestClose={() => {
              if (!saving) setEditModalVisible(false);
            }}
            actions={
              <>
                <AppButton label="Cancel" variant="secondary" onPress={() => setEditModalVisible(false)} disabled={saving} />
                <AppButton label="Save" onPress={saveCompletionNote} loading={saving} />
              </>
            }
          >
                <Text
                  tone={"muted"} style={[
                    styles.modalSubtitle,
                  ]}
                >
                  Update what was done to resolve this defect.
                </Text>
                <TextArea
                  label="Completion note"
                  value={editCompletionNote}
                  onChangeText={setEditCompletionNote}
                  placeholder="What was done?"
                />
          </AppModal>
        </>
      )}
    </PageShell>
  );
}



function NoteField({ label, value }) {


  return (
    <View style={styles.noteField}>
      <Text tone={"muted"} style={[styles.noteLabel]}>
        {label}
      </Text>
      <Text tone={"primary"} style={[styles.noteValue]}>
        {value || "-"}
      </Text>
    </View>
  );
}

