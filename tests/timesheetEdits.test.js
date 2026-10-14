import assert from "node:assert/strict";
import test from "node:test";
import { hasTimesheetEdits } from "../lib/timesheetEdits.js";

test("opening and enriching an untouched week never requests a save", () => {
  const state = { ready: true, userEdited: false, baseline: "loaded week", current: "week with booking and holiday defaults" };
  assert.equal(hasTimesheetEdits(state), false);
  assert.equal(hasTimesheetEdits({ ...state, ready: false }), false);
});

test("real edits remain protected, while reverting or saving removes the warning", () => {
  const state = { ready: true, userEdited: true, baseline: "08:00", current: "09:00" };
  assert.equal(hasTimesheetEdits(state), true);
  assert.equal(hasTimesheetEdits({ ...state, current: "08:00" }), false);
  assert.equal(hasTimesheetEdits({ ...state, baseline: "09:00", userEdited: false }), false);
  assert.equal(hasTimesheetEdits({ ...state, baseline: null }), false);
});
