import { useCallback, useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useAuth } from "../providers/AuthProvider";
import { useCompanyCollection } from "./useOperationalData";
import { listOutboxMutations, subscribeOutbox } from "../lib/sync/outbox";

export function useVehiclePrepResource() {
  const resource = useCompanyCollection("vehiclePrepRecords");
  const { employee, user, isAuthed, loading } = useAuth();
  const companyId = String(employee?.companyId || "").trim();
  const key = `${user?.uid || ""}:${companyId}`;
  const [retry, setRetry] = useState(0);
  const [live, setLive] = useState(null);
  const [pending, setPending] = useState(null);
  useEffect(() => {
    if (loading || !isAuthed || !companyId) return undefined;
    let active = true;
    setLive({ key, state: "loading", rows: [] });
    const refreshPending = async () => {
      const rows = await listOutboxMutations();
      if (active) setPending({ key, rows: rows.filter((row) => (["prepStatus", "prepChecklist"].includes(row.operation) || row.entityType === "vehiclePrepRecord") && row.data?.companyId === companyId && (row.data?.actorUid || row.data?.completedByUid) === user?.uid) });
    };
    refreshPending();
    const stopOutbox = subscribeOutbox(refreshPending);
    const stopLive = onSnapshot(query(collection(db, "vehiclePrepRecords"), where("companyId", "==", companyId)), { includeMetadataChanges: true }, (snapshot) => {
      if (active) setLive({ key, state: snapshot.metadata.hasPendingWrites ? "pending" : snapshot.metadata.fromCache ? "cached" : "ready", rows: snapshot.docs.map((row) => ({ ...row.data(), id: row.id, hasPendingWrites: row.metadata.hasPendingWrites })) });
    }, (error) => { if (active) setLive({ key, state: "error", rows: [], error }); });
    return () => { active = false; stopLive(); stopOutbox(); };
  }, [key, companyId, user?.uid, isAuthed, loading, retry]);
  const current = live?.key === key ? live : null;
  const rows = current?.rows || [];
  const operations = pending?.key === key ? pending.rows : [];
  const data = rows.map((row) => {
    const operation = operations.find((item) => item.entityId === row.id);
    return { ...row, prepReadState: current?.state || "loading", ...(operation ? { pendingPrepStatus: operation.data.desiredCompleted ?? operation.data.completed ?? false, prepConflict: operation.lastErrorCode === "prep/conflict" } : {}) };
  });
  for (const operation of operations) {
    if (!data.some((row) => row.id === operation.entityId)) data.push({ id: operation.entityId, companyId, bookingId: operation.data.bookingId, vehicleId: operation.data.vehicleId, completed: false, pendingPrepStatus: operation.data.desiredCompleted ?? operation.data.completed ?? false, prepConflict: operation.lastErrorCode === "prep/conflict", prepReadState: current?.state || "loading" });
  }
  const refreshCollection = resource.refresh;
  const refresh = useCallback(async () => { setRetry((value) => value + 1); return refreshCollection(); }, [refreshCollection]);
  return { ...resource, refresh, data, state: current?.state || "loading", error: current?.error || resource.error };
}
