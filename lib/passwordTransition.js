// Only extract codes locally. Never navigate to, log or persist pasted URLs.
export function passwordResetCode(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:" || url.searchParams.get("mode") !== "resetPassword") return "";
    return url.searchParams.get("oobCode") || "";
  } catch { return ""; }
}

export async function finishPasswordTransition({ auth, email, expectedUid, password, resetLink,
  verifyPasswordResetCode, confirmPasswordReset, signInWithEmailAndPassword, complete, sync }) {
  if (resetLink) {
    const code = passwordResetCode(resetLink);
    if (!code) throw new Error("Paste the complete password setup link from your email.");
    const verifiedEmail = await verifyPasswordResetCode(auth, code);
    if (verifiedEmail.toLowerCase() !== email.toLowerCase()) throw new Error("That link is for a different work email.");
    await confirmPasswordReset(auth, code, password);
  }
  // Firebase verifies the password, not the old employee-code credential.
  let result = await signInWithEmailAndPassword(auth, email, password);
  if (result.user.uid !== expectedUid) throw new Error("Your account identity changed. Ask an administrator for help.");
  const completed = await complete(await result.user.getIdToken(true));
  if (completed.refreshSession) result = await signInWithEmailAndPassword(auth, email, password);
  if (result.user.uid !== expectedUid) throw new Error("Your account identity changed. Ask an administrator for help.");
  await sync({ idToken: await result.user.getIdToken(true) });
}
