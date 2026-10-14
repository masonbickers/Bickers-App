import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import { validateTransitionIdentity, createStagedPasswordTransition } from "../server/stagedPasswordTransition.js";
import { passwordResetCode, finishPasswordTransition } from "../lib/passwordTransition.js";

function fixture() {
  const now = Date.parse("2026-09-07T12:00:00Z");
  const decoded = { uid: "u1", email: "test@example.com", auth_time: now / 1000 - 100, firebase: { sign_in_provider: "custom" } };
  const account = { uid: "u1", email: decoded.email, providerData: [] };
  const employee = { id: "e1", authUid: "u1", companyId: "c1", email: decoded.email, mobileAccess: { status: "invited", approvedEmail: decoded.email } };
  const user = { employeeId: "e1", companyId: "c1", mobileAccessStatus: "invited" };
  const enrolment = { uid: "u1", employeeId: "e1", companyId: "c1", email: decoded.email, status: "eligible", deadline: "2026-09-14T12:00:00Z", sessionCutoff: now / 1000 - 10 };
  return { decoded, account, employee, user, enrolment, now };
}

test("only approved, enrolled, previously signed-in custom sessions qualify", () => {
  assert.equal(validateTransitionIdentity(fixture()), "test@example.com");
  for (const change of [
    (f) => { f.enrolment = null; }, (f) => { f.account.disabled = true; },
    (f) => { f.user.isEnabled = false; }, (f) => { f.employee.mobileAccess.status = "pending"; },
    (f) => { f.employee.archived = true; }, (f) => { f.user.appDisabled = true; },
    (f) => { f.enrolment.deadline = "invalid"; }, (f) => { f.enrolment.deadline = "2026-09-01"; },
    (f) => { f.enrolment.status = "completed"; }, (f) => { f.enrolment.status = "retiring"; },
    (f) => { f.decoded.auth_time = f.now / 1000; }, (f) => { f.decoded.auth_time = 0; },
    (f) => { f.decoded.firebase.sign_in_provider = "anonymous"; },
  ]) { const f = fixture(); change(f); assert.throws(() => validateTransitionIdentity(f), { status: 403 }); }
});
test("changed email, uid, employee or company never inherit the old session", () => {
  for (const change of [
    (f) => { f.decoded.email = "other@example.com"; }, (f) => { f.employee.email = "other@example.com"; },
    (f) => { f.account.uid = "other"; }, (f) => { f.user.employeeId = "other"; },
    (f) => { f.enrolment.companyId = "other"; }, (f) => { f.employee.userId = "other"; },
    (f) => { f.user.authUid = "other"; },
  ]) { const f = fixture(); change(f); assert.throws(() => validateTransitionIdentity(f), { status: 409 }); }
});
test("secure password sign-in can recover after deadline or a partial retirement", () => {
  const f = fixture(); f.decoded.firebase.sign_in_provider = "password";
  f.enrolment.deadline = "2026-09-01"; f.enrolment.status = "retiring";
  assert.equal(validateTransitionIdentity(f), f.decoded.email);
});

function serviceFixture() {
  const f = fixture(); const events = [];
  let extraEmployee = null, linkedIds = ["u1"];
  const ref = { get: async () => ({ data: () => ({ ...f.enrolment }) }), update: async (data) => Object.assign(f.enrolment, data) };
  const db = {
    collection(name) { return {
      doc(id) {
        if (name === "mobilePasswordTransitions") return ref;
        return { get: async () => ({ exists: true, id, data: () => name === "users" ? f.user : f.employee }) };
      },
      get: async () => ({ docs: [{ id: "e1", data: () => f.employee }, ...(extraEmployee ? [{ id: "e2", data: () => extraEmployee }] : [])] }),
      where: () => ({ get: async () => ({ docs: linkedIds.map((id) => ({ id })) }) }),
    }; },
    async runTransaction(fn) { return fn({ get: (r) => r.get(), update: (r, data) => r.update(data) }); },
  };
  const service = createStagedPasswordTransition({ db, now: () => f.now,
    auth: { verifyIdToken: async (token, revoked) => { assert.equal(revoked, true); if (token === "expired") throw new Error("revoked"); return f.decoded; },
      getUser: async () => f.account, revokeRefreshTokens: async (uid) => events.push(["revoke", uid]) },
    syncApprovedEmployeeAuth: async () => events.push(["sync"]), sendSetupEmail: async (email) => events.push(["email", email]),
  });
  return { f, service, events, duplicateEmail: () => { extraEmployee = { email: "TEST@example.com" }; }, duplicateUser: () => { linkedIds.push("other"); } };
}
test("status is read-only, missing/revoked tokens denied and duplicate identities rechecked", async () => {
  const s = serviceFixture();
  assert.equal((await s.service.status("token")).hasPassword, false);
  assert.deepEqual(s.events, []);
  await assert.rejects(s.service.status(""), { status: 401 });
  await assert.rejects(s.service.status("expired"), { status: 401 });
  s.duplicateEmail(); await assert.rejects(s.service.status("token"), { status: 409 });
  const t = serviceFixture(); t.duplicateUser(); await assert.rejects(t.service.status("token"), { status: 409 });
});
test("setup email is fixed to approved identity, throttled and does not reset credentials or revoke", async () => {
  const s = serviceFixture(); await s.service.sendEmail("token");
  assert.deepEqual(s.events, [["email", "test@example.com"]]);
  await assert.rejects(s.service.sendEmail("token"), { status: 429 });
});
test("completion requires fresh password proof; retires old mobile access without revoking shared web sessions", async () => {
  const s = serviceFixture(); await assert.rejects(s.service.complete("token"), { status: 403 });
  s.f.decoded.firebase.sign_in_provider = "password";
  s.f.decoded.auth_time = s.f.now / 1000 - 301;
  await assert.rejects(s.service.complete("token"), { status: 403 });
  s.f.decoded.auth_time = s.f.now / 1000;
  assert.deepEqual(await s.service.complete("token"), { completed: true, refreshSession: false });
  assert.deepEqual(s.events, [["sync"]]);
  assert.equal(s.f.enrolment.status, "completed");
  assert.equal((await s.service.complete("token")).refreshSession, false);
  assert.equal(s.events.filter(([action]) => action === "revoke").length, 0);
  s.f.decoded.firebase.sign_in_provider = "custom";
  await assert.rejects(s.service.status("token"), { status: 403 });
});

