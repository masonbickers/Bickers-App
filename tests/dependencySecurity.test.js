import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const queryString = require("query-string");
const decode = require("decode-uri-component");

test("patched decoder keeps CommonJS navigation and encoded document URLs working", () => {
  assert.equal(typeof decode, "function");
  const url = "https://firebasestorage.googleapis.com/v0/b/example/o/crew%2Fjob%20sheet.pdf?alt=media&token=test-only";
  const query = queryString.stringify({ url, title: "Crew + café 🚐", empty: "", flag: null });
  assert.deepEqual({ ...queryString.parse(query) }, { empty: "", flag: null, title: "Crew + café 🚐", url });
  assert.equal(queryString.parse("title=Working+Terms%2BNotes").title, "Working Terms+Notes");
  assert.deepEqual(queryString.parse("crew=A&crew=B").crew, ["A", "B"]);
});

test("malformed percent-encoded input completes within a bounded subprocess", () => {
  // A child-process timeout stops a reintroduced decoder denial of service.
  execFileSync(process.execPath, ["-e", `
    const assert = require('node:assert/strict');
    const query = require('query-string');
    const input = '%FF'.repeat(10000) + '%20ok';
    assert.equal(query.parse('value=' + input).value, '%FF'.repeat(10000) + ' ok');
    assert.equal(query.parse('value=%E0%A4%A').value, '%E0%A4%A');
  `], { cwd: new URL("..", import.meta.url), timeout: 3000, stdio: "pipe" });
});

test("patched build-tool UUID remains compatible with Xcode project IDs", () => {
  const xcode = require("xcode");
  const project = xcode.project("unused-test-project.pbxproj");
  project.hash = { project: { objects: {} } };
  const id = project.generateUuid();
  assert.match(id, /^[A-F0-9]{24}$/);
});
