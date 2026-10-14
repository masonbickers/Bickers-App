import assert from "node:assert/strict";
import test from "node:test";

import { matchesServiceSearch } from "../lib/serviceSearch.js";

test("service search matches names and notes without case sensitivity", () => {
  assert.equal(matchesServiceSearch("brake", ["AB12 CDE", "Brake pads replaced"]), true);
  assert.equal(matchesServiceSearch("alex", ["Signed by Alex Smith"]), true);
  assert.equal(matchesServiceSearch("tyre", ["Brake pads replaced"]), false);
});

test("service search matches registrations with or without spaces", () => {
  assert.equal(matchesServiceSearch("ab12cde", ["AB12 CDE"]), true);
  assert.equal(matchesServiceSearch("AB12 CDE", ["AB12CDE"]), true);
});

test("service search checks every saved field and handles empty values", () => {
  assert.equal(matchesServiceSearch("hydraulic", ["Displayed finding", "Hydraulic hose recommendation", null]), true);
  assert.equal(matchesServiceSearch("", [null]), true);
  assert.equal(matchesServiceSearch("unknown", [null, undefined, ""]), false);
});
