import assert from "node:assert/strict";
import test from "node:test";
import { timesheetBackCount } from "../lib/timesheetNavigation.js";

test("Timesheets back removes duplicate copies and preserves the original screen", () => {
  const routes = [{ name: "(main-tabs)" }, { name: "timesheet" }, { name: "timesheet" }];
  assert.equal(timesheetBackCount({ routes, index: 2 }), 2);
  assert.equal(timesheetBackCount({ routes, index: 1 }), 1);
  assert.equal(timesheetBackCount({ routes: [...routes, { name: "week/[id]/index" }], index: 3 }), 1);
});

test("Timesheets back leaves unrelated history intact", () => {
  assert.equal(timesheetBackCount({ routes: [{ name: "timesheet" }, { name: "me" }, { name: "timesheet" }], index: 2 }), 1);
  assert.equal(timesheetBackCount(null), 1);
});
