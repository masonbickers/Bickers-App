import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { receiptLocalDemo } from "./receipts/localDemo";
import { executePrepStatusTransition, executePrepChecklistPatch, prepWritesAllowed, validatePrepReplayContext } from "./vehiclePrepStatus";

export const sharedPrepWritesEnabled = prepWritesAllowed({
  enabled: process.env.EXPO_PUBLIC_SHARED_VEHICLE_PREP_WRITE,
  isDev: typeof __DEV__ !== "undefined" && __DEV__,
  projectId: db.app.options.projectId,
  emulatorConnected: !!receiptLocalDemo,
});

export function commitVehiclePrepStatus(operation) {
  validatePrepReplayContext(operation, { enabled: sharedPrepWritesEnabled, actorUid: auth.currentUser?.uid });
  return executePrepStatusTransition(db, operation, { doc, runTransaction, serverTimestamp });
}

export function commitVehiclePrepChecklist(operation) {
  validatePrepReplayContext(operation, { enabled: sharedPrepWritesEnabled, actorUid: auth.currentUser?.uid });
  return executePrepChecklistPatch(db, operation, { doc, runTransaction, serverTimestamp });
}
