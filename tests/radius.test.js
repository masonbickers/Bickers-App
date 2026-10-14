import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../lib/design/radius.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports });
const { getConcentricRadius } = exports;

test("matching inset rectangles preserve corner centres including borders", () => {
  assert.equal(getConcentricRadius(28, 12 + 1), 15);
  assert.equal(getConcentricRadius(12, 4 + 1), 7);
  assert.equal(getConcentricRadius(18, 0), 18);
  assert.equal(getConcentricRadius(8, 12), 0);
  assert.equal(getConcentricRadius(0, 0), 0);
  assert.equal(getConcentricRadius(12.5, 1.5), 11);
});

test("capsules clamp to actual outer dimensions before applying inset", () => {
  assert.equal(getConcentricRadius(999, 4, { width: 200, height: 48 }), 20);
  assert.equal(getConcentricRadius(999, 4, { width: 48, height: 200 }), 20);
  assert.equal(getConcentricRadius(28, 4, { width: 20, height: 48 }), 6);
  assert.equal(getConcentricRadius(28, 4, { width: 0, height: 48 }), 0);
});

test("invalid geometry cannot silently generate invalid native style values", () => {
  for (const value of [-1, NaN, Infinity, -Infinity, "12", null, undefined]) {
    assert.throws(() => getConcentricRadius(value, 4), { name: "RangeError" });
    assert.throws(() => getConcentricRadius(28, value), { name: "RangeError" });
  }
  for (const outerSize of [{ width: -1, height: 48 }, { width: 48 }, { height: 48 }, { width: Infinity, height: 48 }]) {
    assert.throws(() => getConcentricRadius(28, 4, outerSize), { name: "RangeError" });
  }
});
