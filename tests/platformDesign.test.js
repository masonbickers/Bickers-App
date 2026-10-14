import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
const require = createRequire(import.meta.url), ts = require("typescript");
const source = readFileSync(new URL("../lib/design/platform.ts", import.meta.url), "utf8");
const exports = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });

test("Android uses 48dp targets and native ripple without altering shared spacing", () => {
  const metrics = exports.getPlatformControlMetrics("android");
  assert.equal(metrics.minimumTouchTarget, 48);
  assert.equal(metrics.androidRipple, true);
});
test("iOS and fallback platforms keep 44pt targets without Android APIs", () => {
  for (const platform of ["ios", "web", "unknown"]) {
    const metrics = exports.getPlatformControlMetrics(platform);
    assert.equal(metrics.minimumTouchTarget, 44);
    assert.equal(metrics.androidRipple, false);
  }
});
