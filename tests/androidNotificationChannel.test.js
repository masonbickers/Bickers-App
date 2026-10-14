import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../lib/notifications.js", import.meta.url), "utf8");
const setup = source.slice(source.indexOf("let _channelReady = false;"), source.indexOf("/*                           EXPO PUSH TOKEN HELPERS"));

function load(platform, enabled = true) {
  const calls = [];
  const Notifications = {
    AndroidImportance: { MAX: 5 },
    AndroidNotificationVisibility: { PUBLIC: 1 },
    setNotificationChannelAsync: async (...args) => calls.push(args),
  };
  const ensure = new Function("Platform", "Notifications", "NOTIFICATIONS_RUNTIME_ENABLED", "console", `${setup}\nreturn ensureAndroidChannel;`)({ OS: platform }, Notifications, enabled, console);
  return { ensure, calls };
}

test("Android channel uses the system default sound without naming a custom resource", async () => {
  const { ensure, calls } = load("android");
  await ensure();
  await ensure();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "default");
  const options = calls[0][1];
  assert.equal(Object.hasOwn(options, "sound"), false);
  assert.equal(options.importance, 5);
  assert.equal(options.enableVibrate, true);
  assert.deepEqual(options.vibrationPattern, [0, 250, 250, 250]);
});

test("channel setup remains Android-only and honours the runtime guard", async () => {
  for (const [platform, enabled] of [["ios", true], ["web", true], ["android", false]]) {
    const { ensure, calls } = load(platform, enabled);
    await ensure();
    assert.equal(calls.length, 0);
  }
});
