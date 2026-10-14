// firebaseConfig.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  setPersistence,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { Platform } from "react-native";
import { getAsyncStoragePersistence } from "./lib/firebaseAuthPersistence";
import { receiptLocalDemo } from "./lib/receipts/localDemo";
import { assertReceiptFirebaseMode } from "./lib/receipts/localDemoConfig";

/** ---- Your project config ---- */
const firebaseConfig = {
  apiKey: "AIzaSyBiKz88kMEAB5C-oRn3qN6E7KooDcmYTWE",
  authDomain: "bickers-booking.firebaseapp.com",
  projectId: "bickers-booking",
  storageBucket: "bickers-booking.firebasestorage.app",
  messagingSenderId: "784506946068",
  appId: "1:784506946068:web:7a86167b5f7f4b0b249d01",
  // databaseURL: "https://bickers-booking-default-rtdb.firebaseio.com",
};

/** ---- App (singleton) ---- */
const existingApp = globalThis.__fb_app__ || (getApps().length ? getApp() : null);
assertReceiptFirebaseMode(existingApp, receiptLocalDemo);
const app = existingApp || initializeApp(receiptLocalDemo?.firebase || firebaseConfig);
globalThis.__fb_app__ = app;

/** ---- Auth (singleton; RN uses initializeAuth + AsyncStorage) ---- */
let auth = globalThis.__fb_auth__;
if (!auth) {
  if (Platform.OS === "web") {
    // Web: use local persistence (stays signed in across reloads)
    auth = getAuth(app);
    // Don't crash if called twice during fast refresh
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } else {
    // Native: must initialize with AsyncStorage persistence
    try {
      auth = initializeAuth(app, {
        persistence: getAsyncStoragePersistence(AsyncStorage),
      });
    } catch {
      // Already initialised (e.g., after fast refresh)
      auth = getAuth(app);
    }
  }
  globalThis.__fb_auth__ = auth;
}

/** ---- Firestore & Storage (singletons) ---- */
const db = globalThis.__fb_db__ || getFirestore(app);
const storage = globalThis.__fb_storage__ || getStorage(app);
globalThis.__fb_db__ = db;
globalThis.__fb_storage__ = storage;

// Connect synchronously before exporting services to AuthProvider or background hooks.
if (receiptLocalDemo) {
  const binding = JSON.stringify(receiptLocalDemo);
  if (globalThis.__fb_receipt_demo_binding__ && globalThis.__fb_receipt_demo_binding__ !== binding) throw new Error("Receipt emulator endpoints changed. Restart the development app.");
  if (!globalThis.__fb_receipt_demo_binding__) {
    connectAuthEmulator(auth, receiptLocalDemo.authUrl, { disableWarnings: true });
    connectFirestoreEmulator(db, receiptLocalDemo.firestore.host, receiptLocalDemo.firestore.port);
    connectStorageEmulator(storage, receiptLocalDemo.storage.host, receiptLocalDemo.storage.port);
    globalThis.__fb_receipt_demo_binding__ = binding;
  }
} else if (globalThis.__fb_receipt_demo_binding__) throw new Error("Receipt demo services cannot be reused by production. Restart the app.");

export { app, auth, db, storage };
export default app;
