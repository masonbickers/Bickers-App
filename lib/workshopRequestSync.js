import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { completionForWorkshopRequest } from "./workshopRequests";

export function workshopCompletionMutation({ requestId, workType, assetId, collection, recordId, signedBy }) {
  if (!requestId) return null;
  const patch = {
    ...completionForWorkshopRequest(
      { id: requestId, workType, assetId, status: "open" },
      { id: recordId, collection, assetId, signedBy }
    ),
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const requestRef = doc(db, "workshopRequests", String(requestId));
  return {
    run: () => updateDoc(requestRef, patch),
    mutation: {
      operation: "update",
      docPath: `workshopRequests/${requestId}`,
      data: patch,
      entityType: "workshopRequest",
      entityId: String(requestId),
    },
  };
}
