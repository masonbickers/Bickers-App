import { createWorkshopPhotoUploader } from "../../../../lib/workshopPhotoUpload";
import AssetSelectField from "../../../../components/ui/AssetSelectField";
import { routeColors } from "../../../../lib/design/routePresentation/service-minor-service-id-jsx.js";
import { styles } from "../../../../lib/design/screenStyles/service-minor-service-id-jsx.js";
import { SectionCard, AppText as Text, AppPressable as TouchableOpacity, FormField as SharedFormField, TextArea } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
// app/(protected)/service/minor-service/[id].jsx
import { Feather } from "@expo/vector-icons"; // ✅ use Expo Feather
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams,
  useNavigation,
  useRouter } from "expo-router";
import {
  doc,
  serverTimestamp,
  } from "firebase/firestore";
import { getDownloadURL,
  ref,
  uploadBytesResumable } from "firebase/storage";
import { useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  View } from "react-native";

import { db, storage } from "../../../../firebaseConfig";
import { formatShortDate } from "../../../../lib/dateDisplay";
import { formatISODateDDMMYYYY } from "../../../../lib/dateFormat";
import {
  getVehicleLastService,
  getVehicleManufacturer,
  getVehicleMileage,
  getVehicleName,
  getVehicleRegistration,
} from "../../../../lib/fleetSchema";
import { useServiceCacheActions, useServiceCollectionReader } from "../../../../hooks/useServiceData";
import { submitOrQueueWorkshopRecord } from "../../../../lib/workshopSubmissionApi";
import { useAuth } from "../../../../providers/AuthProvider";
import { useTheme } from "../../../../providers/ThemeProvider";
import { designTokens as t } from "../../../../lib/design/tokens";
import PageShell from "../../../../components/layout/PageShell";

const SERVICE_TYPE_OPTIONS = [
  "Interim / minor service",
  "Oil & filter change",
  "Inspection only",
  "Other",
];

const CHECK_STATUS_OPTIONS = [
  { value: "green", label: "Green", color: routeColors.hex_22c55e_740if4 },
  { value: "amber", label: "Amber", color: routeColors.hex_f59e0b_4zbh7f },
  { value: "red", label: "Red", color: routeColors.hex_ef4444_4oizhh },
];

const NOTE_REQUIRED_STATUSES = new Set(["amber", "red"]);

/* ------------------------------------------------------------------ */
/*  CHECKLISTS – same structure as full service                       */
/* ------------------------------------------------------------------ */

const CHECK_ENGINE_FLUIDS = [
  "Engine oil & filter replaced",
  "Air filter checked / replaced",
  "Coolant level & condition checked",
  "Brake fluid level & condition checked",
  "Fuel filter checked / replaced (if applicable)",
  "Cabin / pollen filter checked / replaced",
  "Auxiliary belt & pulleys checked",
  "Power steering / PAS fluid checked (if fitted)",
  "Washer fluid topped up",
];

const CHECK_SAFETY_CHASSIS = [
  "Front brake pads & discs inspected",
  "Rear brake pads & discs / drums inspected",
  "Tyre tread depth & wear pattern checked",
  "Tyre pressures set to spec (incl. spare)",
  "Steering joints & rack inspected",
  "Suspension arms, bushes & shocks inspected",
  "Brake hoses & lines inspected for leaks / corrosion",
];

const CHECK_ELECTRICAL_TEST = [
  "All exterior lights & indicators checked",
  "Brake lights & reverse lights checked",
  "Horn, wipers & washers checked",
  "Battery condition / terminals checked",
  "Road test completed",
  "Dashboard warning lights confirmed off after service",
];

/* ---------------- DATE HELPERS ---------------- */

function getNowParts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return {
    date: `${yyyy}-${mm}-${dd}`, // YYYY-MM-DD
    time: `${hh}:${min}`, // HH:MM
  };
}

function computeNextServiceFromDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const next = new Date(d);
  // you can change this to 6 months later if you want minor services more often
  next.setFullYear(next.getFullYear() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = next.getFullYear();
  const mm = pad(next.getMonth() + 1);
  const dd = pad(next.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeCheckStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "green" || value === "amber" || value === "red") return value;
  if (typeof status === "number") {
    if (status >= 4) return "green";
    if (status >= 2) return "amber";
    return "red";
  }
  return "";
}

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

async function uploadPhotoList(photoItems, basePath, uploadPhoto) {
  const uris = photoItems
    .map((p) => (typeof p === "string" ? p : p?.uri))
    .filter(Boolean);

  const uploaded = [];
  for (const uri of uris) {
    if (isDownloadUrl(uri)) {
      uploaded.push(uri);
      continue;
    }

    uploaded.push(await uploadPhoto(uri, basePath));
  }

  return uploaded;
}

