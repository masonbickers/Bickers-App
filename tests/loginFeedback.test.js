import assert from "node:assert/strict";
import test from "node:test";
import { getLoginFeedback } from "../lib/loginFeedback.js";

test("password failures do not tell approved users to request approval", () => {
  for (const code of ["auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"]) {
    const feedback = getLoginFeedback({ code });
    assert.equal(feedback.title, "Wrong password");
    assert.doesNotMatch(feedback.message, /approv|administrator/i);
  }
});

test("confirmed access rejection gives approval guidance", () => {
  assert.equal(getLoginFeedback({ status: 403, message: "Mobile app access has not been approved." }).title, "Access approval required");
  assert.equal(getLoginFeedback({ status: 403, message: "The approved employee identity could not be verified." }).title, "Unable to verify access");
});

test("service failures never report wrong passwords or missing approval", () => {
  for (const error of [new TypeError("Network request failed"), { code: "auth/network-request-failed" }, { status: 503 }, { status: 401 }, undefined]) {
    const feedback = getLoginFeedback(error);
    assert.equal(feedback.title, "Unable to sign in");
    assert.doesNotMatch(feedback.message, /password|approv/i);
  }
});

test("account and rate-limit errors have their own messages", () => {
  assert.equal(getLoginFeedback({ code: "auth/too-many-requests" }).title, "Too many attempts");
  assert.equal(getLoginFeedback({ code: "auth/user-disabled" }).title, "Account disabled");
  assert.equal(getLoginFeedback({ code: "auth/invalid-email" }).title, "Check your email");
  assert.equal(getLoginFeedback({ code: "auth/user-not-found" }).title, "Check your email");
});
