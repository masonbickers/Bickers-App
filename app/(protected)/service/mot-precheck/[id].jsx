import AssetSelectField from "../../../../components/ui/AssetSelectField";
import { routeColors } from "../../../../lib/design/routePresentation/service-mot-precheck-id-jsx.js";
import { styles } from "../../../../lib/design/screenStyles/service-mot-precheck-id-jsx.js";
import { SectionCard, AppText as Text, AppPressable as TouchableOpacity, FormField as SharedFormField, TextArea } from "../../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../../lib/design/semantics";
//app/(protected)/service/mot-precheck/[id].jsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams,
  useNavigation,
  useRouter } from "expo-router";
import {
  doc,
  serverTimestamp,
  } from "firebase/firestore";
import { useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
    ActivityIndicator,
  Alert,
  Platform,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import { db } from "../../../../firebaseConfig";
import { formatShortDate } from "../../../../lib/dateDisplay";
import { formatISODateDDMMYYYY } from "../../../../lib/dateFormat";
import {
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

const PRECHECK_STATUS_OPTIONS = [
  "Ready for MOT",
  "Requires work before MOT",
  "Do not drive – unsafe",
];

/* ---------------- MOT PRE-CHECK CHECKLIST ---------------- */

const CHECK_LIGHTS = [
  "Headlights (dip & main) working",
  "Side lights / DRLs working",
  "Rear lights & number plate light working",
  "Indicators / hazards working",
  "Brake lights & reverse lights working",
  "Fog lights working (if fitted)",
];

const CHECK_VISIBILITY = [
  "Windscreen free from major damage",
  "Wipers clear screen effectively",
  "Screenwash level & operation OK",
  "Mirrors secure and not cracked",
];

const CHECK_TYRES_BRAKES = [
  "Tyre tread above legal limit on all corners",
  "Tyre sidewalls free from cuts / bulges",
  "Wheel nuts present and secure",
  "Footbrake feels normal on road test",
  "Handbrake / parking brake holds vehicle",
];

const CHECK_SAFETY_INTERIOR = [
  "Seat belts latch & retract correctly",
  "Seats secure and adjust/lock correctly",
  "Horn working",
  "Warning lights checked & no critical faults",
  "Airbag / safety system lights OK",
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
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
  };
}



// 🔑 Local storage key for drafts
const MOT_PRECHECK_DRAFTS_KEY = "motPrecheckDrafts_v1";

export default function MotPrecheckScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, workshopRequestId, vehicleId: requestedVehicleId } = useLocalSearchParams();
  const formId = Array.isArray(id) ? id[0] : id;
  const { employee } = useAuth();
  const allowLeaveRef = useRef(false);

  const { colors } = useTheme();
  const readServiceCollection = useServiceCollectionReader();
  const { upsertServiceRow, patchServiceRow } = useServiceCacheActions();

  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedVehicleId, setSelectedVehicleId] = useState(requestedVehicleId ? String(requestedVehicleId) : null);
  const [vehicleCollapsed, setVehicleCollapsed] = useState(false);

  const now = getNowParts();
  const [precheckDate] = useState(now.date);
  const [precheckTime] = useState(now.time);

  const [odometer, setOdometer] = useState("");
  const [precheckStatus, setPrecheckStatus] = useState("Ready for MOT");
  const [statusOpen, setStatusOpen] = useState(false);

  const [summary, setSummary] = useState("");
  const [faultsFound, setFaultsFound] = useState("");
  const [workRecommended, setWorkRecommended] = useState("");

  const [signedBy, setSignedBy] = useState("");

  const [checks, setChecks] = useState({});
  const [checkRatings, setCheckRatings] = useState({});
  const [checkNA, setCheckNA] = useState({});

  const allChecklistLabels = useMemo(
    () => [
      ...CHECK_LIGHTS,
      ...CHECK_VISIBILITY,
      ...CHECK_TYRES_BRAKES,
      ...CHECK_SAFETY_INTERIOR,
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
        console.error("Failed to load vehicles for MOT pre-check:", err);
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
      precheckStatus !== "Ready for MOT" ||
      !!summary.trim() ||
      !!faultsFound.trim() ||
      !!workRecommended.trim() ||
      !!signedBy.trim() ||
      Object.keys(checks || {}).length > 0 ||
      Object.keys(checkRatings || {}).length > 0 ||
      Object.keys(checkNA || {}).length > 0,
    [
      checkNA,
      checkRatings,
      checks,
      faultsFound,
      odometer,
      precheckStatus,
      selectedVehicleId,
      signedBy,
      summary,
      workRecommended,
    ]
  );

  const confirmLeave = (onLeave) => {
    if (!hasUnsavedChanges || allowLeaveRef.current) {
      onLeave();
      return;
    }

    Alert.alert(
      "Leave MOT pre-check?",
      "You have unsaved pre-check details. Leave without saving?",
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
        "Leave MOT pre-check?",
        "You have unsaved pre-check details. Leave without saving?",
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

  /* ---------------- LOAD DRAFT ---------------- */

  useEffect(() => {
    const loadDraft = async () => {
      if (!formId) return;
      try {
        const raw = await AsyncStorage.getItem(MOT_PRECHECK_DRAFTS_KEY);
        if (!raw) return;

        const allDrafts = JSON.parse(raw) || {};
        const draft = allDrafts[formId];
        if (!draft) return;

        if (draft.selectedVehicleId) {
          setSelectedVehicleId(draft.selectedVehicleId);
          setVehicleCollapsed(true);
        }
        if (draft.odometer) setOdometer(String(draft.odometer));
        if (draft.precheckStatus) setPrecheckStatus(draft.precheckStatus);
        if (draft.summary) setSummary(draft.summary);
        if (draft.faultsFound) setFaultsFound(draft.faultsFound);
        if (draft.workRecommended) setWorkRecommended(draft.workRecommended);
        if (draft.signedBy) setSignedBy(draft.signedBy);
        if (draft.checks) setChecks(draft.checks);
        if (draft.checkRatings) setCheckRatings(draft.checkRatings);
        if (draft.checkNA) setCheckNA(draft.checkNA);
      } catch (err) {
        console.error("Failed to load MOT pre-check draft:", err);
      }
    };

    loadDraft();
  }, [formId]);

  /* ---------------- AUTO-SAVE DRAFT ---------------- */

  useEffect(() => {
    const saveDraft = async () => {
      if (!formId) return;

      try {
        const vehicleName = getVehicleName(selectedVehicle) || "";
        const registration = getVehicleRegistration(selectedVehicle) || "";

        const hasAnyContent =
          selectedVehicleId ||
          odometer ||
          summary ||
          faultsFound ||
          workRecommended ||
          signedBy ||
          Object.keys(checks).length > 0 ||
          Object.keys(checkRatings).length > 0 ||
          Object.keys(checkNA).length > 0;

        const raw = await AsyncStorage.getItem(MOT_PRECHECK_DRAFTS_KEY);
        const allDrafts = raw ? JSON.parse(raw) || {} : {};

        if (!hasAnyContent) {
          if (allDrafts[formId]) {
            delete allDrafts[formId];
            if (Object.keys(allDrafts).length === 0) {
              await AsyncStorage.removeItem(MOT_PRECHECK_DRAFTS_KEY);
            } else {
              await AsyncStorage.setItem(
                MOT_PRECHECK_DRAFTS_KEY,
                JSON.stringify(allDrafts)
              );
            }
          }
          return;
        }

        const draftToSave = {
          selectedVehicleId,
          vehicleName,
          registration,
          odometer,
          precheckStatus,
          precheckDate,
          precheckTime,
          summary,
          faultsFound,
          workRecommended,
          signedBy,
          checks,
          checkRatings,
          checkNA,
        };

        allDrafts[formId] = draftToSave;
        await AsyncStorage.setItem(
          MOT_PRECHECK_DRAFTS_KEY,
          JSON.stringify(allDrafts)
        );
      } catch (err) {
        console.error("Failed to save MOT pre-check draft:", err);
      }
    };

    saveDraft();
  }, [
    formId,
    selectedVehicle,
    selectedVehicleId,
    odometer,
    precheckStatus,
    precheckDate,
    precheckTime,
    summary,
    faultsFound,
    workRecommended,
    signedBy,
    checks,
    checkRatings,
    checkNA,
  ]);

  /* ---------------- HELPERS ---------------- */

  const handleSelectVehicle = (id) => {
    setSelectedVehicleId(id);
    setVehicleCollapsed(true);
  };

  const toggleCheck = (label) => {
    setChecks((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
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
      [label]: value,
    }));
    setChecks((prev) => ({
      ...prev,
      [label]: true,
    }));
  };

  const validate = () => {
    if (!selectedVehicleId) {
      Alert.alert("Select vehicle", "Please choose a vehicle for this check.");
      return false;
    }
    if (!precheckDate.trim()) {
      Alert.alert("Date", "Pre-check date is missing.");
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
      const completed =
        checks[label] || typeof checkRatings[label] === "number";
      if (!completed) {
        Alert.alert(
          "Checklist incomplete",
          `Please complete or mark N/A: "${label}".`
        );
        return false;
      }
    }

    return true;
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
      const precheckDateTime = `${precheckDate} ${precheckTime}`;
      const recordVehicleName = getVehicleName(v) || "";
      const recordRegistration = getVehicleRegistration(v) || "";

      const record = {
        companyId: employee?.companyId,
        ...(workshopRequestId ? { workshopRequestId: String(workshopRequestId), workshopWorkType: "mot_precheck" } : {}),
        vehicleId: selectedVehicleId,
        vehicleName: recordVehicleName,
        registration: recordRegistration,
        manufacturer: getVehicleManufacturer(v) || "",
        model: v?.model || "",
        precheckDateTime,
        precheckDateOnly: precheckDate,
        precheckTime,
        odometer: odoNumber,
        status: precheckStatus.trim(),
        summary: summary.trim(),
        faultsFound: faultsFound.trim(),
        workRecommended: workRecommended.trim(),
        checks,
        checkRatings,
        checkNA,
        signedBy: signedBy.trim(),
        createdAt: serverTimestamp(),
      };

      const motRef = doc(db, "motPreChecks", String(workshopRequestId || formId));
      const result = await submitOrQueueWorkshopRecord({ kind: "mot", recordId: motRef.id, record });
      const { queued } = result;
      await Promise.allSettled([
        upsertServiceRow("motPreChecks", { ...(result.record || record), id: motRef.id }),
        ...(result.vehiclePatch ? [patchServiceRow("vehicles", selectedVehicleId, result.vehiclePatch)] : []),
      ]);

      // Clear this draft
      try {
        const raw = await AsyncStorage.getItem(MOT_PRECHECK_DRAFTS_KEY);
        if (raw) {
          const allDrafts = JSON.parse(raw) || {};
          if (allDrafts[formId]) {
            delete allDrafts[formId];
            if (Object.keys(allDrafts).length === 0) {
              await AsyncStorage.removeItem(MOT_PRECHECK_DRAFTS_KEY);
            } else {
              await AsyncStorage.setItem(
                MOT_PRECHECK_DRAFTS_KEY,
                JSON.stringify(allDrafts)
              );
            }
          }
        }
      } catch (e) {
        console.error("Failed to remove MOT pre-check draft after submit:", e);
      }

      Alert.alert(
        queued ? "Saved offline" : "MOT pre-check saved",
        queued
          ? "No internet right now. This MOT pre-check will upload automatically when internet returns."
          : "Pre-check recorded and vehicle updated.",
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
      console.error("Failed to save MOT pre-check:", err);
      Alert.alert("Error", err.message || "Could not save MOT pre-check. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- DELETE DRAFT ---------------- */

  const handleDeleteDraft = () => {
    Alert.alert(
      "Delete MOT pre-check?",
      "This will delete this draft and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!formId) {
                allowLeaveRef.current = true;
                router.back();
                return;
              }
              const raw = await AsyncStorage.getItem(MOT_PRECHECK_DRAFTS_KEY);
              if (raw) {
                const allDrafts = JSON.parse(raw) || {};
                if (allDrafts[formId]) {
                  delete allDrafts[formId];
                  if (Object.keys(allDrafts).length === 0) {
                    await AsyncStorage.removeItem(MOT_PRECHECK_DRAFTS_KEY);
                  } else {
                    await AsyncStorage.setItem(
                      MOT_PRECHECK_DRAFTS_KEY,
                      JSON.stringify(allDrafts)
                    );
                  }
                }
              }
            } catch (err) {
              console.error("Failed to delete MOT pre-check draft:", err);
              Alert.alert(
                "Error",
                "Could not delete draft. Please try again."
              );
            } finally {
              allowLeaveRef.current = true;
              router.back();
            }
          },
        },
      ]
    );
  };

  /* ---------------- RENDER ---------------- */

  return (
    <PageShell mode="form" width="form" header={{
      variant: "compact",
      title: "MOT Pre-check",
      subtitle: "Quick safety check before sending vehicle for MOT.",
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
              <Text
                tone={"muted"} style={[
                  styles.fieldLabel,
                ]}
              >
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
                  Last MOT pre-check: {formatShortDate(selectedVehicle.motPrecheckDate) || selectedVehicle.motPrecheckDate || "—"}
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

        {/* PRE-CHECK DETAILS */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Pre-check details
          </Text>
        </View>

        <View style={styles.flatSectionContent}>
          <View style={styles.fieldGroup}>
            <Text tone={"primary"} style={[styles.fieldLabel]}>
              Date (auto)
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
                {formatISODateDDMMYYYY(precheckDate)}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text tone={"primary"} style={[styles.fieldLabel]}>
              Time (auto)
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
                {precheckTime}
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
              MOT readiness
            </Text>
            <TouchableOpacity
              style={[
                styles.dropdownHeader,
                {
                  backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                  borderColor: colors.inputBorder || colors.border || COLORS.border,
                },
              ]}
              onPress={() => setStatusOpen((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Text tone={"primary"} style={[styles.dropdownText]}>
                {precheckStatus}
              </Text>
              <Icon
                name={statusOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textMuted || COLORS.textMid}
              />
            </TouchableOpacity>
            {statusOpen && (
              <View
                style={[
                  styles.dropdownList,
                  {
                    backgroundColor: colors.inputBackground || routeColors.hex_ffffff_5c2ocm,
                    borderColor: colors.border || COLORS.border,
                  },
                ]}
              >
                {PRECHECK_STATUS_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.dropdownItem,
                      opt === precheckStatus && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setPrecheckStatus(opt);
                      setStatusOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
	                    <Text
	                      style={[
	                        styles.dropdownItemText,
	                        { color: colors.text || COLORS.textHigh },
	                        opt === precheckStatus && {
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
        </View>

        {/* CHECKLISTS */}
        <ChecklistSection
          title="Lights & signalling"
          hint="Tick / 0–5 (5 = good, 0 = issue) or mark N/A."
          items={CHECK_LIGHTS}
          checks={checks}
          checkNA={checkNA}
          checkRatings={checkRatings}
          toggleCheck={toggleCheck}
          toggleNA={toggleNA}
          updateRating={updateRating}
        />

        <ChecklistSection
          title="Visibility"
          hint="Windscreen, wipers, washers, mirrors."
          items={CHECK_VISIBILITY}
          checks={checks}
          checkNA={checkNA}
          checkRatings={checkRatings}
          toggleCheck={toggleCheck}
          toggleNA={toggleNA}
          updateRating={updateRating}
        />

        <ChecklistSection
          title="Tyres & brakes"
          hint="Legal tread, condition and basic brake feel."
          items={CHECK_TYRES_BRAKES}
          checks={checks}
          checkNA={checkNA}
          checkRatings={checkRatings}
          toggleCheck={toggleCheck}
          toggleNA={toggleNA}
          updateRating={updateRating}
        />

        <ChecklistSection
          title="Interior & safety"
          hint="Seat belts, horn, warning lights."
          items={CHECK_SAFETY_INTERIOR}
          checks={checks}
          checkNA={checkNA}
          checkRatings={checkRatings}
          toggleCheck={toggleCheck}
          toggleNA={toggleNA}
          updateRating={updateRating}
        />

        {/* NOTES */}
        <View style={styles.sectionHeaderRow}>
          <Text
            tone={"primary"} style={[
              styles.sectionTitle,
            ]}
          >
            Notes
          </Text>
        </View>

        <SectionCard
          tone="subtle" layoutStyle={styles.card}
        >
          <FormField
            label="Summary"
            placeholder="General summary of vehicle condition."
            value={summary}
            onChangeText={setSummary}
            multiline
          />
          <FormField
            label="Faults found"
            placeholder="List any faults likely to cause MOT failure."
            value={faultsFound}
            onChangeText={setFaultsFound}
            multiline
          />
          <FormField
            label="Work recommended"
            placeholder="Repairs or work required before MOT."
            value={workRecommended}
            onChangeText={setWorkRecommended}
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
            Required before vehicle goes for MOT.
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
              By entering your name you confirm this pre-check has been carried
              out to the best of your ability.
            </Text>
          </View>
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
              <Icon
                name="check-circle"
                size={16}
                color={COLORS.textHigh}
                style={{ marginRight: t.spacing.xxs }}
              />
              <Text style={styles.submitText}>
                Save MOT pre-check & update vehicle
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* DELETE DRAFT */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteDraft}
          activeOpacity={0.9}
        >
          <Icon
            name="trash-2"
            size={16}
            color={COLORS.textHigh}
            style={{ marginRight: t.spacing.xxs }}
          />
          <Text style={styles.deleteText}>Delete pre-check draft</Text>
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
  keyboardType = "default",
}) {
  return (
    <View style={styles.fieldGroup}>
      {multiline ? (
        <TextArea label={label} placeholder={placeholder} value={value} onChangeText={onChangeText} />
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
  toggleCheck,
  toggleNA,
  updateRating,
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
            rating={
              typeof checkRatings[item] === "number" ? checkRatings[item] : null
            }
            onToggle={() => toggleCheck(item)}
            onToggleNA={() => toggleNA(item)}
            onChangeRating={(val) => updateRating(item, val)}
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
}) {
  const { colors, colorScheme } = useTheme();
  const paletteFor = (value) => getServiceStatusColors({ green: "success", amber: "warning", red: "danger" }[value] || "neutral", colorScheme);
  const neutralPalette = paletteFor("");
  const disabled = na;

  return (
    <View style={styles.checkRowWrapper}>
      {/* Left: tick + label */}
      <TouchableOpacity
        style={styles.checkRowLeft}
        onPress={disabled ? undefined : onToggle}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <View style={styles.checkIconWrap}>
          {checked ? (
            <View style={styles.checkIconFilled}>
              <Icon name="check" size={18} color={COLORS.textHigh} />
            </View>
          ) : (
            <View
              style={[
                styles.checkIconEmpty,
                {
                  borderColor: colors.textMuted || COLORS.textMid,
                },
                disabled && { opacity: 0.4 },
              ]}
            />
          )}
        </View>
        <Text
          tone={(checked) ? "primary" : ("muted")} style={[
            styles.checkLabel,
            null,
            checked && null,
            disabled && { opacity: 0.5 },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>

      {/* Right: rating 0–5 + N/A */}
      <View style={styles.ratingRow}>
        {[0, 1, 2, 3, 4, 5].map((n) => {
          const isActive = rating === n;
          return (
            <TouchableOpacity
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${n}`}
              disabled={disabled}
              aria-pressed={isActive}
              accessibilityState={{ selected: isActive, disabled }}
              style={[
                styles.ratingDot,
                isActive && { backgroundColor: neutralPalette.background, borderColor: neutralPalette.border },
                disabled && { opacity: 0.25 },
              ]}
              onPress={disabled ? undefined : () => onChangeRating(n)}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <Text
                style={[
                  styles.ratingText,
                  { color: colors.textMuted || COLORS.textLow },
                  { color: neutralPalette.foreground },
                ]}
              >
                {n}
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
      </View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
