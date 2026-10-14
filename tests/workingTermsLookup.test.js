import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(new URL("../lib/workingTermsApi.js", import.meta.url), "utf8");
const provider = readFileSync(new URL("../providers/AuthProvider.tsx", import.meta.url), "utf8");
const screen = readFileSync(new URL("../app/(protected)/working-terms.jsx", import.meta.url), "utf8");
const section = source.slice(source.indexOf("export async function loadWorkingTermsAcceptance"), source.indexOf("export async function signWorkingTerms")).replace("export ", "");
function loader({ own = null, body = { acceptance: null }, ok = true, readError } = {}) {
  let requests = 0;
  const context = { WORKING_TERMS_VERSION: "1.1",
    getDoc: async () => { if (readError) throw readError; return { exists: () => own !== null, data: () => own, id: "1.1" }; },
    workingTermsAcceptanceRef: uid => uid,
    isCurrentWorkingTermsAcceptance: data => data?.accepted === true && data.documentVersion === "1.1" && data.userId,
    getApiBaseUrl: () => "https://test.invalid",
    fetchWithServiceWakeRetry: async (url, options) => {
      requests++;
      assert.equal(url, "https://test.invalid/auth/working-terms-acceptance");
      assert.equal(options.headers.Authorization, "Bearer private-token");
      assert.equal(options.body, undefined);
      return { ok, json: async () => body };
    },
  };
  const load = vm.runInNewContext(section + "\nloadWorkingTermsAcceptance", context);
  return { load: user => load(user === undefined ? { uid: "new", getIdToken: async () => "private-token" } : user), requests: () => requests };
}
test("existing self signature works without a backend request", async () => {
  const f = loader({ own: { accepted: true, documentVersion: "1.1", userId: "new" } });
  assert.equal((await f.load()).userId, "new"); assert.equal(f.requests(), 0);
});
test("missing self signature uses only bearer identity and retains original signer/date", async () => {
  const f = loader({ body: { acceptance: { accepted: true, documentVersion: "1.1", userId: "old", acceptedAt: "2026-08-19T11:08:13.815Z" } } });
  const record = await f.load();
  assert.equal(record.userId, "old"); assert.equal(record.acceptedAt, "2026-08-19T11:08:13.815Z");
});
test("a confirmed absent signature is distinct from unavailable or malformed responses", async () => {
  assert.equal(await loader().load(), null);
  for (const options of [{ ok: false }, { body: null }, { body: {} }, { body: { acceptance: { accepted: true, documentVersion: "1.0", userId: "old" } } }]) {
    await assert.rejects(loader(options).load());
  }
});
test("signed-out and anonymous sessions never perform a lookup", async () => {
  const f = loader(); assert.equal(await f.load(null), null);
  assert.equal(await f.load({ isAnonymous: true }), null); assert.equal(f.requests(), 0);
});
test("lookup errors hide new signing and expose a retry; signing rechecks prior acceptance", () => {
  assert.match(provider, /setWorkingTermsError\(error instanceof Error/);
  assert.match(screen, /!workingTermsAccepted && !workingTermsError \? <SectionCard\b[^>]*>/);
  assert.match(screen, /label="Retry signature check"/);
  assert.match(source, /const existing = await loadWorkingTermsAcceptance\(firebaseUser\);\s+if \(existing\) return existing;/);
});

test("denied direct signature reads use the existing authenticated resolver without assuming acceptance", async () => {
  for (const code of ["permission-denied", "firestore/permission-denied"]) {
    const f = loader({ readError: { code }, body: { acceptance: { accepted: true, documentVersion: "1.1", userId: "original-signer" } } });
    assert.equal((await f.load()).userId, "original-signer"); assert.equal(f.requests(), 1);
    assert.equal(await loader({ readError: { code } }).load(), null);
    for (const options of [{ ok: false }, { body: {} }, { body: { acceptance: { accepted: false } } }]) await assert.rejects(loader({ readError: { code }, ...options }).load());
  }
});
test("network and unexpected direct-read failures retain an explicit failure state", async () => {
  for (const code of ["unavailable", "unauthenticated", "unknown"]) {
    const f = loader({ readError: { code } }); await assert.rejects(f.load()); assert.equal(f.requests(), 0);
  }
});
