import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  compareAppVersions,
  isAppUpdateRequired,
} from "../lib/appVersion.js";

const appConfig = JSON.parse(
  readFileSync(new URL("../app.json", import.meta.url), "utf8")
).expo;
const easConfig = JSON.parse(
  readFileSync(new URL("../eas.json", import.meta.url), "utf8")
);
const packageConfig = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

test("release candidate uses a new app runtime", () => {
  // Sentry introduces native code; older binaries must not receive its OTA bundle.
  assert.ok(compareAppVersions(appConfig.version, "5.0.12") > 0);
  assert.deepEqual(appConfig.runtimeVersion, { policy: "appVersion" });
});

test("Expo Router native dependencies remain autolinked", () => {
  const excludedModules = packageConfig.expo?.autolinking?.exclude ?? [];
  assert.equal(excludedModules.includes("expo-glass-effect"), false);
});

test("minimum version keeps the previous release available during rollout", () => {
  const minimum = appConfig.extra.minSupportedAppVersion;
  assert.ok(compareAppVersions(minimum, appConfig.version) < 0);
  assert.equal(isAppUpdateRequired("5.0.4", minimum), false);
  assert.equal(isAppUpdateRequired("5.0.3", minimum), true);
});

test("Android SDK policy is consistent", () => {
  const nativeMinimum =
    appConfig.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties"
    )?.[1]?.android?.minSdkVersion;

  assert.equal(nativeMinimum, 24);
  assert.equal(appConfig.extra.minAndroidSdk, 24);
});

test("iOS release builds compile React Native from source", () => {
  const buildProperties = appConfig.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties"
  )?.[1];

  assert.equal(buildProperties?.ios?.buildReactNativeFromSource, true);
});

test("camera is available for receipts while audio remains blocked", () => {
  const blocked = new Set(appConfig.android.blockedPermissions);
  const requested = new Set(appConfig.android.permissions);

  assert.equal(blocked.has("android.permission.CAMERA"), false);
  assert.equal(requested.has("android.permission.CAMERA"), true);
  assert.equal(blocked.has("android.permission.RECORD_AUDIO"), true);
  assert.equal(requested.has("android.permission.RECORD_AUDIO"), false);
  assert.match(appConfig.ios.infoPlist.NSCameraUsageDescription, /receipt/i);
  const imagePicker = appConfig.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-image-picker"
  )?.[1];
  assert.equal(imagePicker?.microphonePermission, false);
});

test("iOS photo access explains how selected photos are used", () => {
  const imagePicker = appConfig.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-image-picker"
  )?.[1];
  const purpose = imagePicker?.photosPermission;

  assert.equal(typeof purpose, "string");
  assert.match(purpose, /photos you select from your library/i);
  assert.match(purpose, /receipts? to expenses/i);
  assert.match(purpose, /vehicle or job photos to work records/i);
  assert.match(purpose, /profile/i);
  assert.equal(appConfig.ios.infoPlist.NSPhotoLibraryUsageDescription, purpose);
  const nativeInfoPlistPath = new URL("../ios/Bickers/Info.plist", import.meta.url);
  if (existsSync(nativeInfoPlistPath)) {
    const nativeInfoPlist = readFileSync(nativeInfoPlistPath, "utf8");
    assert.match(nativeInfoPlist, /<key>NSPhotoLibraryUsageDescription<\/key>/);
    assert.ok(nativeInfoPlist.includes(`<string>${purpose}</string>`));
    assert.doesNotMatch(nativeInfoPlist, /<key>NSMicrophoneUsageDescription<\/key>/);
  }
});

test("production builds use remote auto-increment and production variables", () => {
  assert.equal(easConfig.cli.appVersionSource, "remote");
  assert.equal(easConfig.build.production.autoIncrement, true);
  assert.equal(easConfig.build.production.environment, "production");
  assert.equal(
    easConfig.build.production.env.EXPO_PUBLIC_APP_ENV,
    "production"
  );
});

test("internal candidates are production-equivalent and directly installable", () => {
  assert.equal(easConfig.build.internal.distribution, "internal");
  assert.equal(easConfig.build.internal.environment, "production");
  assert.equal(easConfig.build.internal.autoIncrement, true);
  assert.equal(
    easConfig.build.internal.env.EXPO_PUBLIC_APP_ENV,
    "production"
  );
  assert.equal(easConfig.build.internal.android.buildType, "apk");
});
