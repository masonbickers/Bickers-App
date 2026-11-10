import test from "node:test";
import assert from "node:assert/strict";
import { createWorkingTermsResolver } from "../server/workingTermsIdentity.js";

const stamp = (iso) => ({ toDate: () => new Date(iso) });
const acceptance = (uid = "old") => ({
  accepted: true, documentVersion: "1.1",
  documentTitle: "Bickers Action Working Terms", documentEffectiveDate: "19/08/2026",
  userId: uid, employeeId: "employee-1", companyId: "company-1", fullName: "Test Employee",
  signatureSvgPath: "M 10 10 L 20 20 L 30 30", acceptedAt: stamp("2026-08-19T11:08:13.815Z"),
});
function fixture() {
  const employee = { id: "employee-1", companyId: "company-1", authUid: "new",
    email: "employee@example.com", mobileAccess: { status: "active", approvedEmail: "employee@example.com" } };
  const records = new Map([
    ["users/new", { isEnabled: true, mobileAccessStatus: "active", employeeId: employee.id, companyId: employee.companyId }],
    ["users/old", { isEnabled: false, mobileAccessStatus: "disabled", previousEmployeeId: employee.id,
      companyId: employee.companyId, supersededByUid: "new" }],
    ["employees/employee-1", employee],
    ["workingTermsAcceptances/old/versions/1.1", acceptance()],
  ]);
  const read = (path) => ({ id: path.split("/").at(-1), ref: { path }, exists: records.has(path), data: () => records.get(path) });
  const fieldValue = (obj, field) => field.split(".").reduce((v, key) => v?.[key], obj);
  function collection(path, filters = [], cap = Infinity) {
    return {
      doc: (id) => ({ path: path + "/" + id, get: async () => read(path + "/" + id), collection: (name) => collection(path + "/" + id + "/" + name) }),
      where: (field, op, value) => {
        assert.equal(op, "==");
        return collection(path, [...filters, [field, value]], cap);
      },
      limit: (value) => collection(path, filters, value),
      get: async () => ({ docs: [...records.keys()].filter(key => key.startsWith(path + "/") &&
        key.split("/").length === path.split("/").length + 1 &&
        filters.every(([field, value]) => fieldValue(records.get(key), field) === value))
        .slice(0, cap).map(read) }),
    };
  }
  const decoded = { uid: "new", email: employee.email, firebase: { sign_in_provider: "password" } };
  const deps = { db: { collection }, auth: { verifyIdToken: async (token, revoked) => {
    assert.equal(token, "token"); assert.equal(revoked, true); return decoded;
  } }, findEmployeeForApprovedUid: async () => employee, employeeIsBlocked: (e) => e.status === "disabled",
  employeeEmailMatches: (e, email) => e.email === email };
  return { employee, records, decoded, deps, resolve: (token = "token") => createWorkingTermsResolver(deps)(token) };
}

function clerkFixture({ status = 200, body, failure } = {}) {
  const f = fixture();
  Object.assign(f.decoded, { auth_time: 100, firebase: { sign_in_provider: 'custom' },
    authMethod: 'clerk', verifiedClerkEmail: true, identityLinkVersion: 2,
    clerkUserId: 'clerk-user', clerkSessionId: 'clerk-session',
    identityCompanyId: 'company-1', identityEmployeeId: 'employee-1' });
  f.records.get('users/new').uid = 'new';
  f.deps.fetchImpl = async (url, init) => {
    assert.equal(url, 'https://booking.bickers.co.uk/api/security/session');
    assert.equal(init.headers.Authorization, 'Bearer token');
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    if (failure) throw failure;
    return new Response(JSON.stringify(body ?? { version: 1,
      identity: { uid: 'new', companyId: 'company-1', employeeId: 'employee-1' } }), { status });
  };
  return f;
}

test('an approved current Clerk session reads its explicitly linked historical signature without writes', async () => {
  const f = clerkFixture(), before = JSON.stringify([...f.records]);
  const result = await f.resolve();
  assert.equal(result.userId, 'old');
  assert.equal(result.employeeId, 'employee-1');
  assert.equal(result.sourcePath, 'workingTermsAcceptances/old/versions/1.1');
  assert.equal(result.signatureSvgPath, undefined);
  assert.equal(JSON.stringify([...f.records]), before);
});

