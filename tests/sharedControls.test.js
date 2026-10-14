import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { createActionLock, getServiceStatusColors, getStatusColors } from "../lib/design/semantics.js";
import { getContrastRatio } from "../lib/design/contrast.js";
import { normalizeSelectOptions, filterSelectOptions } from "../lib/design/controlState.js";
const require = createRequire(import.meta.url), ts = require("typescript");
const flatten = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function load(platform) {
  const jsx = (type, props) => ({ type, props });
  const native = { Platform: { OS: platform, select: (values) => values[platform] || values.default }, StyleSheet: { create: (value) => value, flatten, hairlineWidth: 0.5 }, useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }), Pressable: "Pressable", View: "View", Text: "Text", TextInput: "TextInput", Switch: "Switch", Animated: {}, Easing: {} };
  const compile = (path, modules) => {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, console, require: (name) => { assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`); return modules[name]; } });
    return exports;
  };
  const platformPolicy = compile("lib/design/platform.ts", {});
  const radius = compile("lib/design/radius.ts", {});
  const { designTokens: tokens } = compile("lib/design/tokens.ts", { "react-native": native, "./navigation.js": { navigationMetrics: {} }, "./platform": platformPolicy });
  const cardSurface = compile("lib/design/cardSurface.js", { "./tokens": { designTokens: tokens }, "./radius": radius });
  const colors = { accent: "#ED1C25", accentSoft: "#FDD", accentText: "#B31920", accentFill: "#D91D26", text: "#15202B", textOnAccent: "#FFFFFF", glassPressed: "rgba(0,0,0,0.16)", glassBorder: "#CCC", background: "#F9FAFB", surface: "#FFF", surfaceAlt: "#EEE", border: "#DDD" };
  const controls = compile("components/ui/AppPrimitives.js", {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    react: { useEffect: () => {}, useMemo: (fn) => fn(), useRef: (value) => ({ current: value }), useState: (initial) => [initial, () => {}] },
    "react-native": native,
    "react-native-calendars": { Calendar: "Calendar" }, "expo-router": { usePathname: () => "/service/form" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" }, "react-native-vector-icons/Feather": { default: "Icon" },
    "../../lib/design/controlState": { normalizeSelectOptions, filterSelectOptions, resolveInteractionState: ({ disabled }) => ({ opacity: disabled ? 0.55 : 1 }) },
    "../../lib/design/cardSurface": cardSurface,
    "../../lib/design/tokens": { designTokens: tokens }, "../../lib/design/radius": radius,
    "../../lib/design/pageDensity": { resolvePageDensity: (_pathname, density) => density || "compact" },
    "../../lib/dateFormat": {}, "../../lib/design/semantics": { createActionLock, getServiceStatusColors, getStatusColors },
    "../../providers/ThemeProvider": { useTheme: () => ({ colors, colorScheme: "light" }) },
    "../../hooks/useReducedMotion": { useReducedMotion: () => true }, "./AppleMaterialSurface": { default: "AppleMaterialSurface" },
  });
  return { controls, tokens, cardSurface, loadTimeChoice: () => compile("components/ui/TimeChoiceRow.js", { "react/jsx-runtime": { jsx, jsxs: jsx }, "react-native": native, "react-native-vector-icons/Feather": { default: "Icon" }, "../../providers/ThemeProvider": { useTheme: () => ({ colors }) }, "../../lib/design/cardSurface": cardSurface,
    "../../lib/design/tokens": { designTokens: tokens }, "./AppPrimitives": controls }).default, loadDocumentSurface: () => compile("components/ui/DocumentSurface.js", { "react/jsx-runtime": { jsx, jsxs: jsx }, "react-native": native, "../../providers/ThemeProvider": { useTheme: () => ({ colors }) } }).default };
}

test("select options show a check only for the current value and retain selection callbacks", () => {
  for (const platform of ["ios", "android"]) {
    const { controls } = load(platform);
    let chosen;
    const options = [{ value: "vehicle", label: "Vehicle" }, { value: "equipment", label: "Equipment" }];
    const field = controls.SelectField({ label: "Asset type", value: "vehicle", options, onChange: (value) => { chosen = value; } });
    const modal = field.props.children.find((node) => node?.type === controls.AppModal);
    const list = modal.props.children.find((node) => node?.props?.renderItem);
    const selected = list.props.renderItem({ item: options[0], index: 0 });
    const other = list.props.renderItem({ item: options[1], index: 1 });
    assert.equal(selected.props.trailing.props.children.props.name, "check");
    assert.equal(other.props.trailing.props.children, null);
    assert.equal(selected.props.selected, true);
    other.props.onPress();
    assert.equal(chosen, "equipment");
  }
});

test("full-width form steps place controls outside the numbered rail without changing the default", () => {
  for (const platform of ["ios", "android"]) {
    const { controls } = load(platform);
    const content = { type: "Input" };
    const wide = controls.FormStep({ number: 1, title: "Dates", fullWidth: true, children: content });
    assert.equal(wide.props.children[1], content);
    const standard = controls.FormStep({ number: 1, title: "Dates", children: content });
    assert.equal(standard.props.children[1].props.children[1], content);
  }
});

test("shared compact and icon actions respect each platform's target and feedback policy", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, tokens } = load(platform);
    const target = platform === "android" ? 48 : 44;
    for (const node of [controls.AppButton({ label: "Save", onPress: () => {} }), controls.IconButton({ label: "Back", icon: "arrow-left", onPress: () => {} }), controls.AppPressable({ onPress: () => {} })]) {
      const style = flatten(node.props.style({ pressed: false, focused: false }));
      assert.ok((style.minHeight || style.height) >= target);
      assert.ok(style.minWidth >= target);
      assert.equal(Boolean(node.props.android_ripple), platform === "android");
      assert.equal(node.props.accessibilityState.disabled, false);
    }
    assert.equal(tokens.density.compact.controlHeight, target);
  }
});

test("shared action buttons default to capsules and preserve explicit shape exceptions", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, tokens } = load(platform);
    for (const variant of ["primary", "secondary", "ghost", "danger"]) {
      const node = controls.AppButton({ label: "Action", variant });
      assert.equal(flatten(node.props.style({ pressed: false, focused: false })).borderRadius, tokens.componentRadius.pill);
    }
    const rectangular = controls.AppButton({ label: "Action", pill: false });
    assert.equal(flatten(rectangular.props.style({ pressed: false, focused: false })).borderRadius, tokens.componentRadius.control);
    const explicit = controls.AppButton({ label: "Action", style: { borderRadius: 8 } });
    assert.equal(flatten(explicit.props.style({ pressed: false, focused: false })).borderRadius, 8);
  }
});

test("glass primary actions render a branded material rather than an opaque parent fill", () => {
  const { controls, tokens } = load("ios");
  const button = controls.AppButton({ label: "Save", variant: "glassPrimary" });
  assert.equal(flatten(button.props.style({ pressed: false, focused: false })).backgroundColor, "transparent");
  const children = button.props.children({ pressed: false }).props.children;
  const material = children.find((node) => node?.type === "AppleMaterialSurface");
  assert.ok(material);
  assert.equal(material.props.tintColor, "#D91D26");
  assert.equal(material.props.fallbackColor, "#D91D26");
  assert.equal(flatten(material.props.style).borderRadius, tokens.componentRadius.pill);
});

test("native secondary fallback uses a capsule material without a decorative outline", () => {
  for (const platform of ["ios", "android"]) {
    const { controls, tokens } = load(platform);
    const button = controls.AppButton({ label: "Refresh", variant: "glassSecondary", pill: true, size: "small", icon: "refresh-ccw" });
    const style = flatten(button.props.style({ pressed: false, focused: false }));
    assert.equal(style.borderColor, "transparent");
    assert.equal(style.borderRadius, tokens.componentRadius.pill);
    assert.ok(style.minHeight >= (platform === "android" ? 48 : 44));
    assert.ok(button.props.children({ pressed: false }).props.children.some((node) => node?.type === "AppleMaterialSurface"));
  }
});

test("grouped settings use solid borderless surfaces and accessible full-row actions", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, tokens } = load(platform);
    const group = controls.SettingsGroup({ children: "content" });
    const geometry = flatten(group.props.style);
    assert.equal(geometry.borderRadius, tokens.componentRadius.card);
    assert.equal(geometry.borderWidth, undefined);
    assert.equal(group.props.children, "content");
    let calls = 0;
    const row = controls.SettingsRow({ title: "Start", value: "08:00", onPress: () => calls++ });
    assert.equal(row.props.accessibilityRole, "button");
    assert.equal(row.props.accessibilityLabel, "Start, 08:00");
    row.props.onPress();
    assert.equal(calls, 1);
    assert.ok(flatten(row.props.style({ pressed: false, focused: false })).minHeight >= 48);
    const disabled = controls.SettingsRow({ title: "Start", disabled: true, onPress: () => calls++ });
    disabled.props.onPress();
    assert.equal(calls, 1);
    assert.equal(disabled.props.accessibilityState.disabled, true);
  }
});

test("explicit semantic text tones override legacy colour without changing font or layout", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls } = load(platform);
    const legacy = { color: "#ABCDEF", fontSize: 12, fontWeight: "700" };
    const explicit = controls.AppText({ tone: "primary", style: legacy, layoutStyle: { marginTop: 8 } });
    const resolved = flatten(explicit.props.style);
    assert.equal(resolved.color, "#15202B");
    assert.equal(resolved.fontSize, 12);
    assert.equal(resolved.fontWeight, "700");
    assert.equal(resolved.marginTop, 8);
    const compatibility = controls.AppText({ style: legacy });
    assert.equal(flatten(compatibility.props.style).color, "#ABCDEF");
  }
});

test("Today uses supported button props with identical legacy geometry in every state", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, tokens } = load(platform);
    for (const disabled of [false, true]) {
      const common = { label: "Today", variant: "secondary", density: "standard", disabled };
      const legacy = controls.AppButton({ ...common, style: { minHeight: tokens.controls.buttonHeight, paddingHorizontal: tokens.spacing.md, borderRadius: tokens.radius.pill } });
      const migrated = controls.AppButton({ ...common, size: "small", pill: true, layoutStyle: { flexShrink: 1 } });
      for (const state of [{ pressed: false, focused: false }, { pressed: true, focused: false }, { pressed: false, focused: true }]) {
        assert.deepEqual(flatten(migrated.props.style(state)), flatten(legacy.props.style(state)));
      }
    }
  }
});

test("subtle cards retain the existing bordered surface geometry and layout insets", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, tokens } = load(platform);
    for (const padding of [0, 4, 8, 12, 16, 24]) {
      const card = controls.SectionCard({ tone: "subtle", layoutStyle: { padding, marginBottom: 8 } });
      assert.deepEqual(flatten(card.props.style), {
        borderWidth: 1,
        borderRadius: tokens.componentRadius.card,
        padding,
        backgroundColor: "#EEE",
        borderColor: "#DDD",
        marginBottom: 8,
      });
      assert.equal(card.props.accessibilityRole, undefined);
    }
  }
});

test("shared buttons preserve action locking and disabled semantics", async () => {
  const { controls } = load("android");
  let calls = 0;
  let complete;
  const action = () => { calls++; return new Promise((resolve) => { complete = resolve; }); };
  const button = controls.AppButton({ label: "Save", onPress: action });
  button.props.onPress(); button.props.onPress();
  assert.equal(calls, 1);
  complete();
  await new Promise((resolve) => setImmediate(resolve));
  button.props.onPress();
  assert.equal(calls, 2);
  complete();
  const disabled = controls.AppButton({ label: "Save", onPress: action, disabled: true });
  disabled.props.onPress();
  assert.equal(calls, 2);
  assert.equal(disabled.props.disabled, true);
  assert.equal(disabled.props.accessibilityState.disabled, true);
});

test("interactive image previews retain a rounded ripple and minimum touch target", () => {
  for (const platform of ["ios", "android"]) {
    const { controls, tokens } = load(platform);
    const node = controls.MediaThumbnail({ uri: "fixture-image", onPress: () => {} });
    const style = flatten(node.props.style({ pressed: false, focused: false }));
    assert.ok(style.minHeight >= (platform === "android" ? 48 : 44));
    assert.ok(style.minWidth >= (platform === "android" ? 48 : 44));
    assert.equal(style.borderRadius, tokens.componentRadius.card);
    assert.equal(style.overflow, "hidden");
    assert.equal(Boolean(node.props.android_ripple), platform === "android");
  }
});

test("destructive action labels meet normal-text contrast on their solid surface", () => {
  for (const platform of ["ios", "android"]) {
    const { controls } = load(platform);
    const node = controls.AppButton({ label: "Delete", variant: "danger", onPress: () => {} });
    const style = flatten(node.props.style({ pressed: false, focused: false }));
    const label = node.props.children({ pressed: false }).props.children.at(-1);
    assert.ok(getContrastRatio(flatten(label.props.style).color, style.backgroundColor) >= 4.5);
  }
});

test("segmented selections and material share inset geometry while selection callbacks stay shared", () => {
  for (const platform of ["ios", "android"]) {
    const { controls } = load(platform);
    let selection;
    const node = controls.SegmentedControl({ options: [{ label: "Open", value: "open" }, { label: "Done", value: "done" }], value: "open", onChange: (value) => { selection = value; } });
    const outer = flatten(node.props.style);
    const [selected, next] = node.props.children;
    const inner = flatten(selected.props.style({ pressed: false, focused: false }));
    assert.equal(inner.borderRadius, outer.borderRadius - outer.padding - outer.borderWidth);
    const contents = selected.props.children({ pressed: false });
    const material = contents.props.children[0];
    assert.equal(flatten(material.props.style).borderRadius, inner.borderRadius - inner.borderWidth);
    next.props.onPress();
    assert.equal(selection, "done");
    assert.equal(selected.props.accessibilityState.selected, true);
  }
});

test("native toggle rows use one labelled system switch with the shared callback", () => {
  function find(node, type) {
    if (!node || typeof node !== "object") return [];
    return [...(node.type === type ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap((child) => find(child, type))];
  }
  for (const platform of ["ios", "android"]) {
    const { controls } = load(platform);
    let value;
    const node = controls.ToggleRow({ label: "Reminders", description: "Day before", value: false, onChange: (next) => { value = next; }, leadingIcon: "clock" });
    const switches = find(node, "Switch");
    assert.equal(switches.length, 1);
    assert.equal(switches[0].props.accessibilityLabel, "Reminders");
    assert.equal(switches[0].props.value, false);
    switches[0].props.onValueChange(true);
    assert.equal(value, true);
    const disabled = controls.ToggleRow({ label: "Reminders", value: true, disabled: true });
    assert.equal(find(disabled, "Switch")[0].props.disabled, true);
  }
  assert.equal(find(load("web").controls.ToggleRow({ label: "Reminders", value: false }), "Switch").length, 0);
});


test("calendar today and selected-day text meet normal-text contrast", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls } = load(platform);
    const calendar = controls.AppCalendar({});
    const theme = calendar.props.children.props.theme;
    assert.ok(getContrastRatio(theme.todayTextColor, theme.calendarBackground) >= 4.5);
    assert.ok(getContrastRatio(theme.selectedDayTextColor, theme.selectedDayBackgroundColor) >= 4.5);
  }
});

test("record dividers preserve legacy geometry while ordinary dividers keep their contract", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls } = load(platform);
    const record = controls.Divider({ variant: "record", layoutStyle: { marginVertical: 8 } });
    assert.deepEqual(flatten(record.props.style), { height: 1, backgroundColor: "#DDD", opacity: 0.6, marginVertical: 8 });
    assert.equal(record.props.accessibilityRole, "none");
    const ordinary = controls.Divider({});
    assert.equal(flatten(ordinary.props.style).height, 0.5);
    assert.equal(flatten(ordinary.props.style).width, "100%");
    assert.equal(flatten(ordinary.props.style).opacity, undefined);
  }
});


test("document surfaces preserve embedded borders, page backgrounds and child semantics", () => {
  for (const platform of ["ios", "android", "web"]) {
    const DocumentSurface = load(platform).loadDocumentSurface();
    const child = { type: "ExistingViewer", props: { loading: true } };
    const page = DocumentSurface({ children: child, layoutStyle: { flex: 1 } });
    assert.deepEqual(flatten(page.props.style), { backgroundColor: "#F9FAFB", flex: 1 });
    const embedded = DocumentSurface({ variant: "embedded", children: child, layoutStyle: { minHeight: 640, overflow: "hidden" } });
    assert.deepEqual(flatten(embedded.props.style), { backgroundColor: "#EEE", borderTopColor: "#DDD", borderTopWidth: 0.5, minHeight: 640, overflow: "hidden" });
    assert.equal(embedded.props.children, child);
    assert.equal(embedded.props.accessibilityRole, undefined);
    assert.equal(embedded.props.accessible, undefined);
  }
});


test("time choices preserve legacy state geometry, text hierarchy and callbacks on each platform", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, loadTimeChoice } = load(platform);
    const TimeChoiceRow = loadTimeChoice();
    for (const selected of [false, true]) for (const disabled of [false, true]) {
      let calls = 0; const onPress = () => calls++;
      const row = TimeChoiceRow({ label: "12:00 AM · next day", selected, disabled, onPress });
      assert.equal(row.props.onPress, onPress);
      assert.equal(row.props.disabled, disabled);
      const resolved = controls.AppPressable(row.props);
      const legacy = controls.AppPressable({ disabled, onPress, style: [
        { height: 42, paddingHorizontal: 8, borderBottomWidth: 1, justifyContent: "center", alignItems: "center" },
        { borderBottomColor: "#DDD" },
        selected && { backgroundColor: "#FDD", borderBottomColor: "#ED1C25" },
      ] });
      for (const state of [{ pressed: false }, { pressed: true }, { focused: true }]) assert.deepEqual(flatten(resolved.props.style(state)), flatten(legacy.props.style(state)));
      const text = row.props.children[0];
      assert.equal(text.props.children, "12:00 AM · next day");
      assert.equal(text.props.style.fontWeight, selected ? "800" : "400");
      assert.equal(text.props.style.color, selected ? "#ED1C25" : "#15202B");
      row.props.onPress(); assert.equal(calls, 1);
      assert.equal(Boolean(row.props.children[1]), selected);
    }
  }
});

test("single-line fields centre native text while preserving multiline entry and password actions", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, tokens } = load(platform);
    const onChangeText = () => {}, onSubmitEditing = () => {}, toggle = () => {};
    for (const secureTextEntry of [false, true]) {
      const tree = controls.FormField({ label: "Password", value: "sample", onChangeText, inputProps: { secureTextEntry, onSubmitEditing }, rightAction: { label: "Show password", icon: "eye", onPress: toggle } });
      const container = tree.props.children[1];
      const input = container.props.children[1];
      const style = flatten(input.props.style);
      assert.equal(style.textAlignVertical, "center");
      assert.equal(style.lineHeight, platform === "ios" ? undefined : tokens.typography.body.lineHeight);
      if (platform === "android") assert.equal(style.includeFontPadding, false);
      assert.equal(input.props.value, "sample");
      assert.equal(input.props.onChangeText, onChangeText);
      assert.equal(input.props.onSubmitEditing, onSubmitEditing);
      assert.equal(input.props.secureTextEntry, secureTextEntry);
      assert.equal(container.props.children[2].props.onPress, toggle);
    }
    const multiline = controls.FormField({ value: "First line\nSecond line", multiline: true });
    const style = flatten(multiline.props.children[1].props.children[1].props.style);
    assert.equal(style.textAlignVertical, "top");
    assert.equal(style.lineHeight, tokens.typography.body.lineHeight);
    assert.equal(style.includeFontPadding, undefined);
  }
});

test("settings selectors expose labelled radio groups while preserving visuals and selection callbacks", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls } = load(platform);
    let value = "system";
    const props = { options: [{ label: "System", value: "system" }, { label: "Light", value: "light" }], value, onChange: (next) => { value = next; }, pill: true, subtle: true, density: "compact" };
    const tabs = controls.SegmentedControl(props);
    const radio = controls.SegmentedControl({ ...props, selectionRole: "radio", accessibilityLabel: "Theme" });
    assert.equal(radio.props.accessibilityRole, "radiogroup");
    assert.equal(radio.props.accessibilityLabel, "Theme");
    assert.deepEqual(radio.props.style, tabs.props.style);
    const choices = radio.props.children;
    assert.equal(choices[0].props.accessibilityRole, "radio");
    assert.equal(choices[0].props.accessibilityLabel, "System");
    assert.equal(choices[0].props.accessibilityState.checked, true);
    assert.equal(choices[1].props.accessibilityState.checked, false);
    assert.equal(choices[0].props["aria-selected"], undefined);
    choices[1].props.onPress();
    assert.equal(value, "light");
    assert.deepEqual(choices[0].props.style({ pressed: false }), tabs.props.children[0].props.style({ pressed: false }));
    const blocked = controls.SegmentedControl({ ...props, selectionRole: "radio", disabled: true });
    assert.equal(blocked.props.children[0].props.disabled, true);
    assert.equal(blocked.props.children[0].props.accessibilityState.disabled, true);
  }
});


test("growing multiline fields balance padding within the compact initial height", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, tokens } = load(platform);
    const onChangeText = () => {};
    const tree = controls.FormField({ label: "Tuesday notes", value: "Test message", onChangeText, multiline: true, autoGrow: true });
    const input = tree.props.children[1].props.children[1];
    const style = flatten(input.props.style);
    assert.equal(style.paddingTop, style.paddingBottom);
    assert.equal(style.lineHeight, platform === "ios" ? undefined : tokens.typography.body.lineHeight);
    assert.equal(style.height, tokens.density.compact.controlHeight);
    assert.equal(style.paddingTop * 2 + tokens.typography.body.lineHeight + 2, style.height);
    assert.equal(input.props.scrollEnabled, false);
    assert.equal(input.props.onChangeText, onChangeText);
    if (platform === "android") assert.equal(style.includeFontPadding, false);
  }
});

test("outlined settings groups share the independent card treatment without changing borderless defaults", () => {
  for (const platform of ["ios", "android", "web"]) {
    const { controls, tokens } = load(platform);
    const card = controls.SectionCard({ tone: "grouped", layoutStyle: { padding: 0 } });
    const group = controls.SettingsGroup({ outlined: true, children: "rows" });
    const a = flatten(card.props.style), b = flatten(group.props.style);
    for (const key of ["backgroundColor", "borderColor", "borderWidth", "borderRadius"]) assert.equal(a[key], b[key]);
    assert.equal(a.borderWidth, 1);
    assert.equal(a.borderRadius, tokens.componentRadius.card);
    assert.equal(a.padding, 0);
    assert.equal(b.padding, undefined);
    assert.equal(group.props.children, "rows");
    assert.equal(flatten(controls.SettingsGroup({}).props.style).borderWidth, undefined);
  }
});


test("the shared card surface supports both themes and semantic exceptions without owning layout", () => {
  const { cardSurface, tokens } = load("ios");
  for (const groupedSurface of ["#1C1C1E", "#FFFFFF"]) {
    const colors = { groupedSurface, surface: "fallback", border: "separator", danger: "red" };
    const before = { ...colors };
    const style = cardSurface.getCardSurfaceStyle(colors);
    assert.equal(style.backgroundColor, groupedSurface);
    assert.equal(style.borderWidth, 1);
    assert.equal(style.borderRadius, tokens.componentRadius.card);
    for (const layout of ["padding", "margin", "width", "height", "flex", "overflow"]) assert.equal(style[layout], undefined);
    assert.deepEqual(colors, before);
    assert.equal(cardSurface.getCardSurfaceStyle(colors, { borderTone: "danger" }).borderColor, "red");
    assert.equal(cardSurface.getCardSurfaceStyle(colors, { borderAccent: "orange" }).borderColor, "orange");
    assert.equal(cardSurface.getCardSurfaceStyle(colors, { inset: 17 }).borderRadius, tokens.componentRadius.card - 17);
  }
});
