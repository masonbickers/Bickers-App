import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { getDeviceReceiptQueue, syncDeviceReceipts } from "../lib/receipts/native";
import { startReceiptSyncSession } from "../lib/receipts/syncSession";

export function useReceiptSync({ user, employee, enabled }) {
  const uid = user?.uid || "", companyId = employee?.companyId || "", personId = employee?.employeeId || "";
  const identity = `${uid}/${companyId}/${personId}`, current = useRef("");
  current.current = enabled ? identity : "";
  useEffect(() => {
    if (!enabled || !uid || !companyId || !personId) return undefined;
    const queue = getDeviceReceiptQueue(companyId, uid, personId);
    return startReceiptSyncSession({
      queue, assertAccount: () => { if (current.current !== identity) throw new Error("The receipt account changed."); },
      sync: (guard) => syncDeviceReceipts(queue, user, undefined, guard),
      getAppState: () => AppState.currentState || "active",
      subscribeNetwork: (listener) => NetInfo.addEventListener(listener),
      subscribeAppState: (listener) => { const subscription = AppState.addEventListener("change", listener); return () => subscription.remove(); },
    });
  }, [companyId, enabled, identity, personId, uid, user]);
}