test('current Clerk authority denial is preserved and cannot fall back to password approval', async () => {
  for (const status of [401, 403]) {
    await assert.rejects(clerkFixture({ status }).resolve(), { status });
  }
});

test('unreachable, redirected, malformed or failing Clerk authority never grants signature access', async () => {
  for (const options of [{ status: 500 }, { status: 302 }, { failure: new TypeError('network') },
    { body: {} }, { body: { version: 1, identity: { uid: 'new' } } }]) {
    await assert.rejects(clerkFixture(options).resolve(), { status: 503 });
  }
});

test('a successful authority response for a different canonical identity is rejected', async () => {
  for (const patch of [{ uid: 'other' }, { employeeId: 'other' }, { companyId: 'other' }]) {
    const body = { version: 1, identity: { uid: 'new', employeeId: 'employee-1', companyId: 'company-1', ...patch } };
    await assert.rejects(clerkFixture({ body }).resolve(), { status: 403 });
  }
});

test('incomplete or conflicting Clerk claims cannot retrieve a historical signature', async () => {
  for (const patch of [{ authMethod: 'other' }, { verifiedClerkEmail: false }, { identityLinkVersion: 1 },
    { clerkUserId: '' }, { clerkSessionId: '' }, { identityCompanyId: 'other' }, { identityEmployeeId: 'other' }]) {
    const f = clerkFixture(); Object.assign(f.decoded, patch);
    await assert.rejects(f.resolve(), { status: 403 });
  }
});

test('Clerk callers retain approved email, active mobile and immutable legacy-signature requirements', async () => {
  for (const mutate of [
    f => { f.employee.mobileAccess.approvedEmail = 'other@example.com'; },
    f => { f.records.get('users/new').mobileAccessStatus = 'disabled'; },
    f => { f.employee.disabled = true; },
  ]) { const f = clerkFixture(); mutate(f); await assert.rejects(f.resolve(), { status: 403 }); }
  const invalid = clerkFixture();
  invalid.records.get('workingTermsAcceptances/old/versions/1.1').signatureSvgPath = '';
  await assert.rejects(invalid.resolve(), { status: 409 });
});

test('existing approved password sessions do not depend on the new Clerk authority request', async () => {
  const f = fixture();
  f.deps.fetchImpl = async () => { throw new Error('Clerk authority must not be called for password sessions'); };
  assert.equal((await f.resolve()).userId, 'old');
});

test("recognises a retired identity's exact current-version signature without modifying any record", async () => {
  const f = fixture(), before = JSON.stringify([...f.records]);
  const result = await f.resolve();
  assert.equal(result.userId, "old");
  assert.equal(result.sourcePath, "workingTermsAcceptances/old/versions/1.1");
  assert.equal(result.acceptedAt, "2026-08-19T11:08:13.815Z");
  assert.equal(result.employeeId, "employee-1");
  assert.equal(result.documentVersion, "1.1");
  assert.equal(result.signatureSvgPath, undefined);
  assert.equal(JSON.stringify([...f.records]), before);
});

test("an existing current-account acceptance takes precedence and is left intact", async () => {
  const f = fixture();
  f.records.set("workingTermsAcceptances/new/versions/1.1", acceptance("new"));
  assert.equal((await f.resolve()).userId, "new");
});

test("no prior signature returns null rather than synthesising acceptance", async () => {
  const f = fixture();
  f.records.delete("workingTermsAcceptances/old/versions/1.1");
  assert.equal(await f.resolve(), null);
});

test("supports a server-recorded legacy login alias tied to the same employee", async () => {
  const f = fixture();
  f.employee.auth = { codeLoginUid: "old" };
  f.records.set("users/old", { employeeId: "employee-1", companyId: "company-1", isEnabled: true });
  assert.equal((await f.resolve()).userId, "old");
});

