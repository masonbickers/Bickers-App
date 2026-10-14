import {
  AppButton,
  AppText as Text,
  Banner,
  FormStep,
  PageSection,
  SelectField,
  SectionCard,
  StateView,
  TextArea,
} from "../../components/ui/AppPrimitives";
import AssetSelectField from "../../components/ui/AssetSelectField";
// app/(protected)/vehicle-issues.js
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { ActionSheetIOS, Alert, Image, Platform, StyleSheet, View } from "react-native";

// 🔑 Firebase + Auth provider (paths for app/(protected)/*)
import PageShell from "../../components/layout/PageShell";
import { db, storage } from "../../firebaseConfig";
import { useEquipment, useVehicles } from "../../hooks/useOperationalData";
import { designTokens as t } from "../../lib/design/tokens";
import {
  maintenancePhotoPath,
  selectedMaintenancePhotoUri,
} from "../../lib/maintenancePhoto";
import {
  getEquipmentCategory,
  getEquipmentName,
  getVehicleDisplayLabel,
  getVehicleDisplayName,
  getVehicleRegistration,
} from "../../lib/fleetSchema";
import { useAuth } from "../../providers/AuthProvider";

const MAX_CHARS = 600;
const ASSET_TYPES = [
  { label: "Vehicle", value: "vehicle" },
  { label: "Equipment", value: "equipment" },
];

// normalise category
const normalizeCategory = (cat) => {
  if (typeof cat !== "string") return "Other";
  const c = cat.trim();
  return c.length ? c : "Other";
};

const getEquipmentIdentifier = (equipment) =>
  String(
    equipment?.serialNumber || equipment?.equipmentId || equipment?.asset || ""
  ).trim();

const getEquipmentDisplayLabel = (equipment) => {
  const name = String(getEquipmentName(equipment) || "Unnamed equipment").trim();
  const identifier = getEquipmentIdentifier(equipment);
  return identifier ? `${name} · ${identifier}` : name;
};

async function uploadMaintenancePhoto(uri, uid, issueId) {
  const processed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  const response = await fetch(processed?.uri || uri);
  if (!response.ok) throw new Error("The issue photo could not be prepared for upload.");

  const blob = await response.blob();
  const photoRef = ref(storage, maintenancePhotoPath(uid, issueId));
  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(photoRef, blob, { contentType: "image/jpeg" });
    task.on("state_changed", undefined, reject, resolve);
  });
  return getDownloadURL(photoRef);
}

