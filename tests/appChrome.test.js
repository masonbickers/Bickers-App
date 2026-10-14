import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getPageShellBottomPadding,
  resolveAppChrome,
} from "../lib/appChrome.js";

const projectRoot = new URL("..", import.meta.url).pathname;
const protectedRoot = path.join(projectRoot, "app", "(protected)");
const walk = (directory) => readdirSync(directory).flatMap((name) => {
  const absolute = path.join(directory, name);
  return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
});
const routeFiles = walk(protectedRoot).filter((file) => /\.(?:js|jsx|ts|tsx)$/.test(file));

test("app chrome shows the correct workspace tab bar on primary routes", () => {
  assert.deepEqual(resolveAppChrome("/screens/homescreen"), {
    tabsVisible: true,
    workspace: "main",
  });
  assert.deepEqual(resolveAppChrome("/service/home"), {
    tabsVisible: true,
    workspace: "service",
  });
});

test("app chrome hides tabs for auth, keyboard, detail, and form routes", () => {
  assert.equal(resolveAppChrome("/login", { inAuthGroup: true }).tabsVisible, false);
  assert.equal(resolveAppChrome("/job", { keyboardVisible: true }).tabsVisible, false);
  assert.equal(resolveAppChrome("/week/2026-08-17").tabsVisible, false);
  assert.equal(resolveAppChrome("/maintenance").tabsVisible, false);
  assert.equal(resolveAppChrome("/working-terms").tabsVisible, false);
  assert.equal(resolveAppChrome("/document-viewer").tabsVisible, false);
  assert.equal(resolveAppChrome("/service/service-form/123").tabsVisible, false);
  assert.equal(resolveAppChrome("/service/vehicles/123").tabsVisible, false);
  assert.equal(resolveAppChrome("/service/vehicles/file-viewer").tabsVisible, false);
  assert.equal(resolveAppChrome("/service/vehicles").tabsVisible, true);
  assert.equal(resolveAppChrome("/notifications").tabsVisible, true);
});

test("existing form routes preserve their floating navigation", () => {
  for (const route of ["/vehicle-check", "/add-timesheet", "/recce-form", "/query/123", "/vehicle-prep/123", "/service/defect-form", "/service/daily-check", "/service/tyre-brake-check", "/service/minor-service/123", "/service/mot-precheck/123", "/service/vehicle-prep/123"]) {
    assert.equal(resolveAppChrome(route).tabsVisible, true, route);
  }
});

test("page shell bottom padding accounts for tabs and safe areas", () => {
  assert.equal(getPageShellBottomPadding({ safeAreaBottom: 34, tabsVisible: true }), 102);
  assert.equal(getPageShellBottomPadding({ safeAreaBottom: 0, tabsVisible: true }), 92);
  assert.equal(getPageShellBottomPadding({ safeAreaBottom: 34, tabsVisible: false }), 50);
  assert.equal(getPageShellBottomPadding({ safeAreaBottom: 0, tabsVisible: false }), 16);
  assert.equal(
    getPageShellBottomPadding({
      safeAreaBottom: 34,
      tabsVisible: true,
      floatingAccessoryHeight: 52,
    }),
    154
  );
});

test("native tabs count their safe-area clearance once and preserve accessory space", () => {
  for (const safeAreaBottom of [0, 34, 83, 100]) {
    assert.equal(getPageShellBottomPadding({ safeAreaBottom, tabsVisible: true, nativeTabs: true }), safeAreaBottom + 16);
    assert.equal(getPageShellBottomPadding({ safeAreaBottom, tabsVisible: true, nativeTabs: true, floatingAccessoryHeight: 52 }), safeAreaBottom + 68);
    assert.equal(getPageShellBottomPadding({ safeAreaBottom, tabsVisible: false, nativeTabs: true }), safeAreaBottom + 16);
  }
});

test("detail pages use platform motion preferences while footer-tab switches remain immediate", () => {
  const protectedLayout = readFileSync(
    path.join(protectedRoot, "_layout.jsx"),
    "utf8"
  );

  assert.match(protectedLayout, /animation:\s*reduceMotion \? "none" : Platform\.OS === "android" \? "default" : "slide_from_right"/);
  assert.match(protectedLayout, /gestureEnabled:\s*true/);
  assert.match(protectedLayout, /fullScreenGestureEnabled:\s*true/);
  assert.match(protectedLayout, /animationMatchesGesture:\s*true/);

  const footerRoutes = ["(main-tabs)", "(service-tabs)"];
  for (const route of footerRoutes) {
    assert.match(
      protectedLayout,
      new RegExp(`name=["']${route.replace(/[()]/g, "\\$&")}["'][^>]*animation:\\s*["']none["']`)
    );
  }
});

test("route back actions use the shared compact header position", () => {
  const manualBackButtons = [];
  const nonCompactHeaders = [];

  for (const file of routeFiles) {
    const source = readFileSync(file, "utf8");
    const relative = path.relative(projectRoot, file);
    const manualBackPattern =
      /<(?:TouchableOpacity|Pressable|AppPressable|IconButton)\b[\s\S]{0,500}(?:router\.back|navigation\.goBack)[\s\S]{0,500}(?:name|icon)=["'](?:arrow-left|chevron-left)["']/;
    const reverseManualBackPattern =
      /<(?:TouchableOpacity|Pressable|AppPressable|IconButton)\b[\s\S]{0,500}(?:name|icon)=["'](?:arrow-left|chevron-left)["'][\s\S]{0,500}(?:router\.back|navigation\.goBack)/;

    if (manualBackPattern.test(source) || reverseManualBackPattern.test(source)) {
      manualBackButtons.push(relative);
    }

    if (/\bonBack\s*:/.test(source)) {
      const usesCompactHeader =
        /header=\{\{[\s\S]{0,500}variant:\s*["']compact["'][\s\S]{0,1500}\bonBack\s*:/.test(source);
      if (!usesCompactHeader) nonCompactHeaders.push(relative);
    }
  }

  assert.deepEqual(manualBackButtons, []);
  assert.deepEqual(nonCompactHeaders, []);

  const sharedHeader = readFileSync(
    path.join(projectRoot, "components", "PageHeaderCard.tsx"),
    "utf8"
  );
  assert.match(sharedHeader, /onBack[\s\S]*<IconButton[\s\S]*icon="arrow-left"/);
  assert.match(sharedHeader, /compactNavigation:\s*\{[\s\S]*alignItems:\s*"flex-start"/);

  const pageShell = readFileSync(
    path.join(projectRoot, "components", "layout", "PageShell.tsx"),
    "utf8"
  );
  assert.match(pageShell, /const headerConstrainedStyle = \{[\s\S]*maxWidth: responsive\.maxContentWidth[\s\S]*paddingHorizontal: responsive\.pageGutter/);
  assert.match(pageShell, /styles\.fixedHeader, headerConstrainedStyle/);
});
