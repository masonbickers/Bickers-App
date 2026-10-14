import assert from "node:assert/strict";
import test from "node:test";
import { validateServiceUrl } from "../lib/serviceUrl.js";

test("production service URLs reject insecure and loopback destinations", () => {
  for (const url of ["http://api.example.com", "https://localhost", "https://[::1]", "https://127.0.0.1", "https://127.1", "https://0.0.0.0", "https://app.localhost", "https://user:secret@api.example.com", "invalid"]) {
    assert.throws(() => validateServiceUrl(url, "production", "Sync API"));
  }
  assert.equal(validateServiceUrl("https://api.example.com/v1/", "production"), "https://api.example.com/v1");
});

test("explicit development destinations remain available for emulator tests", () => {
  assert.equal(validateServiceUrl("http://localhost:3002/", "development"), "http://localhost:3002");
  assert.throws(() => validateServiceUrl("file:///tmp/api", "development"));
});
