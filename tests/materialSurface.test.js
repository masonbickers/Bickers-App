import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url), ts = require("typescript");
const source = readFileSync(new URL("../components/ui/AppleMaterialSurface.js", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
const flatten = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function render({ platform = "ios", reduced = false, glass = true, api = true, props = {} } = {}) {
  const calls = [];
  const colors = { glassSurface: "rgba(255,255,255,0.82)", surfaceElevated: "#FFFFFF", glassSelected: "rgba(237,28,37,0.12)", glassPressed: "rgba(0,0,0,0.16)" };
  const modules = {
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "expo-blur": { BlurView: "BlurView" },
    "expo-glass-effect": { GlassView: "GlassView", isLiquidGlassAvailable: () => { calls.push("glass"); return glass; }, isGlassEffectAPIAvailable: () => { calls.push("api"); return api; } },
    "react-native": { Platform: { OS: platform }, View: "View", StyleSheet: { absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, create: (style) => style, flatten } },
    "../../lib/design/tokens": { designTokens: { materials: { blurIntensity: 80 } } },
    "../../providers/ThemeProvider": { useTheme: () => ({ colors, colorScheme: "dark", reduceTransparency: reduced }) },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => { assert.ok(modules[name], name); return modules[name]; } });
  return { tree: exports.default(props), calls, colors };
}
const children = (tree) => [tree.props.children].flat(Infinity).filter(Boolean);

test("accent glass forwards native tint and preserves a readable opaque fallback", () => {
  const props = { tintColor: "#D91D26", fallbackColor: "#D91D26" };
  const native = children(render({ props }).tree).find((node) => node.type === "GlassView");
  assert.equal(native.props.tintColor, props.tintColor);
  const fallback = children(render({ platform: "android", props }).tree)[0];
  assert.equal(flatten(fallback.props.style).backgroundColor, props.fallbackColor);
});

test("supported iOS renders native glass with the app theme and corner geometry", () => {
  const { tree } = render({ props: { style: [{ borderRadius: 12 }, { borderTopLeftRadius: 4, borderCurve: "continuous", marginTop: 20 }] } });
  const glass = children(tree).find((node) => node.type === "GlassView");
  assert.ok(glass);
  assert.equal(glass.props.colorScheme, "dark");
  const shape = flatten(glass.props.style);
  assert.equal(shape.borderRadius, 12);
  assert.equal(shape.borderTopLeftRadius, 4);
  assert.equal(shape.borderCurve, "continuous");
  assert.equal(shape.marginTop, undefined);
  assert.equal(tree.props.pointerEvents, "none");
});

test("unsupported iOS uses native blur when transparency is allowed", () => {
  for (const config of [{ glass: false }, { api: false }]) {
    const { tree } = render(config);
    const blur = children(tree).find((node) => node.type === "BlurView");
    assert.ok(blur);
    assert.equal(blur.props.tint, "systemChromeMaterialDark");
    assert.equal(blur.props.intensity, 80);
    assert.equal(children(tree).some((node) => node.type === "GlassView"), false);
  }
});

test("reduced transparency and Android use opaque surfaces without querying glass APIs", () => {
  for (const config of [{ reduced: true }, { platform: "android" }]) {
    const { tree, calls, colors } = render(config);
    assert.equal(calls.length, 0);
    assert.equal(children(tree)[0].type, "View");
    assert.equal(flatten(children(tree)[0].props.style).backgroundColor, colors.surfaceElevated);
  }
});

test("web retains its existing fallback and selected/pressed overlays remain noninteractive", () => {
  const { tree, calls, colors } = render({ platform: "web", props: { selected: true, pressed: true } });
  assert.equal(calls.length, 0);
  assert.equal(flatten(children(tree)[0].props.style).backgroundColor, colors.glassSurface);
  assert.equal(children(tree).length, 3);
  assert.equal(tree.props.pointerEvents, "none");
});