export default function VehicleIssuesPage() {
  const router = useRouter();

  // ✅ mirror me.js
  const { employee, user, isAuthed, loading } = useAuth();
  const vehiclesResource = useVehicles();
  const equipmentResource = useEquipment();
  const vehicles = vehiclesResource.data;
  const equipment = equipmentResource.data;

  const [selectedAssetType, setSelectedAssetType] = useState("vehicle");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [issueText, setIssueText] = useState("");
  const [photoUri, setPhotoUri] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedVehicles = useMemo(
    () => vehicles.map((v) => ({ ...v, category: normalizeCategory(v.category) })),
    [vehicles]
  );

  // Fleet Vehicles are valid maintenance targets. This screen previously
  // filtered that category out, which left many employees with nothing to report.
  const reportableVehicles = normalizedVehicles;

  const normalizedEquipment = useMemo(
    () =>
      equipment.map((item) => ({
        ...item,
        category: normalizeCategory(getEquipmentCategory(item) || "Equipment"),
      })),
    [equipment]
  );

  const reportableAssets =
    selectedAssetType === "equipment" ? normalizedEquipment : reportableVehicles;
  const activeResource =
    selectedAssetType === "equipment" ? equipmentResource : vehiclesResource;
  const loadingAssets = activeResource.isInitialLoading;
  const assetLoadError = activeResource.error;

  const categories = useMemo(() => {
    const set = new Set(reportableAssets.map((asset) => asset.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [reportableAssets]);

  const filteredAssets = useMemo(() => {
    if (!selectedCategory) return [];
    return reportableAssets.filter((asset) => asset.category === selectedCategory);
  }, [reportableAssets, selectedCategory]);

  const selectedAssetRecord = useMemo(
    () => reportableAssets.find((asset) => asset.id === selectedAsset) || null,
    [reportableAssets, selectedAsset]
  );
  const selectedRegistration =
    selectedAssetType === "vehicle" ? getVehicleRegistration(selectedAssetRecord) : "";
  const selectedEquipmentIdentifier =
    selectedAssetType === "equipment"
      ? getEquipmentIdentifier(selectedAssetRecord)
      : "";

  const isValid =
    selectedCategory && selectedAsset && issueText.trim().length > 0;

  useEffect(() => {
    setSelectedCategory("");
    setSelectedAsset("");
  }, [selectedAssetType]);

  // clear vehicle when category changes
  useEffect(() => {
    setSelectedAsset("");
  }, [selectedCategory]);

  const applyPhotoResult = (result) => {
    const uri = selectedMaintenancePhotoUri(result);
    if (uri) setPhotoUri(uri);
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera access needed",
          "Allow camera access to photograph the maintenance issue."
        );
        return;
      }
      applyPhotoResult(
        await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          cameraType: ImagePicker.CameraType.back,
          quality: 0.9,
        })
      );
    } catch (error) {
      console.error("Failed to take maintenance photo:", error);
      Alert.alert("Camera unavailable", "The camera could not be opened. Please try again.");
    }
  };

  const choosePhoto = async () => {
    try {
      applyPhotoResult(
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: false,
          quality: 0.9,
        })
      );
    } catch (error) {
      console.error("Failed to choose maintenance photo:", error);
      Alert.alert("Photos unavailable", "The photo library could not be opened. Please try again.");
    }
  };

  const showPhotoSelector = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: photoUri ? "Replace issue photo" : "Add issue photo",
          options: ["Take Photo", "Choose from Photo Library", "Cancel"],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) takePhoto();
          if (buttonIndex === 1) choosePhoto();
        }
      );
      return;
    }
    Alert.alert(photoUri ? "Replace issue photo" : "Add issue photo", undefined, [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Photo Library", onPress: choosePhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const reportIssue = async () => {
    if (!isValid) {
      Alert.alert(
        "Missing info",
        "Please complete all fields before submitting."
      );
      return;
    }
    try {
      setSubmitting(true);
      const asset = reportableAssets.find((item) => item.id === selectedAsset);
      const companyId = String(employee?.companyId || "").trim();
      if (!asset) {
        throw new Error("The selected asset is no longer available.");
      }
      if (!companyId) {
        throw new Error("The employee account is not linked to a company.");
      }
      const reporterName =
        employee?.name ||
        employee?.displayName ||
        user?.displayName ||
        "Unknown";
      const reporterCode = employee?.userCode || "N/A";
      const reporterUid = user?.uid || "N/A";
      if (!user?.uid) throw new Error("The signed-in account could not be verified.");

      const issueRef = doc(collection(db, "vehicleIssues"));
      let photoURL = "";
      if (photoUri) {
        photoURL = await uploadMaintenancePhoto(photoUri, user.uid, issueRef.id);
      }

      await setDoc(issueRef, {
        companyId,
        assetType: selectedAssetType,
        assetId: asset.id,
        assetName:
          selectedAssetType === "equipment"
            ? getEquipmentName(asset) || "Unnamed equipment"
            : getVehicleDisplayName(asset, vehicles),
        ...(selectedAssetType === "equipment"
          ? {
              equipmentDocId: asset.id,
              equipmentId: getEquipmentIdentifier(asset),
              equipmentName: getEquipmentName(asset) || "Unnamed equipment",
              serialNumber: String(asset.serialNumber || "").trim(),
              asset: String(asset.asset || "").trim(),
            }
          : {
              vehicleId: asset.id,
              vehicleName: getVehicleDisplayName(asset, vehicles),
              registration: getVehicleRegistration(asset),
            }),
        category: asset.category || "Other",
        description: issueText.trim(),
        // reporter meta (matches provider pattern)
        reporterName,
        reporterCode,
        reporterUid,
        photoURLs: photoURL ? [photoURL] : [],
        status: "open", // simple workflow
        createdAt: serverTimestamp(), // server time
      });

      Alert.alert(
        "✅ Issue reported",
        `Thanks! We logged an issue for ${
          selectedAssetType === "equipment"
            ? getEquipmentDisplayLabel(asset)
            : getVehicleDisplayLabel(asset, vehicles)
        }.`,
        [
          {
            text: "OK",
            onPress: () => {
              // clear form
              setIssueText("");
              setPhotoUri("");
              setSelectedAsset("");
              setSelectedCategory("");
              // go home
              router.replace("/(protected)/screens/homescreen");
            },
          },
        ]
      );
    } catch (err) {
      console.error("Error reporting issue:", err);
      Alert.alert("❌ Error", "Failed to report the issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // follow me.js: render nothing while resolving or unauthenticated (protected route)
  if (loading || !isAuthed) return null;

  return (
    <PageShell
      appearance="grouped"
      mode="form"
      width="form"
      header={{
        variant: "compact",
        eyebrow: "Maintenance",
        title: "Report an issue",
        subtitle: "Tell us what needs attention",
        onBack: () => router.back(),
      }}
    >
      <View style={styles.container}>
        <Banner title="Quick report" icon="tool" presentation="card">
          Choose the asset, then describe the problem. The maintenance team will be notified.
        </Banner>

        <PageSection divided={false} layoutStyle={styles.formFlow}>
          <FormStep fullWidth number={1} title="Choose the asset type" hint="What needs attention?">
            <SelectField
              label="Asset type"
              value={selectedAssetType}
              onChange={setSelectedAssetType}
              placeholder="Select asset type"
              disabled={submitting}
              options={ASSET_TYPES}
              testID="asset-type-select"
            />
          </FormStep>

          {/* Loading / Empty */}
          {loadingAssets ? (
            <StateView
              state="loading"
              compact
              title={`Loading ${selectedAssetType === "equipment" ? "equipment" : "vehicles"}…`}
            />
          ) : assetLoadError && reportableAssets.length === 0 ? (
            <StateView
              state="error"
              compact
              title={`${selectedAssetType === "equipment" ? "Equipment" : "Vehicles"} could not be loaded`}
              message="Check your connection and try again."
              actionLabel="Retry"
              onAction={activeResource.refresh}
            />
          ) : reportableAssets.length === 0 ? (
            <StateView
              state="empty"
              compact
              icon={selectedAssetType === "equipment" ? "tool" : "truck"}
              title={`No ${selectedAssetType === "equipment" ? "equipment" : "vehicles"} found`}
              message={`Add ${selectedAssetType === "equipment" ? "equipment" : "vehicles"} in the admin area, then report issues here.`}
            />
          ) : (
            <>
              {/* Category */}
              <FormStep fullWidth number={2} title="Narrow the asset list" hint="Choose a category">
                <SelectField
                  label="Category"
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  placeholder="Select category"
                  disabled={submitting}
                  options={categories.map((category) => ({ label: category, value: category }))}
                  searchable={categories.length > 8}
                  testID="category-select"
                />
              </FormStep>

              {/* Asset */}
              <FormStep
                fullWidth
                number={3}
                title="Select the specific asset"
                hint={selectedAssetType === "equipment" ? "Equipment" : "Vehicle"}
              >
                <AssetSelectField
                  type={selectedAssetType}
                  records={filteredAssets}
                  value={selectedAsset}
                  onChange={setSelectedAsset}
                  disabled={!selectedCategory || submitting}
                  testID="vehicle-select"
                />

                {selectedAsset ? (
                  <View style={styles.metaRow}>
                    <Text variant="metadata" tone="secondary">
                      {selectedAssetType === "equipment" ? "Equipment" : "Vehicle"}:{" "}
                      <Text variant="metadata">
                        {selectedAssetType === "equipment"
                          ? getEquipmentName(selectedAssetRecord) || "Unnamed equipment"
                          : getVehicleDisplayName(selectedAssetRecord, vehicles)}
                      </Text>
                    </Text>
                    {selectedRegistration ? (
                      <Text variant="metadata" tone="secondary">
                        Reg:{" "}
                        <Text variant="metadata">
                          {selectedRegistration}
                        </Text>
                      </Text>
                    ) : null}
                    {selectedEquipmentIdentifier ? (
                      <Text variant="metadata" tone="secondary">
                        ID:{" "}
                        <Text variant="metadata">
                          {selectedEquipmentIdentifier}
                        </Text>
                      </Text>
                    ) : null}
                    <Text variant="metadata" tone="secondary">
                      Cat:{" "}
                      <Text variant="metadata">
                        {selectedCategory || "Other"}
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </FormStep>

              {/* Issue description */}
              <FormStep fullWidth number={4} title="Describe the issue" hint="Include warning lights, sounds or symptoms" last>
                <TextArea
                  label="Issue details"
                  disabled={!selectedAsset || submitting}
                  placeholder="e.g. Brakes squeaking above 40mph, warning light on, tyre low…"
                  value={issueText}
                  onChangeText={setIssueText}
                  maxLength={MAX_CHARS}
                  showCount
                />
                <View style={styles.photoField}>
                  <Text variant="bodyStrong">Photo</Text>
                  <Text variant="bodySmall" tone="secondary">
                    Optional · add a clear photo of damage, warning lights or the affected part.
                  </Text>
                  {photoUri ? (
                    <>
                      <SectionCard tone="grouped" layoutStyle={styles.photoPreviewFrame}>
                        <Image
                          source={{ uri: photoUri }}
                          style={styles.photoPreview}
                          accessibilityLabel="Selected maintenance issue photo"
                        />
                      </SectionCard>
                      <View style={styles.photoActions}>
                        <AppButton
                          label="Replace"
                          icon="camera"
                          variant="secondary"
                          onPress={showPhotoSelector}
                          disabled={submitting}
                          layoutStyle={styles.photoAction}
                        />
                        <AppButton
                          label="Remove"
                          icon="trash-2"
                          variant="ghost"
                          onPress={() => setPhotoUri("")}
                          disabled={submitting}
                          layoutStyle={styles.photoAction}
                        />
                      </View>
                    </>
                  ) : (
                    <AppButton
                      label="Add photo"
                      icon="camera"
                      variant="secondary"
                      onPress={showPhotoSelector}
                      disabled={!selectedAsset || submitting}
                      fullWidth
                    />
                  )}
                </View>
                <AppButton
                  label={submitting ? "Submitting…" : "Report issue"}
                  icon="send"
                  onPress={reportIssue}
                  disabled={!isValid || submitting}
                  loading={submitting}
                  fullWidth
                />
              </FormStep>
            </>
          )}
        </PageSection>

        <View style={styles.bottomSpacer} />
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  formFlow: {
    marginTop: t.spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  photoField: {
    gap: t.spacing.xs,
  },
  photoPreview: {
    width: "100%",
    aspectRatio: 4 / 3,
  },
  photoPreviewFrame: {
    overflow: "hidden",
    padding: t.spacing.none,
  },
  photoActions: {
    flexDirection: "row",
    gap: t.spacing.sm,
  },
  photoAction: {
    flex: 1,
  },
  bottomSpacer: { height: t.spacing.xs },
});
