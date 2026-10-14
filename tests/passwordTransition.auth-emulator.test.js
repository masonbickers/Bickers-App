import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(new URL("../server/package.json", import.meta.url));

test("Firebase passwordless custom UID can set a password with built-in reset email and keep its UID", {
  skip: !process.env.FIREBASE_AUTH_EMULATOR_HOST,
}, async () => {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/);
  const projectId = process.env.SECURITY_TEST_PROJECT_ID || "demo-bickers-password-transition";
  const { initializeApp, deleteApp } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");
  const app = initializeApp({ projectId }, "password-transition-test");
  const auth = getAuth(app);
  const email = `transition-${Date.now()}@example.com`;
  async function request(action, body) {
    const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=demo-key`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 200, action);
    return response.json();
  }
  let uid;
  try {
    const account = await auth.createUser({ email }); uid = account.uid;
    assert.equal(account.providerData.length, 0);
    const custom = await auth.createCustomToken(uid);
    await request("signInWithCustomToken", { token: custom, returnSecureToken: true });
    await request("sendOobCode", { requestType: "PASSWORD_RESET", email });
    const codes = await (await fetch(`http://${host}/emulator/v1/projects/${projectId}/oobCodes`)).json();
    const code = codes.oobCodes.find((row) => row.email === email && row.requestType === "PASSWORD_RESET");
    assert.ok(code);
    assert.equal((await request("resetPassword", { oobCode: code.oobCode })).email, email);
    await request("resetPassword", { oobCode: code.oobCode, newPassword: "Test-only-password-123!" });
    const signedIn = await request("signInWithPassword", { email, password: "Test-only-password-123!", returnSecureToken: true });
    assert.equal(signedIn.localId, uid);
    assert.equal((await auth.verifyIdToken(signedIn.idToken, true)).firebase.sign_in_provider, "password");
  } finally { if (uid) await auth.deleteUser(uid); await deleteApp(app); }
});
