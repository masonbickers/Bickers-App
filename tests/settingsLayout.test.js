import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";

const settingsSource = readFileSync(
  new URL("../app/(protected)/settings.js", import.meta.url),
  "utf8"
);

test("notification action labels match permission state and actual destination", () => {
  const ts = createRequire(import.meta.url)("typescript");
  const ast = ts.createSourceFile("settings.jsx", settingsSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  let object;
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node) && node.properties.some((property) => property.name?.getText(ast) === "type" && property.initializer?.getText(ast) === '"notification-permission"')) object = node.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(object);
  for (const [granted, status, expected] of [[true, "granted", "Open Settings"], [false, "denied", "Open Settings"], [false, "undetermined", "Turn on"]]) {
    const openSettings = () => {};
    const enable = () => {};
    const entry = vm.runInNewContext(`(${object})`, { securityStatus: { notificationsGranted: granted, notificationStatus: status }, Linking: { openSettings }, handleEnableNotifications: enable });
    assert.equal(entry.actionLabel, expected);
    if (expected === "Turn on") assert.equal(entry.onPress, enable);
    else {
      let opened = false;
      const destination = vm.runInNewContext(`(${object})`, { securityStatus: { notificationsGranted: granted, notificationStatus: status }, Linking: { openSettings: () => { opened = true; } }, handleEnableNotifications: enable });
      destination.onPress();
      assert.equal(opened, true);
    }
  }
  const message = settingsSource.match(/`Enable notifications for this app in [^`]+`/)?.[0];
  assert.ok(message);
  for (const [platform, name] of [["ios", "iOS"], ["android", "Android"], ["web", "Device"]]) {
    assert.equal(vm.runInNewContext(message, { Platform: { OS: platform } }), `Enable notifications for this app in ${name} Settings.`);
  }
});

test("completed setup tasks and item-count badges do not clutter settings", () => {
  assert.match(settingsSource, /const incompleteSetupItems = accountSetupItems\.filter/);
  assert.match(settingsSource, /incompleteSetupItems\.length > 0/);
  assert.doesNotMatch(settingsSource, /sectionCountPill/);
  assert.doesNotMatch(settingsSource, /Account Setup/);
});

test("notification controls use real device permission and saved preferences", () => {
  assert.match(settingsSource, /group: "Notifications"/);
  assert.match(settingsSource, /type: "notification-permission"/);
  assert.match(settingsSource, /maintenanceReminderEnabled && securityStatus\.notificationsGranted/);
  assert.doesNotMatch(settingsSource, /notificationsEnabled/);
  assert.doesNotMatch(settingsSource, /type: "toggle"/);
});

test("appearance is a dedicated compact settings group", () => {
  assert.match(settingsSource, /group: "Appearance"/);
  assert.match(settingsSource, /label: "Theme"/);
  assert.match(settingsSource, /<SegmentedControl/);
  assert.match(settingsSource, /<ListRow/);
  assert.doesNotMatch(settingsSource, /Test Alert|test-notification/);
});
