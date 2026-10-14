import * as Application from "expo-application";
import { Platform } from "react-native";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  waitForPendingWrites,
} from "firebase/firestore";

import { db } from "../firebaseConfig";
import { getApiBaseUrl } from "./api";
import { fetchWithServiceWakeRetry } from "./serviceRetry";
import {
  WORKING_TERMS_EFFECTIVE_DATE,
  WORKING_TERMS_TITLE,
  WORKING_TERMS_VERSION,
} from "./workingTerms";

export function workingTermsAcceptanceRef(uid) {
  return doc(
    db,
    "workingTermsAcceptances",
    uid,
    "versions",
    WORKING_TERMS_VERSION
  );
}

export function isCurrentWorkingTermsAcceptance(data) {
  return (
    data?.accepted === true &&
    data?.documentVersion === WORKING_TERMS_VERSION &&
    data?.userId
  );
}

export async function loadWorkingTermsAcceptance(firebaseUser) {
  if (!firebaseUser || firebaseUser.isAnonymous) return null;
  let snapshot;
  try { snapshot = await getDoc(workingTermsAcceptanceRef(firebaseUser.uid)); }
  catch (error) {
    // Some supported rule sets keep signatures server-only. The authenticated
    // resolver still verifies the employee and original acceptance record.
    if (!["permission-denied", "firestore/permission-denied"].includes(error?.code)) throw error;
  }
  if (snapshot?.exists()) {
    const data = snapshot.data();
    if (!isCurrentWorkingTermsAcceptance(data)) {
      throw new Error("Your Working Terms record needs an administrator to check it.");
    }
    return { id: snapshot.id, ...data };
  }
  const idToken = await firebaseUser.getIdToken();
  const response = await fetchWithServiceWakeRetry(
    `${getApiBaseUrl("Working Terms service")}/auth/working-terms-acceptance`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || !Object.hasOwn(body, "acceptance")) {
    throw new Error(body?.error || "We could not check your existing Working Terms. Please try again.");
  }
  if (body.acceptance === null) return null;
  if (!isCurrentWorkingTermsAcceptance(body.acceptance)) {
    throw new Error("Your existing Working Terms could not be verified.");
  }
  return { id: WORKING_TERMS_VERSION, ...body.acceptance };
}

export async function signWorkingTerms({ firebaseUser, employee, fullName, signatureSvgPath }) {
  if (!firebaseUser || firebaseUser.isAnonymous) {
    throw new Error("Your signed-in session is no longer available. Please sign in again.");
  }

  const cleanName = String(fullName || "").trim();
  const cleanSignature = String(signatureSvgPath || "").trim();
  if (cleanName.length < 2) throw new Error("Enter your full name.");
  if (!cleanSignature.startsWith("M ") || cleanSignature.length < 20) {
    throw new Error("Please draw your signature in the box.");
  }

  const ref = workingTermsAcceptanceRef(firebaseUser.uid);
  const existing = await loadWorkingTermsAcceptance(firebaseUser);
  if (existing) return existing;

  await setDoc(ref, {
    accepted: true,
    acceptedAt: serverTimestamp(),
    companyId: String(employee?.companyId || "bickers-action"),
    documentEffectiveDate: WORKING_TERMS_EFFECTIVE_DATE,
    documentTitle: WORKING_TERMS_TITLE,
    documentVersion: WORKING_TERMS_VERSION,
    employeeId: String(employee?.employeeId || ""),
    email: String(firebaseUser.email || employee?.email || "").trim().toLowerCase(),
    fullName: cleanName,
    signatureSvgPath: cleanSignature,
    signedFromAppVersion: String(Application.nativeApplicationVersion || "unknown"),
    signedFromPlatform: Platform.OS,
    userId: firebaseUser.uid,
  });

  // Access remains locked until Firestore has confirmed the immutable record.
  await waitForPendingWrites(db);
  const confirmed = await getDoc(ref);
  if (!confirmed.exists() || !isCurrentWorkingTermsAcceptance(confirmed.data())) {
    throw new Error("Your signature could not be confirmed. Please try again.");
  }
  return { id: confirmed.id, ...confirmed.data() };
}
