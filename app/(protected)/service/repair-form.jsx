import AssetSelectField from "../../../components/ui/AssetSelectField";
import { styles } from "../../../lib/design/screenStyles/service-repair-form-jsx.js";
import { AppButton, AppText as Text, AppPressable as TouchableOpacity, DateField, FormField, TextArea } from "../../../components/ui/AppPrimitives";

import { useLocalSearchParams,
  useNavigation,
  useRouter } from "expo-router";
import {
  collection,
  doc,
  } from "firebase/firestore";
import { useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
  Alert,
  Platform,
  View } from "react-native";

import { db } from "../../../firebaseConfig";
import {
  getVehicleManufacturer,
  getVehicleMileage,
  getVehicleName,
  getVehicleRegistration,
} from "../../../lib/fleetSchema";
import { useServiceCacheActions, useServiceCollectionReader } from "../../../hooks/useServiceData";
import { submitOrQueueWorkshopRecord } from "../../../lib/workshopSubmissionApi";
import { useAuth } from "../../../providers/AuthProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { designTokens as t } from "../../../lib/design/tokens";
import PageShell from "../../../components/layout/PageShell";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RepairFormRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const readServiceCollection = useServiceCollectionReader();
  const { upsertServiceRow, patchServiceRow } = useServiceCacheActions();
  const allowLeaveRef = useRef(false);
  const submissionRef = useRef(null);
  const { employee } = useAuth();

  const initialVehicleId = params.vehicleId || params.id || null;
  const initialVehicleName = params.vehicleName || params.name || "";
  const initialRegistration = params.registration || params.reg || "";

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    initialVehicleId ? String(initialVehicleId) : null
  );
  const [vehicleCollapsed, setVehicleCollapsed] = useState(!!initialVehicleId);
  const [vehicleDetailsOpen, setVehicleDetailsOpen] = useState(
    !initialVehicleId && Boolean(initialVehicleName || initialRegistration)
  );

  const [vehicleName, setVehicleName] = useState(String(initialVehicleName || ""));
  const [registration, setRegistration] = useState(
    String(initialRegistration || "")
  );
  const [repairDate, setRepairDate] = useState(todayISO());
  const [summary, setSummary] = useState("");
  const [reason, setReason] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [mileage, setMileage] = useState("");
  const [completedBy, setCompletedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [userEdited, setUserEdited] = useState(false);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoadingVehicles(true);
        const rows = await readServiceCollection("vehicles", {
          orderByField: "name",
        });
        const list = rows.map((data) => {
          return {
            id: data.id,
            name: getVehicleName(data) || "Unnamed vehicle",
            reg: getVehicleRegistration(data) || "",
            manufacturer: getVehicleManufacturer(data) || "",
            model: data.model || "",
            mileage: getVehicleMileage(data),
          };
        });
        setVehicles(list);
      } catch (err) {
        console.error("Failed to load vehicles for repair form:", err);
        Alert.alert("Error", "Could not load vehicles.");
      } finally {
        setLoadingVehicles(false);
      }
    };

    loadVehicles();
  }, [readServiceCollection]);


  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const hasUnsavedChanges = userEdited;

  useEffect(() => {
    if (!selectedVehicle) return;
    setVehicleName(selectedVehicle.name || "");
    setRegistration(selectedVehicle.reg || "");
    setMileage((prev) => prev || (selectedVehicle.mileage ? String(selectedVehicle.mileage) : ""));
  }, [selectedVehicle]);

  const handleSelectVehicle = (id) => {
    setUserEdited(true);
    setSelectedVehicleId(id);
    setVehicleCollapsed(true);
    setVehicleDetailsOpen(false);
  };

  const handleAddNewVehicle = () => {
    setUserEdited(true);
    setSelectedVehicleId(null);
    setVehicleCollapsed(false);
    setVehicleName("");
    setRegistration("");
    setMileage("");
    setVehicleDetailsOpen(true);
  };

  const updateField = (setter) => (value) => {
    setUserEdited(true);
    setter(value);
  };

  const confirmLeave = (onLeave) => {
    if (!hasUnsavedChanges || allowLeaveRef.current) {
      onLeave();
      return;
    }

    Alert.alert(
      "Discard repair?",
      "You have unsaved repair details. Leave without saving?",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            allowLeaveRef.current = true;
            onLeave();
          },
        },
      ]
    );
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (!hasUnsavedChanges || allowLeaveRef.current) return;

      event.preventDefault();
      Alert.alert(
        "Discard repair?",
        "You have unsaved repair details. Leave without saving?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              allowLeaveRef.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [hasUnsavedChanges, navigation]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges || allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    const repairSummary = summary.trim();
    const effectiveVehicleId = selectedVehicleId || null;
    if (params.workshopRequestId && String(effectiveVehicleId) !== String(initialVehicleId)) {
      Alert.alert("Wrong vehicle", "Complete this request for its selected vehicle.");
      return;
    }
    const odoNumber = mileage.trim() ? Number(mileage.trim()) : null;

    if (!effectiveVehicleId && !vehicleName.trim() && !registration.trim()) {
      Alert.alert(
        "Vehicle details",
        "Select a vehicle or enter at least a vehicle name or registration."
      );
      return;
    }

    if (!repairSummary) {
      Alert.alert(
        "Repair summary",
        "Add a short summary, for example replaced headlight due to damage."
      );
      return;
    }

    if (odoNumber !== null && Number.isNaN(odoNumber)) {
      Alert.alert("Mileage", "Mileage must be a number.");
      return;
    }

    try {
      setSaving(true);
      const v = selectedVehicle;
      const companyId = employee?.companyId;
      if (!companyId) throw new Error("Your company could not be verified. Sign in again before saving.");
      const record = {
        companyId,
        ...(params.workshopRequestId ? { workshopRequestId: String(params.workshopRequestId), workshopWorkType: "general_repair" } : {}),
        vehicleId: effectiveVehicleId,
        vehicleName: vehicleName.trim(),
        registration: registration.trim(),
        manufacturer: v?.manufacturer || "",
        model: v?.model || "",
        serviceType: "General repair",
        recordType: "repair",
        serviceDate: repairDate,
        serviceDateOnly: repairDate,
        completedDate: repairDate,
        odometer: odoNumber,
        workSummary: repairSummary,
        repairSummary,
        repairReason: reason.trim(),
        partsUsed: partsUsed.trim(),
        extraNotes: notes.trim(),
        signedBy: completedBy.trim(),
        completedBy: completedBy.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const repairRecordRef = submissionRef.current || (submissionRef.current = params.workshopRequestId ? doc(db, "serviceRecords", String(params.workshopRequestId)) : doc(collection(db, "serviceRecords")));
      const result = await submitOrQueueWorkshopRecord({ recordId: repairRecordRef.id, record, defects: [] });
      const { queued } = result;
      await Promise.allSettled([
        upsertServiceRow("serviceRecords", { ...(result.record || record), id: repairRecordRef.id }),
        ...(effectiveVehicleId && result.vehiclePatch ? [patchServiceRow("vehicles", effectiveVehicleId, result.vehiclePatch)] : []),
      ]);

      Alert.alert(
        queued ? "Saved offline" : "Repair saved",
        queued
          ? "No internet right now. This repair will upload automatically when internet returns."
          : "The general repair has been recorded.",
        [
        {
          text: "OK",
          onPress: () => {
            allowLeaveRef.current = true;
            router.back();
          },
        },
      ]);
    } catch (err) {
      console.error("Failed to save repair record:", err);
      Alert.alert("Error", err.message || "Could not save this repair. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const themedLabel = { color: colors.textMuted };

  return (
    <PageShell mode="form" width="form" header={{
      variant: "compact",
      title: "General repairs",
      subtitle: "Record ad-hoc repairs and rectification work against a vehicle.",
      onBack: () => confirmLeave(() => router.back()),
    }}>


      <>
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Vehicle
          </Text>
          {vehicleCollapsed && selectedVehicle ? (
            <TouchableOpacity
              onPress={() => { setVehicleCollapsed(false); setVehicleDetailsOpen(false); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.sectionHint, { color: colors.accent }]}>
                Change
              </Text>
            </TouchableOpacity>
          ) : loadingVehicles ? (
            <Text style={[styles.sectionHint, themedLabel]}>Loading fleet...</Text>
          ) : null}
        </View>

        <View style={styles.flatSectionContent}>
          {vehicleCollapsed && selectedVehicle ? (
            <>
              <Text style={[styles.labelSmall, themedLabel]}>Selected vehicle</Text>
              <View style={styles.selectedVehicleRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    tone={"primary"} style={[
                      styles.vehicleName,
                    ]}
                  >
                    {vehicleName || selectedVehicle.name || "Unnamed vehicle"}
                  </Text>
                  <Text style={[styles.vehicleReg, themedLabel]}>
                    {registration || selectedVehicle.reg || "-"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={vehicleDetailsOpen ? "Hide vehicle details" : "Show vehicle details"}
                accessibilityState={{ expanded: vehicleDetailsOpen }}
                onPress={() => setVehicleDetailsOpen((open) => !open)}
                style={styles.vehicleDetailsToggle}
              >
                <Text variant="link">{vehicleDetailsOpen ? "Hide vehicle details" : "Vehicle details"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <AssetSelectField
                hideLabel
                records={vehicles}
                value={selectedVehicleId}
                onChange={handleSelectVehicle}
                loading={loadingVehicles}
                testID="service-vehicle-select"
              />
              {!vehicleDetailsOpen && !params.workshopRequestId ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Enter new vehicle"
                  onPress={handleAddNewVehicle}
                  style={styles.vehicleDetailsToggle}
                >
                  <Text variant="link">Enter new vehicle</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {vehicleDetailsOpen ? <>
          <FormField
            label="Vehicle name"
            layoutStyle={{ marginTop: t.spacing.sm }}
            placeholder="e.g. Amarok, Silverado..."
            value={vehicleName}
            onChangeText={updateField(setVehicleName)}
          />

          <FormField
            label="Registration"
            placeholder="e.g. AB12 CDE"
            value={registration}
            onChangeText={updateField(setRegistration)}
          />
          </> : null}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Repair details
          </Text>
        </View>

        <View style={styles.flatSectionContent}>

          <DateField
            label="Date completed"
            placeholder="DD-MM-YYYY"
            value={repairDate}
            onChange={updateField(setRepairDate)}
          />

          <TextArea
            label="Repair summary"
            placeholder="e.g. Replaced headlight due to damage"
            value={summary}
            onChangeText={updateField(setSummary)}
          />

          <TextArea
            label="Reason / fault"
            placeholder="Damage, failed bulb, customer request, wear and tear..."
            value={reason}
            onChangeText={updateField(setReason)}
          />

          <FormField
            label="Parts used"
            placeholder="e.g. N/S headlight unit, bulb, clips"
            value={partsUsed}
            onChangeText={updateField(setPartsUsed)}
          />

          <FormField
            label="Mileage"
            placeholder="Current mileage"
            value={mileage}
            onChangeText={updateField(setMileage)}
            inputProps={{ keyboardType: "numeric" }}
          />

          <FormField
            label="Completed by"
            placeholder="Technician name"
            value={completedBy}
            onChangeText={updateField(setCompletedBy)}
          />

          <TextArea
            label="Additional notes"
            placeholder="Anything useful for future reference..."
            value={notes}
            onChangeText={updateField(setNotes)}
          />
        </View>

        <AppButton
          label="Save repair"
          icon="check-circle"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          fullWidth
        />
      </>
    </PageShell>
  );
}
