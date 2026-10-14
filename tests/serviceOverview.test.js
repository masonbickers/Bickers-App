import assert from "node:assert/strict";
import test from "node:test";
import { createServiceOverviewActions, getServiceOverviewState } from "../lib/serviceOverview.js";
import * as overview from "../lib/serviceOverview.js";

test("service overview labels pending data separately from failed data", () => {
  const ready = { data: [{ id: "vehicle" }], isInitialLoading: false, error: null };
  const pending = { data: [], isInitialLoading: true, error: null };
  const failed = { data: [], isInitialLoading: false, error: new Error("permission denied") };
  assert.deepEqual(overview.getServiceOverviewNotice?.([ready, pending], false), {
    tone: "info", title: "Loading remaining fleet data", retry: false,
  });
  assert.deepEqual(overview.getServiceOverviewNotice?.([ready, pending], true), {
    tone: "info", title: "Some fleet data is taking longer than usual", retry: true,
  });
  assert.deepEqual(overview.getServiceOverviewNotice?.([ready, failed], false), {
    tone: "warning", title: "Fleet data is incomplete", retry: true,
  });
  assert.equal(overview.getServiceOverviewNotice?.([ready, ready], false), null);
});

test("service overview never presents missing data as a healthy empty fleet", () => {
  const loading = { data: [], isInitialLoading: true };
  const failed = { data: [], isInitialLoading: false, error: new Error("Offline") };
  const ready = { data: [], isInitialLoading: false, error: null };
  assert.equal(getServiceOverviewState([loading, loading]), "loading");
  assert.equal(getServiceOverviewState([failed, loading]), "error");
  assert.equal(getServiceOverviewState([failed, failed]), "error");
  assert.equal(getServiceOverviewState([ready, ready]), "ready");
  assert.equal(getServiceOverviewState([ready, loading]), "partial");
  assert.equal(getServiceOverviewState([ready, failed]), "partial");
  assert.equal(getServiceOverviewState([{ ...failed, data: [{ id: "cached" }] }, failed]), "partial");
});

test("service overview actions preserve all five workflow destinations", () => {
  const visited = [];
  const actions = createServiceOverviewActions({}, (route) => visited.push(route));
  for (const action of actions) action.onPress();
  assert.deepEqual(visited, [
    "/(protected)/service/service-list",
    "/(protected)/service/equipment-list",
    "/(protected)/service/defects",
    "/(protected)/service/advisories",
    "/(protected)/service/activity-history",
  ]);
});

test("service overview preserves empty, singular and plural counts", () => {
  const empty = createServiceOverviewActions({}, () => {});
  assert.equal(empty.find((item) => item.id === "defects").subtitle, "No open approved defects");
  for (const count of [1, 12, 125]) {
    const actions = createServiceOverviewActions({ equipmentDueCount: count, openDefectCount: count, advisoryCount: count, recentActivityCount: count }, () => {});
    assert.equal(actions.find((item) => item.id === "equipment").badgeCount, count);
    assert.equal(actions.find((item) => item.id === "defects").subtitle, `${count} open defect${count === 1 ? "" : "s"} need attention`);
    assert.equal(actions.find((item) => item.id === "activity").subtitle, `${count} recent update${count === 1 ? "" : "s"}`);
  }
});
