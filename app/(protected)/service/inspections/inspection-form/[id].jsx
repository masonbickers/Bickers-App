import AssetSelectField from "../../../../../components/ui/AssetSelectField";
import { routeColors } from "../../../../../lib/design/routePresentation/service-inspections-inspection-form-id-jsx.js";
import { styles } from "../../../../../lib/design/screenStyles/service-inspections-inspection-form-id-jsx.js";
import { SectionCard, AppButton, AppModal, AppText as Text, AppPressable as TouchableOpacity, FormField as SharedFormField, TextArea } from "../../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../../../lib/design/semantics";
// app/(protected)/service/inspections/inspection-form/[id].jsx
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams,
  useNavigation,
  useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  ScrollView,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { db, storage } from "../../../../../firebaseConfig";
import { formatISODateDDMMYYYY, parseDDMMYYYYToISO } from "../../../../../lib/dateFormat";
import {
  buildEquipmentCoreUpdate,
  getEquipmentCategory,
  getEquipmentLastInspection,
  getEquipmentName,
  getEquipmentNextInspection,
  getEquipmentStatus,
} from "../../../../../lib/fleetSchema";
import { useServiceCacheActions, useServiceCollectionReader } from "../../../../../hooks/useServiceData";
import { runOrQueueFirestoreMutations } from "../../../../../lib/sync/firestoreQueue";
import { workshopCompletionMutation } from "../../../../../lib/workshopRequestSync";
import { useTheme } from "../../../../../providers/ThemeProvider";
import { designTokens as t } from "../../../../../lib/design/tokens";
import PageShell from "../../../../../components/layout/PageShell";

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                           */
/* ------------------------------------------------------------------ */

const CHECK_STATUS_OPTIONS = [
  { value: "green", label: "Green", color: routeColors.hex_22c55e_740if4 },
  { value: "amber", label: "Amber", color: routeColors.hex_f59e0b_4zbh7f },
  { value: "red",   label: "Red",   color: routeColors.hex_ef4444_4oizhh },
];

const NOTE_REQUIRED_STATUSES = new Set(["amber", "red"]);

const OVERALL_RESULT_OPTIONS = [
  { value: "pass", label: "Pass",    color: routeColors.hex_22c55e_740if4 },
  { value: "fail", label: "Fail",    color: routeColors.hex_ef4444_4oizhh },
];

/* ------------------------------------------------------------------ */
/*  CHECKLIST ITEMS                                                     */
/* ------------------------------------------------------------------ */

const CHECK_STRUCTURAL = [
  "Frame / chassis integrity – no cracks or deformation",
  "Roll cage / protection structure secure and intact",
  "Bodywork / panels – no sharp edges or loose sections",
  "All mounting points secure – no wear or fatigue cracks",
  "Labels, markings and serial numbers legible",
];

const CHECK_SAFETY = [
  "Harness / restraints – no fraying, cuts or damage",
  "Harness buckles and adjusters fully functional",
  "Fire suppression system charged and accessible",
  "Kill switch / cut-off operational and clearly marked",
  "Safety padding in place and securely fitted",
  "Safety cage / net intact (if fitted)",
];

const CHECK_MECHANICAL = [
  "Engine starts and idles correctly",
  "Throttle response smooth – no sticking or hesitation",
  "Brakes functional – adequate pedal / lever feel",
  "Steering responsive – no excessive play",
  "Transmission / gearbox shifts correctly",
  "Suspension – no unusual noise or binding",
  "All fasteners and mounting points checked and secure",
];

const CHECK_ELECTRICAL_FLUIDS = [
  "Battery charged and terminals secure",
  "Wiring – no exposed, frayed or damaged cables",
  "All switches and controls functional",
  "Engine oil level correct – no leaks",
  "Coolant level correct – no leaks",
  "Fuel sufficient for planned activity",
  "No fluid leaks visible",
];

const CHECK_TYRES = [
  "Tyre pressures correct for activity",
  "Tyre condition – no cuts, bulges or excessive wear",
  "Wheel nuts / bolts torqued and secure",
  "Wheel bearings – no play or noise",
  "Drive shafts / axles – no damage or leaks",
];

const CHECK_LIGHTS_COMMS = [
  "All lights operational (if fitted)",
  "Horn operational",
  "Radio / intercom functional (if fitted)",
  "Camera mounts and wiring secure (if fitted)",
  "Dashboard warning lights confirmed clear",
];

const CHECKLIST_SECTIONS = [
  { title: "Structural condition", source: "structural", items: CHECK_STRUCTURAL },
  { title: "Safety systems", source: "safety", items: CHECK_SAFETY },
  { title: "Mechanical systems", source: "mechanical", items: CHECK_MECHANICAL },
  { title: "Electrical & fluids", source: "electricalFluids", items: CHECK_ELECTRICAL_FLUIDS },
  { title: "Tyres & running gear", source: "tyresRunningGear", items: CHECK_TYRES },
  { title: "Lights & communications", source: "lightsComms", items: CHECK_LIGHTS_COMMS },
];

const ALL_CHECKLIST_ITEMS = CHECKLIST_SECTIONS.flatMap((section) => section.items);

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */

function pad(n) {
  return String(n).padStart(2, "0");
}

