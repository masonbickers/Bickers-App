import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { resolveWorkDiaryAccess, getWorkDiaryRedirect } from "../lib/workDiaryAccess.js";

const identity = (code = "9453") => ({
  firebaseUid: "u1",
  userProfile: { id: "u1", employeeId: "e1", mobileAccessStatus: "active", isEnabled: true },
  employeeProfile: { id: "e1", userCode: code, mobileAccess: { status: "active" } },
});

test("the existing six employee codes retain diary access", () => {
  for (const code of ["2996", "9453", "3514", "1906", "6978", "9759"]) {
    assert.equal(resolveWorkDiaryAccess(identity(code)), true);
  }
  for (const code of ["1234", "", "09453"]) assert.equal(resolveWorkDiaryAccess(identity(code)), false);
});

test("missing, mismatched and revoked identities cannot gain diary access", () => {
  assert.equal(resolveWorkDiaryAccess({ ...identity(), firebaseUid: "other" }), false);
  assert.equal(resolveWorkDiaryAccess({ ...identity(), userProfile: null }), false);
  assert.equal(resolveWorkDiaryAccess({ ...identity(), employeeProfile: null }), false);
  assert.equal(resolveWorkDiaryAccess({ ...identity(), userProfile: { ...identity().userProfile, employeeId: "other" } }), false);
  assert.equal(resolveWorkDiaryAccess({ ...identity(), employeeUserCode: "9453", employeeProfile: identity("1234").employeeProfile }), false);
  for (const field of ["userProfile", "employeeProfile"]) {
    for (const [key, value] of Object.entries({ isEnabled: false, active: false, disabled: true, appDisabled: true, archived: true, isArchived: true })) {
      const input = identity(); input[field][key] = value;
      assert.equal(resolveWorkDiaryAccess(input), false);
    }
  }
  const revoked = identity(); revoked.employeeProfile.mobileAccess.status = "revoked";
  assert.equal(resolveWorkDiaryAccess(revoked), false);
});

test("Max's authenticated email grants diary access with an active linked identity", () => {
  for (const firebaseEmail of ["max@bickers.co.uk", " MAX@BICKERS.CO.UK "]) {
    assert.equal(resolveWorkDiaryAccess({ ...identity("1234"), firebaseEmail }), true);
  }
  for (const firebaseEmail of [undefined, "", "other@bickers.co.uk", "max@bickers.co.uk.example.com"]) {
    const input = { ...identity("1234"), firebaseEmail };
    input.userProfile.email = "max@bickers.co.uk";
    input.employeeProfile.email = "max@bickers.co.uk";
    assert.equal(resolveWorkDiaryAccess(input), false);
  }
});

test("Max's email does not bypass missing, mismatched or disabled profiles", () => {
  const max = () => ({ ...identity("1234"), firebaseEmail: "max@bickers.co.uk" });
  assert.equal(resolveWorkDiaryAccess({ ...max(), firebaseUid: undefined }), false);
  assert.equal(resolveWorkDiaryAccess({ ...max(), firebaseUid: "other" }), false);
  assert.equal(resolveWorkDiaryAccess({ ...max(), userProfile: null }), false);
  assert.equal(resolveWorkDiaryAccess({ ...max(), employeeProfile: null }), false);
  const mismatched = max(); mismatched.userProfile.employeeId = "other";
  assert.equal(resolveWorkDiaryAccess(mismatched), false);
  for (const field of ["userProfile", "employeeProfile"]) {
    for (const [key, value] of Object.entries({ isEnabled: false, active: false, disabled: true, appDisabled: true, archived: true, isArchived: true })) {
      const input = max(); input[field][key] = value;
      assert.equal(resolveWorkDiaryAccess(input), false);
    }
  }
  const revokedUser = max(); revokedUser.userProfile.mobileAccessStatus = "revoked";
  assert.equal(resolveWorkDiaryAccess(revokedUser), false);
  const revokedEmployee = max(); revokedEmployee.employeeProfile.mobileAccess.status = "revoked";
  assert.equal(resolveWorkDiaryAccess(revokedEmployee), false);
});

test("the actual gate withholds children until all access checks pass", () => {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const source = readFileSync(new URL("../components/WorkDiaryAccessGate.jsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  let session;
  const exports = {};
  const Redirect = Symbol("Redirect");
  vm.runInNewContext(code, { exports, require: (id) => {
    if (id === "expo-router") return { Redirect };
    if (id === "../lib/workDiaryAccess") return { getWorkDiaryRedirect };
    if (id === "../providers/AuthProvider") return { useAuth: () => session };
    if (id === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
    throw new Error(`Unexpected import: ${id}`);
  }});
  const child = Symbol("diary screen with data hooks");
  const render = () => exports.default({ children: child });
  session = { loading: true, isAuthed: true, workingTermsAccepted: true, employee: { workDiaryAccess: true } };
  assert.equal(render(), null);
  session = { ...session, loading: false, isAuthed: false };
  assert.equal(render().props.href, "/(auth)/login");
  session = { ...session, isAuthed: true, workingTermsAccepted: false };
  assert.equal(render().props.href, "/(protected)/working-terms");
  session = { ...session, workingTermsAccepted: true, employee: { workDiaryAccess: false } };
  assert.equal(render().props.href, "/(protected)/screens/homescreen");
  session.employee = { appAccess: { user: false, service: true } };
  assert.equal(render().props.href, "/(protected)/service/home");
  session.employee = { workDiaryAccess: true };
  assert.equal(render(), child);
  session.employee = { workDiaryAccess: false };
  assert.equal(render().type, Redirect);
});

test("both direct routes wrap their data-fetching components in the gate", () => {
  for (const [file, content] of [["work-diary.js", "WorkDiaryContent"], ["work-diary-board.js", "WorkDiaryBoardContent"]]) {
    const source = readFileSync(new URL(`../app/(protected)/${file}`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`<WorkDiaryAccessGate><${content} /></WorkDiaryAccessGate>`));
    assert.ok(source.indexOf(`function ${content}()`) > source.indexOf("export default function"));
  }
  const home = readFileSync(new URL("../app/(protected)/(main-tabs)/screens/homescreen.js", import.meta.url), "utf8");
  assert.match(home, /workDiaryAccess: employee\?\.workDiaryAccess === true/);
  const presentation = readFileSync(new URL("../components/home/HomeDashboard.jsx", import.meta.url), "utf8");
  assert.match(presentation, /return workDiaryAccess === true/);
  assert.doesNotMatch(home, /ALLOWED_WORK_DIARY_CODES/);
});
