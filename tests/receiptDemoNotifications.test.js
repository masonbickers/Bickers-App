import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Execute the actual helper with native boundaries injected; no Expo/Firebase calls.
const source = readFileSync(new URL("../lib/notifications.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "")
  .replaceAll("export ", "");
function notifications({ demo = null, existing = "undetermined", requested = "granted" } = {}) {
  const calls = [], inbox = [];
  const native = {
    setNotificationHandler() {},
    async getAllScheduledNotificationsAsync() { calls.push("scheduled"); return []; },
    async getPermissionsAsync() { calls.push("get-permission"); return { status: existing }; },
    async requestPermissionsAsync() { calls.push("request-permission"); return { status: requested }; },
    async getExpoPushTokenAsync() { calls.push("push-token"); return { data: "synthetic-test-token" }; },
  };
  const load = new Function("Constants", "Device", "Platform", "receiptLocalDemo", "addToInbox", "require", source + "\nreturn { requestNotificationPermission, registerForPushNotificationsAsync, saveNotificationToInbox };");
  const helpers = load({}, { isDevice: true }, { OS: "ios" }, demo, async (item) => { inbox.push(item); return item; }, (id) => { assert.equal(id, "expo-notifications"); return native; });
  return { ...helpers, calls, inbox };
}

test("local receipt demo registration and direct permission requests never invoke native permission or token calls", async () => {
  const helper = notifications({ demo: { projectId: "demo-receipts-v2" } });
  assert.equal(await helper.registerForPushNotificationsAsync(), null);
  assert.deepEqual(await helper.requestNotificationPermission(), { status: "denied", granted: false });
  assert.deepEqual(helper.calls, []);
  await helper.saveNotificationToInbox({ request: { identifier: "local-receipt", content: { title: "Receipt requested", body: "Open your receipt", data: { receiptId: "receipt-local" } } } });
  assert.equal(helper.inbox.length, 1);
  assert.equal(helper.inbox[0].data.receiptId, "receipt-local");
});

test("ordinary registration still requests permission and retrieves a token after approval", async () => {
  const helper = notifications();
  assert.equal(await helper.registerForPushNotificationsAsync(), "synthetic-test-token");
  assert.deepEqual(helper.calls, ["scheduled", "get-permission", "request-permission", "push-token"]);
});

test("ordinary denied permission never retrieves a push token", async () => {
  const helper = notifications({ requested: "denied" });
  assert.equal(await helper.registerForPushNotificationsAsync(), null);
  assert.deepEqual(helper.calls, ["scheduled", "get-permission", "request-permission"]);
});

test("ordinary previously approved permission is not requested again", async () => {
  const helper = notifications({ existing: "granted" });
  assert.equal(await helper.registerForPushNotificationsAsync(), "synthetic-test-token");
  assert.deepEqual(helper.calls, ["scheduled", "get-permission", "push-token"]);
});
