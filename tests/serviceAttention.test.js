import assert from "node:assert/strict";
import test from "node:test";
import { selectServiceAttention } from "../lib/serviceAttention.js";

test("attention list prioritises overdue vehicles without repeating mixed deadlines", () => {
  const vehicles = [
    { id: "soon", worstCode: "due-soon" },
    { id: "mixed", worstCode: "overdue", motStatus: { code: "overdue" }, serviceStatus: { code: "due-soon" } },
    { id: "future", worstCode: "ok" },
    { id: "late", worstCode: "overdue" },
  ];
  assert.deepEqual(selectServiceAttention(vehicles).map((v) => v.id), ["mixed", "late", "soon"]);
  assert.deepEqual(selectServiceAttention(vehicles, 2).map((v) => v.id), ["mixed", "late"]);
  assert.deepEqual(selectServiceAttention([]), []);
});
