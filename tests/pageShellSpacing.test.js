import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { readRouteBundle } from "./helpers/routeSource.js";

const pageShellSource = readFileSync(
  new URL("../components/layout/PageShell.tsx", import.meta.url),
  "utf8"
);
const scheduleSource = readRouteBundle("app/(protected)/(main-tabs)/screens/schedule.js");
const jobSource = readRouteBundle("app/(protected)/(main-tabs)/job.js");
const serviceWorkSource = readRouteBundle("app/(protected)/(service-tabs)/service/work.js");
const serviceIssuesSource = readRouteBundle("app/(protected)/(service-tabs)/service/issues.jsx");

test("PageShell does not add implicit spacing between screen-owned sections", () => {
  assert.match(pageShellSource, /contentSpacing = "none"/);
  assert.match(pageShellSource, /contentSpacing === "compact"/);
  assert.match(pageShellSource, /gap: contentGap/);
  assert.doesNotMatch(pageShellSource, /gap: sectionGap/);
});

test("scrolling hero screens opt into compact spacing without legacy offsets", () => {
  assert.match(scheduleSource, /contentSpacing="compact"/);
  assert.doesNotMatch(scheduleSource, /heroCard:\s*\{[^}]*marginBottom:/);
  assert.match(jobSource, /contentSpacing="compact"/);
  assert.doesNotMatch(jobSource, /heroCard:\s*\{[^}]*marginBottom:/);
  assert.doesNotMatch(jobSource, /heroContent:\s*\{[^}]*minHeight:/);
});

test("workshop forms separate cards and section headings consistently", () => {
  assert.match(serviceWorkSource, /<PageShell[\s\S]*?contentSpacing="compact"/);
  assert.match(serviceWorkSource, /<FormCard/);
  assert.match(serviceWorkSource, /styles\.sectionDivider/);
});

test("service issue sections preserve their original content stack", () => {
  assert.match(serviceIssuesSource, /<View style=\{styles\.contentStack\}>/);
  assert.match(serviceIssuesSource, /contentStack:\s*\{\s*gap:\s*t\.spacing\.md/);
});
