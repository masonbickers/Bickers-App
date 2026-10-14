import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
const ts = createRequire(import.meta.url)("typescript");
const jsx = (type, props) => ({ type, props });
function compile(path, modules) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => { assert.ok(name in modules, name); return modules[name]; } });
  return exports;
}

test("native secondary actions preserve compact symbol and accessible capsule fallback", () => {
  const modifiers = new Proxy({}, { get: (_, name) => (value) => ({ name, value }) });
  let native = { glass: true, components: { Host: "Host", Button: "Button", HStack: "HStack", ProgressView: "ProgressView", Text: "Text" }, modifiers };
  const control = compile("components/ui/NativeActionButton.jsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "./AppPrimitives": { AppButton: "AppButton", useAsyncAction: ({ action, loading, disabled }) => ({ busy: loading, inactive: loading || disabled, run: action }) },
    "./nativeUI": { getNativeUI: () => native },
    "../../lib/design/tokens": { designTokens: { spacing: { xs: 4 }, platformControls: { minimumTouchTarget: 44 } } },
    "../../providers/ThemeProvider": { useTheme: () => ({ colors: { text: "white" }, colorScheme: "dark" }) },
  }).default;
  const props = { label: "Refresh", variant: "secondary", size: "small", icon: "refresh-ccw", systemImage: "arrow.clockwise", accessibilityLabel: "Refresh timesheets", onPress: () => {} };
  const component = control(props);
  const button = component.type(component.props).props.children;
  assert.equal(button.props.systemImage, "arrow.clockwise");
  assert.equal(button.props.onPress, props.onPress);
  assert.ok(button.props.modifiers.some((m) => m.name === "buttonStyle" && m.value === "glass"));
  assert.ok(button.props.modifiers.some((m) => m.name === "controlSize" && m.value === "regular"));
  assert.ok(button.props.modifiers.some((m) => m.name === "accessibilityLabel" && m.value === props.accessibilityLabel));
  const busy = control({ ...props, loading: true });
  const busyButton = busy.type(busy.props).props.children;
  assert.equal(busyButton.props.systemImage, undefined);
  assert.ok(busyButton.props.modifiers.some((m) => m.name === "disabled" && m.value));
  native = null;
  const fallback = control({ ...props, loading: true });
  assert.equal(fallback.props.variant, "glassSecondary");
  assert.equal(fallback.props.pill, true);
  assert.equal(fallback.props.icon, props.icon);
  assert.equal(fallback.props.onPress, props.onPress);
  assert.equal(fallback.props.loading, true);
});

test("native sheet blocks dismissal while saving and preserves the exact fallback props", () => {
  const modifiers = new Proxy({}, { get: (_, name) => (value) => ({ name, value }) });
  let native = { components: { Host: "Host", BottomSheet: "BottomSheet", Group: "Group", RNHostView: "RNHostView", VStack: "VStack", HStack: "HStack", Spacer: "Spacer" }, modifiers };
  const viewport = { width: 390, height: 844, fontScale: 1 };
  const sheet = compile("components/ui/NativeSettingsSheet.jsx", {
    react: { useEffect: () => {}, useState: (value) => [value, () => {}], Children: { toArray: (value) => value ? [value].flat() : [] }, Fragment: "Fragment", cloneElement: (node, props) => ({ ...node, props: { ...node.props, ...props } }) },
    "./NativeActionButton": { default: "NativeActionButton" },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { ScrollView: "ScrollView", View: "View", StyleSheet: { create: (s) => s }, useWindowDimensions: () => viewport },
    "./AppPrimitives": { AppModal: "AppModal", AppText: "AppText", IconButton: "IconButton" },
    "./nativeUI": { getNativeUI: () => native },
    "../../lib/design/tokens": { designTokens: { layout: { tabletBreakpoint: 768 }, spacing: { none: 0, sm: 12, md: 16 } } },
    "../../providers/ThemeProvider": { useTheme: () => ({ colors: { groupedBackground: "#FFF" }, colorScheme: "dark" }) },
  }).default;
  let calls = 0;
  const props = { visible: true, title: "Settings", presentation: "sheet", onRequestClose: () => calls++, busy: true, children: "form" };
  const tree = sheet(props);
  const nativeSheet = tree.props.children;
  nativeSheet.props.onIsPresentedChange(false);
  assert.equal(calls, 0);
  assert.equal(nativeSheet.props.children.props.modifiers.find((m) => m.name === "interactiveDismissDisabled").value, true);
  sheet({ ...props, busy: false }).props.children.props.onIsPresentedChange(false);
  assert.equal(calls, 1);
  const actionProps = { ...props, actions: [{ type: "NativeActionButton", props: { label: "Save" } }] };
  const footer = (tree) => tree.props.children.props.children.props.children.props.children[1];
  assert.equal(footer(sheet(actionProps)).type, "HStack");
  viewport.fontScale = 2;
  assert.equal(footer(sheet(actionProps)).type, "VStack");
  viewport.fontScale = 1;
  viewport.width = 320;
  assert.equal(footer(sheet(actionProps)).type, "VStack");
  native = null;
  const fallback = sheet(props);
  assert.equal(fallback.type, "AppModal");
  assert.equal(fallback.props.onRequestClose, props.onRequestClose);
  assert.equal(fallback.props.children, props.children);
});

test("native segmented picker rejects disabled and unknown selections", () => {
  const modifiers = new Proxy({}, { get: (_, name) => (value) => ({ name, value }) });
  const control = compile("components/ui/NativeSegmentedControl.jsx", {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "./AppPrimitives": { SegmentedControl: "SegmentedControl" },
    "./nativeUI": { getNativeUI: () => ({ components: { Host: "Host", Picker: "Picker", Text: "Text" }, modifiers }) },
    "../../providers/ThemeProvider": { useTheme: () => ({ colors: { accent: "#ED1C25" }, colorScheme: "light" }) },
  }).default;
  let selection = "yard";
  const props = { options: [{ label: "Yard", value: "yard" }, { label: "Office", value: "office" }], value: selection, onChange: (v) => { selection = v; } };
  control(props).props.children.props.onSelectionChange("unknown");
  assert.equal(selection, "yard");
  control({ ...props, disabled: true }).props.children.props.onSelectionChange("office");
  assert.equal(selection, "yard");
  control(props).props.children.props.onSelectionChange("office");
  assert.equal(selection, "office");
});
