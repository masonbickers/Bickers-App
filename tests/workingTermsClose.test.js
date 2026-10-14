import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../app/(protected)/working-terms.jsx", import.meta.url), "utf8");
const body = source.match(/const handleClose = async \(\) => \{([\s\S]*?)\n  \};/)?.[1];

function closeHandler({ accepted, canGoBack = true, submitting = false }) {
  const calls = [];
  const close = new Function("workingTermsAccepted", "closing", "submitting", "router", "returnToApp", "setClosing", "AsyncStorage", "global", "signOut", "auth", "reloadSession", "Alert", `return async () => {${body}}`)(
    accepted, false, submitting,
    { canGoBack: () => canGoBack, back: () => calls.push("back"), replace: (path) => calls.push(path) },
    () => calls.push("home"), () => {},
    { multiRemove: async () => calls.push("clear-session") }, {},
    async () => calls.push("sign-out"), {}, async () => calls.push("reload-session"),
    { alert: () => calls.push("alert") },
  );
  return { close, calls };
}

test("closing signed terms returns to the previous page without signing out", async () => {
  const { close, calls } = closeHandler({ accepted: true });
  await close();
  assert.deepEqual(calls, ["back"]);
});

test("signed terms opened without navigation history return to the app", async () => {
  const { close, calls } = closeHandler({ accepted: true, canGoBack: false });
  await close();
  assert.deepEqual(calls, ["home"]);
});

test("closing required unsigned terms retains the logout flow", async () => {
  const { close, calls } = closeHandler({ accepted: false });
  await close();
  assert.deepEqual(calls, ["clear-session", "sign-out", "reload-session", "/(auth)/login"]);
});

test("closing is blocked while a signature is being submitted", async () => {
  const { close, calls } = closeHandler({ accepted: true, submitting: true });
  await close();
  assert.deepEqual(calls, []);
});
