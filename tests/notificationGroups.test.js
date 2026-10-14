import assert from "node:assert/strict";
import test from "node:test";
import { groupNotificationItems } from "../lib/notificationGroups.js";

test("interleaved notification dates produce one section per label without losing items", () => {
  const now = new Date(2026, 8, 7, 12).getTime();
  const items = [
    { id: "old-1", createdAt: new Date(2026, 7, 1).getTime() },
    { id: "today", createdAt: now },
    { id: "invalid", createdAt: "invalid" },
    { id: "yesterday", createdAt: new Date(2026, 8, 6, 12).getTime() },
    { id: "old-2", createdAt: new Date(2026, 7, 2).getTime() },
    { id: "week", createdAt: new Date(2026, 8, 4, 12).getTime() },
  ];
  const groups = groupNotificationItems(items, now);
  assert.deepEqual(groups.map(g => g.label), ["Today", "Yesterday", "Last 7 days", "Earlier"]);
  assert.deepEqual(groups.at(-1).items.map(i => i.id), ["old-1", "invalid", "old-2"]);
  assert.equal(groups.flatMap(g => g.items).length, items.length);
  assert.equal(items[0].id, "old-1");
});
test("empty inbox has no sections", () => {
  assert.deepEqual(groupNotificationItems([]), []);
});