async function uploadCheckPhotoMap(checkPhotosMap, basePath, uploadPhoto) {
  const uploadedMap = {};

  for (const [label, photoItems] of Object.entries(checkPhotosMap || {})) {
    if (!Array.isArray(photoItems) || photoItems.length === 0) continue;
    const safeLabel = sanitizeStorageSegment(label);
    const uploaded = await uploadPhotoList(photoItems, `${basePath}/${safeLabel}`, uploadPhoto);
    if (uploaded.length > 0) {
      uploadedMap[label] = uploaded;
    }
  }

  return uploadedMap;
}

// 🔑 multi-draft key for minor service forms
const MINOR_SERVICE_DRAFTS_KEY = "minorServiceFormDrafts_v1";

export default function MinorServiceFormScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, workshopRequestId: routeWorkshopRequestId, vehicleId: routeRequestedVehicleId } = useLocalSearchParams();
  const [workshopRequestId, setWorkshopRequestId] = useState(String(routeWorkshopRequestId || ""));
  const [requestedVehicleId, setRequestedVehicleId] = useState(String(routeRequestedVehicleId || ""));
  const formId = Array.isArray(id) ? id[0] : id;
  const { employee } = useAuth();
  const photoUploaderRef = useRef(null);
  if (!photoUploaderRef.current) photoUploaderRef.current = createWorkshopPhotoUploader(uploadImageUri);
  const allowLeaveRef = useRef(false);

  const { colors } = useTheme();
  const readServiceCollection = useServiceCollectionReader();
  const { upsertServiceRow, patchServiceRow } = useServiceCacheActions();

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // VEHICLE SEARCH + SELECTION
  const [selectedVehicleId, setSelectedVehicleId] = useState(requestedVehicleId ? String(requestedVehicleId) : null);
  const [vehicleCollapsed, setVehicleCollapsed] = useState(false);

  // DATE/TIME
  const now = getNowParts();
  const [serviceDate] = useState(now.date); // read-only
  const [serviceTime] = useState(now.time); // read-only

  // SERVICE FIELDS
  const [odometer, setOdometer] = useState("");
  const [serviceType, setServiceType] = useState("Interim / minor service");
  const [serviceTypeOpen, setServiceTypeOpen] = useState(false);
  const [workSummary, setWorkSummary] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  // SIGNATURE
  const [signedBy, setSignedBy] = useState("");

  // CHECKLIST STATE
  const [checks, setChecks] = useState({});
  const [checkRatings, setCheckRatings] = useState({});
  const [checkNA, setCheckNA] = useState({});
  const [checkNotes, setCheckNotes] = useState({});
  const [checkPhotos, setCheckPhotos] = useState({});

  // PHOTOS
  const [photos, setPhotos] = useState([]); // [{ uri }]

  const allChecklistLabels = useMemo(
    () => [
      ...CHECK_ENGINE_FLUIDS,
      ...CHECK_SAFETY_CHASSIS,
      ...CHECK_ELECTRICAL_TEST,
    ],
    []
  );

  const nextServiceComputed = useMemo(
    () => computeNextServiceFromDate(serviceDate),
    [serviceDate]
  );

  /* ---------------- LOAD VEHICLES ---------------- */

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const list = await readServiceCollection("vehicles", {
          orderByField: "name",
        });
        setVehicles(list);
      } catch (err) {
        console.error("Failed to load vehicles for minor service:", err);
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
      !!selectedVehicleId ||
      !!odometer.trim() ||
      serviceType !== "Interim / minor service" ||
      !!workSummary.trim() ||
      !!partsUsed.trim() ||
      !!extraNotes.trim() ||
      !!signedBy.trim() ||
      Object.keys(checks || {}).length > 0 ||
      Object.keys(checkRatings || {}).length > 0 ||
      Object.keys(checkNA || {}).length > 0 ||
      Object.keys(checkNotes || {}).length > 0 ||
      Object.values(checkPhotos || {}).some((items) => Array.isArray(items) && items.length > 0) ||
      photos.length > 0,
    [
      checkNA,
      checkNotes,
      checkPhotos,
      checkRatings,
      checks,
      extraNotes,
      odometer,
      partsUsed,
      photos.length,
      selectedVehicleId,
      serviceType,
      signedBy,
      workSummary,
    ]
  );

  const confirmLeave = (onLeave) => {
    if (!hasUnsavedChanges || allowLeaveRef.current) {
      onLeave();
      return;
    }

    Alert.alert(
      "Leave minor service?",
      "You have unsaved service details. Leave without saving?",
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
        "Leave minor service?",
        "You have unsaved service details. Leave without saving?",
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

  /* ---------------- LOAD DRAFT FOR THIS FORM ID ---------------- */

  useEffect(() => {
    const loadDraft = async () => {
      if (!formId) return;
      try {
        const raw = await AsyncStorage.getItem(MINOR_SERVICE_DRAFTS_KEY);
        if (!raw) return;

        const allDrafts = JSON.parse(raw) || {};
        const draft = allDrafts[formId];
        if (!draft) return;
        if (draft.workshopRequestId) setWorkshopRequestId(String(draft.workshopRequestId));
        if (draft.requestedVehicleId) setRequestedVehicleId(String(draft.requestedVehicleId));

        if (draft.selectedVehicleId) {
          setSelectedVehicleId(draft.selectedVehicleId);
          setVehicleCollapsed(true);
        }
        if (draft.odometer) setOdometer(String(draft.odometer));
        if (draft.serviceType) setServiceType(draft.serviceType);
        if (draft.workSummary) setWorkSummary(draft.workSummary);
        if (draft.partsUsed) setPartsUsed(draft.partsUsed);
        if (draft.extraNotes) setExtraNotes(draft.extraNotes);
        if (draft.signedBy) setSignedBy(draft.signedBy);
        if (draft.checks) setChecks(draft.checks);
        if (draft.checkRatings) setCheckRatings(draft.checkRatings);
        if (draft.checkNA) setCheckNA(draft.checkNA);
        if (draft.checkNotes) setCheckNotes(draft.checkNotes);
        if (draft.checkPhotoURIs) {
          const restored = {};
          Object.entries(draft.checkPhotoURIs).forEach(([label, uris]) => {
            if (Array.isArray(uris)) {
              restored[label] = uris.map((uri) => ({ uri }));
            }
          });
          setCheckPhotos(restored);
        }
        if (Array.isArray(draft.photoURIs)) {
          setPhotos(draft.photoURIs.map((uri) => ({ uri })));
        }
      } catch (err) {
        console.error("Failed to load minor service draft:", err);
      }
    };

    loadDraft();
  }, [formId]);

  /* ---------------- AUTO-SAVE DRAFT LOCALLY (MULTI) ---------------- */

  useEffect(() => {
    const saveDraft = async () => {
      if (!formId) return;

      try {
        const vehicleName = getVehicleName(selectedVehicle) || "";
        const registration = getVehicleRegistration(selectedVehicle) || "";

        const hasAnyContent =
          selectedVehicleId ||
          odometer ||
          workSummary ||
          partsUsed ||
          extraNotes ||
          signedBy ||
          Object.keys(checks).length > 0 ||
          Object.keys(checkRatings).length > 0 ||
          Object.keys(checkNA).length > 0 ||
          Object.keys(checkNotes).length > 0 ||
          Object.values(checkPhotos).some((items) => Array.isArray(items) && items.length > 0) ||
          photos.length > 0;

        const raw = await AsyncStorage.getItem(MINOR_SERVICE_DRAFTS_KEY);
        const allDrafts = raw ? JSON.parse(raw) || {} : {};

        if (!hasAnyContent) {
          if (allDrafts[formId]) {
            delete allDrafts[formId];
            if (Object.keys(allDrafts).length === 0) {
              await AsyncStorage.removeItem(MINOR_SERVICE_DRAFTS_KEY);
            } else {
              await AsyncStorage.setItem(
                MINOR_SERVICE_DRAFTS_KEY,
                JSON.stringify(allDrafts)
              );
            }
          }
          return;
        }

        const draftToSave = {
          workshopRequestId: workshopRequestId || allDrafts[formId]?.workshopRequestId || "",
          requestedVehicleId: requestedVehicleId || allDrafts[formId]?.requestedVehicleId || "",
          selectedVehicleId,
          vehicleName,
          registration,
          odometer,
          serviceType,
          serviceDate,
          serviceTime,
          workSummary,
          partsUsed,
          extraNotes,
          signedBy,
          checks,
          checkRatings,
          checkNA,
          checkNotes,
          checkPhotoURIs: Object.fromEntries(
            Object.entries(checkPhotos).map(([label, items]) => [
              label,
              Array.isArray(items) ? items.map((item) => item.uri).filter(Boolean) : [],
            ])
          ),
          photoURIs: photos.map((p) => p.uri),
        };

        allDrafts[formId] = draftToSave;
        await AsyncStorage.setItem(
          MINOR_SERVICE_DRAFTS_KEY,
          JSON.stringify(allDrafts)
        );
      } catch (err) {
        console.error("Failed to save minor service draft:", err);
      }
    };

    saveDraft();
  }, [
    formId,
    workshopRequestId,
    requestedVehicleId,
    selectedVehicleId,
    selectedVehicle,
    odometer,
    serviceType,
    serviceDate,
    serviceTime,
    workSummary,
    partsUsed,
    extraNotes,
    signedBy,
    checks,
    checkRatings,
    checkNA,
    checkNotes,
    checkPhotos,
    photos,
  ]);

  /* ---------------- HELPERS ---------------- */

  const toggleCheck = (label) => {
    setChecks((prev) => {
      const nextChecked = !prev[label];
      if (nextChecked) {
        setCheckNA((prevNA) => ({ ...prevNA, [label]: false }));
        setCheckRatings((prevRatings) => ({
          ...prevRatings,
          [label]: normalizeCheckStatus(prevRatings[label]) || "green",
        }));
      } else {
        setCheckRatings((prevRatings) => {
          const { [label]: _omit, ...rest } = prevRatings;
          return rest;
        });
      }
      return {
        ...prev,
        [label]: nextChecked,
      };
    });
  };

  const toggleNA = (label) => {
    setCheckNA((prev) => {
      const newVal = !prev[label];

      if (newVal) {
        setChecks((prevChecks) => ({
          ...prevChecks,
          [label]: false,
        }));
        setCheckRatings((prevRatings) => {
          const { [label]: _omit, ...rest } = prevRatings;
          return rest;
        });
        setCheckNotes((prevNotes) => {
          const { [label]: _omit, ...rest } = prevNotes;
          return rest;
        });
      }

      return {
        ...prev,
        [label]: newVal,
      };
    });
  };

  const updateRating = (label, value) => {
    const status = normalizeCheckStatus(value) || "green";
    setCheckNA((prev) => ({ ...prev, [label]: false }));
    setCheckRatings((prev) => ({
      ...prev,
      [label]: status,
    }));
    setChecks((prev) => ({
      ...prev,
      [label]: true,
    }));
  };

  const updateNote = (label, value) => {
    setCheckNotes((prev) => ({
      ...prev,
      [label]: value,
    }));
  };

  const handleSelectVehicle = (id) => {
    setSelectedVehicleId(id);
    setVehicleCollapsed(true);
  };

  const validate = () => {
    if (!selectedVehicleId) {
      Alert.alert("Select vehicle", "Please choose a vehicle for this service.");
      return false;
    }
    if (!serviceDate.trim()) {
      Alert.alert("Service date", "Service date is missing.");
      return false;
    }
    if (!odometer.trim()) {
      Alert.alert("Odometer", "Please enter the vehicle mileage.");
      return false;
    }
    if (!signedBy.trim()) {
      Alert.alert(
        "Signature",
        "Please enter the technician name/signature before saving."
      );
      return false;
    }

    for (const label of allChecklistLabels) {
      if (checkNA[label]) continue;
      const status = normalizeCheckStatus(checkRatings[label]);
      if (!status) {
        Alert.alert(
          "Checklist incomplete",
          `Please mark green, amber, red or N/A: "${label}".`
        );
        return false;
      }
      if (NOTE_REQUIRED_STATUSES.has(status) && !String(checkNotes[label] || "").trim()) {
        Alert.alert(
          "Notes required",
          `Please add notes for the ${status} check: "${label}".`
        );
        return false;
      }
    }

    return true;
  };

  /* ---------------- PHOTOS ---------------- */

  const handleAddPhotoFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setPhotos((prev) => [...prev, { uri: asset.uri }]);
    } catch (err) {
      console.error("Failed to pick image:", err);
      Alert.alert("Error", "Could not open photo library.");
    }
  };

  const handleRemovePhoto = (uri) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const handleAddCheckPhoto = async (label) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setCheckPhotos((prev) => ({
        ...prev,
        [label]: [...(prev[label] || []), { uri: asset.uri }],
      }));
    } catch (err) {
      console.error("Failed to pick check image:", err);
      Alert.alert("Error", "Could not open photo library.");
    }
  };

  const handleRemoveCheckPhoto = (label, uri) => {
    setCheckPhotos((prev) => ({
      ...prev,
      [label]: (prev[label] || []).filter((p) => p.uri !== uri),
    }));
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async () => {
    if (workshopRequestId && String(selectedVehicleId) !== String(requestedVehicleId)) {
      Alert.alert("Wrong vehicle", "Complete this request for its selected vehicle.");
      return;
    }
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const v = selectedVehicle;
      const odoNumber = odometer ? Number(odometer) : null;
      const nextServiceDate = nextServiceComputed || null;
      const serviceDateTime = `${serviceDate} ${serviceTime}`;
      const serviceRecordRef = doc(db, "serviceRecords", String(workshopRequestId || formId));
      if (!employee?.companyId) throw new Error("Your approved account is missing its company. Sign in again.");
      const storageBasePath = `companies/${employee.companyId}/vehicles/${selectedVehicleId}/service/${serviceRecordRef.id}`;

      let photoURLs = [];
      let checkPhotoURLs = {};
      try {
        photoURLs = await uploadPhotoList(
          photos,
          `${storageBasePath}/overall`,
          photoUploaderRef.current
        );
        checkPhotoURLs = await uploadCheckPhotoMap(
          checkPhotos,
          `${storageBasePath}/checks`,
          photoUploaderRef.current
        );
      } catch (uploadErr) {
        console.error("Failed to upload minor service photos:", uploadErr);
        Alert.alert(
          "Photo upload failed",
          "Could not upload the service photos. Please check your connection and try again."
        );
        return;
      }

      const recordVehicleName = getVehicleName(v) || "";
      const recordRegistration = getVehicleRegistration(v) || "";
      const record = {
        companyId: employee?.companyId,
        ...(workshopRequestId ? { workshopRequestId: String(workshopRequestId), workshopWorkType: "minor_service" } : {}),
        vehicleId: selectedVehicleId,
        vehicleName: recordVehicleName,
        registration: recordRegistration,
        manufacturer: getVehicleManufacturer(v) || "",
        model: v?.model || "",
        serviceDate: serviceDateTime,
        serviceDateOnly: serviceDate,
        serviceTime: serviceTime,
        serviceType: serviceType.trim(),
        odometer: odoNumber,
        workSummary: workSummary.trim(),
        partsUsed: partsUsed.trim(),
        nextServiceDate,
        nextService: nextServiceDate,
        extraNotes: extraNotes.trim(),
        checks,
        checkRatings,
        checkNA,
        checkNotes,
        checkPhotoURIs: Object.fromEntries(
          Object.entries(checkPhotos).map(([label, items]) => [
            label,
            Array.isArray(items) ? items.map((item) => item.uri).filter(Boolean) : [],
          ])
        ),
        checkPhotoURLs,
        photoURIs: [],
        photoURLs,
        signedBy: signedBy.trim(),
        createdAt: serverTimestamp(),
      };

      const result = await submitOrQueueWorkshopRecord({ kind: "minor", recordId: serviceRecordRef.id, record });
      const { queued } = result;
      await Promise.allSettled([
        upsertServiceRow("serviceRecords", { ...(result.record || record), id: serviceRecordRef.id }),
        ...(result.vehiclePatch ? [patchServiceRow("vehicles", selectedVehicleId, result.vehiclePatch)] : []),
      ]);

      // clear just this draft
      try {
        const raw = await AsyncStorage.getItem(MINOR_SERVICE_DRAFTS_KEY);
        if (raw) {
          const allDrafts = JSON.parse(raw) || {};
          if (allDrafts[formId]) {
            delete allDrafts[formId];
            if (Object.keys(allDrafts).length === 0) {
              await AsyncStorage.removeItem(MINOR_SERVICE_DRAFTS_KEY);
            } else {
              await AsyncStorage.setItem(
                MINOR_SERVICE_DRAFTS_KEY,
                JSON.stringify(allDrafts)
              );
            }
          }
        }
      } catch (e) {
        console.error("Failed to remove minor service draft after submit:", e);
      }

      Alert.alert(
        queued ? "Saved offline" : "Minor service saved",
        queued
          ? "No internet right now. This service will upload automatically when internet returns."
          : "Service record saved and vehicle updated.",
        [
          {
            text: "OK",
            onPress: () => {
              allowLeaveRef.current = true;
              router.back();
            },
          },
        ]
      );
    } catch (err) {
      console.error("Failed to save minor service record:", err);
      Alert.alert("Error", err.message || "Could not save service record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- RENDER ---------------- */

  return (
    <PageShell mode="form" width="form" header={{
      variant: "compact",
      title: "Minor Service Form",
      subtitle: "Interim / minor service checklist, parts and notes.",
      onBack: () => confirmLeave(() => router.back()),
    }}>
      {/* HEADER */}


      <>
        {/* VEHICLE SECTION */}
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
              onPress={() => setVehicleCollapsed(false)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.sectionHint, { color: COLORS.primaryAction }]}
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
              <Text tone={"muted"} style={[styles.fieldLabel]}>
                Selected vehicle
              </Text>
              <View style={styles.selectedVehicleRow}>
                <View style={{ flex: 1 }}>
                  <Text tone={"primary"} style={[styles.vehicleName]}>
                    {getVehicleName(selectedVehicle) || "Unnamed vehicle"}
                  </Text>
                  <Text tone={"muted"} style={[styles.vehicleReg]}>
                    {getVehicleRegistration(selectedVehicle) || "—"}
                  </Text>
                </View>
              </View>
              <View style={styles.vehicleMetaRow}>
                <Text tone={"muted"} style={[styles.vehicleMeta]}>
                  Current mileage:{" "}
                  {typeof getVehicleMileage(selectedVehicle) === "number"
                    ? `${getVehicleMileage(selectedVehicle).toLocaleString("en-GB")} mi`
                    : "—"}
                </Text>
                <Text tone={"muted"} style={[styles.vehicleMeta]}>
                  Last service: {formatShortDate(getVehicleLastService(selectedVehicle)) || getVehicleLastService(selectedVehicle) || "—"}
                </Text>
              </View>
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
            </>
          )}
        </View>

        {/* SERVICE DETAILS */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Service details
          </Text>
        </View>

        <View style={styles.flatSectionContent}>
          <View style={styles.fieldGroup}>
            <Text tone={"primary"} style={[styles.fieldLabel]}>
              Service date (auto)
            </Text>
            <View
              style={[
                styles.readonlyField,
                {
                  backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                  borderColor: colors.inputBorder || colors.border || COLORS.border,
                },
              ]}
            >
              <Text tone={"primary"} style={[styles.readonlyText]}>
                {formatISODateDDMMYYYY(serviceDate)}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text tone={"primary"} style={[styles.fieldLabel]}>
              Service time (auto)
            </Text>
            <View
              style={[
                styles.readonlyField,
                {
                  backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                  borderColor: colors.inputBorder || colors.border || COLORS.border,
                },
              ]}
            >
              <Text tone={"primary"} style={[styles.readonlyText]}>
                {serviceTime}
              </Text>
            </View>
          </View>

          <FormField
            label="Odometer (mi)"
            placeholder="e.g. 65230"
            keyboardType="numeric"
            value={odometer}
            onChangeText={setOdometer}
          />

          <View style={styles.fieldGroup}>
            <Text tone={"primary"} style={[styles.fieldLabel]}>
              Service type
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownHeader,
                {
                  backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                  borderColor: colors.inputBorder || colors.border || COLORS.border,
                },
              ]}
              onPress={() => setServiceTypeOpen((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Text tone={"primary"} style={[styles.dropdownText]}>
                {serviceType}
              </Text>
              <Feather
                name={serviceTypeOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textMuted || COLORS.textMid}
              />
            </TouchableOpacity>
            {serviceTypeOpen && (
              <View
                style={[
                  styles.dropdownList,
                  {
                    backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                    borderColor: colors.border || COLORS.border,
                  },
                ]}
              >
                {SERVICE_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.dropdownItem,
                      opt === serviceType && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setServiceType(opt);
                      setServiceTypeOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: colors.text || COLORS.textHigh },
                        opt === serviceType && {
                          color: COLORS.primaryAction,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text tone={"primary"} style={[styles.fieldLabel]}>
              Next service due (auto)
            </Text>
            <View
              style={[
                styles.readonlyField,
                {
                  backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                  borderColor: colors.inputBorder || colors.border || COLORS.border,
                },
              ]}
            >
              <Text tone={"primary"} style={[styles.readonlyText]}>
                {nextServiceComputed ||
                  "Calculated from service date (+12 months)"}
              </Text>
            </View>
          </View>
        </View>

        {/* CHECKLISTS */}
        <ChecklistSection
          title="Engine & fluids"
          hint="Mark green, amber, red or N/A. Notes required for amber/red."
          items={CHECK_ENGINE_FLUIDS}
          checks={checks}
          checkNA={checkNA}
          checkRatings={checkRatings}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          toggleCheck={toggleCheck}
          toggleNA={toggleNA}
          updateRating={updateRating}
          updateNote={updateNote}
          addCheckPhoto={handleAddCheckPhoto}
          removeCheckPhoto={handleRemoveCheckPhoto}
        />

        <ChecklistSection
          title="Safety & chassis"
          hint="Mark green, amber, red or N/A. Notes required for amber/red."
          items={CHECK_SAFETY_CHASSIS}
          checks={checks}
          checkNA={checkNA}
          checkRatings={checkRatings}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          toggleCheck={toggleCheck}
          toggleNA={toggleNA}
          updateRating={updateRating}
          updateNote={updateNote}
          addCheckPhoto={handleAddCheckPhoto}
          removeCheckPhoto={handleRemoveCheckPhoto}
        />

        <ChecklistSection
          title="Electrical & test drive"
          hint="Mark green, amber, red or N/A. Notes required for amber/red."
          items={CHECK_ELECTRICAL_TEST}
          checks={checks}
          checkNA={checkNA}
          checkRatings={checkRatings}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          toggleCheck={toggleCheck}
          toggleNA={toggleNA}
          updateRating={updateRating}
          updateNote={updateNote}
          addCheckPhoto={handleAddCheckPhoto}
          removeCheckPhoto={handleRemoveCheckPhoto}
        />

        {/* WORKSHOP NOTES */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Workshop notes
          </Text>
        </View>

        <SectionCard
          tone="subtle" layoutStyle={styles.card}
        >
          <FormField
            label="Work carried out"
            placeholder="Describe work done, faults found, road test notes, etc."
            value={workSummary}
            onChangeText={setWorkSummary}
            multiline
          />
          <FormField
            label="Parts used"
            placeholder="Part numbers, quantities, suppliers."
            value={partsUsed}
            onChangeText={setPartsUsed}
            multiline
          />
          <FormField
            label="Extra notes (optional)"
            autoGrow
            placeholder="Anything else useful for future jobs."
            value={extraNotes}
            onChangeText={setExtraNotes}
            multiline
          />
        </SectionCard>

        {/* SIGN-OFF */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Sign-off
          </Text>
          <Text
            tone={"muted"} style={[
              styles.sectionHint,
            ]}
          >
            Required to complete service.
          </Text>
        </View>

        <SectionCard
          tone="subtle" layoutStyle={styles.card}
        >
          <FormField
            label="Technician signature (name)"
            placeholder="Type name as signature"
            value={signedBy}
            onChangeText={setSignedBy}
          />
          <View style={{ marginTop: t.spacing.xxs }}>
            <Text tone={"muted"} style={[styles.signatureInfo]}>
              By entering your name you confirm the checks above have been
              carried out to the best of your ability.
            </Text>
          </View>
        </SectionCard>

        {/* PHOTOS / ATTACHMENTS */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Photos / attachments
          </Text>
          <Text
            tone={"muted"} style={[
              styles.sectionHint,
            ]}
          >
            Tyre wear, pad condition, damage, etc.
          </Text>
        </View>

        <SectionCard
          tone="subtle" layoutStyle={styles.card}
        >
          <View style={styles.photoButtonsRow}>
            <TouchableOpacity
              style={[
                styles.photoButton,
                {
                  backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                  borderColor: colors.border || COLORS.border,
                },
              ]}
              onPress={handleAddPhotoFromLibrary}
              activeOpacity={0.85}
            >
              <Feather
                name="image"
                size={16}
                color={COLORS.textHigh}
                style={{ marginRight: t.spacing.xxs }}
              />
              <Text style={styles.photoAddText}>Add from library</Text>
            </TouchableOpacity>
          </View>

          {photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: t.spacing.xs }}
            >
              {photos.map((p) => (
                <View key={p.uri} style={styles.photoThumbWrapper}>
                  <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.photoRemoveBadge}
                    onPress={() => handleRemovePhoto(p.uri)}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={12} color={COLORS.textHigh} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </SectionCard>

        {/* SUBMIT */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.9}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.textHigh} />
          ) : (
            <>
              <Feather
                name="save"
                size={16}
                color={COLORS.textHigh}
                style={{ marginRight: t.spacing.xxs }}
              />
              <Text style={styles.submitText}>
                Save minor service & update vehicle
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </>
    </PageShell>
  );
}

/* ---------------- SMALL COMPONENTS ---------------- */

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoGrow = false,
  keyboardType = "default",
}) {
  return (
    <View style={styles.fieldGroup}>
      {multiline ? (
        <TextArea label={label} autoGrow={autoGrow} placeholder={placeholder} value={value} onChangeText={onChangeText} />
      ) : (
        <SharedFormField
          label={label}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          inputProps={{ keyboardType }}
        />
      )}
    </View>
  );
}

function ChecklistSection({
  title,
  hint,
  items,
  checks,
  checkNA,
  checkRatings,
  checkNotes,
  checkPhotos,
  toggleCheck,
  toggleNA,
  updateRating,
  updateNote,
  addCheckPhoto,
  removeCheckPhoto,
}) {

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text
          tone={"primary"} style={[
            styles.sectionTitle,
          ]}
        >
          {title}
        </Text>
        <Text
          tone={"muted"} style={[
            styles.sectionHint,
          ]}
        >
          {hint}
        </Text>
      </View>

      <SectionCard
        tone="subtle" layoutStyle={styles.card}
      >
        {items.map((item) => (
          <ChecklistRow
            key={item}
            label={item}
            checked={!!checks[item]}
            na={!!checkNA[item]}
            rating={normalizeCheckStatus(checkRatings[item])}
            note={checkNotes[item] || ""}
            photos={checkPhotos[item] || []}
            onToggle={() => toggleCheck(item)}
            onToggleNA={() => toggleNA(item)}
            onChangeRating={(val) => updateRating(item, val)}
            onChangeNote={(text) => updateNote(item, text)}
            onPressPhoto={() => addCheckPhoto(item)}
            onRemovePhoto={(uri) => removeCheckPhoto(item, uri)}
          />
        ))}
      </SectionCard>
    </>
  );
}

export function ChecklistRow({
  label,
  checked,
  na,
  onToggle,
  onToggleNA,
  rating,
  onChangeRating,
  note,
  onChangeNote,
  photos,
  onPressPhoto,
  onRemovePhoto,
}) {
  const { colors, colorScheme } = useTheme();
  const paletteFor = (value) => getServiceStatusColors({ green: "success", amber: "warning", red: "danger" }[value] || "neutral", colorScheme);
  const neutralPalette = paletteFor("");
  const selectedStatus = normalizeCheckStatus(rating);
  const selectedPalette = paletteFor(selectedStatus);
  const requiresNote = NOTE_REQUIRED_STATUSES.has(selectedStatus);
  const noteMissing = requiresNote && !String(note || "").trim();

  return (
    <View style={styles.checkRowWrapper}>
      {/* Left: tick + label */}
      <TouchableOpacity
        style={styles.checkRowLeft}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <View style={styles.checkIconWrap}>
          {checked ? (
            <View
              style={[
                styles.checkIconFilled,
                {
                  backgroundColor: selectedPalette.background,
                },
              ]}
            >
              <Feather name="check" size={18} color={selectedPalette.onBackground} />
            </View>
          ) : (
            <View
              style={[
                styles.checkIconEmpty,
                { borderColor: colors.textMuted || COLORS.textMid },
                na && { opacity: 0.4 },
              ]}
            />
          )}
        </View>
        <Text
          tone={(checked) ? "primary" : ("muted")} style={[
            styles.checkLabel,
            null,
            checked && null,
            na && { opacity: 0.5 },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>

      {/* Right: condition + N/A + photo icon */}
      <View style={styles.ratingRow}>
        {CHECK_STATUS_OPTIONS.map((option) => {
          const isActive = selectedStatus === option.value;
          const palette = paletteFor(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${option.label}`}
              aria-pressed={isActive}
              accessibilityState={{ selected: isActive }}
              style={[
                styles.conditionPill,
                { borderColor: palette.border },
                isActive && {
                  backgroundColor: palette.background,
                  borderColor: palette.border,
                },

              ]}
              onPress={() => onChangeRating(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.conditionText,
                  { color: isActive ? palette.onBackground : palette.foreground },

                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.naPill, na && styles.naPillActive, { borderColor: neutralPalette.border }, na && { backgroundColor: neutralPalette.background }]}
          onPress={onToggleNA}
          accessibilityRole="button"
          accessibilityLabel={`${label}: Not applicable`}
          aria-pressed={na}
          accessibilityState={{ selected: na }}
          activeOpacity={0.7}
        >
          <Text style={[styles.naText, na && styles.naTextActive, { color: neutralPalette.foreground }]}>N/A</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.photoIconButton}
          onPress={onPressPhoto}
          accessibilityRole="button"
          accessibilityLabel={`Add photo for ${label}`}
          activeOpacity={0.7}
        >
          <Feather name="image" size={16} color={colors.textMuted || COLORS.textMid} />
          {photos.length > 0 && (
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>{photos.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TextArea
        label="Check notes"
        autoGrow
        error={noteMissing ? "Notes are required for this status." : undefined}
        placeholder={
          requiresNote
            ? "Notes required for amber/red..."
            : "Notes for this check..."
        }
        value={note}
        onChangeText={onChangeNote}
      />

      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: t.spacing.xxs }}
        >
          {photos.map((p) => (
            <View key={p.uri} style={styles.photoThumbWrapper}>
              <Image source={{ uri: p.uri }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.photoRemoveBadge}
                onPress={() => onRemovePhoto(p.uri)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={12} color={COLORS.textHigh} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
