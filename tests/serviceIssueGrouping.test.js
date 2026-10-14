import assert from "node:assert/strict";
import test from "node:test";

import { groupServiceIssuesByAsset } from "../lib/serviceIssueGrouping.js";

test("issues sharing a vehicle are grouped while one-off vehicles remain separate", () => {
  const groups = groupServiceIssuesByAsset([
    { id: "a", asset: "Van 1 · AB12 CDE" },
    { id: "b", asset: "Van 2 · XY34 ZZZ" },
    { id: "c", asset: "Van 1 · AB12 CDE" },
  ]);

  assert.deepEqual(
    groups.map((group) => ({ asset: group.asset, ids: group.items.map((item) => item.id) })),
    [
      { asset: "Van 1 · AB12 CDE", ids: ["a", "c"] },
      { asset: "Van 2 · XY34 ZZZ", ids: ["b"] },
    ]
  );
});

test("asset grouping is case-insensitive and missing assets do not merge", () => {
  const groups = groupServiceIssuesByAsset([
    { id: "a", asset: "Video Van" },
    { id: "b", asset: "video van" },
    { id: "c" },
    { id: "d" },
  ]);

  assert.equal(groups[0].items.length, 2);
  assert.equal(groups.length, 3);
});