test("names/emails alone, unlinked identities and cross-company mappings never qualify", async () => {
  for (const patch of [
    { supersededByUid: "someone-else" },
    { companyId: "company-other" },
    { previousEmployeeId: "employee-other" },
    { employeeId: "employee-other" },
    { isEnabled: true },
  ]) {
    const f = fixture();
    Object.assign(f.records.get("users/old"), patch, { email: f.employee.email });
    assert.equal(await f.resolve(), null);
  }
});

test("mismatched employee/company/version or invalid signature evidence blocks recognition", async () => {
  for (const patch of [
    { employeeId: "other" }, { companyId: "other" }, { userId: "other" },
    { documentVersion: "1.0" }, { accepted: false }, { signatureSvgPath: "" },
    { acceptedAt: null }, { documentEffectiveDate: "01/01/2000" },
  ]) {
    const f = fixture();
    Object.assign(f.records.get("workingTermsAcceptances/old/versions/1.1"), patch);
    await assert.rejects(f.resolve(), { status: 409 });
  }
});

test("a signature for an older version does not satisfy current terms", async () => {
  const f = fixture();
  f.records.delete("workingTermsAcceptances/old/versions/1.1");
  f.records.set("workingTermsAcceptances/old/versions/1.0", { ...acceptance(), documentVersion: "1.0" });
  assert.equal(await f.resolve(), null);
});

test("pending, invited and disabled users/employees cannot resolve old signatures", async () => {
  for (const status of ["pending", "invited", "disabled"]) {
    const f = fixture();
    f.records.get("users/new").mobileAccessStatus = status;
    await assert.rejects(f.resolve(), { status: 403 });
  }
  for (const patch of [{ isEnabled: false }, { active: false }, { disabled: true }, { appDisabled: true }, { archived: true }, { isArchived: true }]) {
    for (const target of ["users/new", "employees/employee-1"]) {
      const f = fixture();
      Object.assign(f.records.get(target), patch);
      await assert.rejects(f.resolve(), { status: 403 });
    }
  }
});

test("authentication, company and approved-email mismatches are rejected", async () => {
  const f = fixture();
  await assert.rejects(f.resolve(""), { status: 401 });
  f.decoded.firebase.sign_in_provider = "custom";
  await assert.rejects(f.resolve(), { status: 403 });
  for (const patch of [{ companyId: "other" }, { employeeId: "other" }]) {
    const f = fixture(); Object.assign(f.records.get("users/new"), patch);
    await assert.rejects(f.resolve(), { status: 403 });
  }
  const wrongEmail = fixture(); wrongEmail.decoded.email = "other@example.com";
  await assert.rejects(wrongEmail.resolve(), { status: 403 });
  const duplicate = fixture(); duplicate.deps.findEmployeeForApprovedUid = async () => null;
  await assert.rejects(duplicate.resolve(), { status: 403 });
});

test("revoked tokens fail and shared old identities produce a conflict", async () => {
  const revoked = fixture();
  revoked.deps.auth.verifyIdToken = async () => { throw Object.assign(new Error("revoked"), { code: "auth/id-token-revoked" }); };
  await assert.rejects(revoked.resolve(), { code: "auth/id-token-revoked" });
  const shared = fixture();
  shared.records.set("employees/other", { authUid: "old" });
  await assert.rejects(shared.resolve(), { status: 409 });
});

test("multiple valid historical signatures keep their originals and select the earliest", async () => {
  const f = fixture();
  f.records.set("users/older", { ...f.records.get("users/old") });
  f.records.set("workingTermsAcceptances/older/versions/1.1", {
    ...acceptance("older"), acceptedAt: stamp("2026-08-19T10:00:00Z"),
  });
  const before = JSON.stringify([...f.records]);
  assert.equal((await f.resolve()).userId, "older");
  assert.equal(JSON.stringify([...f.records]), before);
});

test("an invalid current-account signature is not silently replaced with historical evidence", async () => {
  const f = fixture();
  f.records.set("workingTermsAcceptances/new/versions/1.1", { ...acceptance("new"), employeeId: "other" });
  await assert.rejects(f.resolve(), { status: 409 });
});
