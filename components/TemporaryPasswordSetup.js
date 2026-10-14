import { useRef, useState } from "react";
import { View } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import PageShell from "./layout/PageShell";
import { AppButton, AppText, Banner, FormField } from "./ui/AppPrimitives";
import { useAuth } from "../providers/AuthProvider";
import { auth } from "../firebaseConfig";
import { appPasswordSetupRequest, syncEmployeeAuth } from "../lib/authApi";
import { designTokens as t } from "../lib/design/tokens";

export default function TemporaryPasswordSetup() {
  const { signOutAccount, securityTransition: setup, setTransitionBusy, reloadSession } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const operation = useRef(null);
  const expired = setup?.status === "expired" || Number(setup?.expiresAt) <= Date.now();
  const finish = async () => {
    if (busy || expired) return;
    if (password.length < 8 || password.length > 128 || password !== confirmation) {
      setError("Use 8–128 characters and make sure both passwords match."); return;
    }
    // Operation IDs carry no credential material and exist only for this mounted form.
    if (!operation.current) operation.current = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    setBusy(true); setTransitionBusy(true); setError("");
    try {
      let result;
      try {
        result = await appPasswordSetupRequest(await auth.currentUser.getIdToken(true), { issuanceId: setup.issuanceId, operationId: operation.current, newPassword: password });
      } catch (failure) {
        if (saved || ["SIGN_IN_REQUIRED", "PASSWORD_SAVED_RETRY", "SETUP_UNCONFIRMED"].includes(failure.code)) {
          await signInWithEmailAndPassword(auth, setup.email, password);
          if (auth.currentUser.uid !== setup.uid) throw new Error("Your account identity changed. Ask your administrator for help.");
          result = await appPasswordSetupRequest(await auth.currentUser.getIdToken(true), { issuanceId: setup.issuanceId, operationId: operation.current, newPassword: password });
        } else throw failure;
      }
      setSaved(true);
      // Firebase auth_time has one-second precision. Cross the server cutoff before sign-in.
      await new Promise((resolve) => setTimeout(resolve, Math.max(1100, (Number(result.sessionAfter || 0) + 1) * 1000 - Date.now() + 100)));
      const credential = await signInWithEmailAndPassword(auth, setup.email, password);
      if (credential.user.uid !== setup.uid) throw new Error("Your account identity changed. Ask your administrator for help.");
      await syncEmployeeAuth({ idToken: await credential.user.getIdToken(true) });
      setPassword(""); setConfirmation(""); setTransitionBusy(false);
      await reloadSession();
    } catch (failure) {
      setError(failure.code?.startsWith("auth/") ? "Sign in again with your new password if it was saved, or use the latest temporary password from your administrator." : failure.message || "Setup could not finish. Please retry.");
    } finally { setBusy(false); setTransitionBusy(false); }
  };
  return <PageShell mode="form" width="form" header={{ variant: "hero", title: "Choose your own password" }}>
    <View style={{ gap: t.spacing.md }}>
      <AppText>You’re using a temporary password. Choose your own password to finish signing in.</AppText>
      <FormField label="Work email" value={setup?.email || ""} disabled />
      {expired ? <Banner tone="danger" title="Temporary password expired">Your temporary password has expired. Ask your administrator for a new one.</Banner> : <>
        <FormField label="New password" value={password} onChangeText={setPassword} disabled={busy || saved} hint="Use 8–128 characters. Choose a different password from your temporary password."
          inputProps={{ secureTextEntry: !visible, autoCapitalize: "none", autoCorrect: false, textContentType: "newPassword" }} />
        <FormField label="Confirm new password" value={confirmation} onChangeText={setConfirmation} disabled={busy || saved}
          inputProps={{ secureTextEntry: !visible, autoCapitalize: "none", autoCorrect: false, textContentType: "newPassword" }} />
        <AppButton label={visible ? "Hide passwords" : "Show passwords"} variant="ghost" onPress={() => setVisible(!visible)} disabled={busy} />
        {saved ? <Banner tone="success" title="Password saved">Continue with your new password to finish signing in.</Banner> : null}
        {error ? <Banner tone="danger" title="Unable to continue">{error}</Banner> : null}
        <AppButton label={busy ? "Please wait…" : saved ? "Continue signing in" : "Save password and continue"} onPress={finish} disabled={busy} fullWidth />
      </>}
      <AppButton label="Use a different sign-in" variant="ghost" disabled={busy} onPress={async () => { await signOutAccount(); await reloadSession(); }} />
    </View>
  </PageShell>;
}
