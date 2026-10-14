import assert from "node:assert/strict";
import test from "node:test";

import { readRouteBundle } from "./helpers/routeSource.js";

const source = readRouteBundle("app/(protected)/week/[id]/index.js");

test("all timesheet sections align with the main form width", () => {
  assert.match(source, /<View style=\{styles\.actionRow\}>/);
  assert.match(source, /summaryBox:\s*\{\s*width: "100%"/);
  assert.match(source, /actionRow:\s*\{\s*width: "100%"/);
  assert.doesNotMatch(source, /summaryBox:\s*\{[^}]*marginHorizontal/);
  assert.doesNotMatch(source, /dayBlock:\s*\{[^}]*marginHorizontal/);
  assert.doesNotMatch(source, /creditBox:\s*\{[^}]*marginHorizontal/);
});
