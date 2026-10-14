export const RECEIPT_DEMO_PROJECT = "demo-receipts-v2";
export const RECEIPT_DEMO_BUCKET = `${RECEIPT_DEMO_PROJECT}.firebasestorage.app`;
const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

function localUrl(raw, label, hostOnly = false) {
  let url;
  try { url = new URL(hostOnly ? `http://${raw}` : raw); } catch { throw new Error(`${label} must be an explicit loopback address.`); }
  if (url.protocol !== "http:" || !loopback.has(url.hostname) || !url.port || url.username || url.password || url.search || url.hash || (hostOnly && url.pathname !== "/")) throw new Error(`${label} must be an explicit HTTP loopback address with a port.`);
  return url;
}

export function resolveReceiptLocalDemo({ enabled, isDev, appEnv, apiUrl, authHost, firestoreHost, storageHost, projectId, storageBucket, syncApiUrl } = {}) {
  if (enabled !== "true") {
    if (![undefined, "", "false", "0"].includes(enabled) || authHost || firestoreHost || storageHost || projectId === RECEIPT_DEMO_PROJECT || storageBucket === RECEIPT_DEMO_BUCKET) throw new Error("Receipt emulator configuration requires EXPO_PUBLIC_RECEIPTS_LOCAL_DEMO=true.");
    return null;
  }
  if (isDev !== true || String(appEnv || "").toLowerCase() === "production") throw new Error("Receipt local demo requires a development runtime; release and production builds are refused.");
  if ((projectId && projectId !== RECEIPT_DEMO_PROJECT) || (storageBucket && storageBucket !== RECEIPT_DEMO_BUCKET)) throw new Error("Receipt local demo refuses a mixed or production Firebase project/bucket.");
  const api = localUrl(apiUrl, "EXPO_PUBLIC_API_URL");
  const auth = localUrl(authHost, "Receipt Auth emulator", true);
  const firestore = localUrl(firestoreHost, "Receipt Firestore emulator", true);
  const storage = localUrl(storageHost, "Receipt Storage emulator", true);
  if (syncApiUrl) localUrl(syncApiUrl, "Sync API");
  return Object.freeze({
    projectId: RECEIPT_DEMO_PROJECT, storageBucket: RECEIPT_DEMO_BUCKET,
    apiUrl: api.href.replace(/\/+$/, ""),
    authUrl: auth.origin,
    firestore: { host: firestore.hostname.replace(/^\[|\]$/g, ""), port: Number(firestore.port) },
    storage: { host: storage.hostname.replace(/^\[|\]$/g, ""), port: Number(storage.port) },
    firebase: { apiKey: "emulator-only", projectId: RECEIPT_DEMO_PROJECT, authDomain: `${RECEIPT_DEMO_PROJECT}.firebaseapp.com`, storageBucket: RECEIPT_DEMO_BUCKET, appId: "receipt-local-demo" },
  });
}

export function assertReceiptFirebaseMode(app, demo) {
  if (!app) return;
  if (demo && (app.options?.projectId !== demo.projectId || app.options?.storageBucket !== demo.storageBucket)) throw new Error("An existing Firebase app is not the receipt demo. Restart in an isolated development session.");
  if (!demo && app.options?.projectId === RECEIPT_DEMO_PROJECT) throw new Error("An emulator Firebase app cannot be reused outside receipt local demo mode. Restart the app.");
}
