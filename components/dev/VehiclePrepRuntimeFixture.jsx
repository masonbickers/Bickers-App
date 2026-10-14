import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { disableNetwork, enableNetwork, doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { DEFAULT_CHECKS, VehiclePrepForm } from "../../app/(protected)/vehicle-prep/[id]";
import { AppButton, AppText } from "../ui/AppPrimitives";
import { useTheme } from "../../providers/ThemeProvider";
import { commitVehiclePrepStatus } from "../../lib/vehiclePrepMutation";
import { runOrQueueFirestoreMutation } from "../../lib/sync/firestoreQueue";
import { listOutboxMutations, subscribeOutbox, enqueueOutboxMutation } from "../../lib/sync/outbox";
import { flushFirestoreOutbox } from "../../lib/sync/engine";

export default function VehiclePrepRuntimeFixture() {
  const { colors } = useTheme();
  const hydrated = useRef(false);
  const [checks, setChecks] = useState(DEFAULT_CHECKS.map((label, index) => ({ id: `check-${index}`, label, done: false })));
  const [notes, setNotes] = useState("");
  const [record, setRecord] = useState(null);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Signing into emulator fixture…");
  const [pending, setPending] = useState([]);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!String(db.app.options.projectId).startsWith("demo-")) throw new Error("Preparation fixture refuses production Firebase.");
    let active = true;
    signInWithEmailAndPassword(auth, "prep@example.test", "demoOnlyPassword2026").then(({ user: next }) => { if (active) { setUser(next); setMessage("Emulator ready"); } }).catch((error) => setMessage(error.message));
    const stop = onSnapshot(doc(db, "vehiclePrepRecords", "job_fixture-booking__vehicle_fixture-van"), { includeMetadataChanges: true }, (snapshot) => {
      const saved = snapshot.data();
      if (!hydrated.current && saved && Array.isArray(saved.checks)) { setChecks(saved.checks); setNotes(saved.notes || ""); hydrated.current = true; }
      setRecord({ ...saved, prepReadState: snapshot.metadata.fromCache ? "cached" : "ready", hasPendingWrites: snapshot.metadata.hasPendingWrites });
    }, (error) => setMessage(error.message));
    const readPending = async () => { const rows = await listOutboxMutations(); if (active) setPending(rows.filter((row) => row.entityId === "job_fixture-booking__vehicle_fixture-van")); };
    readPending(); const stopPending = subscribeOutbox(readPending);
    return () => { active = false; stop(); stopPending(); };
  }, []);
  const handleSave = async () => {
    const operation = { companyId: "fixture-a", bookingId: "fixture-booking", vehicleId: "fixture-van", desiredCompleted: true, expectedRevision: record?.statusRevision ?? 0,
      mutationId: `fixture_${Date.now()}`, actorUid: user.uid,
      attribution: { uid: user.uid, employeeId: "fixture-employee", name: "Prep Employee", code: "P1" },
      checklistPatch: { checks, equipmentChecks: [], notes } };
    setSaving(true);
    try {
      if (offline) {
        await enqueueOutboxMutation({ target: "firestore", operation: "prepStatus", docPath: "vehiclePrepRecords/job_fixture-booking__vehicle_fixture-van", data: operation, entityType: "vehiclePrepRecord", entityId: "job_fixture-booking__vehicle_fixture-van" });
        setMessage("Save pending — awaiting server confirmation");
        return;
      }
      const result = await runOrQueueFirestoreMutation({ run: () => commitVehiclePrepStatus(operation), mutation: { operation: "prepStatus", docPath: "vehiclePrepRecords/job_fixture-booking__vehicle_fixture-van", data: operation, entityType: "vehiclePrepRecord", entityId: "job_fixture-booking__vehicle_fixture-van" } });
      setMessage(result.queued ? "Save pending — awaiting server confirmation" : "Server-confirmed completion");
    } catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };
  const reconnect = async () => { await enableNetwork(db); setOffline(false); const result = await flushFirestoreOutbox(); const rows = await listOutboxMutations(); setMessage(`Sync: ${result.appliedCount} confirmed; ${rows.length} pending`); };
  return <View>
    <AppText testID="prep-runtime-message">{message}</AppText>
    <AppButton label={offline ? "Reconnect and sync" : "Go offline"} onPress={offline ? reconnect : async () => { await disableNetwork(db); setOffline(true); setMessage("Offline — saves stay pending"); }} />
    {pending.length ? <AppButton label="Sync pending saves" onPress={reconnect} /> : null}
    <VehiclePrepForm colors={colors} checks={checks} equipmentChecks={[]} notes={notes} setNotes={setNotes} toggleCheck={(id) => setChecks((rows) => rows.map((row) => row.id === id ? { ...row, done: !row.done } : row))} toggleEquipmentCheck={() => {}} saving={saving || !user} allDone={checks.every((row) => row.done)} handleSave={handleSave} vehicleName="Pool Van" registration="LM17 WFG" dateLabel="Thursday, 15 October 2026" existingRecord={{ ...record, ...(pending.length ? { pendingPrepStatus: true, prepConflict: pending.some((row) => row.lastErrorCode === "prep/conflict") } : {}) }} router={{ back: () => {} }} />
  </View>;
}
