import AssetSelectField from "../../../../components/ui/AssetSelectField";
import { routeColors } from "../../../../lib/design/routePresentation/service-service-form-id-jsx.js";
import { styles } from "../../../../lib/design/screenStyles/service-service-form-id-jsx.js";
import { AppButton, AppModal, AppText as Text, AppPressable as TouchableOpacity, FormField as SharedFormField, TextArea } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
// app/(protected)/service/service-form/[id].jsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useLocalSearchParams,
  useNavigation,
  useRouter } from "expo-router";
import {
  doc,
  getDoc,
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

import Icon from "react-native-vector-icons/Feather";

import { db, storage } from "../../../../firebaseConfig";
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
import { removeServiceDraft, SERVICE_DRAFTS_KEY } from "../../../../lib/serviceDrafts";
import { useTheme } from "../../../../providers/ThemeProvider";
import { designTokens as t } from "../../../../lib/design/tokens";
import PageShell from "../../../../components/layout/PageShell";

const SERVICE_TYPE_OPTIONS = [
  "Full service",
  "Interim service",
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

const DEFECT_ACTION_OPTIONS = [
  { value: "repaired", label: "Repaired" },
  { value: "replaced", label: "Replaced" },
  { value: "not_repaired", label: "Not repaired" },
];

const WHEEL_POSITIONS = [
  { key: "frontLeft", label: "Front left", shortLabel: "FL" },
  { key: "frontRight", label: "Front right", shortLabel: "FR" },
  { key: "rearLeft", label: "Rear left", shortLabel: "RL" },
  { key: "rearRight", label: "Rear right", shortLabel: "RR" },
];

const EMPTY_WHEEL_INSPECTION = WHEEL_POSITIONS.reduce((acc, wheel) => {
  acc[wheel.key] = { tread: "", pressure: "", brakeWear: "", note: "" };
  return acc;
}, {});

/* ------------------------------------------------------------------ */
/*  FULL SERVICE CHECKLIST                                            */
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
  "Brake system checked for leaks / damage",
  "Tyres checked for visible damage / sidewall condition",
  "Wheel bearings checked for play / noise",
  "Steering joints & rack inspected",
  "Suspension arms, bushes & shocks inspected",
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
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return {
    date: formatDateForDisplay(d), // DD/MM/YYYY
    time: `${hh}:${min}`, // HH:MM
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatDateForDisplay(value) {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
  }

  const str = String(value).trim();
  if (!str) return "";

  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${pad(dd)}/${pad(mm)}/${yyyy}`;
  }

  const ukMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ukMatch) {
    const [, dd, mm, yyyy] = ukMatch;
    return `${pad(dd)}/${pad(mm)}/${yyyy}`;
  }

  return str;
}

function parseDisplayDate(dateStr) {
  if (!dateStr) return null;

  const str = String(dateStr).trim();
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch.map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  const ukMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ukMatch) {
    const [, dd, mm, yyyy] = ukMatch.map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeNextServiceFromDate(dateStr) {
  if (!dateStr) return "";
  const d = parseDisplayDate(dateStr);
  if (!d) return "";
  if (Number.isNaN(d.getTime())) return "";
  const next = new Date(d);
  next.setFullYear(next.getFullYear() + 1);
  return formatDateForDisplay(next);
}

function splitServiceDateTime(record) {
  if (record?.serviceDateOnly) {
    return {
      date: formatDateForDisplay(record.serviceDateOnly),
      time: record.serviceTime || "00:00",
    };
  }

  const serviceDate = typeof record?.serviceDate === "string" ? record.serviceDate : "";
  const [datePart, timePart] = serviceDate.split(" ");
  return {
    date: formatDateForDisplay(datePart) || "",
    time: timePart || record?.serviceTime || "00:00",
  };
}

function normalizeCheckStatus(value) {
  if (typeof value === "string") {
    const status = value.trim().toLowerCase();
    if (status === "green" || status === "amber" || status === "red") return status;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 4) return "green";
    if (value >= 2) return "amber";
    return "red";
  }

  return "";
}

function getCheckStatusOption(value) {
  const status = normalizeCheckStatus(value);
  return CHECK_STATUS_OPTIONS.find((option) => option.value === status) || null;
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

function buildRedWheelDefects(wheelInspection) {
  const data = normalizeWheelInspection(wheelInspection);
  return WHEEL_POSITIONS.flatMap((wheel) => {
    const item = data[wheel.key] || {};
    const treadValue = String(item.tread || "").trim();
    const brakeWearValue = String(item.brakeWear || "").trim();
    const defects = [];

    if (treadValue && getTreadStatus(treadValue) === "red") {
      defects.push({
        key: `${wheel.key}:tread`,
        wheelKey: wheel.key,
        wheelLabel: wheel.label,
        metric: "tread",
        title: `${wheel.label} tyre tread red`,
        value: treadValue,
        unit: "mm",
        description: `${wheel.label} tyre tread is ${treadValue}mm.`,
      });
    }

    if (brakeWearValue && getBrakeWearStatus(brakeWearValue) === "red") {
      defects.push({
        key: `${wheel.key}:brakeWear`,
        wheelKey: wheel.key,
        wheelLabel: wheel.label,
        metric: "brakeWear",
        title: `${wheel.label} brake wear red`,
        value: brakeWearValue,
        unit: "%",
        description: `${wheel.label} brake wear is ${brakeWearValue}%.`,
      });
    }

    return defects;
  });
}

function buildRedChecklistDefects(checkRatings = {}, checkNotes = {}) {
  return Object.entries(checkRatings)
    .filter(([, value]) => normalizeCheckStatus(value) === "red")
    .map(([label]) => ({
      key: `check:${label}`,
      metric: "checklist",
      title: `${label} red`,
      value: "Red",
      unit: "",
      description: checkNotes[label]
        ? `${label}: ${checkNotes[label]}`
        : `${label} was marked red on the service checklist.`,
    }));
}

function buildAmberWheelMonitorItems(wheelInspection) {
  const data = normalizeWheelInspection(wheelInspection);
  return WHEEL_POSITIONS.flatMap((wheel) => {
    const item = data[wheel.key] || {};
    const monitorItems = [];

    if (getTreadStatus(item.tread) === "amber") {
      monitorItems.push({
        key: `${wheel.key}:tread`,
        source: "wheel",
        title: `${wheel.label} tyre tread monitor`,
        value: item.tread,
        unit: "mm",
        details: `${wheel.label} tyre tread is ${item.tread}mm.`,
      });
    }

    if (getBrakeWearStatus(item.brakeWear) === "amber") {
      monitorItems.push({
        key: `${wheel.key}:brakeWear`,
        source: "wheel",
        title: `${wheel.label} brake wear monitor`,
        value: item.brakeWear,
        unit: "%",
        details: `${wheel.label} brake wear is ${item.brakeWear}%.`,
      });
    }

    return monitorItems;
  });
}

function buildAmberChecklistMonitorItems(checkRatings = {}, checkNotes = {}) {
  return Object.entries(checkRatings)
    .filter(([, value]) => normalizeCheckStatus(value) === "amber")
    .map(([label]) => ({
      key: `check:${label}`,
      source: "checklist",
      title: `${label} monitor`,
      value: "Amber",
      unit: "",
      details: checkNotes[label]
        ? `${label}: ${checkNotes[label]}`
        : `${label} was marked amber on the service checklist.`,
    }));
}

function buildServiceDefectActions(redDefects, currentActions = {}) {
  return redDefects.reduce((acc, defect) => {
    const existing = currentActions?.[defect.key] || {};
    acc[defect.key] = {
      ...defect,
      action: existing.action || "",
      note: existing.note || "",
      defectReportId: existing.defectReportId || "",
    };
    return acc;
  }, {});
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

async function uploadPhotoList(photoItems, basePath) {
  const uris = photoItems.map((p) => (typeof p === "string" ? p : p?.uri)).filter(Boolean);

  const uploaded = [];
  for (const [index, uri] of uris.entries()) {
    if (isDownloadUrl(uri)) {
      uploaded.push(uri);
      continue;
    }

    const filename = `${Date.now()}-${index}.jpg`;
    uploaded.push(await uploadImageUri(uri, `${basePath}/${filename}`));
  }

  return uploaded;
}

async function uploadCheckPhotoMap(checkPhotosMap, basePath) {
  const uploadedMap = {};

  for (const [label, photoItems] of Object.entries(checkPhotosMap)) {
    if (!Array.isArray(photoItems) || photoItems.length === 0) continue;
    const safeLabel = sanitizeStorageSegment(label);
    const uploaded = await uploadPhotoList(photoItems, `${basePath}/${safeLabel}`);
    if (uploaded.length > 0) {
      uploadedMap[label] = uploaded;
    }
  }

  return uploadedMap;
}

function parseServiceFormNumber(value) {
  const parsed = Number(String(value || "").replace(/\D/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatServiceFormNumber(value) {
  const parsed = parseServiceFormNumber(value);
  return parsed ? String(parsed).padStart(3, "0") : "";
}

async function getNextServiceFormNumberValue(readServiceCollection, currentRecordId = null) {
  const rows = await readServiceCollection("serviceRecords", { force: true });
  let max = 0;

  rows.forEach((data) => {
    if (currentRecordId && data.id === String(currentRecordId)) return;
    const parsed =
      parseServiceFormNumber(data.serviceFormNumberValue) ||
      parseServiceFormNumber(data.serviceFormNumber);
    if (parsed && parsed > max) max = parsed;
  });

  return max + 1;
}

export default function ServiceFormScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, recordId, workshopRequestId: routeWorkshopRequestId, vehicleId: routeRequestedVehicleId } = useLocalSearchParams();
  const [workshopRequestId, setWorkshopRequestId] = useState(String(routeWorkshopRequestId || ""));
  const [requestedVehicleId, setRequestedVehicleId] = useState(String(routeRequestedVehicleId || ""));
  const formId = Array.isArray(id) ? id[0] : id; // ensure string
  const editRecordId = Array.isArray(recordId) ? recordId[0] : recordId;
  const isEditingRecord = !!editRecordId;
  const { employee } = useAuth();
  const allowLeaveRef = useRef(false);
  const draftDeletedRef = useRef(false);
  const pendingDraftSavesRef = useRef(new Set());

  const { colors } = useTheme();
  const readServiceCollection = useServiceCollectionReader();
  const { upsertServiceRow, patchServiceRow } = useServiceCacheActions();

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 🔎 VEHICLE SEARCH + SELECTION
  const [selectedVehicleId, setSelectedVehicleId] = useState(requestedVehicleId ? String(requestedVehicleId) : null);
  const [vehicleCollapsed, setVehicleCollapsed] = useState(false);

  // INITIAL DATE/TIME (AUTO, NON-EDITABLE)
  const now = getNowParts();
  const [serviceDate, setServiceDate] = useState(now.date); // read-only
  const [serviceTime, setServiceTime] = useState(now.time); // read-only

  // SERVICE FIELDS
  const [odometer, setOdometer] = useState("");
  const [serviceType, setServiceType] = useState("Full service");
  const [serviceTypeOpen, setServiceTypeOpen] = useState(false);
  const [workSummary, setWorkSummary] = useState("");
  const [partsUsed, setPartsUsed] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  // SIGNATURE
  const [signedBy, setSignedBy] = useState("");

  // CHECKLIST STATE
  const [checks, setChecks] = useState({}); // { label: true }
  const [checkRatings, setCheckRatings] = useState({}); // { label: "green" | "amber" | "red" }
  const [checkNA, setCheckNA] = useState({}); // { label: true if N/A }
  const [checkNotes, setCheckNotes] = useState({}); // { label: "note text" }
  const [checkPhotos, setCheckPhotos] = useState({}); // { label: [{ uri }] }
  const [wheelInspection, setWheelInspection] = useState(() =>
    normalizeWheelInspection(EMPTY_WHEEL_INSPECTION)
  );
  const [serviceDefectActions, setServiceDefectActions] = useState({});

  // GLOBAL PHOTOS
  const [photos, setPhotos] = useState([]); // [{ uri }]

  // Picker for per-check photos
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  const [photoPickerLabel, setPhotoPickerLabel] = useState(null);

  const allChecklistLabels = useMemo(
    () => [
      ...CHECK_ENGINE_FLUIDS,
      ...CHECK_SAFETY_CHASSIS,
      ...CHECK_ELECTRICAL_TEST,
    ],
    []
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
        console.error("Failed to load vehicles for service form:", err);
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

  const redWheelDefects = useMemo(
    () => buildRedWheelDefects(wheelInspection),
    [wheelInspection]
  );

  const redChecklistDefects = useMemo(
    () => buildRedChecklistDefects(checkRatings, checkNotes),
    [checkNotes, checkRatings]
  );

  const redServiceDefects = useMemo(
    () => [...redWheelDefects, ...redChecklistDefects],
    [redChecklistDefects, redWheelDefects]
  );

  const monitorReport = useMemo(
    () => [
      ...buildAmberWheelMonitorItems(wheelInspection),
      ...buildAmberChecklistMonitorItems(checkRatings, checkNotes),
    ],
    [checkNotes, checkRatings, wheelInspection]
  );

  const activeServiceDefectActions = useMemo(
    () => buildServiceDefectActions(redServiceDefects, serviceDefectActions),
    [redServiceDefects, serviceDefectActions]
  );

  const hasUnsavedChanges = useMemo(
    () =>
      !!selectedVehicleId ||
      !!odometer.trim() ||
      serviceType !== "Full service" ||
      !!workSummary.trim() ||
      !!partsUsed.trim() ||
      !!extraNotes.trim() ||
      !!signedBy.trim() ||
      Object.keys(checks || {}).length > 0 ||
      Object.keys(checkRatings || {}).length > 0 ||
      Object.keys(checkNA || {}).length > 0 ||
      Object.values(checkNotes || {}).some((value) => String(value || "").trim()) ||
      Object.values(checkPhotos || {}).some(
        (items) => Array.isArray(items) && items.length > 0
      ) ||
      hasWheelInspectionData(wheelInspection) ||
      Object.values(serviceDefectActions || {}).some((item) => item?.action || item?.note) ||
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
      serviceDefectActions,
      serviceType,
      signedBy,
      wheelInspection,
      workSummary,
    ]
  );

  const confirmLeave = (onLeave) => {
    if (!hasUnsavedChanges || allowLeaveRef.current) {
      onLeave();
      return;
    }

    Alert.alert(
      "Leave service form?",
      "Your progress has been saved as a draft. You can continue it from Workshop Forms.",
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
        "Leave service form?",
        "Your progress has been saved as a draft. You can continue it from Workshop Forms.",
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

  const nextServiceComputed = useMemo(
    () => computeNextServiceFromDate(serviceDate),
    [serviceDate]
  );

  /* ---------------- LOAD DRAFT FOR THIS FORM ID ---------------- */

  useEffect(() => {
    const loadDraft = async () => {
      if (isEditingRecord) return;
      if (!formId) return;
      try {
        const raw = await AsyncStorage.getItem(SERVICE_DRAFTS_KEY);
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
        if (draft.serviceDate) setServiceDate(formatDateForDisplay(draft.serviceDate));
        if (draft.serviceTime) setServiceTime(draft.serviceTime);
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
        setWheelInspection(normalizeWheelInspection(draft.wheelInspection));
        setServiceDefectActions(draft.serviceDefectActions || {});

        if (draft.checkPhotoURIs && typeof draft.checkPhotoURIs === "object") {
          const built = {};
          Object.entries(draft.checkPhotoURIs).forEach(([label, uris]) => {
            if (Array.isArray(uris)) {
              built[label] = uris.map((uri) => ({ uri }));
            }
          });
          setCheckPhotos(built);
        }

        if (Array.isArray(draft.photoURIs)) {
          setPhotos(draft.photoURIs.map((uri) => ({ uri })));
        }
      } catch (err) {
        console.error("Failed to load service draft:", err);
      }
    };

    loadDraft();
  }, [formId, isEditingRecord]);

  /* ---------------- LOAD EXISTING RECORD FOR EDIT ---------------- */

  useEffect(() => {
    const loadRecordForEdit = async () => {
      if (!editRecordId) return;

      setLoadingRecord(true);
      try {
        const ref = doc(db, "serviceRecords", String(editRecordId));
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          Alert.alert("Not found", "Could not find this service record.");
          router.back();
          return;
        }

        const record = snap.data();
        setEditingRecord({ id: snap.id, ...record });
        const { date, time } = splitServiceDateTime(record);

        setSelectedVehicleId(record.vehicleId || null);
        setVehicleCollapsed(!!record.vehicleId);
        if (date) setServiceDate(date);
        if (time) setServiceTime(time);
        if (record.odometer !== undefined && record.odometer !== null) {
          setOdometer(String(record.odometer));
        }
        if (record.serviceType) setServiceType(record.serviceType);
        setWorkSummary(record.workSummary || "");
        setPartsUsed(record.partsUsed || "");
        setExtraNotes(record.extraNotes || "");
        setSignedBy(record.signedBy || "");
        setChecks(record.checks || {});
        setCheckRatings(record.checkRatings || {});
        setCheckNA(record.checkNA || {});
        setCheckNotes(record.checkNotes || {});
        setWheelInspection(normalizeWheelInspection(record.wheelInspection));
        setServiceDefectActions(record.serviceDefectActions || {});

        const builtCheckPhotos = {};
        Object.entries(record.checkPhotoURIs || record.checkPhotoURLs || {}).forEach(
          ([label, uris]) => {
            if (Array.isArray(uris)) {
              builtCheckPhotos[label] = uris.map((uri) => ({ uri }));
            }
          }
        );
        setCheckPhotos(builtCheckPhotos);

        const existingPhotos = record.photoURIs || record.photoURLs || [];
        if (Array.isArray(existingPhotos)) {
          setPhotos(existingPhotos.map((uri) => ({ uri })));
        }
      } catch (err) {
        console.error("Failed to load service record for edit:", err);
        Alert.alert("Error", "Could not load this service record for editing.");
      } finally {
        setLoadingRecord(false);
      }
    };

    loadRecordForEdit();
  }, [editRecordId, router]);

  /* ---------------- AUTO-SAVE DRAFT LOCALLY (MULTI) ---------------- */

  useEffect(() => {
    const saveDraft = async () => {
      if (isEditingRecord) return;
      if (!formId) return;
      if (draftDeletedRef.current) return;

      try {
        const vehicleName = getVehicleName(selectedVehicle) || "";
        const registration = getVehicleRegistration(selectedVehicle) || "";

        const hasCheckPhotos = Object.values(checkPhotos).some(
          (arr) => Array.isArray(arr) && arr.length > 0
        );

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
          hasWheelInspectionData(wheelInspection) ||
          Object.keys(serviceDefectActions).length > 0 ||
          photos.length > 0 ||
          hasCheckPhotos;

        const raw = await AsyncStorage.getItem(SERVICE_DRAFTS_KEY);
        if (draftDeletedRef.current) return;
        const allDrafts = raw ? JSON.parse(raw) || {} : {};

        if (!hasAnyContent) {
          // remove this draft if empty
          if (allDrafts[formId]) {
            delete allDrafts[formId];
            if (Object.keys(allDrafts).length === 0) {
              await AsyncStorage.removeItem(SERVICE_DRAFTS_KEY);
            } else {
              await AsyncStorage.setItem(
                SERVICE_DRAFTS_KEY,
                JSON.stringify(allDrafts)
              );
            }
          }
          return;
        }

        const checkPhotoURIs = {};
        Object.entries(checkPhotos).forEach(([label, arr]) => {
          if (Array.isArray(arr) && arr.length > 0) {
            checkPhotoURIs[label] = arr.map((p) => p.uri);
          }
        });

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
          wheelInspection,
          serviceDefectActions: activeServiceDefectActions,
          monitorReport,
          checkPhotoURIs,
          photoURIs: photos.map((p) => p.uri),
        };

        allDrafts[formId] = draftToSave;
        await AsyncStorage.setItem(
          SERVICE_DRAFTS_KEY,
          JSON.stringify(allDrafts)
        );
      } catch (err) {
        console.error("Failed to save service draft:", err);
      }
    };

    const pendingSave = saveDraft();
    pendingDraftSavesRef.current.add(pendingSave);
    pendingSave.finally(() => pendingDraftSavesRef.current.delete(pendingSave));
  }, [
    formId,
    isEditingRecord,
    workshopRequestId,
    requestedVehicleId,
    selectedVehicleId,
    selectedVehicle,
    odometer,
    serviceType,
    serviceDate,
    serviceTime,
    serviceDefectActions,
    monitorReport,
    workSummary,
    partsUsed,
    extraNotes,
    signedBy,
    checks,
    checkRatings,
    checkNA,
    checkNotes,
    wheelInspection,
    activeServiceDefectActions,
    checkPhotos,
    photos,
  ]);

  /* ---------------- HELPERS ---------------- */

  const toggleCheck = (label) => {
    setCheckNA((prev) => ({ ...prev, [label]: false }));
    setChecks((prev) => {
      const nextChecked = !prev[label];
      if (nextChecked) {
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
      }

      return {
        ...prev,
        [label]: newVal,
      };
    });
  };

  const updateRating = (label, value) => {
    setCheckNA((prev) => ({ ...prev, [label]: false }));
    setCheckRatings((prev) => ({
      ...prev,
      [label]: normalizeCheckStatus(value) || "green",
    }));
    setChecks((prev) => ({
      ...prev,
      [label]: true,
    }));
  };

  const updateNote = (label, text) => {
    setCheckNotes((prev) => ({
      ...prev,
      [label]: text,
    }));
  };

  const updateWheelInspection = (wheelKey, field, value) => {
    setWheelInspection((prev) => ({
      ...normalizeWheelInspection(prev),
      [wheelKey]: {
        ...normalizeWheelInspection(prev)[wheelKey],
        [field]: value,
      },
    }));
  };

  const updateServiceDefectAction = (defectKey, action) => {
    setServiceDefectActions((prev) => ({
      ...prev,
      [defectKey]: {
        ...(activeServiceDefectActions[defectKey] || {}),
        action,
      },
    }));
  };

  const openPhotoPickerForLabel = (label) => {
    setPhotoPickerLabel(label);
    setPhotoPickerVisible(true);
  };

  const handleRemoveCheckPhoto = (label, uri) => {
    setCheckPhotos((prev) => {
      const existing = prev[label] || [];
      const nextArr = existing.filter((p) => p.uri !== uri);
      const next = { ...prev, [label]: nextArr };
      if (nextArr.length === 0) {
        delete next[label];
      }
      return next;
    });
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
      const completed = checks[label] || !!status;
      if (!completed) {
        Alert.alert(
          "Checklist incomplete",
          `Please complete or mark N/A: "${label}".`
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

    for (const defect of redServiceDefects) {
      const action = activeServiceDefectActions[defect.key]?.action || "";
      if (!action) {
        Alert.alert(
          "Defect action required",
          `Please mark "${defect.title}" as repaired, replaced or not repaired.`
        );
        return false;
      }
    }

    return true;
  };

  /* ---------------- GLOBAL PHOTOS ---------------- */

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

  /* ---------------- PER-CHECK PHOTO HANDLERS ---------------- */

  const handleAddCheckPhotoFromLibrary = async () => {
    if (!photoPickerLabel) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setCheckPhotos((prev) => {
        const existing = prev[photoPickerLabel] || [];
        return {
          ...prev,
          [photoPickerLabel]: [...existing, { uri: asset.uri }],
        };
      });
    } catch (err) {
      console.error("Failed to pick image for check:", err);
      Alert.alert("Error", "Could not open photo library.");
    } finally {
      setPhotoPickerVisible(false);
      setPhotoPickerLabel(null);
    }
  };

  /* ---------------- DELETE DRAFT BUTTON ---------------- */

  const handleDeleteDraft = () => {
    Alert.alert(
      "Delete service form?",
      "This will delete this draft and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            draftDeletedRef.current = true;
            try {
              if (!formId) {
                allowLeaveRef.current = true;
                router.back();
                return;
              }
              await removeServiceDraft(AsyncStorage, formId, [...pendingDraftSavesRef.current]);
              allowLeaveRef.current = true;
              router.back();
            } catch (err) {
              draftDeletedRef.current = false;
              console.error("Failed to delete service draft:", err);
              Alert.alert(
                "Error",
                "Could not delete draft. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async () => {
    if (workshopRequestId && String(selectedVehicleId) !== String(requestedVehicleId)) {
      Alert.alert("Wrong vehicle", "Complete this request for its selected vehicle.");
      return;
    }
    if (workshopRequestId && serviceType.trim().toLowerCase() !== "full service") {
      Alert.alert("Full service required", "This request needs a full service record.");
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const v = selectedVehicle;
      const companyId = employee?.companyId;
      if (!companyId) throw new Error("Your company could not be verified. Sign in again before saving.");
      const odoNumber = odometer ? Number(odometer) : null;
      const nextServiceDate = nextServiceComputed || null;
      const serviceDateTime = `${serviceDate} ${serviceTime}`;
      const recordVehicleName =
        getVehicleName(v) || editingRecord?.vehicleName || "";
      const recordRegistration =
        getVehicleRegistration(v) || editingRecord?.registration || "";

      const serviceRecordRef = isEditingRecord
        ? doc(db, "serviceRecords", String(editRecordId))
        : doc(db, "serviceRecords", String(workshopRequestId || formId));
      const storageBasePath = `companies/${companyId}/vehicles/${selectedVehicleId}/service/${serviceRecordRef.id}`;
      const existingServiceFormNumberValue =
        parseServiceFormNumber(editingRecord?.serviceFormNumberValue) ||
        parseServiceFormNumber(editingRecord?.serviceFormNumber);
      const serviceFormNumberValue =
        existingServiceFormNumberValue ||
        (await getNextServiceFormNumberValue(
          readServiceCollection,
          isEditingRecord ? editRecordId : null
        ));
      const serviceFormNumber = formatServiceFormNumber(serviceFormNumberValue);

      const photoURLs = await uploadPhotoList(
        photos,
        `${storageBasePath}/overall`
      );
      const checkPhotoURLs = await uploadCheckPhotoMap(
        checkPhotos,
        `${storageBasePath}/checks`
      );

      const serviceDefectActionsForRecord = { ...activeServiceDefectActions };
      const submissionDefects = [];
      for (const action of Object.values(serviceDefectActionsForRecord)) {
        if (action.action !== "not_repaired" || action.defectReportId) continue;

        const defectRef = doc(db, "defectReports", `${serviceRecordRef.id}-defect-${submissionDefects.length}`);
        const description = `${action.title}. ${action.description} Marked not repaired on service form.`;
        const payload = {
          companyId,
          vehicleId: selectedVehicleId,
          vehicleName: recordVehicleName,
          registration: recordRegistration,
          location: "Service form",
          description,
          severity: "Immediate",
          priority: "high",
          offRoad: false,
          reportedBy: signedBy.trim(),
          notes: action.note || "",
          status: "open",
          source: "serviceForm",
          sourceRecordId: serviceRecordRef.id,
          sourceDefectKey: action.key,
          photoURIs: [],
          photoURLs: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        submissionDefects.push({ id: defectRef.id, data: payload });
        serviceDefectActionsForRecord[action.key] = {
          ...action,
          defectReportId: defectRef.id,
        };

      }

      const record = {
        companyId,
        ...(workshopRequestId ? { workshopRequestId: String(workshopRequestId), workshopWorkType: "full_service" } : {}),
        vehicleId: selectedVehicleId,
        vehicleName: recordVehicleName,
        registration: recordRegistration,
        manufacturer: getVehicleManufacturer(v) || editingRecord?.manufacturer || "",
        model: v?.model || editingRecord?.model || "",
        serviceFormNumber,
        serviceFormNumberValue,
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
        wheelInspection,
        monitorReport,
        serviceDefectActions: serviceDefectActionsForRecord,
        checkPhotoURIs: checkPhotoURLs,
        checkPhotoURLs,
        photoURIs: photoURLs,
        photoURLs,
        signedBy: signedBy.trim(),
        ...(isEditingRecord
          ? { updatedAt: new Date().toISOString() }
          : { createdAt: new Date().toISOString() }),
      };

      const result = await submitOrQueueWorkshopRecord({ recordId: serviceRecordRef.id, record, defects: submissionDefects, mode: isEditingRecord ? "update" : "create" });
      const { queued } = result;
      await Promise.allSettled([
        upsertServiceRow("serviceRecords", { ...(result.record || record), id: serviceRecordRef.id }),
        ...(result.vehiclePatch ? [patchServiceRow("vehicles", selectedVehicleId, result.vehiclePatch)] : []),
      ]);

      // 🔥 clear just this draft now it’s finished
      try {
        draftDeletedRef.current = true;
        await removeServiceDraft(AsyncStorage, formId, [...pendingDraftSavesRef.current]);
      } catch (e) {
        console.error("Failed to remove draft after submit:", e);
      }

      Alert.alert(
        queued
          ? "Saved offline"
          : isEditingRecord
          ? "Service updated"
          : "Service saved",
        queued
          ? "No internet right now. This service will upload automatically when internet returns."
          : isEditingRecord
          ? "Service record updated."
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
      console.error("Failed to save service record:", err);
      Alert.alert("Error", err.message || "Could not save service record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- RENDER ---------------- */

  return (
    <PageShell mode="form" width="form" header={{
      variant: "compact",
      title: isEditingRecord ? "Edit Service Record" : "Service Job Form",
      subtitle: isEditingRecord
        ? "Update missed details, check status, notes and photos."
        : "Record full service, check status and photos.",
      onBack: () => confirmLeave(() => router.back()),
    }}>
      {/* HEADER */}


      <>
        {loadingRecord && (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color={COLORS.primaryAction} />
            <Text style={styles.emptyText}>Loading service record…</Text>
          </View>
        )}

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
              <Text
                tone={"muted"} style={[
                  styles.fieldLabel,
                ]}
              >
                Selected vehicle
              </Text>
              <View style={styles.selectedVehicleRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    tone={"primary"} style={[
                      styles.vehicleName,
                    ]}
                  >
                    {getVehicleName(selectedVehicle) || "Unnamed vehicle"}
                  </Text>
                  <Text
                    tone={"muted"} style={[
                      styles.vehicleReg,
                    ]}
                  >
                    {getVehicleRegistration(selectedVehicle) || "—"}
                  </Text>
                </View>
              </View>
              <View style={styles.vehicleMetaRow}>
                <Text
                  tone={"muted"} style={[
                    styles.vehicleMeta,
                  ]}
                >
                  Current mileage:{" "}
                  {typeof getVehicleMileage(selectedVehicle) === "number"
                    ? `${getVehicleMileage(selectedVehicle).toLocaleString("en-GB")} mi`
                    : "—"}
                </Text>
                <Text
                  tone={"muted"} style={[
                    styles.vehicleMeta,
                  ]}
                >
                  Last service: {formatDateForDisplay(getVehicleLastService(selectedVehicle)) || "—"}
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
            <Text
              tone={"primary"} style={[
                styles.fieldLabel,
              ]}
            >
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
                {serviceDate}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text
              tone={"primary"} style={[
                styles.fieldLabel,
              ]}
            >
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
            <Text
              tone={"primary"} style={[
                styles.fieldLabel,
              ]}
            >
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
              <Icon
                name={serviceTypeOpen ? "chevron-up" : "chevron-down"}
                size={18}
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
            <Text
              tone={"primary"} style={[
                styles.fieldLabel,
              ]}
            >
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

        <WheelFootprintSection
          wheelInspection={wheelInspection}
          updateWheelInspection={updateWheelInspection}
        />

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
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
        />

        <ChecklistSection
          title="Safety & chassis"
          hint="Condition/security checks. Wheel measurements are recorded in the footprint."
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
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
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
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
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

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceAlt || COLORS.card,
              borderColor: colors.border || COLORS.border,
            },
          ]}
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
        </View>

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

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceAlt || COLORS.card,
              borderColor: colors.border || COLORS.border,
            },
          ]}
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
        </View>

        {/* PHOTOS / ATTACHMENTS (OVERALL) */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Photos / attachments (overall)
          </Text>
          <Text
            tone={"muted"} style={[
              styles.sectionHint,
            ]}
          >
            General photos not tied to a single check.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceAlt || COLORS.card,
              borderColor: colors.border || COLORS.border,
            },
          ]}
        >
          <View style={styles.photoButtonsRow}>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handleAddPhotoFromLibrary}
              activeOpacity={0.85}
            >
              <Icon
                name="image"
                size={18}
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
                    <Icon name="x" size={12} color={COLORS.textHigh} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <MonitorReportSection monitorItems={monitorReport} />

        <RedDefectReportSection
          redDefects={redServiceDefects}
          actions={activeServiceDefectActions}
          updateAction={updateServiceDefectAction}
        />

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
              <Icon
                name="save"
                size={18}
                color={COLORS.textHigh}
                style={{ marginRight: t.spacing.xxs }}
              />
              <Text style={styles.submitText}>
                {isEditingRecord ? "Save changes" : "Save service & update vehicle"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* DELETE BUTTON */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteDraft}
          activeOpacity={0.9}
        >
          <Icon
            name="trash-2"
            size={18}
            color={COLORS.textHigh}
            style={{ marginRight: t.spacing.xxs }}
          />
          <Text style={styles.deleteText}>Delete service form</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </>

      {/* PER-CHECK PHOTO PICKER MODAL */}
      <AppModal
        visible={photoPickerVisible}
        title="Add photo for check"
        onRequestClose={() => {
          setPhotoPickerVisible(false);
          setPhotoPickerLabel(null);
        }}
        presentation="adaptive"
        actions={
          <AppButton
            label="Cancel"
            variant="secondary"
            onPress={() => {
              setPhotoPickerVisible(false);
              setPhotoPickerLabel(null);
            }}
          />
        }
      >
        <AppButton label="Add from library" icon="image" variant="secondary" onPress={handleAddCheckPhotoFromLibrary} />
      </AppModal>
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

function WheelFootprintSection({ wheelInspection, updateWheelInspection }) {
  const { colors } = useTheme();
  const wheelData = normalizeWheelInspection(wheelInspection);
  const renderWheelCard = (wheel) => {
    const item = wheelData[wheel.key] || {};

    return (
      <View
        key={wheel.key}
        style={[
          styles.wheelCard,
          {
            backgroundColor: colors.surface || COLORS.background,
            borderColor: colors.border || COLORS.border,
          },
        ]}
      >
        <View style={styles.wheelCardHeader}>
          <View style={styles.wheelBadge}>
            <Text style={styles.wheelBadgeText}>{wheel.shortLabel}</Text>
          </View>
          <Text tone={"primary"} style={[styles.wheelTitle]}>
            {wheel.label}
          </Text>
        </View>

        <WheelMetricInput
          label="Tread"
          suffix="mm"
          value={item.tread}
          status={getTreadStatus(item.tread)}
          onChangeText={(text) => updateWheelInspection(wheel.key, "tread", text)}
        />
        <WheelMetricInput
          label="Pressure"
          suffix="psi"
          value={item.pressure}
          onChangeText={(text) => updateWheelInspection(wheel.key, "pressure", text)}
        />
        <WheelMetricInput
          label="Brake wear"
          suffix="%"
          value={item.brakeWear}
          status={getBrakeWearStatus(item.brakeWear)}
          onChangeText={(text) => updateWheelInspection(wheel.key, "brakeWear", text)}
        />
        <TextArea
          label={`${wheel.label} wheel note`}
          autoGrow
          value={item.note}
          onChangeText={(text) => updateWheelInspection(wheel.key, "note", text)}
          placeholder="Wheel note..."
        />
      </View>
    );
  };

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text
          tone={"primary"} style={[
            styles.sectionTitle,
          ]}
        >
          Tyres & brakes footprint
        </Text>
        <Text
          tone={"muted"} style={[
            styles.sectionHint,
          ]}
        >
          Record tread depth, tyre pressure and brake wear at each wheel.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceAlt || COLORS.card,
            borderColor: colors.border || COLORS.border,
          },
        ]}
      >
        <View style={styles.vehicleFootprint}>
          <View style={styles.wheelColumn}>
            {renderWheelCard(WHEEL_POSITIONS[0])}
            {renderWheelCard(WHEEL_POSITIONS[2])}
          </View>

          <View style={styles.vehicleBody}>
            <Text style={styles.vehicleBodyText}>FRONT</Text>
            <View style={styles.vehicleBodyLine} />
            <Text style={styles.vehicleBodyText}>REAR</Text>
          </View>

          <View style={styles.wheelColumn}>
            {renderWheelCard(WHEEL_POSITIONS[1])}
            {renderWheelCard(WHEEL_POSITIONS[3])}
          </View>
        </View>
      </View>
    </>
  );
}

function WheelMetricInput({ label, suffix, value, status, onChangeText }) {
  const statusOption = getCheckStatusOption(status);

  return (
    <View style={styles.wheelMetricRow}>
        <SharedFormField
          label={label}
          hint={statusOption ? `${suffix} · ${statusOption.label}` : suffix}
          value={value}
          onChangeText={onChangeText}
          placeholder="--"
          inputProps={{ keyboardType: "decimal-pad" }}
        />
    </View>
  );
}

function MonitorReportSection({ monitorItems }) {
  const { colors } = useTheme();
  if (!monitorItems.length) return null;

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text
          tone={"primary"} style={[
            styles.sectionTitle,
          ]}
        >
          Monitor report
        </Text>
        <Text
          tone={"muted"} style={[
            styles.sectionHint,
          ]}
        >
          Amber checklist, tyre or brake items to monitor.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceAlt || COLORS.card,
            borderColor: routeColors.hex_f59e0b_4zbh7f,
          },
        ]}
      >
        {monitorItems.map((item) => (
          <View key={item.key} style={styles.monitorReportRow}>
            <View style={styles.monitorReportBadge}>
              <Text style={styles.monitorReportBadgeText}>M</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text tone={"primary"} style={[styles.monitorReportTitle]}>
                {item.title}
              </Text>
              <Text
                tone={"muted"} style={[
                  styles.monitorReportDetails,
                ]}
              >
                {item.details}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function RedDefectReportSection({ redDefects, actions, updateAction }) {
  const { colors } = useTheme();
  if (!redDefects.length) return null;
  const hasWheelDefects = redDefects.some((item) => item.metric === "tread" || item.metric === "brakeWear");

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text
          tone={"primary"} style={[
            styles.sectionTitle,
          ]}
        >
          Defect report
        </Text>
        <Text
          tone={"muted"} style={[
            styles.sectionHint,
          ]}
        >
          {hasWheelDefects
            ? "Red checklist, tyre or brake items must be marked before saving."
            : "Red checklist items must be marked before saving."}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceAlt || COLORS.card,
            borderColor: COLORS.primaryAction,
          },
        ]}
      >
        {redDefects.map((defect) => {
          const selectedAction = actions?.[defect.key]?.action || "";

          return (
            <View key={defect.key} style={styles.redDefectRow}>
              <View style={styles.redDefectHeader}>
                <View style={styles.redDefectIcon}>
                  <Icon name="alert-triangle" size={15} color={COLORS.textHigh} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text tone={"primary"} style={[styles.redDefectTitle]}>
                    {defect.title}
                  </Text>
                  <Text
                    tone={"muted"} style={[
                      styles.redDefectMeta,
                    ]}
                  >
                    {defect.value}
                    {defect.unit} recorded
                  </Text>
                </View>
              </View>

              <View style={styles.defectActionRow}>
                {DEFECT_ACTION_OPTIONS.map((option) => {
                  const active = selectedAction === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.defectActionPill,
                        {
                          borderColor: active ? COLORS.primaryAction : COLORS.lightGray,
                          backgroundColor: active
                            ? getServiceStatusColors("danger").background
                            : "transparent",
                        },
                      ]}
                      onPress={() => updateAction(defect.key, option.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.defectActionText,
                          {
                            color: active
                              ? getServiceStatusColors("danger").onBackground
                              : colors.textMuted || COLORS.textLow,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

export function ChecklistSection({
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
  openPhotoPickerForLabel,
  removePhotoForLabel,
}) {
  const { colors } = useTheme();

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

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceAlt || COLORS.card,
            borderColor: colors.border || COLORS.border,
          },
        ]}
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
            onPressPhoto={() => openPhotoPickerForLabel(item)}
            onRemovePhoto={(uri) => removePhotoForLabel(item, uri)}
          />
        ))}
      </View>
    </>
  );
}

function ChecklistRow({
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
  const selectedStatus = normalizeCheckStatus(rating);
  const selectedPalette = paletteFor(selectedStatus);
  const neutralPalette = paletteFor("");
  const requiresNote = NOTE_REQUIRED_STATUSES.has(selectedStatus);
  const noteMissing = requiresNote && !String(note || "").trim();

  return (
    <View testID="service-check-row" style={styles.checkRowWrapper}>
      {/* Left: tick + label */}
      <TouchableOpacity
        style={styles.checkRowLeft}
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked }}
        aria-checked={checked}
        activeOpacity={0.8}
      >
        <View style={styles.checkIconWrap}>
          {checked ? (
            <View
              style={[
                styles.checkIconFilled,
                { backgroundColor: selectedPalette.background },
              ]}
            >
              <Icon name="check" size={18} color={selectedPalette.onBackground} />
            </View>
          ) : (
            <View
              style={[
                styles.checkIconEmpty,
                na && { borderColor: COLORS.textLow, opacity: 0.4 },
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
          <Icon name="image" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Notes for this check */}
      <TextArea
        label="Check notes"
        autoGrow
        error={noteMissing ? "Notes are required for this status." : undefined}
        placeholder={requiresNote ? "Notes required for amber/red..." : "Notes for this check..."}
        value={note}
        onChangeText={onChangeNote}
      />

      {/* Photos for this check */}
      {photos && photos.length > 0 && (
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
                <Icon name="x" size={12} color={COLORS.textHigh} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
