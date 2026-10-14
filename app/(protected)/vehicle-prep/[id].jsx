import { vehiclePrepPalette as COLORS, routeColors } from "../../../lib/design/routePresentation/vehicle-prep-id-jsx.js";
import { styles } from "../../../lib/design/screenStyles/vehicle-prep-id-jsx.js";
import { AppText as Text, AppPressable as TouchableOpacity, TextArea, AppButton, SectionCard } from "../../../components/ui/AppPrimitives";
// app/(protected)/service/vehicle-prep.jsx
import {
  useLocalSearchParams,
  useRouter } from "expo-router";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { useTheme } from "../../../providers/ThemeProvider";
import { designTokens as t } from "../../../lib/design/tokens";
import PageShell from "../../../components/layout/PageShell";
import { db } from "../../../firebaseConfig";
import { useVehiclePrepResource } from "../../../hooks/useVehiclePrepResource";
import { commitVehiclePrepStatus, commitVehiclePrepChecklist, sharedPrepWritesEnabled } from "../../../lib/vehiclePrepMutation";
import { supersedePrepConflicts } from "../../../lib/sync/outbox";
import { runOrQueueFirestoreMutation } from "../../../lib/sync/firestoreQueue";
import {
  buildVehiclePrepRecordId,
  findVehiclePrepRecord,
  resolveVehiclePrepCompletion,
} from "../../../lib/vehiclePrep";
import { prepRecordVersion } from "../../../lib/vehiclePrepStatus";
import { useAuth } from "../../../providers/AuthProvider";

export const DEFAULT_CHECKS = [
  "Exterior walk-around (damage / dents)",
  "Tyres & tread depth checked",
  "Fluids (oil / screenwash / coolant)",
  "Lights & indicators working",
  "Number plates & tax disk visible",
  "Safety kit loaded (cones / triangles / hi-vis)",
  "In-vehicle documents (insurance / breakdown)",
  "Fuel level OK for job",
];

