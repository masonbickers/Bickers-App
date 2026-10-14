import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

test("record details preserve the legacy read-only geometry and unformatted values", () => {
  const source = readFileSync(new URL("../components/ui/RecordDetailRow.js", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", StyleSheet: { create: (value) => value } },
    "./AppPrimitives": { AppText: "AppText" },
    "../../lib/design/tokens": { designTokens: { spacing: { xxs: 4, xs: 8 }, typography: { metadata: { fontSize: 12 } } } },
  };
  vm.runInNewContext(code, { exports, require: (name) => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  for (const value of ["Not recorded", "AB12 CDE", "", 0, null]) {
    const row = exports.default({ label: "Vehicle", value });
    assert.equal(row.props.style.flexDirection, "row");
    assert.equal(row.props.style.justifyContent, "space-between");
    assert.equal(row.props.style.paddingVertical, 4);
    const [label, detail] = row.props.children;
    assert.equal(label.props.tone, "muted");
    assert.equal(detail.props.tone, "primary");
    assert.equal(label.props.style.fontSize, 12);
    assert.equal(detail.props.style.fontSize, 12);
    assert.equal(detail.props.style.textAlign, "right");
    assert.equal(detail.props.style.flex, 1);
    assert.equal(detail.props.style.marginLeft, 8);
    assert.equal(detail.props.children, value);
    assert.equal(row.props.accessible, undefined);
    assert.equal(row.props.accessibilityRole, undefined);
  }
});
