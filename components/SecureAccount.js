import { useState } from "react";
import { View } from "react-native";
import { confirmPasswordReset, verifyPasswordResetCode, signInWithEmailAndPassword } from "firebase/auth";
import PageShell from "./layout/PageShell";
import { AppButton, AppText, Banner, FormField, FormStep } from "./ui/AppPrimitives";
import { auth } from "../firebaseConfig";
import { passwordTransitionRequest, syncEmployeeAuth } from "../lib/authApi";
import { finishPasswordTransition } from "../lib/passwordTransition";
import { useAuth } from "../providers/AuthProvider";
import { designTokens as t } from "../lib/design/tokens";

export default function SecureAccount() {
  const { signOutAccount, securityTransition: setup, setTransitionBusy, reloadSession } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [resetConsumed, setResetConsumed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [recoverPassword, setRecoverPassword] = useState(false);
  const accountReady = !!setup?.email && typeof setup.hasPassword === "boolean" && !setup.checking && !setup.error;
  const needsNewPassword = !resetConsumed && (setup?.hasPassword === false || recoverPassword);
  const showPasswordFields = !needsNewPassword || (emailSent && !!resetLink.trim());
  const title = !accountReady ? "Secure your account" : needsNewPassword
    ? recoverPassword ? "Reset your password" : "Set up your password"
    : "Confirm your password";

  const run = async (action) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (e) { setError(e?.code?.startsWith("auth/")
      ? "The password or setup link could not be verified. Check your password, or request a fresh email if the link has expired or was already used."
      : e?.message || "Setup could not finish. Please retry."); }
    finally { setBusy(false); }
  };
  const sendEmail = () => run(async () => {
    await passwordTransitionRequest(await auth.currentUser.getIdToken(), "email");
    setEmailSent(true);
    setMessage({ title: "Setup email sent", text: `Check the inbox and junk folder for ${setup.email}. It may take a few minutes to arrive.`, tone: "info" });
  });
  const finish = () => run(async () => {
    if (!password) throw new Error("Enter your password.");
    if (needsNewPassword && (password.length < 8 || password !== confirmation)) {
      throw new Error("Use at least 8 characters and make sure both passwords match.");
    }
    if (needsNewPassword && !resetLink.trim()) throw new Error("Paste the setup link from your work email first.");
    setTransitionBusy(true);
    try {
      await finishPasswordTransition({ auth, email: setup.email, expectedUid: setup.uid, password,
        resetLink: needsNewPassword ? resetLink : "", verifyPasswordResetCode,
        confirmPasswordReset: async (...args) => {
          await confirmPasswordReset(...args);
          setResetConsumed(true);
          setResetLink("");
          setConfirmation("");
          setMessage({ title: "Password saved", text: "Use your new password to continue if setup needs another attempt.", tone: "success" });
        },
        signInWithEmailAndPassword,
        complete: (token) => passwordTransitionRequest(token, "complete"), sync: syncEmployeeAuth,
      });
      setPassword("");
      setConfirmation("");
      setTransitionBusy(false);
      await reloadSession();
    } finally { setTransitionBusy(false); }
  });

  const useExistingPassword = () => {
    setResetConsumed(true);
    setResetLink("");
    setPassword("");
    setConfirmation("");
    setError("");
    setMessage(null);
  };
  const recover = () => {
    setRecoverPassword(true);
    setResetConsumed(false);
    setEmailSent(false);
    setResetLink("");
    setPassword("");
    setConfirmation("");
    setError("");
    setMessage(null);
  };

  return <PageShell mode="form" width="form" header={{ variant: "hero", title }}>
    <View style={{ gap: t.spacing.md }}>
      {setup?.checking ? <AppText>Checking your existing account…</AppText> : null}
      {setup?.error ? <Banner title="Unable to check your account" tone="danger" icon="alert-circle">{setup.error}</Banner> : null}
      {accountReady ? <>
        <AppText>{needsNewPassword
          ? recoverPassword
            ? "Request an email to reset your password, then continue with your existing Bickers account."
            : "Your Bickers account already exists, but it doesn’t have a password yet. Set one up to keep using the app."
          : "Enter your password to finish securing your existing Bickers account. You do not need to create another one."}</AppText>
        <FormField label="Approved work email" value={setup.email} disabled />
        {message ? <View accessibilityLiveRegion="polite"><Banner title={message.title} tone={message.tone} icon={message.tone === "success" ? "check-circle" : "mail"}>{message.text}</Banner></View> : null}
        {needsNewPassword ? <>
          {!emailSent ? <FormStep number={1} title="Get your setup email" hint="We’ll send it to your approved work email above." last>
            <AppButton label="Send setup email" onPress={sendEmail} disabled={busy} fullWidth />
          </FormStep> : <FormStep number={2} title="Copy the link from your email" last={!showPasswordFields}>
            <FormField label="Setup link from your email" value={resetLink} onChangeText={setResetLink} disabled={busy}
              hint="In the email, press and hold the password setup link, choose Copy Link, then paste it here. If you opened it and created a password, choose ‘I have already set my password’ below."
              inputProps={{ autoCapitalize: "none", autoCorrect: false, spellCheck: false, textContentType: "none" }} />
          </FormStep>}
        </> : null}
        {showPasswordFields ? <FormStep number={needsNewPassword ? 3 : 1} title={needsNewPassword ? "Choose your password" : "Enter your password"} last>
          <View style={{ gap: t.spacing.md }}>
            <FormField label={needsNewPassword ? "New password" : "Password"} value={password} onChangeText={setPassword} disabled={busy}
              hint={needsNewPassword ? "Use at least 8 characters." : undefined}
              inputProps={{ secureTextEntry: true, autoCapitalize: "none", autoCorrect: false, textContentType: needsNewPassword ? "newPassword" : "password" }} />
            {needsNewPassword ? <FormField label="Confirm new password" value={confirmation} onChangeText={setConfirmation} disabled={busy}
              inputProps={{ secureTextEntry: true, autoCapitalize: "none", autoCorrect: false, textContentType: "newPassword", onSubmitEditing: finish }} /> : null}
            {error ? <Banner title="Unable to continue" tone="danger" icon="alert-circle">{error}</Banner> : null}
            <AppButton label={busy ? "Please wait…" : needsNewPassword ? "Set password and continue" : "Confirm password and continue"} onPress={finish} disabled={busy} fullWidth />
          </View>
        </FormStep> : error ? <Banner title="Unable to continue" tone="danger" icon="alert-circle">{error}</Banner> : null}
        {needsNewPassword ? <>
          <AppButton label="I have already set my password" variant="ghost" disabled={busy} onPress={useExistingPassword} />
          {emailSent ? <AppButton label="Resend setup email" variant="ghost" onPress={sendEmail} disabled={busy} /> : null}
        </> : <AppButton label="Forgot password?" variant="ghost" disabled={busy} onPress={recover} />}
        <AppText variant="caption" tone="secondary">Complete by {new Date(setup.deadline).toLocaleDateString("en-GB")}. Your jobs, timesheets and previous signatures stay with your existing account.</AppText>
      </> : <>
        {error ? <Banner title="Unable to continue" tone="danger" icon="alert-circle">{error}</Banner> : null}
        {!setup?.checking ? <AppButton label="Retry account check" disabled={busy} onPress={() => run(reloadSession)} /> : null}
      </>}
      <AppButton label="Use a different sign-in" variant="ghost" disabled={busy} onPress={() => run(async () => { await signOutAccount(); await reloadSession(); })} />
    </View>
  </PageShell>;
}
