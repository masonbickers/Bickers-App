import assert from "node:assert/strict";
import test from "node:test";
import { resolveNativeUIPolicy, timePickerDate, timePickerValue } from "../lib/design/nativeUI.js";

test("native UI requires the linked module and supported iOS; glass has independent accessibility guards", () => {
  const supported = { platform: "ios", version: "26.5", moduleAvailable: true, glassAvailable: true, apiAvailable: true, reduceTransparency: false };
  assert.deepEqual(resolveNativeUIPolicy(supported), { native: true, glass: true });
  for (const change of [{ platform: "android" }, { platform: "web" }, { version: "18.6" }, { moduleAvailable: false }]) {
    assert.deepEqual(resolveNativeUIPolicy({ ...supported, ...change }), { native: false, glass: false });
  }
  for (const change of [{ reduceTransparency: true }, { glassAvailable: false }, { apiAvailable: false }]) {
    assert.deepEqual(resolveNativeUIPolicy({ ...supported, ...change }), { native: true, glass: false });
  }
});

test("native time conversion preserves local HH:mm and the allowed quarter-hour choices", () => {
  for (const value of ["00:00", "08:00", "16:30", "23:45"]) {
    assert.equal(timePickerValue(timePickerDate(value), [value]), value);
  }
  assert.equal(timePickerValue(timePickerDate("08:07"), ["08:00", "08:15"]), null);
  assert.equal(timePickerValue(new Date(NaN), []), null);
  assert.equal(timePickerDate("99:99"), null);
});
