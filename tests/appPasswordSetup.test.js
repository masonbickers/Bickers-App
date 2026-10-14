import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAppPasswordProxy, mobilePasswordAccessAllowed } from "../server/appPasswordSetup.js";

test("cached session restoration first checks server-owned password restrictions", () => {
  const source = readFileSync(new URL("../providers/AuthProvider.tsx", import.meta.url), "utf8");
  const session = source.slice(source.indexOf("const loadSession = useCallback"));
  assert.match(session, /await getDocFromServer\(doc\(db, "users", firebaseUser.uid\)\)/);
  assert.ok(session.indexOf("appPasswordSetupRequired") < session.indexOf("AsyncStorage.multiGet"));
  assert.match(session, /catch \{\s*setEmployee\(null\);\s*setSecurityTransition\([\s\S]*?return;/);
});

test("mobile password gate blocks temporary, old and legacy sessions but accepts fresh password proof", () => {
  const user = { uid:"crew",companyId:"A",employeeId:"emp",isEnabled:true,mobileAccessStatus:"active" };
  const token = { uid:"crew", firebase: { sign_in_provider: "password" }, auth_time: 102 };
  assert.equal(mobilePasswordAccessAllowed(token, { ...user, appPasswordSetupRequired: true }), false);
  assert.equal(mobilePasswordAccessAllowed(token, { ...user, appPasswordSessionAfter: 101 }), true);
  assert.equal(mobilePasswordAccessAllowed(token, { ...user, appPasswordSessionAfter: 102 }), false);
  assert.equal(mobilePasswordAccessAllowed({ ...token, firebase: { sign_in_provider: "custom" } }, { ...user, appPasswordSessionAfter: 101 }), false);
});

test("setup proxy forwards only fixed routes and fields and never follows redirects", async () => {
  const calls = [];
  const proxy = createAppPasswordProxy({ origin: "https://web.example", fetchImpl: async (...args) => { calls.push(args); return { status: 200, json: async () => ({ completed: true }) }; } });
  const res = { headers: {}, set(k, v) { this.headers[k] = v; return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  const req = { method: "POST", path: "/complete", headers: { authorization: "Bearer test-token" }, body: { issuanceId: "issue1", operationId: "operation1", newPassword: "only-in-memory", uid: "forged", companyId: "other" } };
  await proxy(req, res);
  assert.equal(res.code, 200); assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(calls[0][0].href, "https://web.example/api/security/app-password-setup");
  assert.equal(calls[0][1].redirect, "error");
  assert.deepEqual(JSON.parse(calls[0][1].body), { issuanceId: "issue1", operationId: "operation1", newPassword: "only-in-memory" });
  await proxy({ ...req, path: "/issue" }, res); assert.equal(res.code, 404);
  await proxy({ ...req, headers: {} }, res); assert.equal(res.code, 401);
  assert.equal(calls.length, 1);
});

test("an uncertain completion produces retry guidance without exposing the submitted password", async () => {
  const proxy = createAppPasswordProxy({ origin: "https://web.example", fetchImpl: async () => { throw new Error("secret-new-password"); } });
  const res = { set() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await proxy({ method: "POST", path: "/complete", headers: { authorization: "Bearer token" }, body: {} }, res);
  assert.equal(res.code, 503); assert.equal(res.body.code, "SETUP_UNCONFIRMED");
  assert.ok(!JSON.stringify(res.body).includes("secret-new-password"));
});