export default function VehiclePrepScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { user, employee } = useAuth();
  const prepRecordsResource = useVehiclePrepResource();

  /* ---------- CHECKLIST STATE ---------- */

  const [checks, setChecks] = useState(
    DEFAULT_CHECKS.map((label, idx) => ({ id: `check-${idx}`, label, done: false }))
  );

  /* ---------- EQUIPMENT PARSING ---------- */

  const rawEquipment =
    params.equipment || params.equipmentList || params.equipmentNames || "";

  const initialEquipmentChecks = (() => {
    if (!rawEquipment) return [];

    let items = [];

    if (Array.isArray(rawEquipment)) items = rawEquipment;
    else if (typeof rawEquipment === "string") {
      const trimmed = rawEquipment.trim();
      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);
        items = Array.isArray(parsed) ? parsed : trimmed.split(/[;,]/);
      } catch {
        items = trimmed.split(/[;,]/);
      }
    }

    return items
      .map((x, idx) => ({
        id: `equip-${idx}`,
        label: String(x || "").trim(),
        done: false,
      }))
      .filter((x) => x.label);
  })();

  const [equipmentChecks, setEquipmentChecks] = useState(initialEquipmentChecks);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [hydratedRecordId, setHydratedRecordId] = useState("");

  /* ---------- PARAMS ---------- */

  const paramValue = (value) => String(Array.isArray(value) ? value[0] || "" : value || "");
  const vehicleId = paramValue(params.vehicleId || params.id);
  const bookingId = paramValue(params.bookingId);
  const vehicleName = paramValue(params.vehicleName);
  const registration = paramValue(params.registration);
  const dateStr = paramValue(params.date);
  const prepRecordId = useMemo(
    () => buildVehiclePrepRecordId(bookingId, vehicleId),
    [bookingId, vehicleId]
  );
  const existingRecord = useMemo(
    () =>
      findVehiclePrepRecord(prepRecordsResource.data, {
        companyId: employee?.companyId,
        bookingId,
        vehicleId,
        date: dateStr,
      }),
    [bookingId, dateStr, prepRecordsResource.data, vehicleId, employee?.companyId]
  );

  const [draftBasis, setDraftBasis] = useState({ revision: 0, version: null });
  const staleDraft = existingRecord && hydratedRecordId === existingRecord.id && draftBasis.version !== prepRecordVersion(existingRecord);

  const dateLabel = dateStr
    ? new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  /* ---------- LOGIC ---------- */

  const toggleCheck = (id) =>
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));

  const toggleEquipmentCheck = (id) =>
    setEquipmentChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    );

  const allVehicleChecksDone = checks.every((c) => c.done);
  const allEquipmentDone =
    equipmentChecks.length === 0 || equipmentChecks.every((c) => c.done);

  const allDone = allVehicleChecksDone && allEquipmentDone;

  useEffect(() => {
    if (!existingRecord || hydratedRecordId === existingRecord.id) return;

    const savedChecks = Array.isArray(existingRecord.checks) ? existingRecord.checks : [];
    setChecks(
      DEFAULT_CHECKS.map((label, idx) => {
        const id = `check-${idx}`;
        const saved = savedChecks.find((check) => check?.id === id || check?.label === label);
        return { id, label, done: saved?.done === true };
      })
    );
    if (Array.isArray(existingRecord.equipmentChecks)) {
      setEquipmentChecks(existingRecord.equipmentChecks);
    }
    setNotes(String(existingRecord.notes || ""));
    setDraftBasis({ revision: existingRecord.statusRevision ?? 0, version: prepRecordVersion(existingRecord) });
    setHydratedRecordId(existingRecord.id);
  }, [existingRecord, hydratedRecordId]);

  const handleSave = async (markComplete) => {
    if (saving || (markComplete && !allDone)) return;

    setSaving(true);
    try {
      if (sharedPrepWritesEnabled) {
        if (!bookingId || !vehicleId || !employee?.companyId || !user?.uid) throw new Error("A saved booking, vehicle and company are required.");
        if (existingRecord?.pendingPrepStatus !== undefined && !existingRecord.prepConflict && markComplete) throw new Error("A preparation save is already pending. Wait for sync before saving completion again.");
        if (["error", "loading"].includes(prepRecordsResource.state) && markComplete) throw new Error("Refresh preparation from the server before marking it complete.");
        if (staleDraft) throw Object.assign(new Error("Preparation changed on another device. Reload saved preparation before saving again."), { code: "prep/conflict" });
        const checklistPatch = { vehicleName, registration, prepDate: dateStr, checks, equipmentChecks, notes: notes.trim() };
        const operation = {
          companyId: employee.companyId, bookingId, vehicleId,
          desiredCompleted: true, expectedRevision: draftBasis.revision, expectedRecordVersion: draftBasis.version,
          mutationId: `prep_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          actorUid: user.uid,
          attribution: { uid: user.uid, employeeId: employee.employeeId, name: employee.displayName || employee.name || "", code: employee.userCode || null },
          checklistPatch,
        };
        const result = markComplete
          ? await runOrQueueFirestoreMutation({ run: () => commitVehiclePrepStatus(operation), mutation: { operation: "prepStatus", docPath: `vehiclePrepRecords/${prepRecordId}`, data: operation, entityType: "vehiclePrepRecord", entityId: prepRecordId } })
          : await runOrQueueFirestoreMutation({ run: () => commitVehiclePrepChecklist(operation), mutation: { operation: "prepChecklist", docPath: `vehiclePrepRecords/${prepRecordId}`, data: operation, entityType: "vehiclePrepChecklist", entityId: prepRecordId } });
        await supersedePrepConflicts(operation, markComplete ? "prepStatus" : "prepChecklist");
        Alert.alert(result.queued ? "Save pending" : markComplete ? "Vehicle prepped" : "Prep saved", result.queued ? "Saved on this device. Completion is not server-confirmed until sync succeeds." : "Preparation saved to the server.", [{ text: "OK", onPress: () => router.back() }]);
        return;
      }
      const completed = resolveVehiclePrepCompletion(existingRecord, markComplete);
      const record = {
        companyId: String(employee?.companyId || "bickers-action"),
        bookingId,
        vehicleId,
        vehicleName,
        registration,
        prepDate: dateStr,
        checks,
        equipmentChecks,
        notes: notes.trim(),
        completed,
        completedAt: completed
          ? existingRecord?.completedAt || serverTimestamp()
          : null,
        completedByUid: completed
          ? existingRecord?.completedByUid || user?.uid || null
          : null,
        completedByEmployeeId: completed
          ? existingRecord?.completedByEmployeeId || employee?.employeeId || null
          : null,
        completedByName: completed
          ? existingRecord?.completedByName || employee?.displayName || employee?.name || ""
          : null,
        completedByCode: completed
          ? existingRecord?.completedByCode || employee?.userCode || null
          : null,
        createdAt: existingRecord?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const prepRef = doc(db, "vehiclePrepRecords", prepRecordId);
      const { queued } = await runOrQueueFirestoreMutation({
        run: () => setDoc(prepRef, record, { merge: true }),
        mutation: {
          operation: "set",
          docPath: `vehiclePrepRecords/${prepRecordId}`,
          data: record,
          options: { merge: true },
          entityType: "vehiclePrepRecord",
          entityId: prepRecordId,
        },
      });

      await prepRecordsResource.upsertRow({
        ...record,
        id: prepRecordId,
        completed: queued ? existingRecord?.completed === true : completed,
        ...(queued ? { pendingPrepStatus: completed } : {}),
        completedAt: completed ? existingRecord?.completedAt || new Date() : null,
        updatedAt: new Date(),
      });

      Alert.alert(
        queued ? "Saved offline" : markComplete ? "Vehicle prepped" : "Prep saved",
        queued
          ? "This preparation will sync automatically when the connection returns."
          : markComplete
          ? "This vehicle is now marked as prepped for the job."
          : "Your progress has been saved.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Failed to save vehicle preparation:", error);
      Alert.alert("Couldn’t save preparation", error?.code === "prep/conflict" ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const reloadSavedPreparation = async () => { await prepRecordsResource.refresh(); setHydratedRecordId(""); };
  return <VehiclePrepForm {...{ staleDraft, reloadSavedPreparation, colors, checks, equipmentChecks, notes, setNotes, toggleCheck, toggleEquipmentCheck, saving, allDone, handleSave, vehicleName, registration, dateLabel, existingRecord, router }} />;
}

export function VehiclePrepForm({ staleDraft, reloadSavedPreparation, colors, checks, equipmentChecks, notes, setNotes, toggleCheck, toggleEquipmentCheck, saving, allDone, handleSave, vehicleName, registration, dateLabel, existingRecord, router }) {
  return (
    <PageShell appearance="grouped" mode="form" width="form" header={{
      variant: "compact",
      title: "Vehicle prep",
      subtitle: "Tick off checks before this vehicle leaves the yard.",
      onBack: router.back,
    }}>
      {/* HEADER */}


      <>
        {/* SUMMARY CARD */}
        {staleDraft || existingRecord?.prepConflict ? <Text tone="warning">Preparation changed on another device. Refresh and review before saving again.</Text> : existingRecord?.pendingPrepStatus !== undefined || existingRecord?.hasPendingWrites ? <Text tone="warning">Save pending — awaiting server confirmation.</Text> : existingRecord?.prepReadState === "cached" ? <Text tone="muted">Saved preparation — awaiting server confirmation.</Text> : null}
        {staleDraft || existingRecord?.prepConflict ? <AppButton variant="secondary" label="Reload saved preparation (replaces unsaved edits)" onPress={reloadSavedPreparation} /> : null}
        <SectionCard tone="grouped" layoutStyle={styles.summaryCard}>
          <Text
            tone={"muted"} style={[styles.summaryLabel]}
          >
            Vehicle
          </Text>

          <Text
            tone={"primary"} style={[styles.summaryMain]}
          >
            {vehicleName}
            {registration ? ` · ${registration}` : ""}
          </Text>

          {!!dateLabel && (
            <>
              <Text
                tone={"muted"} style={[
                  styles.summaryLabel,
                  { marginTop: t.spacing.xs },
                ]}
              >
                Going out
              </Text>
              <Text
                tone={"muted"} style={[styles.summaryDate]}
              >
                {dateLabel}
              </Text>
            </>
          )}

          {existingRecord?.completed && existingRecord?.prepReadState === "ready" && existingRecord?.pendingPrepStatus === undefined && !existingRecord?.hasPendingWrites ? (
            <View
              style={[
                styles.completionMeta,
                {
                  backgroundColor: colors.successSoft,
                  borderColor: colors.success,
                },
              ]}
            >
              <Icon name="check-circle" size={16} color={colors.success} />
              <View style={styles.completionMetaCopy}>
                <Text tone={"success"} style={[styles.completionMetaTitle]}>Prepped</Text>
                <Text tone={"muted"} style={[styles.completionMetaText]}>
                  {existingRecord.completedByName
                    ? `Completed by ${existingRecord.completedByName}${
                        existingRecord.completedByCode
                          ? ` · ${existingRecord.completedByCode}`
                          : ""
                      }`
                    : "Completion recorded"}
                </Text>
              </View>
            </View>
          ) : null}
        </SectionCard>

        {/* SECTION HEADER */}
        <View style={styles.sectionHeaderRow}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            Prep checks
          </Text>
          <Text
            tone={"muted"} style={[styles.sectionSubtitle]}
          >
            Tap to mark complete / reopen.
          </Text>
        </View>

        {/* CHECKLIST CARD */}
        <SectionCard tone="grouped" layoutStyle={styles.card}>
          {checks.map((c, idx) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.checkRow,
                {
                  borderTopColor: colors.border || COLORS.border,
                  borderTopWidth: idx === 0 ? 0 : 1,
                },
                c.done && { opacity: 0.5 },
              ]}
              onPress={() => toggleCheck(c.id)}
              activeOpacity={0.8}
            >
              <View style={styles.checkIconWrap}>
                {c.done ? (
                  <View
                    style={[
                      styles.checkFilled,
                      { backgroundColor: colors.accent || COLORS.primaryAction },
                    ]}
                  >
                    <Icon name="check" size={14} color={routeColors.hex_fff_yhjmu8} />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.checkEmpty,
                      { borderColor: colors.textMuted || COLORS.textMid },
                    ]}
                  />
                )}
              </View>

              <Text
                tone={(c.done) ? "muted" : ("primary")} style={[
                  styles.checkLabel,
                  null,
                  c.done && { textDecorationLine: "line-through" },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </SectionCard>

        {/* EQUIPMENT SECTION */}
        {equipmentChecks.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text
                tone={"primary"} style={[
                  styles.sectionTitle,
                ]}
              >
                Equipment load-out
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.sectionSubtitle,
                ]}
              >
                Confirm all job kit is loaded.
              </Text>
            </View>

            <SectionCard tone="grouped" layoutStyle={styles.card}>
              {equipmentChecks.map((c, idx) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.checkRow,
                    {
                      borderTopColor: colors.border || COLORS.border,
                      borderTopWidth: idx === 0 ? 0 : 1,
                    },
                    c.done && { opacity: 0.5 },
                  ]}
                  onPress={() => toggleEquipmentCheck(c.id)}
                >
                  <View style={styles.checkIconWrap}>
                    {c.done ? (
                      <View
                        style={[
                          styles.checkFilled,
                          { backgroundColor: colors.accent || COLORS.primaryAction },
                        ]}
                      >
                        <Icon name="check" size={14} color={routeColors.hex_fff_yhjmu8} />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.checkEmpty,
                          { borderColor: colors.textMuted || COLORS.textMid },
                        ]}
                      />
                    )}
                  </View>

                  <Text
                    tone={(c.done) ? "muted" : ("primary")} style={[
                      styles.checkLabel,
                      null,
                      c.done && { textDecorationLine: "line-through" },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </SectionCard>
          </>
        )}

        {/* NOTES */}
        <View style={styles.sectionHeaderRow}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            Notes
          </Text>
          <Text
            tone={"muted"} style={[styles.sectionSubtitle]}
          >
            Damage, missing kit, or anything unusual.
          </Text>
        </View>

        <SectionCard tone="grouped" layoutStyle={styles.card}>
          <TextArea
            label="Notes"
            placeholder="e.g. Small scuff on rear bumper."
            value={notes}
            onChangeText={setNotes}
          />
        </SectionCard>

        {/* ACTION BUTTONS */}
        <View style={styles.buttonRow}>
          <AppButton
            label="Save & back"
            variant="secondary"
            onPress={() => handleSave(false)}
            disabled={saving}
            layoutStyle={styles.secondaryActionLayout}
          />
          <AppButton
            label={existingRecord?.completed ? "Update preparation" : "Mark vehicle prepped"}
            icon="check-circle"
            onPress={() => handleSave(true)}
            disabled={!allDone || saving}
            loading={saving}
            layoutStyle={styles.primaryActionLayout}
          />
        </View>

        <View style={{ height: 40 }} />
      </>
    </PageShell>
  );
}

/* ---------- STYLES MATCH SERVICE-LIST EXACTLY ---------- */
