import { routeColors } from "../../lib/design/routePresentation/vehicle-check-js.js";
import { styles } from "../../lib/design/screenStyles/vehicle-check-js.js";
import { AppText as Text, AppPressable as TouchableOpacity, FormField, SelectField, TextArea, Banner, AppButton, SectionCard } from "../../components/ui/AppPrimitives";
// app/vehicle-check.js  (or app/screens/vehicle-check.js)
import {
  useLocalSearchParams,
  useRouter } from "expo-router";
import { useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import {
  Alert,
  Image,
  View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import PageShell from "../../components/layout/PageShell";

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { collection, doc, getDoc, getDocs, query, where, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

// ⛽ Firebase + Auth provider
import { auth, db, storage } from "../../firebaseConfig";
import { useVehicles } from "../../hooks/useOperationalData";
import { isBookingVisibleToEmployee } from "../../lib/bookingVisibility";
import { buildAssetSelectOptions } from "../../lib/assetSelectOptions";
import { formatDateDDMMYYYY } from "../../lib/dateFormat";
import {
  buildVehicleCheckDraftId,
  dailyVehicleCheckItems,
  dailyVehicleCheckSections,
  validateDailyVehicleCheck,
} from "../../lib/dailyVehicleCheck";
import {
  findVehicleRecord,
  getBookingVehicleReferences,
  getVehicleDisplayLabel,
  getVehicleDisplayName,
  getVehicleReferenceId,
  getVehicleRegistration,
} from "../../lib/fleetSchema";
import { useAuth } from "../../providers/AuthProvider"; // if file is app/vehicle-check.js use "./providers/AuthProvider"
import { useDataCache } from "../../providers/DataCacheProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { designTokens as t } from "../../lib/design/tokens"; // 🎨 theme

const IMAGES_ONLY = ImagePicker.MediaTypeOptions.Images;

const STATUS = { SERVICEABLE: "serviceable", DEFECT: "defect", NA: "na" };
const OK_GREEN = routeColors.hex_24c77a_6x4mf6;
const OK_GREEN_TEXT = routeColors.hex_052e1a_89bntw;

const normaliseParam = (value) => {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : "";
  return value ? String(value) : "";
};

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const ensureFileUri = async (uri) => {
  if (!uri) return null;
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
};

export default function VehicleCheckPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const jobId = normaliseParam(params?.jobId);

  const { employee, user, isAuthed, loading } = useAuth();
  const vehiclesResource = useVehicles();
  const { invalidate } = useDataCache();
  const { colors } = useTheme(); // 🎨

  const [loadingDoc, setLoadingDoc] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  // Identity
  const userCode = employee?.userCode || "N/A";
  const driverName =
    employee?.name ||
    employee?.displayName ||
    user?.displayName ||
    "Unknown";

  const [job, setJob] = useState(null);
  const [vehicles, setVehicles] = useState([]); // from booking
  const [vehicle, setVehicle] = useState("");
  const vehicleOptions = useMemo(() => {
    const refs = jobId ? vehicles : vehiclesResource.data;
    return refs.map((vehicleRef) => {
      const matched = findVehicleRecord(vehicleRef, vehiclesResource.data);
      const resolved = matched || vehicleRef;
      const id = getVehicleReferenceId(resolved);
      const detail = buildAssetSelectOptions([{ ...(typeof resolved === "object" ? resolved : {}), id }])[0];
      return {
        value: id,
        label: detail?.label === "Unnamed vehicle" ? getVehicleDisplayLabel(resolved, vehiclesResource.data) : detail?.label || getVehicleDisplayLabel(resolved, vehiclesResource.data),
        description: detail?.description,
        keywords: detail?.keywords,
        vehicle: resolved,
      };
    }).filter((option) => option.value);
  }, [jobId, vehicles, vehiclesResource.data]);
  const selectedVehicleOption = useMemo(
    () => vehicleOptions.find((option) => option.value === vehicle) || null,
    [vehicle, vehicleOptions]
  );

  const [dateISO] = useState(() => toISO(new Date()));
  const [timeStr] = useState(() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  const [odometer, setOdometer] = useState("");
  const [trailerId, setTrailerId] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState(() => dailyVehicleCheckItems.map((item) => ({ ...item })));

  const [photos, setPhotos] = useState([]); // [{uri, remote?}]
  const [expandedSection, setExpandedSection] = useState(null);

  const checkDocId = buildVehicleCheckDraftId(user?.uid, jobId, dateISO);

  const normalizeMaintenanceBooking = useCallback((id, data) => {
    if (!data) return null;
    return {
      id,
      ...data,
      // Compatibility adapter: maintenanceBookings is the web-canonical
      // collection, but this screen still expects the legacy booking shape.
      status: data.status === "Booked" ? "Confirmed" : data.status,
      date: data.appointmentDateISO || data.startDateISO || "",
      startDate: data.startDateISO || data.appointmentDateISO || "",
      endDate:
        data.endDateISO || data.startDateISO || data.appointmentDateISO || "",
      vehicles: data.vehicleId
        ? [
            {
              id: data.vehicleId,
              name: data.vehicleLabel || "Vehicle",
              vehicleName: data.vehicleLabel || "Vehicle",
            },
          ]
        : [],
    };
  }, []);

  const loadData = useCallback(async () => {
    if (loading || !isAuthed) {
      setLoadingDoc(false);
      return;
    }
    let readStage = "booking";
    try {
      setLoadingDoc(true);
      setLoadError("");

      // Load booking
      if (jobId) {
        let snap = await getDoc(doc(db, "bookings", jobId));
        let j = null;
        let isEmployeeBooking = false;
        if (snap.exists()) {
          j = { id: snap.id, ...snap.data() };
          isEmployeeBooking = true;
        } else {
          snap = await getDoc(doc(db, "maintenanceBookings", jobId));
          if (snap.exists()) {
            j = normalizeMaintenanceBooking(snap.id, snap.data());
          }
        }
        if (j) {
          if (isEmployeeBooking && !isBookingVisibleToEmployee(j, employee)) {
            setJob(null);
            Alert.alert(
              "Booking unavailable",
              "This booking is not currently published to your employee app."
            );
            router.back();
            return;
          }
          setJob(j);
          const vs = getBookingVehicleReferences(j);
          setVehicles(vs);
        }
      }

      // Resume only an unfinished daily draft. Submitted checks are separate records.
      readStage = "saved draft";
      const companyId = employee?.companyId;
      if (!companyId) throw new Error("Your account company could not be resolved.");
      // An exact document-ID query is evaluated against the missing resource
      // for a new draft. Read this driver's company drafts and match locally,
      // so nonexistence is a normal new check under the tenant read rules.
      const existingDrafts = await getDocs(query(
        collection(db, "vehicleChecks"),
        where("companyId", "==", companyId),
        where("driverUid", "==", user.uid)
      ));
      const existingSnap = existingDrafts.docs.find((draft) => draft.id === checkDocId);
      if (existingSnap && existingSnap.data()?.status === "draft") {
        setHasExisting(true);
        const d = existingSnap.data();

        setOdometer(d.odometer || "");
        setTrailerId(d.trailerId || "");
        setNotes(d.notes || "");
        const storedVehicle = d.vehicleId || d.vehicle;
        const matchedVehicle = findVehicleRecord(
          storedVehicle,
          vehiclesResource.data
        );
        if (storedVehicle) {
          setVehicle(getVehicleReferenceId(matchedVehicle || storedVehicle));
        }

        if (Array.isArray(d.items) && d.items.length) {
          setItems((prev) =>
            prev.map((p, idx) => ({
              ...p,
              status: d.items[idx]?.status ?? p.status,
              note: d.items[idx]?.note ?? p.note,
              assessment: d.items[idx]?.assessment ?? p.assessment,
            }))
          );
        }

        const urls = Array.isArray(d.photos) ? d.photos : [];
        setPhotos(urls.map((u) => ({ uri: u, remote: true })));
      } else {
        setHasExisting(false);
      }
    } catch (error) {
      console.warn(`Vehicle check ${readStage} could not be loaded`, error);
      setLoadError("Could not load the vehicle check. Your saved check has not been changed. Check your connection or account access and retry.");
    } finally {
      setLoadingDoc(false);
    }
  }, [
    jobId,
    checkDocId,
    loading,
    isAuthed,
    user?.uid,
    employee,
    router,
    normalizeMaintenanceBooking,
  ]);

  useEffect(() => {
    if (!vehicle && vehicleOptions.length === 1) setVehicle(vehicleOptions[0].value);
  }, [vehicle, vehicleOptions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cycleStatus = (cur) => {
    if (cur === STATUS.SERVICEABLE) return STATUS.DEFECT;
    if (cur === STATUS.DEFECT) return STATUS.NA;
    if (cur === STATUS.NA) return STATUS.SERVICEABLE;
    return STATUS.SERVICEABLE;
  };

  const setItemStatus = (index) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, status: cycleStatus(it.status), assessment: "" } : it
      )
    );
  };
  const setItemNote = (index, t) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, note: t } : it))
    );
  };
  const setItemAssessment = (index, assessment) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, assessment } : it));
  };

  const markSectionServiceable = (section) => {
    const sectionNumbers = new Set(section.itemNumbers);
    setItems((prev) =>
      prev.map((item) =>
        !sectionNumbers.has(item.i) || item.status === STATUS.DEFECT
          ? item
          : { ...item, status: STATUS.SERVICEABLE }
      )
    );
  };

  const pickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: 6,
      mediaTypes: IMAGES_ONLY,
      quality: 1,
    });
    if (res.canceled) return;
    const assets = res.assets ?? [];
    setPhotos((p) =>
      [...p, ...assets.map((a) => ({ uri: a.uri }))].slice(0, 10)
    );
  };

  const uploadPhotos = async () => {
    const uid = user?.uid || auth.currentUser?.uid || "public";
    const uploaded = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (p.remote || (p.uri || "").startsWith("http")) {
        uploaded.push(p.uri);
        continue;
      }
      const fileUri = await ensureFileUri(p.uri);
      if (!fileUri) continue;

      const filename = `${Date.now()}_${i}.jpg`;
      const path = `vehicle-checks/${uid}/${checkDocId}/${filename}`;
      const r = ref(storage, path);

      const resp = await fetch(fileUri);
      const blob = await resp.blob();

      await new Promise((resolve, reject) =>
        uploadBytesResumable(r, blob, {
          contentType: "image/jpeg",
        }).on("state_changed", undefined, reject, resolve)
      );
      uploaded.push(await getDownloadURL(r));
    }
    return uploaded;
  };

  const validateBeforeSubmit = () => {
    return validateDailyVehicleCheck({ items, vehicleId: vehicle, odometer });
  };

  const save = async (finalize = false) => {
    if (loadError) { Alert.alert("Vehicle check unavailable", "Retry loading the check before saving."); return; }
    if (saving) return;

    try {
      setSaving(true);
      const companyId = employee?.companyId;
      if (!companyId) throw new Error("Missing authenticated company for vehicle check");
      const photoUrls = await uploadPhotos();

      const checkedAt = new Date();
      const payload = {
        companyId,
        recordVersion: 2,
        bookingId: jobId || null, // for JobDay lookup when linked to a job
        jobId: jobId || null,
        dateISO: finalize ? toISO(checkedAt) : dateISO,
        time: finalize ? `${String(checkedAt.getHours()).padStart(2, "0")}:${String(checkedAt.getMinutes()).padStart(2, "0")}` : timeStr,
        vehicle: selectedVehicleOption?.label || "Unknown vehicle",
        vehicleId: selectedVehicleOption?.value || vehicle,
        vehicleName: getVehicleDisplayName(
          selectedVehicleOption?.vehicle,
          vehiclesResource.data
        ),
        registration: getVehicleRegistration(selectedVehicleOption?.vehicle) || "",
        trailerId: trailerId.trim(),
        odometer,
        driverName,
        driverCode: userCode,
        driverUid: user?.uid || auth.currentUser?.uid || "",
        items,
        notes,
        photos: photoUrls,
        reportedTo: "Bickers workshop",
        nilDefects: !items.some((item) => item.status === STATUS.DEFECT),
        status: finalize ? "submitted" : "draft",
        updatedAt: serverTimestamp(),
      };
      if (finalize) {
        const submittedRef = doc(collection(db, "vehicleChecks"));
        const submissionSnapshot = {
          jobId: payload.jobId,
          dateISO: payload.dateISO,
          time: payload.time,
          vehicleId: payload.vehicleId,
          registration: payload.registration,
          trailerId: payload.trailerId,
          odometer: payload.odometer,
          driverName: payload.driverName,
          driverUid: payload.driverUid,
          items: items.map((item) => ({ ...item })),
          notes,
          photos: [...photoUrls],
          reportedTo: payload.reportedTo,
          nilDefects: payload.nilDefects,
        };
        const batch = writeBatch(db);
        batch.set(submittedRef, { ...payload, checkId: submittedRef.id, submittedAt: serverTimestamp(), createdAt: serverTimestamp(), submissionSnapshot });
        if (hasExisting) batch.set(doc(db, "vehicleChecks", checkDocId), { companyId, status: "submitted-copy", submittedCheckId: submittedRef.id, updatedAt: serverTimestamp() }, { merge: true });
        await batch.commit();
      } else {
        await setDoc(doc(db, "vehicleChecks", checkDocId), {
          ...payload,
          checkId: checkDocId,
          ...(!hasExisting ? { createdAt: serverTimestamp() } : {}),
        }, { merge: true });
      }
      await invalidate("collection:vehicleChecks");

      if (finalize) {
        Alert.alert(
          "Submitted",
          payload.nilDefects ? "Daily check recorded with nil defects." : "Defects sent to the workshop. Do not drive if a defect is dangerous.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        setHasExisting(true);
        Alert.alert("Saved", "Draft saved.");
      }
    } catch (e) {
      console.error("vehicle-check save error", e);
      Alert.alert("Error", "Could not save vehicle check.");
    } finally {
      setSaving(false);
    }
  };

  const onSubmitOrUpdate = async () => {
    const err = validateBeforeSubmit();
    if (err) return Alert.alert("Incomplete", err);
    await save(true);
  };

  if (loading || !isAuthed) return null;

  if (loadingDoc) {
    return (
      <PageShell
        appearance="grouped" mode="form" width="form"
        header={{ variant: "compact", title: "Daily Vehicle Check", onBack: router.back }}
        state={{
          resources: [{ isInitialLoading: loadingDoc }],
          hasContent: false,
          loadingLabel: "Loading vehicle check…",
        }}
      />
    );
  }

  const sectionStates = dailyVehicleCheckSections.map((section) => {
    const sectionItems = items.filter((item) => section.itemNumbers.includes(item.i));
    return {
      ...section,
      items: sectionItems,
      completed: sectionItems.every((item) => !!item.status),
      defectCount: sectionItems.filter((item) => item.status === STATUS.DEFECT).length,
    };
  });
  const completedSectionCount = sectionStates.filter((section) => section.completed).length;
  const defectCount = items.filter((item) => item.status === STATUS.DEFECT).length;

  return (
    <PageShell
      appearance="grouped"
      mode="form"
      width="form"
      header={{
        variant: "compact",
        title: "Daily Vehicle Check",
        subtitle: job ? `Job #${job.jobNumber || "N/A"} · ${job.client || "No client"}` : undefined,
        onBack: router.back,
        metadata: hasExisting ? <Text tone={"success"} style={[styles.existingBadge]}>Today&apos;s draft restored</Text> : undefined,
      }}
    >

        {loadError ? <Banner title="Vehicle check unavailable" tone="warning" presentation="card">
          <Text tone="secondary">{loadError}</Text>
          <AppButton label="Retry loading check" variant="secondary" onPress={loadData} />
        </Banner> : null}
        <View style={styles.checkContext}>
          <CheckContextItem icon="user" label="Driver" value={driverName} colors={colors} />
          <CheckContextItem
            icon="calendar"
            label="Check time"
            value={`${formatDateDDMMYYYY(dateISO) || dateISO} · ${timeStr}`}
            colors={colors}
          />
        </View>

        <View style={styles.grid2}>
          <SelectField
              label="Vehicle"
              value={vehicle}
              options={vehicleOptions}
              onChange={setVehicle}
              searchable
              showSelectedDescription
            />
          <FormField
              label="Odometer Reading"
              value={odometer}
              onChangeText={setOdometer}
              placeholder="e.g., 123456"
              inputProps={{ keyboardType: "numeric" }}
            />
          <FormField
              label="Trailer ID (if towing)"
              value={trailerId}
              onChangeText={setTrailerId}
              placeholder="Trailer registration or fleet number"
            />
        </View>

        {/* Checks */}
        <SectionCard tone="grouped" layoutStyle={styles.card}>
          <View style={styles.checkSectionHeader}>
            <View>
              <Text tone={"primary"} style={[styles.cardTitle]}>Daily Check</Text>
              <Text tone={"muted"} style={[styles.progressText]}>
                {completedSectionCount} of {dailyVehicleCheckSections.length} sections complete
                {defectCount ? ` · ${defectCount} defect${defectCount === 1 ? "" : "s"}` : ""}
              </Text>
            </View>
          </View>
          <View style={styles.sectionList}>
            {sectionStates.map((section) => {
              const isExpanded = expandedSection === section.id;
              return (
                <View
                  key={section.id}
                  style={[styles.checkGroup, { borderColor: colors.border }]}
                >
                  <View style={styles.checkGroupHeader}>
                    <TouchableOpacity
                      onPress={() => setExpandedSection(isExpanded ? null : section.id)}
                      style={styles.groupMain}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      accessibilityLabel={`Open ${section.title} checks`}
                    >
                      <View
                        style={[
                          styles.groupIcon,
                          { backgroundColor: section.defectCount ? colors.danger : colors.surface },
                        ]}
                      >
                        <Icon name={section.icon} size={17} color={section.defectCount ? routeColors.hex_fff_yhjmu8 : colors.textMuted} />
                      </View>
                      <View style={styles.groupCopy}>
                        <Text tone={"primary"} style={[styles.groupTitle]}>{section.title}</Text>
                        <Text tone={"muted"} style={[styles.groupDescription]} numberOfLines={1}>
                          {section.defectCount
                            ? `${section.defectCount} defect${section.defectCount === 1 ? "" : "s"} reported`
                            : section.completed
                            ? "Completed · all items checked"
                            : section.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => markSectionServiceable(section)}
                      style={[
                        styles.headerOkButton,
                        {
                          backgroundColor:
                            section.completed && !section.defectCount
                              ? OK_GREEN
                              : colors.surface,
                          borderColor: OK_GREEN,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark ${section.title} all OK`}
                    >
                      <Icon
                        name="check"
                        size={15}
                        color={section.completed && !section.defectCount ? OK_GREEN_TEXT : OK_GREEN}
                      />
                      <Text
                        style={[
                          styles.headerOkText,
                          {
                            color:
                              section.completed && !section.defectCount
                                ? OK_GREEN_TEXT
                                : OK_GREEN,
                          },
                        ]}
                      >
                        OK
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setExpandedSection(isExpanded ? null : section.id)}
                      style={styles.expandButton}
                      accessibilityRole="button"
                      accessibilityLabel={`${isExpanded ? "Close" : "Open"} ${section.title} checks`}
                    >
                      <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {isExpanded ? (
                    <View style={[styles.groupItems, { borderTopColor: colors.border }]}>
                      {section.items.map((it) => {
                        const itemIndex = items.findIndex((item) => item.i === it.i);
                        return (
                          <View key={it.i} style={styles.itemRow}>
                            <Text tone={"primary"} style={[styles.itemLabel]}>{it.label}</Text>
                            <TouchableOpacity
                              onPress={() => setItemStatus(itemIndex)}
                              activeOpacity={0.85}
                              style={[
                                styles.statusBadge,
                                it.status === STATUS.SERVICEABLE && styles.statusOk,
                                it.status === STATUS.DEFECT && styles.statusDefect,
                                it.status === STATUS.NA && { borderColor: routeColors.hex_666_yhlfzk, backgroundColor: colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusText,
                                  {
                                    color:
                                      it.status === STATUS.SERVICEABLE
                                        ? routeColors.hex_052e16_89ayk3
                                        : it.status === STATUS.DEFECT
                                        ? routeColors.hex_7f1d1d_81m7ef
                                        : colors.text,
                                  },
                                ]}
                              >
                                {it.status === STATUS.SERVICEABLE
                                  ? "OK"
                                  : it.status === STATUS.DEFECT
                                  ? "Defect"
                                  : it.status === STATUS.NA
                                  ? "N/A"
                                  : "Set"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </SectionCard>

        {defectCount > 0 ? (
          <SectionCard tone="grouped" layoutStyle={styles.card} style={{ borderColor: colors.danger }}>
          <Text tone={"primary"} style={[styles.cardTitle]}>Defect details</Text>
          <Text
            tone={"muted"} style={{
              marginBottom: t.spacing.xxs,
              fontSize: t.typography.metadata.fontSize,
            }}
          >
            Add a note and assessment for every defect. Submitting reports it to the Bickers workshop.
          </Text>

          {items.map((it, idx) =>
            it.status === STATUS.DEFECT ? (
              <View key={`def-${it.i}`} style={{ marginBottom: t.spacing.xs }}>
                <Text
                  tone={"primary"} style={{
                    fontWeight: "700",
                    marginBottom: t.spacing.xxs,
                  }}
                >
                  {String(it.i).padStart(2, "0")} · {it.label}
                </Text>
                <TextArea
                  label={`${String(it.i).padStart(2, "0")} ${it.label} defect`}
                  value={it.note}
                  onChangeText={(t) => setItemNote(idx, t)}
                  placeholder="Describe the defect, location, severity…"
                />
                <SelectField
                  label="Defect assessment"
                  value={it.assessment || ""}
                  options={[
                    { value: "dangerous", label: "Dangerous — do not drive" },
                    { value: "other", label: "Other defect — workshop review" },
                  ]}
                  onChange={(value) => setItemAssessment(idx, value)}
                />
              </View>
            ) : null
          )}

          <Text
            tone={"primary"} style={{
              fontWeight: "700",
              marginTop: t.spacing.xs,
              marginBottom: t.spacing.xxs,
            }}
          >
            Additional Notes
          </Text>
          <TextArea
            label="Additional Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else to report (accident damage, irregular circumstances, etc.)"
          />
          </SectionCard>
        ) : (
          <SectionCard tone="grouped" layoutStyle={styles.allClearCard}>
            <Icon name="shield" size={17} color={colors.success} />
            <Text tone={"muted"} style={[styles.allClearText]}>
              Defect details will appear here only when an item is marked Defect.
            </Text>
          </SectionCard>
        )}

        {/* Photos */}
        {(defectCount > 0 || photos.length > 0) ? <SectionCard tone="grouped" layoutStyle={styles.card}>
          <Text tone={"primary"} style={[styles.cardTitle]}>
            Photos
          </Text>
          <View
            style={{ flexDirection: "row", gap: t.spacing.xs, marginBottom: t.spacing.xs }}
          >
            <SmallBtn icon="image" text="Library" onPress={pickPhotos} />
          </View>

          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing.xs }}
          >
            {photos.map((p, idx) => (
              <View
                key={`${p.uri}-${idx}`}
                style={{ position: "relative" }}
              >
                <Image
                  source={{ uri: p.uri }}
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: t.radius.sm,
                  }}
                />
                <TouchableOpacity
                  onPress={() =>
                    setPhotos((prev) =>
                      prev.filter((_, i) => i !== idx)
                    )
                  }
                  style={styles.closeChip}
                >
                  <Text
                    style={{ color: routeColors.hex_fff_yhjmu8, fontWeight: t.typography.pageTitle.fontWeight }}
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length === 0 && (
              <Text tone={"muted"}>
                No photos added.
              </Text>
            )}
          </View>
        </SectionCard> : null}

        {/* Actions */}
        <View style={{ flexDirection: "row", gap: t.spacing.xs, marginTop: t.spacing.xs }}>
          <AppButton
            label="Save Draft" variant="secondary"
            onPress={() => save(false)} disabled={saving}
            layoutStyle={styles.actionLayout}
          />
          <AppButton
            label="Submit Check" onPress={onSubmitOrUpdate}
            disabled={saving} loading={saving}
            layoutStyle={styles.actionLayout}
          />
        </View>
    </PageShell>
  );
}

/* ---------- tiny UI helpers ---------- */
const CheckContextItem = ({ icon, label, value, colors }) => (
  <View style={styles.checkContextItem}>
    <View style={[styles.contextIcon, { backgroundColor: colors.surface }]}>
      <Icon name={icon} size={15} color={colors.textMuted} />
    </View>
    <View style={styles.contextText}>
      <Text tone={"muted"} style={[styles.contextLabel]}>{label}</Text>
      <Text tone={"primary"} style={[styles.contextValue]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

const SmallBtn = ({ icon, text, onPress }) => (
  <AppButton icon={icon} label={text} onPress={onPress} variant="secondary" />
);
