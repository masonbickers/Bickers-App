import { createWorkshopPhotoUploader } from "../../../lib/workshopPhotoUpload";
import AssetSelectField from "../../../components/ui/AssetSelectField";
import { routeColors } from "../../../lib/design/routePresentation/service-defect-form-jsx.js";
import { styles } from "../../../lib/design/screenStyles/service-defect-form-jsx.js";
import { AppButton, AppText as Text, AppPressable as TouchableOpacity, Checkbox, FormField, SegmentedControl, TextArea } from "../../../components/ui/AppPrimitives";

// app/(protected)/service/defect-form.jsx
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams,
  useNavigation,
  useRouter } from "expo-router";
import { useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import {
    collection,
    doc,
    serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../../../firebaseConfig";
import {
  getVehicleManufacturer,
  getVehicleName,
  getVehicleRegistration,
} from "../../../lib/fleetSchema";
import { useServiceCacheActions, useServiceCollectionReader } from "../../../hooks/useServiceData";
import { submitOrQueueWorkshopRecord } from "../../../lib/workshopSubmissionApi";
import { useAuth } from "../../../providers/AuthProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { designTokens as t } from "../../../lib/design/tokens";
import PageShell from "../../../components/layout/PageShell";

function isDownloadUrl(uri) {
  return typeof uri === "string" && /^https?:\/\//i.test(uri);
}

function sanitizeStorageSegment(value) {
  return String(value || "item")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

async function ensureUploadableImageUri(uri) {
  if (!uri || isDownloadUrl(uri)) return uri;

  try {
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manip?.uri || uri;
  } catch {
    return uri;
  }
}

async function uploadImageUri(uri, path) {
  if (isDownloadUrl(uri)) return uri;

  const uploadableUri = await ensureUploadableImageUri(uri);
  const response = await fetch(uploadableUri);
  if (!response.ok) {
    throw new Error("Could not read selected photo for upload.");
  }

  const blob = await response.blob();
  const storageRef = ref(storage, path);

  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type || "image/jpeg",
    });
    task.on("state_changed", undefined, reject, resolve);
  });

  return getDownloadURL(storageRef);
}

async function uploadPhotoList(uris, basePath, uploadPhoto) {
  const uploaded = [];
  const photoUris = Array.isArray(uris) ? uris.filter(Boolean) : [];

  for (const uri of photoUris) {
    if (isDownloadUrl(uri)) {
      uploaded.push(uri);
      continue;
    }

    uploaded.push(await uploadPhoto(uri, basePath));
  }

  return uploaded;
}

