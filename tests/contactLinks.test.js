import assert from "node:assert/strict";
import test from "node:test";

import { callUrl, whatsappUrl, contactPhoneMatches } from "../lib/contactLinks.js";

test("WhatsApp links use international digits and an encoded greeting", () => {
  assert.equal(
    whatsappUrl("07738 610741", "Adam Crossman"),
    "https://wa.me/447738610741?text=Hi%20Adam%20Crossman"
  );
  assert.equal(
    whatsappUrl("+44 (7970) 262918", "Adam Eastall"),
    "https://wa.me/447970262918?text=Hi%20Adam%20Eastall"
  );
  assert.equal(whatsappUrl("01473 890938", "Andy Martin"), "https://wa.me/441473890938?text=Hi%20Andy%20Martin");
});

test("call links use the supported tel scheme and preserve an international prefix", () => {
  assert.equal(callUrl("+44 (7970) 262918"), "tel:+447970262918");
  assert.equal(callUrl("07738 610741"), "tel:+447738610741");
  assert.equal(callUrl("7784845520"), "tel:+447784845520");
  assert.equal(callUrl("+1 (202) 555-0123"), "tel:+12025550123");
});

test("malformed numbers cannot produce call or WhatsApp destinations", () => {
  for (const raw of ["123", "abcdef", "+999 123456789", "Call 07738 610741"]) {
    assert.equal(callUrl(raw), null);
    assert.equal(whatsappUrl(raw, "Crew"), null);
  }
  assert.equal(whatsappUrl("7784845520", "Brian"), "https://wa.me/447784845520?text=Hi%20Brian");
});

test("phone search ignores formatting without matching empty or name queries", () => {
  assert.equal(contactPhoneMatches("07738 610741", "07738610741"), true);
  assert.equal(contactPhoneMatches("+44 (7970) 262918", "+44 7970-262918"), true);
  assert.equal(contactPhoneMatches("07738 610741", "Adam 1"), false);
  assert.equal(contactPhoneMatches("07738 610741", ""), false);
  assert.equal(contactPhoneMatches("07738 610741", "+"), false);
  assert.equal(contactPhoneMatches("07738 610741", "999"), false);
});

test("blank numbers do not produce actionable links", () => {
  assert.equal(whatsappUrl("", "Adam"), null);
  assert.equal(callUrl("   "), null);
});