const link = "https://example.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=secret";
test("same-UID password replacement refreshes auth context while the transition excludes business routes", async () => {
  const provider = await readFile(new URL("../providers/AuthProvider.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/_layout.jsx", import.meta.url), "utf8");
  assert.match(provider, /onIdTokenChanged\(auth/);
  assert.match(provider, /if \(transitionBusy.current\) return/);
  assert.match(provider, /mobileAccessOK && !securityTransition/);
  assert.match(layout, /securityTransition \? <SecureAccount \/> : <Slot \/>/);
});
test("only HTTPS password reset links are parsed, without following any URL", () => {
  assert.equal(passwordResetCode(link), "secret");
  for (const url of ["secret", "javascript:alert(1)", link.replace("https:", "http:"), link.replace("resetPassword", "verifyEmail")]) assert.equal(passwordResetCode(url), "");
});
function clientFixture() {
  const events = [];
  return { events, args: { auth: {}, email: "test@example.com", expectedUid: "u1", password: "only-in-memory",
    resetLink: link, verifyPasswordResetCode: async () => "test@example.com",
    confirmPasswordReset: async () => events.push("reset"),
    signInWithEmailAndPassword: async () => { events.push("signin"); return { user: { uid: "u1", getIdToken: async () => "token" } }; },
    complete: async () => { events.push("complete"); return { refreshSession: true }; },
    sync: async () => events.push("sync"),
  } };
}
test("reset verifies email ownership then replaces session, retires old sessions and refreshes without signOut", async () => {
  const c = clientFixture(); await finishPasswordTransition(c.args);
  assert.deepEqual(c.events, ["reset", "signin", "complete", "signin", "sync"]);
});
test("existing password is preserved and no reset email/code is required", async () => {
  const c = clientFixture(); c.args.resetLink = ""; await finishPasswordTransition(c.args);
  assert.deepEqual(c.events, ["signin", "complete", "signin", "sync"]);
});
test("wrong-email and expired reset links never change a password", async () => {
  const c = clientFixture(); c.args.verifyPasswordResetCode = async () => "other@example.com";
  await assert.rejects(finishPasswordTransition(c.args), /different work email/); assert.deepEqual(c.events, []);
  c.args.verifyPasswordResetCode = async () => { throw new Error("expired"); };
  await assert.rejects(finishPasswordTransition(c.args), /expired/); assert.deepEqual(c.events, []);
});
test("network failure after reset can retry using new password without consuming the link again", async () => {
  const c = clientFixture(), complete = c.args.complete;
  c.args.complete = async () => { throw new Error("offline"); };
  await assert.rejects(finishPasswordTransition(c.args), /offline/);
  c.args.resetLink = ""; c.args.complete = complete;
  await finishPasswordTransition(c.args);
  assert.equal(c.events.filter((e) => e === "reset").length, 1);
});

// Exercise the actual screen handlers with mocked native primitives and Auth services.
async function setupScreen(hasPassword = false) {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const source = await readFile(new URL("../components/SecureAccount.js", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  const states = [], events = [];
  let index = 0;
  const control = { emailError: null, completeError: null };
  const jsx = (type, props) => ({ type, props });
  const setup = { hasPassword, uid: "u1", email: "test@example.com", deadline: "2026-10-01" };
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    react: { useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], (next) => { states[i] = next; }]; } },
    "react-native": { View: "View" },
    "./layout/PageShell": { default: "PageShell" },
    "./ui/AppPrimitives": Object.fromEntries(["AppButton", "AppText", "Banner", "FormField", "FormStep"].map((name) => [name, name])),
    "../firebaseConfig": { auth: { currentUser: { getIdToken: async () => "token" } } },
    "firebase/auth": {
      verifyPasswordResetCode: async () => setup.email,
      confirmPasswordReset: async () => { events.push("reset"); },
      signInWithEmailAndPassword: async () => { events.push("signin"); return { user: { uid: "u1", getIdToken: async () => "token" } }; },
      signOut: async () => { events.push("signout"); },
    },
    "../lib/authApi": {
      passwordTransitionRequest: async (_token, action) => {
        events.push(action);
        if (action === "email" && control.emailError) throw control.emailError;
        if (action === "complete" && control.completeError) throw control.completeError;
        return {};
      },
      syncEmployeeAuth: async () => { events.push("sync"); },
    },
    "../lib/passwordTransition": { finishPasswordTransition },
    "../providers/AuthProvider": { useAuth: () => ({ securityTransition: setup, setTransitionBusy() {}, reloadSession: async () => { events.push("reload"); } }) },
    "../lib/design/tokens": { designTokens: { spacing: { md: 16 } } },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, Date, require: (id) => { assert.ok(id in modules, id); return modules[id]; } });
  const nodes = (tree) => !tree || typeof tree !== "object" ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const render = () => { index = 0; return exports.default(); };
  const find = (type, label) => nodes(render()).find((node) => node.type === type && (!label || node.props.label === label));
  return { control, setup, events, render, find,
    click: async (label) => { const button = find("AppButton", label); assert.ok(button, label); await button.props.onPress(); },
    input: (label, value) => { const field = find("FormField", label); assert.ok(field, label); field.props.onChangeText(value); },
  };
}

