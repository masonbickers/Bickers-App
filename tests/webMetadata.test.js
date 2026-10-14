import assert from "node:assert/strict";
import test from "node:test";
import { getWebMetadata } from "../lib/webMetadata.js";

test("employee routes use page titles without disclosing record IDs", () => {
  assert.equal(getWebMetadata("/login").title, "Sign in | Bickers");
  assert.equal(getWebMetadata("/service/vehicles/private-record-id").title, "Vehicles | Bickers");
  assert.equal(getWebMetadata("/week/private-week-id").title, "Weekly timesheet | Bickers");
  assert.equal(getWebMetadata("/unrecognised/private-id").title, "Bickers");
  assert.equal(getWebMetadata("/receipts").robots, "noindex, nofollow");
});

test("social image URLs require an explicit public HTTPS origin", () => {
  assert.equal(getWebMetadata("/login", "https://app.bickers.co.uk/subpath").image, "https://app.bickers.co.uk/social-preview.png");
  for (const origin of ["", "invalid", "http://app.bickers.co.uk", "https://localhost:3000", "https://127.0.0.1", "https://[::1]", "https://user:secret@app.bickers.co.uk"]) {
    assert.equal(getWebMetadata("/login", origin).image, null);
  }
});