function getNowParts() {
  const d = new Date();
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    dateISO: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function normalizeCheckStatus(value) {
  const s = String(value || "").trim().toLowerCase();
  if (s === "green" || s === "amber" || s === "red") return s;
  return "";
}

function normaliseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildEquipmentOptions(records) {
  return records
    .map((record) => {
      const name = String(getEquipmentName(record)).trim();
      const serial = String(record?.serialNumber || "").trim();
      const asset = String(record?.asset || "").trim();
      if (!name) return null;

      return {
        key: record.id,
        equipmentDocId: record.id,
        name,
        equipmentId: serial || asset,
        serialNumber: serial,
        asset,
        type: getEquipmentCategory(record) || "",
        category: getEquipmentCategory(record) || "",
        status: getEquipmentStatus(record) || "",
        location: record?.location || "",
        lastInspection: getEquipmentLastInspection(record) || "",
        inspectionFrequency: record?.inspectionFrequency || "",
        nextInspection: getEquipmentNextInspection(record) || "",
        notes: record?.notes || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      normaliseKey(a.name).localeCompare(normaliseKey(b.name))
    );
}

function findChecklistSource(label) {
  const section = CHECKLIST_SECTIONS.find((item) => item.items.includes(label));
  return section?.source || "inspection";
}

function buildInspectionReportItems({ checkRatings = {}, checkNotes = {}, targetStatus }) {
  return ALL_CHECKLIST_ITEMS
    .filter((label) => normalizeCheckStatus(checkRatings[label]) === targetStatus)
    .map((label) => ({
      key: `check:${label}`,
      source: findChecklistSource(label),
      title:
        targetStatus === "red"
          ? `${label} red`
          : `${label} monitor`,
      value: targetStatus === "red" ? "Red" : "Amber",
      unit: "",
      details: checkNotes[label]
        ? `${label}: ${checkNotes[label]}`
        : `${label} was marked ${targetStatus} on the equipment inspection.`,
    }));
}

function isDownloadUrl(uri) {
  return typeof uri === "string" && /^https?:\/\//i.test(uri);
}

async function compressAndUpload(uri, path) {
  if (isDownloadUrl(uri)) return uri;
  try {
    const manip = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1400 } }],
      { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
    );
    const response = await fetch(manip.uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob, {
        contentType: "image/jpeg",
      });
      task.on("state_changed", undefined, reject, resolve);
    });
    return getDownloadURL(storageRef);
  } catch {
    return uri;
  }
}

async function uploadPhotoList(photos, basePath) {
  const results = [];
  for (const [i, p] of photos.entries()) {
    const uri = typeof p === "string" ? p : p?.uri;
    if (!uri) continue;
    results.push(await compressAndUpload(uri, `${basePath}/${Date.now()}-${i}.jpg`));
  }
  return results;
}

