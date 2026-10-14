import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import PageShell from "../../components/layout/PageShell";
import BrandArtwork from "../../components/renderers/BrandArtwork";
import { AppButton, AppText as Text, Banner, FormField } from "../../components/ui/AppPrimitives";
import { auth } from "../../firebaseConfig";
import { syncEmployeeAuth, warmAuthService } from "../../lib/authApi";
import { designTokens as t } from "../../lib/design/tokens";
import { getLoginFeedback } from "../../lib/loginFeedback";
import { openPrivacyPolicy } from "../../lib/privacyPolicy";
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
    if (loading || resetting) return;
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
    if (resetting || loading) return;
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
    <PageShell mode="form" width="full">
      <View style={styles.scrollContainer}>
        <BrandArtwork variant="login" />

        <Text variant="titleSmall" align="center" layoutStyle={styles.title}>
          Welcome to Bickers Action
        </Text>

        <View style={styles.section}>
          <Text variant="sectionTitle" align="center" layoutStyle={styles.sectionTitle}>
            Sign In
          </Text>

          <FormField
            label="Work email"
            placeholder="Work email"
            value={employeeEmail}
            onChangeText={setEmployeeEmail}
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: false,
              spellCheck: false,
              autoComplete: "email",
              textContentType: "emailAddress",
              keyboardType: "email-address",
            }}
          />
          <FormField
            label="Password"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            rightAction={{
              label: passwordVisible ? "Hide password" : "Show password",
              icon: passwordVisible ? "eye-off" : "eye",
              onPress: () => setPasswordVisible((visible) => !visible),
            }}
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: false,
              autoComplete: "password",
              textContentType: "password",
              secureTextEntry: !passwordVisible,
              onSubmitEditing: handleLogin,
            }}
          />

          {notification ? (
            <Banner
              title={notification.title}
              tone={notification.tone}
              icon={notification.tone === "danger" ? "alert-circle" : "info"}
              onDismiss={() => setNotification(null)}
            >
              {notification.message}
            </Banner>
          ) : null}

          <AppButton
            label={loading ? "Signing in..." : "Sign In"}
            pill
            onPress={handleLogin}
            loading={loading}
            disabled={resetting}
            fullWidth
          />
          <AppButton
            label={resetting ? "Please wait..." : "Forgot password?"}
            variant="ghost"
            onPress={handlePasswordReset}
            disabled={loading || resetting}
            fullWidth
          />

          <Text tone="secondary" align="center" layoutStyle={styles.helperText}>
            Access must be approved by a Bickers administrator before you can sign in.
          </Text>
          <AppButton
            label="Privacy policy"
            variant="ghost"
            onPress={openPrivacyPolicy}
            fullWidth
          />
        </View>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: t.spacing["2xl"],
    paddingVertical: t.spacing["2xl"],
  },
  title: {
    marginBottom: t.spacing.xl,
  },
  section: {
    width: "100%",
    maxWidth: 420,
    gap: t.spacing.md,
  },
  sectionTitle: {
    marginBottom: t.spacing.sm,
  },
  helperText: {
    marginTop: t.spacing.xs,
  },
});
