import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertReceiptFirebaseMode, RECEIPT_DEMO_BUCKET, RECEIPT_DEMO_PROJECT, resolveReceiptLocalDemo } from "../lib/receipts/localDemoConfig.js";
const config = { enabled: "true", isDev: true, appEnv: "development", apiUrl: "http://127.0.0.1:3002", authHost: "127.0.0.1:9099", firestoreHost: "127.0.0.1:8080", storageHost: "127.0.0.1:9199" };

test("production defaults remain disabled and demo requires an explicit development opt in", () => {
  assert.equal(resolveReceiptLocalDemo(), null); assert.equal(resolveReceiptLocalDemo({ enabled: "false", appEnv: "production" }), null);
  for (const extra of [{ isDev: false }, { appEnv: "production" }, { enabled: "1" }, { enabled: undefined }]) assert.throws(() => resolveReceiptLocalDemo({ ...config, ...extra }));
  const demo = resolveReceiptLocalDemo(config); assert.equal(demo.projectId, RECEIPT_DEMO_PROJECT); assert.equal(demo.storageBucket, RECEIPT_DEMO_BUCKET); assert.equal(demo.authUrl, "http://127.0.0.1:9099");
});
test("partial and mixed production/emulator configurations fail closed", () => {
  for (const key of ["apiUrl", "authHost", "firestoreHost", "storageHost"]) assert.throws(() => resolveReceiptLocalDemo({ ...config, [key]: "" }));
  for (const extra of [{ projectId: "bickers-booking" }, { storageBucket: "bickers-booking.firebasestorage.app" }, { syncApiUrl: "https://production.example" }, { apiUrl: "https://localhost:3002" }, { apiUrl: "http://127.0.0.1:3002@evil.example" }, { authHost: "127.0.0.1.evil.example:9099" }, { firestoreHost: "192.168.1.10:8080" }, { storageHost: "127.0.0.1:9199/path" }]) assert.throws(() => resolveReceiptLocalDemo({ ...config, ...extra }));
  assert.equal(resolveReceiptLocalDemo({ ...config, apiUrl: "http://[::1]:3002", authHost: "[::1]:9099" }).authUrl, "http://[::1]:9099");
});
test("hot reload cannot reuse a production Firebase app in local demo or retain demo in ordinary mode", () => {
  const demo = resolveReceiptLocalDemo(config);
  assert.throws(() => assertReceiptFirebaseMode({ options: { projectId: "bickers-booking" } }, demo));
  assert.throws(() => assertReceiptFirebaseMode({ options: demo.firebase }, null));
  assert.doesNotThrow(() => assertReceiptFirebaseMode({ options: demo.firebase }, demo));
});
const source = (await readFile(new URL("../firebaseConfig.js", import.meta.url), "utf8")).replace(/import[\s\S]*?from\s+["'][^"']+["'];/g, "").replace(/export\s*\{[^}]+\};/g, "").replace(/export default app;/g, "");
function bootstrap(globals, demo, events) {
  const names = ["globalThis", "receiptLocalDemo", "assertReceiptFirebaseMode", "AsyncStorage", "Platform", "getApps", "getApp", "initializeApp", "getAuth", "initializeAuth", "getAsyncStoragePersistence", "browserLocalPersistence", "setPersistence", "getFirestore", "getStorage", "connectAuthEmulator", "connectFirestoreEmulator", "connectStorageEmulator"];
  const mock = (event, result) => (...args) => { events.push([event, ...args]); return result; };
  const auth = {}, db = {}, storage = {};
  return new Function(...names, source + "\nreturn {app,auth,db,storage};")(globals, demo, assertReceiptFirebaseMode, {}, { OS: "ios" }, () => [], () => null, (options) => { events.push(["initializeApp", options]); return { options }; }, mock("getAuth", auth), mock("initializeAuth", auth), () => ({}), {}, async () => {}, mock("getFirestore", db), mock("getStorage", storage), mock("authEmulator"), mock("firestoreEmulator"), mock("storageEmulator"));
}
test("real bootstrap binds every exported service before consumer access and refuses changed endpoints", () => {
  const demo = resolveReceiptLocalDemo(config), events = [], globals = {};
  const first = bootstrap(globals, demo, events);
  assert.deepEqual(events.filter(([name]) => name.endsWith("Emulator")).map(([name]) => name), ["authEmulator", "firestoreEmulator", "storageEmulator"]);
  assert.equal(first.app.options.projectId, RECEIPT_DEMO_PROJECT);
  const second = bootstrap(globals, demo, events); assert.equal(first.auth, second.auth); assert.equal(events.filter(([name]) => name.endsWith("Emulator")).length, 3);
  assert.throws(() => bootstrap(globals, resolveReceiptLocalDemo({ ...config, storageHost: "127.0.0.1:9299" }), events), /endpoints changed/);
  const rejected = []; assert.throws(() => bootstrap({ __fb_app__: { options: { projectId: "bickers-booking" } } }, demo, rejected)); assert.equal(rejected.length, 0);
});