async function uploadCheckPhotoMap(checkPhotos, basePath) {
  const out = {};
  for (const [label, photos] of Object.entries(checkPhotos)) {
    if (!Array.isArray(photos) || photos.length === 0) continue;
    const safeLabel = label.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60);
    out[label] = await uploadPhotoList(photos, `${basePath}/${safeLabel}`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */

export default function InspectionFormScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const readServiceCollection = useServiceCollectionReader();
  const { upsertServiceRow, patchServiceRow } = useServiceCacheActions();

  const formId = Array.isArray(id) ? id[0] : id;
  const preselectEquipmentDocId = Array.isArray(params.equipmentDocId)
    ? params.equipmentDocId[0]
    : params.equipmentDocId;
  const isNew = String(formId || "").startsWith("new-");
  const docId = isNew
    ? `insp-${String(formId).replace("new-", "")}`
    : String(formId);

  const allowLeaveRef = useRef(false);
  const now = getNowParts();

  /* ---- equipment details ---- */
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentId, setEquipmentId]     = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [equipmentDocId, setEquipmentDocId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [asset, setAsset] = useState("");
  const [equipmentStatus, setEquipmentStatus] = useState("");
  const [lastInspection, setLastInspection] = useState("");
  const [inspectionFrequency, setInspectionFrequency] = useState("");
  const [nextInspection, setNextInspection] = useState("");
  const [location, setLocation]           = useState("");
  const [hoursOrOdo, setHoursOrOdo]       = useState("");
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [loadingEquipment, setLoadingEquipment] = useState(true);
  const [selectedEquipmentKey, setSelectedEquipmentKey] = useState(null);
  const [equipmentCollapsed, setEquipmentCollapsed] = useState(false);
  const [equipmentDetailsOpen, setEquipmentDetailsOpen] = useState(false);

  /* ---- inspection meta ---- */
  const [inspectionDate, setInspectionDate] = useState(now.date);
  const [inspectionDateISO, setInspectionDateISO] = useState(now.dateISO);
  const [inspectionTime, setInspectionTime] = useState(now.time);
  const [inspectedBy, setInspectedBy]     = useState("");
  const [overallResult, setOverallResult] = useState("");

  /* ---- checklist state (shared across all sections) ---- */
  const [checkRatings, setCheckRatings] = useState({});
  const [checkNA,      setCheckNA]      = useState({});
  const [checkNotes,   setCheckNotes]   = useState({});
  const [checkPhotos,  setCheckPhotos]  = useState({});

  /* ---- notes / sign-off ---- */
  const [findings,      setFindings]      = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [extraNotes,    setExtraNotes]    = useState("");
  const [signedBy,      setSignedBy]      = useState("");

  /* ---- general photos ---- */
  const [photos, setPhotos] = useState([]);

  /* ---- ui state ---- */
  const [loadingRecord, setLoadingRecord] = useState(!isNew);
  const [submitting,    setSubmitting]    = useState(false);
  const [dirty,         setDirty]         = useState(false);

  /* ---- photo picker modal ---- */
  const [photoModalLabel, setPhotoModalLabel] = useState(null);

  const defectReport = useMemo(
    () =>
      buildInspectionReportItems({
        checkRatings,
        checkNotes,
        targetStatus: "red",
      }),
    [checkNotes, checkRatings]
  );

  const monitorReport = useMemo(
    () =>
      buildInspectionReportItems({
        checkRatings,
        checkNotes,
        targetStatus: "amber",
      }),
    [checkNotes, checkRatings]
  );


  const selectedEquipment = useMemo(
    () => equipmentOptions.find((item) => item.key === selectedEquipmentKey) || null,
    [equipmentOptions, selectedEquipmentKey]
  );

  useEffect(() => {
    const loadEquipmentOptions = async () => {
      try {
        setLoadingEquipment(true);
        const rows = await readServiceCollection("equipment");
        setEquipmentOptions(
          buildEquipmentOptions(rows)
        );
      } catch (err) {
        console.error("Failed to load equipment options:", err);
      } finally {
        setLoadingEquipment(false);
      }
    };

    loadEquipmentOptions();
  }, [readServiceCollection]);

  useEffect(() => {
    if (!isNew || !preselectEquipmentDocId || equipmentOptions.length === 0) return;
    if (selectedEquipmentKey === preselectEquipmentDocId) return;
    const match = equipmentOptions.find((item) => item.equipmentDocId === preselectEquipmentDocId);
    if (!match) return;
    setSelectedEquipmentKey(match.key);
    setEquipmentDocId(match.equipmentDocId || "");
    setEquipmentName(match.name || "");
    setEquipmentId(match.equipmentId || "");
    setSerialNumber(match.serialNumber || "");
    setAsset(match.asset || "");
    setEquipmentType(match.category || match.type || "");
    setEquipmentStatus(match.status || "");
    setLocation((prev) => prev || match.location || "");
    setLastInspection(match.lastInspection || "");
    setInspectionFrequency(match.inspectionFrequency || "");
    setNextInspection(match.nextInspection || "");
    setEquipmentCollapsed(true);
    setEquipmentDetailsOpen(!(match.name && (match.category || match.type)));
    setDirty(true);
  }, [equipmentOptions, isNew, preselectEquipmentDocId, selectedEquipmentKey]);

  /* ---------------------------------------------------------------- */
  /*  Load existing record                                             */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const loadedNow = getNowParts();
        const snap = await getDoc(doc(db, "equipmentInspections", docId));
        if (!snap.exists()) return;
        const d = snap.data() || {};
        setEquipmentName(d.equipmentName || "");
        setEquipmentId(d.equipmentId || "");
        setEquipmentType(d.equipmentType || d.category || "");
        setEquipmentDocId(d.equipmentDocId || "");
        setSerialNumber(d.serialNumber || d.equipmentId || "");
        setAsset(d.asset || "");
        setEquipmentStatus(d.equipmentStatus || d.status || "");
        setLastInspection(d.lastInspection || "");
        setInspectionFrequency(d.inspectionFrequency || "");
        setNextInspection(d.nextInspection || "");
        setSelectedEquipmentKey(d.equipmentDocId || null);
        setEquipmentCollapsed(!!(d.equipmentName || d.equipmentId));
        setEquipmentDetailsOpen(!(d.equipmentName && (d.equipmentType || d.category)));
        setLocation(d.location || "");
        setHoursOrOdo(d.hoursOrOdo || "");
        setInspectionDate(d.inspectionDate || loadedNow.date);
        setInspectionDateISO(d.inspectionDateISO || d.completedDate || loadedNow.dateISO);
        setInspectionTime(d.inspectionTime || loadedNow.time);
        setInspectedBy(d.inspectedBy || "");
        setOverallResult(d.overallResult || "");
        setCheckRatings(d.checkRatings || {});
        setCheckNA(d.checkNA || {});
        setCheckNotes(d.checkNotes || {});
        setCheckPhotos(
          Object.fromEntries(
            Object.entries(d.checkPhotos || {}).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.map((uri) => ({ uri, uploaded: true })) : [],
            ])
          )
        );
        setFindings(d.findings || "");
        setRecommendations(d.recommendations || "");
        setExtraNotes(d.extraNotes || "");
        setSignedBy(d.signedBy || "");
        setPhotos(
          (d.photoUrls || []).map((uri) => ({ uri, uploaded: true }))
        );
      } catch (e) {
        console.error("Failed to load inspection:", e);
      } finally {
        setLoadingRecord(false);
      }
    })();
  }, [docId, isNew]);

  /* ---------------------------------------------------------------- */
  /*  Dirty / leave guard                                              */
  /* ---------------------------------------------------------------- */
  function confirmLeave(action) {
    if (!dirty) { action(); return; }
    Alert.alert("Unsaved changes", "Discard changes and leave?", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: action },
    ]);
  }

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (allowLeaveRef.current || !dirty) return;
      e.preventDefault();
      Alert.alert("Unsaved changes", "Discard changes and leave?", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive",
          onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsub;
  }, [navigation, dirty]);

  /* ---------------------------------------------------------------- */
  /*  Checklist handlers                                               */
  /* ---------------------------------------------------------------- */
  function updateRating(item, value) {
    if (checkNA[item]) return;
    setCheckRatings((p) => ({ ...p, [item]: value }));
    setDirty(true);
  }

  function updateNote(item, text) {
    setCheckNotes((p) => ({ ...p, [item]: text }));
    setDirty(true);
  }

  function markNA(item) {
    if (checkNA[item]) {
      setCheckNA((previous) => ({ ...previous, [item]: false }));
      setDirty(true);
      return;
    }
    setCheckNA((p) => ({ ...p, [item]: true }));
    setCheckRatings((p) => {
      const { [item]: _omit, ...rest } = p;
      return rest;
    });
    setCheckNotes((p) => {
      const { [item]: _omit, ...rest } = p;
      return rest;
    });
    setDirty(true);
  }

  function handleSelectEquipment(item) {
    setSelectedEquipmentKey(item.key);
    setEquipmentDocId(item.equipmentDocId || "");
    setEquipmentName(item.name || "");
    setEquipmentId(item.equipmentId || "");
    setSerialNumber(item.serialNumber || "");
    setAsset(item.asset || "");
    setEquipmentType(item.category || item.type || "");
    setEquipmentStatus(item.status || "");
    setLocation((prev) => prev || item.location || "");
    setLastInspection(item.lastInspection || "");
    setInspectionFrequency(item.inspectionFrequency || "");
    setNextInspection(item.nextInspection || "");
    setEquipmentCollapsed(true);
    setEquipmentDetailsOpen(!(item.name && (item.category || item.type)));
    setDirty(true);
  }

  function handleAddNewEquipment() {
    setSelectedEquipmentKey(null);
    setEquipmentDocId("");
    setEquipmentName("");
    setEquipmentId("");
    setSerialNumber("");
    setAsset("");
    setEquipmentType("");
    setEquipmentStatus("");
    setLocation("");
    setLastInspection("");
    setInspectionFrequency("");
    setNextInspection("");
    setHoursOrOdo("");
    setEquipmentDetailsOpen(true);
    setDirty(true);
  }

  /* ---------------------------------------------------------------- */
  /*  Photo handlers                                                   */
  /* ---------------------------------------------------------------- */
  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.85 });
    if (result.canceled) return null;
    return result.assets[0].uri;
  }

  // Per-check photos
  function openPhotoPickerForLabel(label) {
    setPhotoModalLabel(label);
  }

  async function handleCheckPhotoSource() {
    const label = photoModalLabel;
    setPhotoModalLabel(null);
    const uri = await pickImage();
    if (!uri || !label) return;
    setCheckPhotos((p) => ({
      ...p,
      [label]: [...(p[label] || []), { uri, uploaded: false }],
    }));
    setDirty(true);
  }

  function handleRemoveCheckPhoto(label, uri) {
    setCheckPhotos((p) => ({
      ...p,
      [label]: (p[label] || []).filter((ph) => ph.uri !== uri),
    }));
    setDirty(true);
  }

  // Overall photos
  async function handleAddPhotoFromLibrary() {
    const uri = await pickImage();
    if (!uri) return;
    setPhotos((p) => [...p, { uri, uploaded: false }]);
    setDirty(true);
  }

  function handleRemovePhoto(uri) {
    setPhotos((p) => p.filter((ph) => ph.uri !== uri));
    setDirty(true);
  }

  /* ---------------------------------------------------------------- */
  /*  Submit                                                           */
  /* ---------------------------------------------------------------- */
  async function handleSubmit() {
    if (params.workshopRequestId && String(equipmentDocId) !== String(preselectEquipmentDocId)) {
      Alert.alert("Wrong equipment", "Complete this request for its selected equipment.");
      return;
    }
    if (!equipmentName.trim()) {
      Alert.alert("Required", "Equipment name is required."); return;
    }
    if (!equipmentType.trim()) {
      Alert.alert("Required", "Equipment category is required."); return;
    }
    for (const label of ALL_CHECKLIST_ITEMS) {
      if (checkNA[label]) continue;
      const status = normalizeCheckStatus(checkRatings[label]);
      if (!status) {
        Alert.alert(
          "Checklist incomplete",
          `Please mark green, amber, red or N/A: "${label}".`
        );
        return;
      }
      if (NOTE_REQUIRED_STATUSES.has(status) && !String(checkNotes[label] || "").trim()) {
        Alert.alert(
          "Notes required",
          `Please add notes for the ${status} check: "${label}".`
        );
        return;
      }
    }
    if (!overallResult) {
      Alert.alert("Required", "Please choose pass or fail for the overall result."); return;
    }
    if (!signedBy.trim()) {
      Alert.alert("Required", "Inspector signature (name) is required."); return;
    }

    setSubmitting(true);
    try {
      const basePath = `equipmentInspections/${docId}`;

      const uploadedCheckPhotos = await uploadCheckPhotoMap(checkPhotos, `${basePath}/checks`);
      const uploadedPhotoUrls   = await uploadPhotoList(photos, `${basePath}/photos`);
      const matchingEquipment = equipmentOptions.find(
        (item) => normaliseKey(item.name) === normaliseKey(equipmentName)
      );
      let targetEquipmentDocId = equipmentDocId || matchingEquipment?.equipmentDocId || "";

      if (!targetEquipmentDocId) {
        const newEquipmentRef = doc(collection(db, "equipment"));
        targetEquipmentDocId = newEquipmentRef.id;
        await setDoc(newEquipmentRef, {
          ...buildEquipmentCoreUpdate({
            name: equipmentName.trim(),
            category: equipmentType.trim(),
            status: equipmentStatus.trim() || "Available",
            serialNumber: serialNumber.trim(),
            asset: asset.trim(),
            location: location.trim(),
            lastInspection: inspectionDateISO || "",
            inspectionFrequency: inspectionFrequency.trim(),
            nextInspection: parseDDMMYYYYToISO(nextInspection),
            notes: extraNotes.trim(),
          }),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const payload = {
        ...(params.workshopRequestId ? { workshopRequestId: String(params.workshopRequestId), workshopWorkType: "equipment_inspection" } : {}),
        equipmentDocId:  targetEquipmentDocId || null,
        equipmentName:   equipmentName.trim(),
        equipmentId:     serialNumber.trim() || asset.trim() || equipmentId.trim(),
        serialNumber:    serialNumber.trim(),
        asset:           asset.trim(),
        equipmentType:   equipmentType.trim(),
        category:        equipmentType.trim(),
        equipmentStatus: equipmentStatus.trim(),
        status:          equipmentStatus.trim(),
        location:        location.trim(),
        hoursOrOdo:      hoursOrOdo.trim(),
        lastInspection:  parseDDMMYYYYToISO(lastInspection),
        inspectionFrequency: inspectionFrequency.trim(),
        nextInspection:  parseDDMMYYYYToISO(nextInspection),
        inspectionDate,
        inspectionDateISO,
        inspectionTime,
        inspectedBy:     inspectedBy.trim(),
        overallResult,
        checkRatings,
        checkNA,
        checkNotes,
        checkPhotos:     uploadedCheckPhotos,
        defectReport,
        monitorReport,
        findings:        findings.trim(),
        recommendations: recommendations.trim(),
        extraNotes:      extraNotes.trim(),
        signedBy:        signedBy.trim(),
        photoUrls:       uploadedPhotoUrls,
        updatedAt:       serverTimestamp(),
      };

      if (isNew) {
        payload.createdAt = serverTimestamp();
      }
      const inspectionRef = doc(db, "equipmentInspections", docId);
      const firestoreMutations = [
        {
          run: () =>
            isNew
              ? setDoc(inspectionRef, payload)
              : updateDoc(inspectionRef, payload),
          mutation: {
            operation: isNew ? "set" : "update",
            docPath: `equipmentInspections/${docId}`,
            data: payload,
            options: isNew ? { merge: false } : undefined,
            entityType: "equipmentInspection",
            entityId: docId,
          },
        },
      ];

      const queueSaveInspectionToEquipment = (targetEquipmentDocId) => {
        if (!targetEquipmentDocId) return;
        const equipmentUpdate = {
          ...buildEquipmentCoreUpdate({
            name: equipmentName.trim(),
            category: equipmentType.trim(),
            status: equipmentStatus.trim(),
            serialNumber: serialNumber.trim(),
            asset: asset.trim(),
            location: location.trim(),
            lastInspection: inspectionDateISO || parseDDMMYYYYToISO(lastInspection),
            inspectionFrequency: inspectionFrequency.trim(),
            nextInspection: parseDDMMYYYYToISO(nextInspection),
          }),
          updatedAt: serverTimestamp(),
        };
        firestoreMutations.push({
          run: () => updateDoc(doc(db, "equipment", targetEquipmentDocId), equipmentUpdate),
          mutation: {
            operation: "update",
            docPath: `equipment/${targetEquipmentDocId}`,
            data: equipmentUpdate,
            entityType: "equipment",
            entityId: targetEquipmentDocId,
          },
        });
      };

      queueSaveInspectionToEquipment(targetEquipmentDocId);

      if (params.workshopRequestId) firestoreMutations.push(workshopCompletionMutation({
        requestId: String(params.workshopRequestId), workType: "equipment_inspection", assetId: targetEquipmentDocId,
        collection: "equipmentInspections", recordId: docId, signedBy,
      }));

      const { queued } = await runOrQueueFirestoreMutations(firestoreMutations);
      await upsertServiceRow("equipmentInspections", { ...payload, id: docId });
      if (targetEquipmentDocId && firestoreMutations[1]?.mutation?.data) {
        await patchServiceRow(
          "equipment",
          targetEquipmentDocId,
          firestoreMutations[1].mutation.data
        );
      }

      allowLeaveRef.current = true;
      setDirty(false);
      Alert.alert(
        queued ? "Saved offline" : "Saved",
        queued
          ? "No internet right now. This inspection will upload automatically when internet returns."
          : isNew
          ? "Inspection created."
          : "Inspection updated.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      console.error("Failed to save inspection:", e);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <PageShell mode="form" width="form" header={{
      variant: "compact",
      title: isNew ? "Equipment Inspection" : "Edit Inspection",
      subtitle: isNew
        ? "Pre-use condition check. Mark every item and sign off."
        : "Update inspection findings and sign off.",
      onBack: () => confirmLeave(() => router.back()),
    }}>
      {/* HEADER */}


      <>
        {loadingRecord && (
          <View style={styles.centerRow}>
            <ActivityIndicator size="small" color={COLORS.primaryAction} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}

        {/* EQUIPMENT DETAILS */}
        <View style={styles.sectionHeaderRow}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            Equipment
          </Text>
        </View>
        <View style={styles.flatSectionContent}>
          {equipmentCollapsed && (selectedEquipment || equipmentName) ? (
            <>
              <Text tone={"muted"} style={[styles.fieldLabel]}>
                Selected equipment
              </Text>
              <View style={styles.selectedEquipmentRow}>
                <View style={{ flex: 1 }}>
                  <Text tone={"primary"} style={[styles.selectedEquipmentName]}>
                    {equipmentName || selectedEquipment?.name || "Unnamed equipment"}
                  </Text>
                  <Text tone={"muted"} style={[styles.selectedEquipmentMeta]}>
                    {[
                      serialNumber || selectedEquipment?.serialNumber,
                      equipmentType || selectedEquipment?.category,
                      equipmentStatus || selectedEquipment?.status,
                    ].filter(Boolean).join(" · ") || "-"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setEquipmentCollapsed(false); setEquipmentDetailsOpen(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={equipmentDetailsOpen ? "Hide equipment details" : "Show equipment details"}
                accessibilityState={{ expanded: equipmentDetailsOpen }}
                onPress={() => setEquipmentDetailsOpen((open) => !open)}
                style={styles.equipmentDetailsToggle}
              >
                <Text variant="link">{equipmentDetailsOpen ? "Hide equipment details" : "Equipment details"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <AssetSelectField
                hideLabel
                type="equipment"
                records={equipmentOptions}
                value={selectedEquipmentKey}
                onChange={(key) => {
                  const item = equipmentOptions.find((option) => String(option.key) === String(key));
                  if (item) handleSelectEquipment(item);
                }}
                loading={loadingEquipment}
                emptyMessage="No previous equipment found. Use Enter new equipment below."
                testID="inspection-equipment-select"
              />
              {!equipmentDetailsOpen && !params.workshopRequestId ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Enter new equipment"
                  onPress={handleAddNewEquipment}
                  style={styles.equipmentDetailsToggle}
                >
                  <Text variant="link">Enter new equipment</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {equipmentDetailsOpen && <>
          <FormField
            label="Equipment name *"
            placeholder="e.g. Ramp car, Stunt bike #3, Hero rig"
            value={equipmentName}
            onChangeText={(v) => { setEquipmentName(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Serial number"
            placeholder="Optional serial number"
            value={serialNumber}
            onChangeText={(v) => { setSerialNumber(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Asset number / internal ref"
            placeholder="Optional asset reference"
            value={asset}
            onChangeText={(v) => { setAsset(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Category *"
            placeholder="e.g. Towing, Rigging, Safety, Workshop"
            value={equipmentType}
            onChangeText={(v) => { setEquipmentType(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Status"
            placeholder="e.g. Available, Out of Service, Repair"
            value={equipmentStatus}
            onChangeText={(v) => { setEquipmentStatus(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Location"
            placeholder="e.g. Workshop, Store, Truck 1"
            value={location}
            onChangeText={(v) => { setLocation(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Last inspection"
            placeholder="DD-MM-YYYY"
            value={formatISODateDDMMYYYY(lastInspection)}
            onChangeText={(v) => { setLastInspection(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Inspection frequency"
            placeholder="Weeks, e.g. 12"
            value={inspectionFrequency}
            onChangeText={(v) => { setInspectionFrequency(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Next inspection"
            placeholder="DD-MM-YYYY"
            value={formatISODateDDMMYYYY(nextInspection)}
            onChangeText={(v) => { setNextInspection(v); setDirty(true); }}
            colors={colors}
          />
          <FormField
            label="Hours / odometer"
            placeholder="e.g. 1240 hrs or 24500 mi"
            value={hoursOrOdo}
            onChangeText={(v) => { setHoursOrOdo(v); setDirty(true); }}
            colors={colors}
          />
          </>}
        </View>

        {/* INSPECTION DETAILS */}
        <View style={styles.sectionHeaderRow}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            Inspection details
          </Text>
        </View>
        <View style={styles.flatSectionContent}>
          <View style={styles.fieldGroup}>
            <Text tone={"primary"} style={[styles.fieldLabel]}>
              Inspection date (auto)
            </Text>
            <View style={[styles.readonlyField, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            }]}>
              <Text tone={"primary"} style={[styles.readonlyText]}>{inspectionDate}</Text>
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text tone={"primary"} style={[styles.fieldLabel]}>
              Inspection time (auto)
            </Text>
            <View style={[styles.readonlyField, {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            }]}>
              <Text tone={"primary"} style={[styles.readonlyText]}>{inspectionTime}</Text>
            </View>
          </View>
          <FormField
            label="Inspected by"
            placeholder="Inspector full name"
            value={inspectedBy}
            onChangeText={(v) => { setInspectedBy(v); setDirty(true); }}
            colors={colors}
          />
        </View>

        {/* CHECKLISTS */}
        <ChecklistSection
          title="Structural condition"
          hint="Mark green, amber or red. Notes required for amber / red."
          items={CHECK_STRUCTURAL}
          checkRatings={checkRatings}
          checkNA={checkNA}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          updateRating={updateRating}
          markNA={markNA}
          updateNote={updateNote}
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
          colors={colors}
        />
        <ChecklistSection
          title="Safety systems"
          hint="Restraints, fire suppression, kill switch and padding."
          items={CHECK_SAFETY}
          checkRatings={checkRatings}
          checkNA={checkNA}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          updateRating={updateRating}
          markNA={markNA}
          updateNote={updateNote}
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
          colors={colors}
        />
        <ChecklistSection
          title="Mechanical systems"
          hint="Engine, brakes, steering, transmission and suspension."
          items={CHECK_MECHANICAL}
          checkRatings={checkRatings}
          checkNA={checkNA}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          updateRating={updateRating}
          markNA={markNA}
          updateNote={updateNote}
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
          colors={colors}
        />
        <ChecklistSection
          title="Electrical & fluids"
          hint="Battery, wiring, oil, coolant, fuel and leaks."
          items={CHECK_ELECTRICAL_FLUIDS}
          checkRatings={checkRatings}
          checkNA={checkNA}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          updateRating={updateRating}
          markNA={markNA}
          updateNote={updateNote}
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
          colors={colors}
        />
        <ChecklistSection
          title="Tyres & running gear"
          hint="Pressures, condition, wheel nuts, bearings and axles."
          items={CHECK_TYRES}
          checkRatings={checkRatings}
          checkNA={checkNA}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          updateRating={updateRating}
          markNA={markNA}
          updateNote={updateNote}
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
          colors={colors}
        />
        <ChecklistSection
          title="Lights & communications"
          hint="Lights, horn, radio, camera mounts and warnings."
          items={CHECK_LIGHTS_COMMS}
          checkRatings={checkRatings}
          checkNA={checkNA}
          checkNotes={checkNotes}
          checkPhotos={checkPhotos}
          updateRating={updateRating}
          markNA={markNA}
          updateNote={updateNote}
          openPhotoPickerForLabel={openPhotoPickerForLabel}
          removePhotoForLabel={handleRemoveCheckPhoto}
          colors={colors}
        />

        <InspectionReportSection
          title="Defect report"
          items={defectReport}
          badge="R"
          badgeColor={routeColors.hex_ef4444_4oizhh}
          emptyText="No red equipment defects recorded."
          colors={colors}
        />

        <InspectionReportSection
          title="Monitor report"
          items={monitorReport}
          badge="M"
          badgeColor={routeColors.hex_f59e0b_4zbh7f}
          emptyText="No amber equipment advisories recorded."
          colors={colors}
        />

        {/* FINDINGS & NOTES */}
        <View style={styles.sectionHeaderRow}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            Findings & notes
          </Text>
        </View>
        <SectionCard tone="subtle" layoutStyle={styles.card}>
          <FormField
            label="Findings"
            placeholder="Describe any faults, defects or concerns found during inspection."
            value={findings}
            onChangeText={(v) => { setFindings(v); setDirty(true); }}
            multiline
            colors={colors}
          />
          <FormField
            label="Recommendations"
            placeholder="Remedial actions required before use, monitoring notes, etc."
            value={recommendations}
            onChangeText={(v) => { setRecommendations(v); setDirty(true); }}
            multiline
            colors={colors}
          />
          <FormField
            label="Extra notes (optional)"
            placeholder="Any additional context for future inspections."
            value={extraNotes}
            onChangeText={(v) => { setExtraNotes(v); setDirty(true); }}
            multiline
            colors={colors}
          />
        </SectionCard>

        {/* OVERALL RESULT */}
        <View style={styles.sectionHeaderRow}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            Overall result
          </Text>
          <Text tone={"muted"} style={[styles.sectionHint]}>
            Required to complete inspection.
          </Text>
        </View>
        <SectionCard tone="subtle" layoutStyle={styles.card}>
          <View style={styles.resultRow}>
            {OVERALL_RESULT_OPTIONS.map((opt) => {
              const active = overallResult === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.resultButton,
                    active
                      ? { backgroundColor: opt.color, borderColor: opt.color }
                      : { borderColor: colors.border || COLORS.border },
                  ]}
                  onPress={() => { setOverallResult(opt.value); setDirty(true); }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.resultButtonText,
                    { color: active ? routeColors.hex_ffffff_5c2ocm : colors.textMuted || COLORS.textMid },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SectionCard>

        {/* SIGN-OFF */}
        <View style={styles.sectionHeaderRow}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            Sign-off
          </Text>
          <Text tone={"muted"} style={[styles.sectionHint]}>
            Required to complete inspection.
          </Text>
        </View>
        <SectionCard tone="subtle" layoutStyle={styles.card}>
          <FormField
            label="Inspector signature (name) *"
            placeholder="Type name as signature"
            value={signedBy}
            onChangeText={(v) => { setSignedBy(v); setDirty(true); }}
            colors={colors}
          />
          <View style={{ marginTop: t.spacing.xxs }}>
            <Text style={styles.signatureInfo}>
              By entering your name you confirm all checks above have been
              carried out to the best of your ability.
            </Text>
          </View>
        </SectionCard>

        {/* PHOTOS */}
        <View style={styles.sectionHeaderRow}>
          <Text tone={"primary"} style={[styles.sectionTitle]}>
            Photos / attachments
          </Text>
          <Text tone={"muted"} style={[styles.sectionHint]}>
            General photos not tied to a single check.
          </Text>
        </View>
        <SectionCard tone="subtle" layoutStyle={styles.card}>
          <View style={styles.photoButtonsRow}>
            <TouchableOpacity style={styles.photoButton} onPress={handleAddPhotoFromLibrary} activeOpacity={0.85}>
              <Icon name="image" size={18} color={colors.text || COLORS.textHigh} style={{ marginRight: t.spacing.xxs }} />
              <Text tone={"primary"} style={[styles.photoAddText]}>Add from library</Text>
            </TouchableOpacity>
          </View>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: t.spacing.xs }}>
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
              <Icon name="save" size={18} color={COLORS.textHigh} style={{ marginRight: t.spacing.xxs }} />
              <Text style={styles.submitText}>
                {isNew ? "Save inspection" : "Save changes"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </>

      {/* PER-CHECK PHOTO PICKER MODAL */}
      <AppModal
        visible={!!photoModalLabel}
        title="Add photo"
        onRequestClose={() => setPhotoModalLabel(null)}
        presentation="adaptive"
        actions={<AppButton label="Cancel" variant="secondary" onPress={() => setPhotoModalLabel(null)} />}
      >
        <AppButton label="Choose from library" icon="image" variant="secondary" onPress={handleCheckPhotoSource} />
      </AppModal>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  CHECKLIST COMPONENTS                                               */
/* ------------------------------------------------------------------ */

function ChecklistSection({
  title, hint, items,
  checkRatings, checkNA, checkNotes, checkPhotos,
  updateRating, markNA, updateNote,
  openPhotoPickerForLabel, removePhotoForLabel,
  colors,
}) {
  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text tone={"primary"} style={[styles.sectionTitle]}>
          {title}
        </Text>
        <Text tone={"muted"} style={[styles.sectionHint]}>
          {hint}
        </Text>
      </View>
      <SectionCard tone="subtle" layoutStyle={styles.card}>
        {items.map((item) => (
          <ChecklistRow
            key={item}
            label={item}
            rating={normalizeCheckStatus(checkRatings[item])}
            na={!!checkNA[item]}
            note={checkNotes[item] || ""}
            photos={checkPhotos[item] || []}
            onChangeRating={(val) => updateRating(item, val)}
            onMarkNA={() => markNA(item)}
            onChangeNote={(text) => updateNote(item, text)}
            onPressPhoto={() => openPhotoPickerForLabel(item)}
            onRemovePhoto={(uri) => removePhotoForLabel(item, uri)}
            colors={colors}
          />
        ))}
      </SectionCard>
    </>
  );
}

export function ChecklistRow({
  label, rating, na, note, photos,
  onChangeRating, onMarkNA, onChangeNote, onPressPhoto, onRemovePhoto,
  colors,
}) {
  const { colorScheme } = useTheme();
  const paletteFor = (value) => getServiceStatusColors({ green: "success", amber: "warning", red: "danger" }[value] || "neutral", colorScheme);
  const neutralPalette = paletteFor("");
  const needsNote = !na && NOTE_REQUIRED_STATUSES.has(rating);
  const isComplete = !!rating || na;

  return (
    <View style={[styles.checkRowWrapper, { borderBottomColor: colors.border || COLORS.border }]}>
      <View style={styles.checkRowLeft}>
        <View style={styles.checkIconWrap}>
          {isComplete ? (
            <View style={styles.checkIconFilled}>
              <Icon name="check" size={18} color={COLORS.textHigh} />
            </View>
          ) : (
            <View style={styles.checkIconEmpty} />
          )}
        </View>
        <Text tone={"primary"} style={[styles.checkLabel]}>
          {label}
        </Text>
      </View>

      <View style={styles.ratingRow}>
        {CHECK_STATUS_OPTIONS.map((opt) => {
          const active = rating === opt.value;
          const palette = paletteFor(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${opt.label}`}
              aria-pressed={active}
              accessibilityState={{ selected: active, disabled: na }}
              onPress={() => onChangeRating(opt.value)}
              disabled={na}
              style={[
                styles.conditionPill,
                na && { opacity: 0.35 },
                active
                  ? { backgroundColor: palette.background, borderColor: palette.border }
                  : { borderColor: colors.border || COLORS.border },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.conditionText,
                active && { color: palette.onBackground },
                !active && { color: colors.textMuted || COLORS.textLow },
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={onMarkNA}
          accessibilityRole="button"
          accessibilityLabel={`${label}: Not applicable`}
          aria-pressed={na}
          accessibilityState={{ selected: na }}
          style={[
            styles.naPill,
            { borderColor: colors.border || COLORS.border },
            na && { backgroundColor: neutralPalette.background, borderColor: neutralPalette.border },
          ]}
          activeOpacity={0.75}
        >
          <Text style={[styles.naText, na && styles.naTextActive, { color: neutralPalette.foreground }]}>N/A</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPressPhoto}
          accessibilityRole="button"
          accessibilityLabel={`Add photo for ${label}`}
          style={[styles.photoIconButton, { borderColor: colors.border || COLORS.border }]}
          activeOpacity={0.75}
        >
          <Icon name="image" size={16} color={colors.textMuted || COLORS.textMid} />
          {photos.length > 0 && (
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>{photos.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Note input */}
      {needsNote && (
        <TextArea
          label="Inspection note"
          error={!String(note || "").trim() ? `Note required for ${rating}` : undefined}
          placeholder={`Note required for ${rating}`}
          value={note}
          onChangeText={onChangeNote}
        />
      )}

      {/* Check photos */}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: t.spacing.xxs }}>
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

function InspectionReportSection({ title, items, badge, badgeColor, colors }) {
  if (!items.length) return null;

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text tone={"primary"} style={[styles.sectionTitle]}>
          {title}
        </Text>
      </View>
      <SectionCard
        tone="subtle" layoutStyle={styles.card}
      >
        {items.map((item) => (
          <View key={item.key} style={styles.reportRow}>
            <View style={[styles.reportBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.reportBadgeText}>{badge}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text tone={"primary"} style={[styles.reportTitle]}>
                {item.title}
              </Text>
              <Text tone={"muted"} style={[styles.reportDetails]}>
                {item.details}
              </Text>
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  );
}

function FormField({ label, placeholder, value, onChangeText, multiline, colors }) {
  return (
    <View style={styles.fieldGroup}>
      {multiline ? (
        <TextArea label={label} placeholder={placeholder} value={value} onChangeText={onChangeText} />
      ) : (
        <SharedFormField label={label} placeholder={placeholder} value={value} onChangeText={onChangeText} />
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  STYLES                                                              */
/* ------------------------------------------------------------------ */