test("passwordless setup reveals stages only after a successful email and a pasted link", async () => {
  const s = await setupScreen();
  assert.equal(s.render().props.header.title, "Set up your password");
  assert.match(JSON.stringify(s.render()), /Your Bickers account already exists, but it doesn’t have a password yet/);
  assert.equal(s.find("FormField", "Setup link from your email"), undefined);
  assert.equal(s.find("FormField", "New password"), undefined);
  s.control.emailError = new Error("Offline. Please retry.");
  await s.click("Send setup email");
  assert.equal(s.find("Banner").props.tone, "danger");
  assert.equal(s.find("FormField", "Setup link from your email"), undefined);
  s.control.emailError = null;
  await s.click("Send setup email");
  assert.equal(s.find("Banner").props.title, "Setup email sent");
  assert.ok(s.find("FormField", "Setup link from your email"));
  assert.equal(s.find("FormField", "New password"), undefined);
  s.input("Setup link from your email", link);
  assert.ok(s.find("FormField", "New password"));
  s.control.emailError = new Error("Please wait a minute before requesting another email.");
  await s.click("Resend setup email");
  assert.equal(s.find("FormField", "Setup link from your email").props.value, link);
  s.input("New password", "new-password"); s.input("Confirm new password", "mismatch");
  await s.click("Set password and continue");
  assert.ok(!s.events.includes("reset"));
  s.input("Confirm new password", "new-password");
  s.control.completeError = new Error("Offline. Please retry.");
  await s.click("Set password and continue");
  assert.equal(s.render().props.header.title, "Confirm your password");
  assert.equal(s.find("Banner").props.title, "Password saved");
  assert.equal(s.find("FormField", "Setup link from your email"), undefined);
  s.control.completeError = null;
  await s.click("Confirm password and continue");
  assert.equal(s.events.filter((event) => event === "reset").length, 1);
  assert.deepEqual(s.events.slice(-4), ["signin", "complete", "sync", "reload"]);
});

test("existing and browser-created passwords use password-only confirmation; recovery restarts guidance", async () => {
  for (const hasPassword of [true, false]) {
    const s = await setupScreen(hasPassword);
    if (!hasPassword) await s.click("I have already set my password");
    assert.equal(s.render().props.header.title, "Confirm your password");
    assert.equal(s.find("FormField", "New password"), undefined);
    s.input("Password", "existing-password");
    await s.click("Confirm password and continue");
    assert.deepEqual(s.events, ["signin", "complete", "sync", "reload"]);
    await s.click("Forgot password?");
    assert.equal(s.render().props.header.title, "Reset your password");
    assert.ok(s.find("AppButton", "Send setup email"));
    assert.equal(s.find("FormField", "New password"), undefined);
    await s.click("Use a different sign-in");
    assert.deepEqual(s.events.slice(-2), ["signout", "reload"]);
  }
});

test("checking or unknown password status does not incorrectly tell users they have no password", async () => {
  const s = await setupScreen();
  delete s.setup.hasPassword;
  assert.equal(s.render().props.header.title, "Secure your account");
  assert.equal(s.find("AppButton", "Send setup email"), undefined);
  s.setup.checking = true;
  assert.equal(s.find("AppButton", "Retry account check"), undefined);
});
