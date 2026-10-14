import NetInfo from "@react-native-community/netinfo";
import { auth } from "../../firebaseConfig";
import { getSyncIdentity } from "./identity";

import { isTransientNetworkError } from "./errors";
import { enqueueOutboxMutation } from "./outbox";

export const queuedServerTimestamp = () => ({
  __firestoreOp: "serverTimestamp",
});

export const queuedArrayUnion = (...values) => ({
  __firestoreOp: "arrayUnion",
  values,
});

export function isDefinitelyOffline(networkState) {
  return (
    networkState?.isConnected === false ||
    networkState?.isInternetReachable === false
  );
}

async function queueMutation(mutation, identity) {
  await enqueueOutboxMutation({
    ...mutation,
    target: "firestore",
  }, identity);
}

export async function runOrQueueFirestoreMutation({ run, mutation }, originalIdentity = getSyncIdentity(auth.currentUser?.uid)) {
  try {
    const networkState = await NetInfo.fetch();
    if (isDefinitelyOffline(networkState)) {
      await queueMutation(mutation, originalIdentity);
      return { queued: true, error: null };
    }
  } catch {
    // If connectivity cannot be determined, try the write and use its error as
    // the source of truth. This avoids queueing while a device is actually online.
  }

  const currentIdentity = getSyncIdentity(auth.currentUser?.uid);
  if (!originalIdentity?.uid || !originalIdentity?.companyId
    || currentIdentity?.uid !== originalIdentity.uid
    || currentIdentity?.companyId !== originalIdentity.companyId) {
    await queueMutation(mutation, originalIdentity);
    return { queued: true, error: null };
  }

  try {
    await run();
    return { queued: false, error: null };
  } catch (error) {
    if (!isTransientNetworkError(error)) {
      throw error;
    }

    await queueMutation(mutation, originalIdentity);

    return { queued: true, error };
  }
}

export async function runOrQueueFirestoreMutations(mutations = [], originalIdentity = getSyncIdentity(auth.currentUser?.uid)) {
  let queued = false;

  for (const item of mutations) {
    const result = await runOrQueueFirestoreMutation(item, originalIdentity);
    queued = queued || result.queued;
  }

  return { queued };
}
