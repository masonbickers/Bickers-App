import assert from "node:assert/strict";
import test from "node:test";
import { profilePhoneError } from "../lib/profilePhone.js";

test("profile accepts formatted UK and international numbers without rewriting input", () => {
  for (const value of ["07714 133734", "+44 7714 133734", "020 7946 0018", "+44 (0)20 7946 0018", "+1 (202) 555-0123", "+33 1 42 68 53 00", "+49 30 901820"]) {
    assert.equal(profilePhoneError(value), null, value);
  }
});

test("profile rejects empty, alphabetic, embedded and malformed numbers", () => {
  for (const value of ["", "   ", "abcdef", "Call +44 7714 133734", "07714ABC133734", "123", "+999 123456789", "++44 7714 133734"]) {
    assert.ok(profilePhoneError(value), value);
  }
});
