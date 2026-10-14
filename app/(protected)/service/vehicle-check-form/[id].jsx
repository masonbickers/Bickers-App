import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, View } from "react-native";

import { AppButton, AppText as Text, FormField, TextArea } from "../../../../components/ui/AppPrimitives";
import PageShell from "../../../../components/layout/PageShell";
import { db, storage } from "../../../../firebaseConfig";
import { useServiceCollection } from "../../../../hooks/useServiceData";
import { useAuth } from "../../../../providers/AuthProvider";
import { isDefinitelyOffline, runOrQueueFirestoreMutations } from "../../../../lib/sync/firestoreQueue";
import { enqueueOutboxMutation } from "../../../../lib/sync/outbox";
import { getSyncIdentity } from "../../../../lib/sync/identity";
import { isTransientNetworkError } from "../../../../lib/sync/errors";
import { workshopCompletionMutation } from "../../../../lib/workshopRequestSync";
import { getVehicleName, getVehicleRegistration } from "../../../../lib/fleetSchema";
import { designTokens as t } from "../../../../lib/design/tokens";

const CHECKS = ["Exterior and lights", "Tyres and wheels", "Fluids and leaks", "Cab and controls", "Safety equipment"];
const OPTIONS = ["pass", "attention", "not_applicable"];

export default function WorkshopVehicleCheckForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = String(params.workshopRequestId || "");
  const vehicleId = String(params.vehicleId || "");
  const { employee } = useAuth();
  const { rows: vehicles, loading } = useServiceCollection("vehicles");
  const vehicle = useMemo(() => (vehicles || []).find((item) => item.id === vehicleId), [vehicles, vehicleId]);
  const [ratings, setRatings] = useState({});
  const [defects, setDefects] = useState("");
  const [notes, setNotes] = useState("");
  const [signedBy, setSignedBy] = useState("");
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const draftKey = `workshopVehicleCheckDraft:${requestId}`;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(draftKey).then((raw) => {
      if (!active || !raw) return;
      const draft = JSON.parse(raw);
      setRatings(draft.ratings || {});
      setDefects(draft.defects || "");
      setNotes(draft.notes || "");
      setSignedBy(draft.signedBy || "");
      setPhotos(Array.isArray(draft.photos) ? draft.photos : []);
    }).catch(() => {}).finally(() => { if (active) setDraftLoaded(true); });
    return () => { active = false; };
  }, [draftKey]);

  useEffect(() => {
    if (!draftLoaded || saving) return;
    AsyncStorage.setItem(draftKey, JSON.stringify({ ratings, defects, notes, signedBy, photos })).catch(() => {});
  }, [draftKey, draftLoaded, saving, ratings, defects, notes, signedBy, photos]);

  const addPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsMultipleSelection: true });
    if (result.canceled) return;
    const photoDirectory = `${FileSystem.documentDirectory}workshop-check-photos/${requestId}/`;
    await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
    const saved = [];
    for (const asset of result.assets) {
      const uri = `${photoDirectory}draft-${Date.now()}-${saved.length}.jpg`;
      await FileSystem.copyAsync({ from: asset.uri, to: uri });
      saved.push(uri);
    }
    setPhotos((current) => [...current, ...saved]);
  };

  const submit = async () => {
    if (!requestId || !vehicleId || !vehicle) { Alert.alert("Vehicle unavailable", "Open this request from Workshop To-Do again."); return; }
    if (!employee?.companyId) { Alert.alert("Account unavailable", "Refresh your workshop session and try again."); return; }
    if (CHECKS.some((check) => !ratings[check])) { Alert.alert("Complete the check", "Mark every condition item before signing."); return; }
    if (Object.values(ratings).includes("attention") && !defects.trim()) { Alert.alert("Describe the defect", "Record what needs attention before signing."); return; }
    if (!signedBy.trim()) { Alert.alert("Signature required", "Enter your name to sign off this check."); return; }
    if (submitLock.current) return;
    submitLock.current = true;
    const originalIdentity = getSyncIdentity(employee?.uid);
    setSaving(true);
    try {
      const storagePaths = photos.map((_, index) => `companies/${employee.companyId}/workshopVehicleChecks/${requestId}/photo-${index}.jpg`);
      let queuePhotos = isDefinitelyOffline(await NetInfo.fetch());
      let photoURLs = [];
      if (!queuePhotos) {
        try {
          for (const [index, uri] of photos.entries()) {
            const response = await fetch(uri);
            const blob = await response.blob();
            const storageRef = ref(storage, storagePaths[index]);
            await uploadBytes(storageRef, blob, { contentType: blob.type || "image/jpeg" });
            photoURLs.push(await getDownloadURL(storageRef));
          }
        } catch (error) {
          if (!isTransientNetworkError(error)) throw error;
          queuePhotos = true;
        }
      }
      if (queuePhotos) {
        for (const [index, uri] of photos.entries()) {
          await enqueueOutboxMutation({
            target: "storage", operation: "upload", docPath: storagePaths[index],
            data: { uri, storagePath: storagePaths[index], contentType: "image/jpeg" },
            entityType: "workshopVehicleCheckPhoto", entityId: requestId,
          }, originalIdentity);
        }
        photoURLs = storagePaths.map((path) => ({ __storageDownloadURL: path }));
      }
      const record = {
        companyId: employee?.companyId || "",
        workshopRequestId: requestId,
        workshopWorkType: "vehicle_check",
        vehicleId,
        vehicleName: getVehicleName(vehicle) || "Vehicle",
        registration: getVehicleRegistration(vehicle) || "",
        checkedAt: new Date().toISOString(),
        ratings,
        defects: defects.trim(),
        notes: notes.trim(),
        photoURLs,
        signedBy: signedBy.trim(),
        createdAt: new Date().toISOString(),
      };
      const formRef = doc(db, "workshopVehicleChecks", requestId);
      const mutations = [
        {
          run: () => setDoc(formRef, record),
          mutation: { operation: "set", docPath: `workshopVehicleChecks/${requestId}`, data: record, options: { merge: false }, entityType: "workshopVehicleCheck", entityId: requestId },
        },
        workshopCompletionMutation({ requestId, workType: "vehicle_check", assetId: vehicleId, collection: "workshopVehicleChecks", recordId: requestId, signedBy }),
      ];
      const { queued } = queuePhotos
        ? await (async () => {
            for (const item of mutations) await enqueueOutboxMutation({ target: "firestore", ...item.mutation }, originalIdentity);
            return { queued: true };
          })()
        : await runOrQueueFirestoreMutations(mutations, originalIdentity);
      setDraftLoaded(false);
      await AsyncStorage.removeItem(draftKey);
      Alert.alert(queued ? "Saved offline" : "Check complete", queued ? "The signed check and request status will sync when online." : "The workshop request is complete.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert("Could not save", error?.message || "Try again.");
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  return <PageShell title="General vehicle check" subtitle="Record condition and sign off this workshop request.">
    <ScrollView contentContainerStyle={{ padding: t.spacing.md, gap: t.spacing.md }}>
      {loading ? <ActivityIndicator /> : <Text>{vehicle ? `${getVehicleName(vehicle)} · ${getVehicleRegistration(vehicle)}` : "Vehicle unavailable"}</Text>}
      {CHECKS.map((check) => <View key={check} style={{ gap: t.spacing.xs }}>
        <Text>{check}</Text>
        <View style={{ flexDirection: "row", gap: t.spacing.xs, flexWrap: "wrap" }}>
          {OPTIONS.map((option) => <AppButton key={option} label={option === "not_applicable" ? "N/A" : option === "attention" ? "Needs attention" : "Pass"} variant={ratings[check] === option ? "primary" : "secondary"} onPress={() => setRatings((current) => ({ ...current, [check]: option }))} />)}
        </View>
      </View>)}
      <TextArea label="Defects found" value={defects} onChangeText={setDefects} placeholder="Describe any issue that needs attention" />
      <TextArea label="Workshop notes" value={notes} onChangeText={setNotes} placeholder="Other observations or work completed" />
      <AppButton label="Add photos" onPress={addPhoto} />
      <View style={{ flexDirection: "row", gap: t.spacing.xs, flexWrap: "wrap" }}>{photos.map((uri, index) => <Image key={`${uri}-${index}`} source={{ uri }} style={{ width: 76, height: 76 }} />)}</View>
      <FormField label="Signed by" value={signedBy} onChangeText={setSignedBy} placeholder="Your name" />
      <AppButton label={saving ? "Saving…" : "Sign and complete"} onPress={submit} disabled={saving || loading || !vehicle} />
    </ScrollView>
  </PageShell>;
}
