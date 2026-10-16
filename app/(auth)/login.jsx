import PageShell from "../../components/layout/PageShell";
import BickersLoginForm from "../../components/auth/BickersLoginForm";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "../../firebaseConfig";
import { syncEmployeeAuth, warmAuthService } from "../../lib/authApi";
import { getLoginFeedback } from "../../lib/loginFeedback";
import { useClerkFirebase } from "../../providers/ClerkFirebaseProvider";
import { useAuth } from "../../providers/AuthProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_COMPANY_ID = "bickers-action";
const SESSION_KEYS = [
  "sessionRole",
  "sessionIsService",
  "sessionCompanyId",
  "sessionUserAccess",
  "sessionServiceAccess",
  "displayName",
  "employeeId",
  "employeeEmail",
  "employeeUserCode",
  "userCode",
  "timesheetYardStart",
  "timesheetYardEnd",
  "timesheetOfficeStart",
  "timesheetOfficeEnd",
  "timesheetWorkshopStart",
  "timesheetWorkshopEnd",
  "timesheetDefaultType",
];

export default function LoginPage() {
  const clerk = useClerkFirebase();
  const [code, setCode] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (title, message, tone = "danger") => setNotification({ title, message, tone });

  const { reloadSession, setSignInPending } = useAuth();

  useEffect(() => {
    warmAuthService().catch(() => {});
  }, []);

  const setSession = async (data) => {
    await AsyncStorage.multiSet([
      ["sessionRole", data.role || ""],
      ["sessionIsService", data.isService ? "1" : "0"],
      ["sessionCompanyId", data.companyId || DEFAULT_COMPANY_ID],
      ["sessionUserAccess", data.appAccess?.user ? "1" : "0"],
      ["sessionServiceAccess", data.appAccess?.service ? "1" : "0"],
      ["displayName", data.displayName || ""],
      ["employeeId", data.employeeId || ""],
      ["employeeEmail", data.email || ""],
      ["employeeUserCode", data.userCode || ""],
      ["userCode", data.userCode || ""],
      ["timesheetYardStart", data.timesheetYardStart || ""],
      ["timesheetYardEnd", data.timesheetYardEnd || ""],
      ["timesheetOfficeStart", data.timesheetOfficeStart || ""],
      ["timesheetOfficeEnd", data.timesheetOfficeEnd || ""],
      ["timesheetWorkshopStart", data.timesheetWorkshopStart || ""],
      ["timesheetWorkshopEnd", data.timesheetWorkshopEnd || ""],
      ["timesheetDefaultType", data.timesheetDefaultType || ""],
    ]);
  };

  const completeLogin = async (sessionData, employee) => {
    global.employee = employee;
    await setSession(sessionData);
    await reloadSession?.();
    // The root auth gate routes only after the full sign-in attempt completes.
  };

  const clearRejectedLogin = async () => {
    global.employee = null;
    await Promise.all([
      signOut(auth).catch(() => {}),
      AsyncStorage.multiRemove(SESSION_KEYS).catch(() => {}),
    ]);
    await reloadSession?.().catch(() => {});
  };

  const handleLogin = async () => {
    if (loading || resetting || clerk.flowState.busy) return;
    setNotification(null);

    const email = String(employeeEmail || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      notify("Invalid email", "Enter your approved work email.");
      return;
    }
    if (!password) {
      notify("Missing password", "Enter your password.");
      return;
    }

    setLoading(true);
    setSignInPending(true);
    try {
      if (clerk.enabled) {
        await clerk.startPasswordSignIn?.(email, password);
        setPassword("");
        return;
      }
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken(true);
      const synced = await syncEmployeeAuth({ idToken });
      await completeLogin(synced.sessionData, synced.employee);
    } catch (error) {
      if (error.code === "APP_PASSWORD_SETUP_REQUIRED") {
        await reloadSession();
        return;
      }
      await clearRejectedLogin();
      const feedback = getLoginFeedback(error);
      notify(feedback.title, feedback.message);
    } finally {
      setSignInPending(false);
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (resetting || loading || clerk.flowState.busy) return;
    if (clerk.enabled) {
      try { await clerk.openRecovery?.(); }
      catch (error) { notify("Password recovery", error.message); }
      return;
    }
    setNotification(null);

    const email = String(employeeEmail || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      notify("Invalid email", "Enter your work email first.");
      return;
    }

    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch {
      // Keep this response identical for unknown, disabled and unapproved accounts.
    } finally {
      setResetting(false);
      notify(
        "Check your email",
        "If an approved account exists for this email, Firebase will send password reset instructions.",
        "info"
      );
    }
  };

  return (
    <PageShell mode="form" width="full" scrollProps={{ automaticallyAdjustKeyboardInsets: true }}>
      <BickersLoginForm {...{ clerk, employeeEmail, setEmployeeEmail, password, setPassword, passwordVisible, setPasswordVisible, code, setCode, loading, resetting, notification, setNotification, handleLogin, handlePasswordReset }} />
    </PageShell>
  );
}
