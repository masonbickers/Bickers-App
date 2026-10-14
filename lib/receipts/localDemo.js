import Constants from "expo-constants";
import { resolveReceiptLocalDemo } from "./localDemoConfig.js";

const extra = Constants.expoConfig?.extra || Constants.manifest2?.extra || Constants.manifest?.extra || {};
// Keep explicit property access: Expo statically replaces EXPO_PUBLIC values.
export const receiptLocalDemo = resolveReceiptLocalDemo({
  enabled: process.env.EXPO_PUBLIC_RECEIPTS_LOCAL_DEMO,
  isDev: typeof __DEV__ !== "undefined" && __DEV__,
  appEnv: process.env.EXPO_PUBLIC_APP_ENV || extra.appEnv || process.env.NODE_ENV,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || extra.EXPO_PUBLIC_API_URL || extra.apiUrl,
  authHost: process.env.EXPO_PUBLIC_RECEIPTS_AUTH_EMULATOR_HOST,
  firestoreHost: process.env.EXPO_PUBLIC_RECEIPTS_FIRESTORE_EMULATOR_HOST,
  storageHost: process.env.EXPO_PUBLIC_RECEIPTS_STORAGE_EMULATOR_HOST,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || extra.firebaseProjectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || extra.firebaseStorageBucket,
  syncApiUrl: process.env.EXPO_PUBLIC_SYNC_API_URL || extra.syncApiBaseUrl || extra.SYNC_API_URL,
});
