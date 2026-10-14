import assert from "node:assert/strict";
import test from "node:test";

import { readRouteBundle } from "./helpers/routeSource.js";

const source = readRouteBundle("app/(protected)/week/[id]/index.js");

test("timesheet booking rows show production rather than production company", () => {
  assert.match(source, /function getProductionDisplayName\(job\)/);
  assert.match(
    source,
    /\{job\.jobNumber \|\| job\.id\} – \{getProductionDisplayName\(job\)\}/
  );
  assert.doesNotMatch(
    source,
    /\{job\.jobNumber \|\| job\.id\} – \{job\.client/
  );
});

test("timesheet day notes grow with content instead of using a fixed height", () => {
  const field = source.match(/const renderDayNotesField[\s\S]*?<TextArea([\s\S]*?)\/>/)?.[1];
  assert.ok(field);
  assert.match(field, /autoGrow/);
  assert.doesNotMatch(field, /inputStyle/);
  assert.match(field, /onChangeText=\{\(t\) => updateDay\(day, "dayNotes", t\)\}/);
});