export default function DefectFormScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const readServiceCollection = useServiceCollectionReader();
  const { upsertServiceRow, patchServiceRow } = useServiceCacheActions();
  const params = useLocalSearchParams();
  const { employee } = useAuth();
  const defectRecordRef = useRef(null);
  if (!defectRecordRef.current) defectRecordRef.current = doc(collection(db, "defectReports"));
  const photoUploaderRef = useRef(null);
  if (!photoUploaderRef.current) photoUploaderRef.current = createWorkshopPhotoUploader(uploadImageUri);
  const allowLeaveRef = useRef(false);

  const initialVehicleName = params.vehicleName || params.name || "";
  const initialReg = params.registration || params.reg || "";
  const initialVehicleId = params.vehicleId || params.id || null;

  // VEHICLE STATE
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState(
    initialVehicleId ? String(initialVehicleId) : null
  );
  const [vehicleCollapsed, setVehicleCollapsed] = useState(!!initialVehicleId);
  const [vehicleDetailsOpen, setVehicleDetailsOpen] = useState(
    !initialVehicleId && Boolean(initialVehicleName || initialReg)
  );

  // Manual fields (still allowed but auto-filled from vehicle)
  const [vehicleName, setVehicleName] = useState(initialVehicleName);
  const [registration, setRegistration] = useState(initialReg);

  // DEFECT FIELDS
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Immediate"); // Immediate / General
  const [offRoad, setOffRoad] = useState(false);
  const [reportedBy, setReportedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]); // array of URIs

  const [saving, setSaving] = useState(false);

  /* ---------------- LOAD VEHICLES (same pattern as minor-service) ---------------- */

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
          };
        });
        setVehicles(list);
      } catch (err) {
        console.error("Failed to load vehicles for defect form:", err);
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

  const hasUnsavedChanges = useMemo(
    () =>
      String(selectedVehicleId || "") !== String(initialVehicleId || "") ||
      vehicleName.trim() !== String(initialVehicleName || "").trim() ||
      registration.trim() !== String(initialReg || "").trim() ||
      !!location.trim() ||
      !!description.trim() ||
      severity !== "Immediate" ||
      offRoad ||
      !!reportedBy.trim() ||
      !!notes.trim() ||
      photos.length > 0,
    [
      description,
      initialReg,
      initialVehicleId,
      initialVehicleName,
      location,
      notes,
      offRoad,
      photos.length,
      registration,
      reportedBy,
      selectedVehicleId,
      severity,
      vehicleName,
    ]
  );

  const confirmLeave = (onLeave) => {
    if (!hasUnsavedChanges || allowLeaveRef.current) {
      onLeave();
      return;
    }

    Alert.alert(
      "Leave defect report?",
      "You have unsaved defect details. Leave without saving?",
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
        "Leave defect report?",
        "You have unsaved defect details. Leave without saving?",
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

  // When a vehicle is selected, auto-fill the name/reg text fields
  useEffect(() => {
    if (!selectedVehicle) return;
    const name = selectedVehicle.name || "";
    const reg = selectedVehicle.reg || "";
    setVehicleName(name);
    setRegistration(reg);
  }, [selectedVehicle]);

  const handleSelectVehicle = (id) => {
    setSelectedVehicleId(id);
    setVehicleCollapsed(true);
    setVehicleDetailsOpen(false);
  };

  const handleAddNewVehicle = () => {
    setSelectedVehicleId(null);
    setVehicleCollapsed(false);
    setVehicleName("");
    setRegistration("");
    setVehicleDetailsOpen(true);
  };

  /* ---------------- PHOTOS ---------------- */

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (!result.canceled) {
        const uri =
          result.assets && result.assets.length
            ? result.assets[0].uri
            : null;
        if (uri) {
          setPhotos((prev) => [...prev, uri]);
        }
      }
    } catch (err) {
      console.error("Failed to pick photo:", err);
      Alert.alert("Error", "Could not open photo library.");
    }
  };

  const handleRemovePhoto = (uri) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  /* ---------------- SAVE ---------------- */

  const handleSave = async () => {
    if (saving) return;

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      Alert.alert("Missing description", "Add a short description of the defect.");
      return;
    }

    const effectiveVehicleId = selectedVehicleId || null;

    if (!vehicleName.trim() && !registration.trim() && !effectiveVehicleId) {
      Alert.alert(
        "Vehicle details",
        "Please select a vehicle from the list or enter at least a vehicle name/registration."
      );
      return;
    }

    try {
      setSaving(true);
      const defectRef = defectRecordRef.current;
      if (!employee?.companyId) throw new Error("Your approved account is missing its company. Sign in again.");
      const vehicleSegment = sanitizeStorageSegment(
        effectiveVehicleId || registration || vehicleName || "unassigned"
      );
      let photoURLs = [];

      try {
        photoURLs = await uploadPhotoList(
          photos,
          `companies/${employee.companyId}/vehicles/${vehicleSegment}/defects/${defectRef.id}`,
          photoUploaderRef.current
        );
      } catch (uploadErr) {
        console.error("Failed to upload defect photos:", uploadErr);
        Alert.alert(
          "Photo upload failed",
          "Could not upload the defect photos. Please check your connection and try again."
        );
        return;
      }

      const payload = {
        companyId: employee?.companyId,
        vehicleId: effectiveVehicleId || null,
        vehicleName: vehicleName.trim(),
        registration: registration.trim(),
        location: location.trim(),
        description: trimmedDesc,
        severity,
        priority: severity === "Immediate" ? "high" : "medium",
        offRoad,
        reportedBy: reportedBy.trim(),
        notes: notes.trim(),
        status: "open",
        photoURIs: [],
        photoURLs,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const result = await submitOrQueueWorkshopRecord({ kind: "defect", recordId: defectRef.id, record: payload });
      const { queued } = result;
      await Promise.allSettled([
        upsertServiceRow("defectReports", { ...(result.record || payload), id: defectRef.id }),
        ...(result.vehiclePatch && effectiveVehicleId ? [patchServiceRow("vehicles", effectiveVehicleId, result.vehiclePatch)] : []),
      ]);

      Alert.alert(queued ? "Saved offline" : "Saved", queued
        ? "No internet right now. This defect report will upload automatically when internet returns."
        : "Defect report saved.", [
        {
          text: "OK",
          onPress: () => {
            allowLeaveRef.current = true;
            router.back();
          },
        },
      ]);
    } catch (err) {
      console.error("Failed to save defect report:", err);
      Alert.alert(
        "Error",
        err.message || "Could not save the defect report. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */

  const themedCard = {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  };
  const themedLabel = { color: colors.textMuted };

  return (
    <PageShell mode="form" width="form" header={{
      variant: "compact",
      title: "Defect report",
      subtitle: "Log issues reported by drivers or crew against a vehicle.",
      onBack: () => confirmLeave(() => router.back()),
    }}>
      {/* HEADER */}


      <>
        {/* VEHICLE SECTION – MATCH MINOR SERVICE STYLE */}
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
              <Text
                style={[styles.sectionHint, { color: colors.accent }]}
              >
                Change
              </Text>
            </TouchableOpacity>
          ) : loadingVehicles ? (
            <Text
              tone={"muted"} style={[
                styles.sectionHint,
              ]}
            >
              Loading fleet…
            </Text>
          ) : null}
        </View>

        <View style={styles.flatSectionContent}>
          {vehicleCollapsed && selectedVehicle ? (
            <>
              <Text style={[styles.labelSmall, themedLabel]}>
                Selected vehicle
              </Text>
              <View style={styles.selectedVehicleRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    tone={"primary"} style={[
                      styles.vehicleName,
                    ]}
                  >
                    {vehicleName || selectedVehicle.name || "Unnamed vehicle"}
                  </Text>
                  <Text
                    tone={"muted"} style={[
                      styles.vehicleReg,
                    ]}
                  >
                    {registration || selectedVehicle.reg || "—"}
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
              {!vehicleDetailsOpen ? (
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
            placeholder="e.g. Amarok, Silverado…"
            value={vehicleName}
            onChangeText={setVehicleName}
          />

          <FormField
            label="Registration"
            placeholder="e.g. AB12 CDE"
            value={registration}
            onChangeText={setRegistration}
          />
          </> : null}
        </View>

        {/* DEFECT DETAILS */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Defect details
          </Text>
        </View>

        <View style={styles.flatSectionContent}>
          <FormField
            label="Location on vehicle"
            placeholder="e.g. OSR wheel, front bumper, dash…"
            value={location}
            onChangeText={setLocation}
          />

          <TextArea
            label="Description"
            placeholder="Short summary of the issue…"
            value={description}
            onChangeText={setDescription}
          />

          <SegmentedControl
            options={[{ label: "Immediate", value: "Immediate" }, { label: "General", value: "General" }]}
            value={severity}
            onChange={setSeverity}
          />

          <Checkbox
            checked={offRoad}
            onChange={setOffRoad}
            label="Vehicle off road? If yes, treat as “do not drive / do not use” until cleared."
          />

          <FormField
            label="Reported by"
            placeholder="Driver / crew name"
            value={reportedBy}
            onChangeText={setReportedBy}
          />

          <TextArea
            label="Additional notes"
            placeholder="Any extra context, sounds, when it happens, etc."
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* PHOTOS */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Photos
          </Text>
        </View>

        <View style={[styles.card, themedCard]}>
          <Text style={[styles.photosHint, themedLabel]}>
            Add clear photos of the defect, damage or warning lights.
          </Text>

          <View style={styles.photoRow}>
            <TouchableOpacity
              style={[
                styles.addPhotoButton,
                {
                  backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                  borderColor: colors.border,
                },
              ]}
              onPress={handlePickPhoto}
              activeOpacity={0.9}
            >
              <Icon
                name="image"
                size={18}
                color={colors.text}
              />
              <Text
                tone={"primary"} style={[
                  styles.addPhotoText,
                ]}
              >
                Add photo
              </Text>
            </TouchableOpacity>
          </View>

          {photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: t.spacing.xs }}
            >
              {photos.map((uri) => (
                <View key={uri} style={styles.photoThumbWrapper}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(uri)}
                  >
                    <Icon name="x" size={12} color={routeColors.hex_fff_yhjmu8} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* SAVE BUTTON */}
        <AppButton
          label="Save defect"
          icon="save"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          fullWidth
        />

        <View style={{ height: 20 }} />
      </>
    </PageShell>
  );
}

/* ---------- STYLES ---------- */
