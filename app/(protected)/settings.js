import { AppButton, AppText, ListRow, PageSection, SegmentedControl, ToggleRow } from "../../components/ui/AppPrimitives";
import {
  useRouter } from "expo-router";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { useCallback,
  useEffect,
  useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  Platform,
  View,
} from "react-native";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import ChangePasswordModal from "../../components/ChangePasswordModal";
import { auth, db } from "../../firebaseConfig";
import { registerDeviceToken } from "../../lib/authApi";
import { openPrivacyPolicy } from "../../lib/privacyPolicy";
import {
  getNotificationPermissionStatus,
  NOTIFICATIONS_ENABLED,
  registerForPushNotificationsAsync,
  requestNotificationPermission,
} from "../../lib/notifications";
import { useClerkFirebase } from "../../providers/ClerkFirebaseProvider";
import { useAuth } from "../../providers/AuthProvider";
import { useNotificationPreferences } from "../../providers/NotificationPreferencesProvider";
import { useTheme } from "../../providers/ThemeProvider";
import { designTokens as t } from "../../lib/design/tokens";
import PageShell from "../../components/layout/PageShell";

function getCurrentAppVersion() {
  return (
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    Constants.manifest2?.extra?.expoClient?.version ||
    Constants.manifest?.version ||
    "0.0.0"
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const clerk = useClerkFirebase();
  const openSharedPassword = async () => {
    try { await clerk.openRecovery(); }
    catch (error) { Alert.alert("Password recovery", error.message); }
  };
  const { user, employee } = useAuth();
  const {
    maintenanceRemindersEnabled: maintenanceReminderEnabled,
    maintenanceReminderTime,
    isLoading: maintenanceReminderLoading,
    isSaving: maintenanceReminderSaving,
    error: maintenanceReminderError,
    refresh: refreshMaintenancePreferences,
    setMaintenanceRemindersEnabled,
    setMaintenanceReminderTime,
  } = useNotificationPreferences();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [securityStatus, setSecurityStatus] = useState({
    loading: true,
    passwordEnabled: true,
    notificationsGranted: false,
    notificationStatus: "unknown",
  });
  const { theme, colors, setTheme } = useTheme();
  const maintenanceReminderTimes = ["07:00", "09:00", "12:00", "17:00"];

  const handleSetTheme = (mode) => {
    setTheme(mode);
  };

  const passwordEmail = () =>
    String(user?.email || auth.currentUser?.email || employee?.email || "")
      .trim()
      .toLowerCase();

  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const refreshAccountSetupStatus = useCallback(
    async () => {
      const firebaseUser = user || auth.currentUser;
      const employeeId = employee?.employeeId;
      const hasPasswordProvider =
        firebaseUser?.providerData?.some((provider) => provider?.providerId === "password") ||
        false;

      try {
        const [userSnap, employeeSnap, notificationPermission] = await Promise.all([
          firebaseUser?.uid
            ? getDoc(doc(db, "users", String(firebaseUser.uid))).catch(() => null)
            : Promise.resolve(null),
          employeeId
            ? getDoc(doc(db, "employees", String(employeeId))).catch(() => null)
            : Promise.resolve(null),
          getNotificationPermissionStatus(),
        ]);

        const userData = userSnap?.exists?.() ? userSnap.data() : {};
        const employeeData = employeeSnap?.exists?.() ? employeeSnap.data() : {};
        const authData = employeeData?.auth || {};
        const passwordEnabled = clerk.enabled ? clerk.passwordEnabled :
          hasPasswordProvider ||
          authData?.passwordEnabled === true ||
          userData?.auth?.passwordEnabled === true;

        setSecurityStatus({
          loading: false,
          passwordEnabled,
          notificationsGranted: notificationPermission.granted,
          notificationStatus: notificationPermission.status || "unknown",
        });
      } catch {
        setSecurityStatus((current) => ({
          ...current,
          loading: false,
        }));
      }
    },
    [clerk.enabled, clerk.passwordEnabled, employee?.employeeId, user]
  );

  useEffect(() => {
    refreshAccountSetupStatus();
  }, [refreshAccountSetupStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") refreshAccountSetupStatus();
    });
    return () => subscription.remove();
  }, [refreshAccountSetupStatus]);

  const handleMaintenanceReminderToggle = async (next) => {
    if (maintenanceReminderSaving) return;

    try {
      await setMaintenanceRemindersEnabled(next);
    } catch (e) {
      Alert.alert(
        "Could not update reminders",
        e?.message || "Please try again."
      );
    }
  };

  const handleMaintenanceReminderTimeChange = async (time) => {
    if (maintenanceReminderSaving || time === maintenanceReminderTime) return;

    try {
      await setMaintenanceReminderTime(time);
    } catch (e) {
      Alert.alert(
        "Could not update reminder time",
        e?.message || "Please try again."
      );
    }
  };

  const handleSendPasswordSetupEmail = async () => {
    if (clerk.enabled) { void openSharedPassword(); return; }
    const email = String(user?.email || auth.currentUser?.email || employee?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      Alert.alert("No email found", "Please contact an admin to finish setup.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Password email sent",
        `Check ${email} and follow the link to set your password.`
      );
    } catch (err) {
      Alert.alert("Could not send email", err?.message || "Please try again.");
    }
  };

  const handleEnableNotifications = async () => {
    if (!NOTIFICATIONS_ENABLED) {
      Alert.alert("Notifications disabled", "Notifications are disabled in this build.");
      return;
    }

    try {
      const result = await requestNotificationPermission();
      await refreshAccountSetupStatus();

      if (result.granted) {
        const firebaseUser = user || auth.currentUser;
        const token = await registerForPushNotificationsAsync();
        if (!firebaseUser || !token) {
          throw new Error("This device could not be registered for push notifications.");
        }

        await registerDeviceToken({
          idToken: await firebaseUser.getIdToken(),
          token,
          platform: Platform.OS,
          appVersion: getCurrentAppVersion(),
          employeeId: employee?.employeeId,
          employeeCode: employee?.userCode,
          email: employee?.email || firebaseUser.email,
        });
        Alert.alert("Notifications enabled", "This device is registered for reminders.");
        return;
      }

      Alert.alert(
        "Notifications blocked",
        `Enable notifications for this app in ${Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Device"} Settings.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Could not enable notifications",
        error?.message || "Please try again."
      );
    }
  };

  const handleChangePassword = () => {
    if (clerk.enabled) { void openSharedPassword(); return; }
    const email = passwordEmail();
    if (!email) {
      Alert.alert("No email found", "Please log out and sign in again.");
      return;
    }

    resetPasswordForm();
    setPasswordModalVisible(true);
  };

  const handleClosePasswordModal = () => {
    if (passwordSaving) return;
    setPasswordModalVisible(false);
    resetPasswordForm();
  };

  const handleForgotCurrentPassword = async () => {
    if (clerk.enabled) { void openSharedPassword(); return; }
    const email = passwordEmail();
    if (!email) {
      Alert.alert("No email found", "Please log out and sign in again.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Reset email sent",
        `Check ${email} and follow the link to choose a new password.`
      );
    } catch (err) {
      Alert.alert("Could not send email", err?.message || "Please try again.");
    }
  };

  const handleSubmitPasswordChange = async () => {
    if (clerk.enabled) { void openSharedPassword(); return; }
    const firebaseUser = user || auth.currentUser;
    const email = passwordEmail();
    const currentPassword = String(passwordForm.currentPassword || "");
    const newPassword = String(passwordForm.newPassword || "");
    const confirmPassword = String(passwordForm.confirmPassword || "");

    if (!firebaseUser || !email) {
      Alert.alert("No signed-in user", "Please log out and sign in again.");
      return;
    }
    if (!currentPassword) {
      Alert.alert("Current password required", "Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Weak password", "Use at least 8 characters for the new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "The new passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Choose a new password", "The new password must be different.");
      return;
    }

    try {
      setPasswordSaving(true);
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      setPasswordModalVisible(false);
      resetPasswordForm();
      await refreshAccountSetupStatus();
      Alert.alert("Password changed", "Your password has been updated.");
    } catch (err) {
      if (
        err?.code === "auth/wrong-password" ||
        err?.code === "auth/invalid-credential"
      ) {
        Alert.alert("Wrong current password", "Check your current password and try again.");
      } else if (err?.code === "auth/weak-password") {
        Alert.alert("Weak password", "Use a stronger new password.");
      } else if (err?.code === "auth/requires-recent-login") {
        Alert.alert("Sign in again", "Please log out, sign back in, then try again.");
      } else {
        Alert.alert("Could not change password", err?.message || "Please try again.");
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const accountSetupItems = [
    {
      key: "password",
      label: "Password",
      icon: "lock",
      complete: securityStatus.passwordEnabled,
      subLabel: securityStatus.passwordEnabled
        ? "Email password login is set up"
        : "Password setup is needed",
      actionLabel: "Send",
      onPress: () => handleSendPasswordSetupEmail(),
    },
  ];

  const incompleteSetupItems = accountSetupItems.filter((item) => !item.complete);

  const settings = [
    {
      group: "Account",
      items: [
        {
          label: "Edit Profile",
          icon: "user",
          subLabel: "Update your personal details",
          onPress: () => router.push("/edit-profile"),
        },
        {
          label: "Change Password",
          icon: "lock",
          subLabel: clerk.enabled ? "Manage the password shared with the booking website" : "Update your login credentials",
          onPress: handleChangePassword,
        },
      ],
    },
    {
      group: "Notifications",
      items: [
        {
          label: "Device Notifications",
          icon: "bell",
          type: "notification-permission",
          complete: securityStatus.notificationsGranted,
          subLabel: securityStatus.notificationsGranted
            ? "Alerts are allowed on this device"
            : securityStatus.notificationStatus === "denied"
              ? "Blocked in device settings"
              : "Allow job and reminder alerts",
          actionLabel: securityStatus.notificationsGranted || securityStatus.notificationStatus === "denied" ? "Open Settings" : "Turn on",
          onPress: securityStatus.notificationsGranted || securityStatus.notificationStatus === "denied"
            ? () => Linking.openSettings()
            : handleEnableNotifications,
        },
        {
          label: "Maintenance Reminders",
          icon: "clock",
          type: "maintenance-reminder-toggle",
          subLabel: securityStatus.notificationsGranted
            ? "Alert me the day before booked maintenance"
            : "Enable device notifications first",
        },
        ...(maintenanceReminderEnabled && securityStatus.notificationsGranted
          ? [{
              label: "Reminder Time",
              icon: "watch",
              type: "maintenance-reminder-time",
              subLabel: "When the day-before alert arrives",
            }]
          : []),
      ],
    },
    {
      group: "Appearance",
      items: [
        {
          label: "Theme",
          icon: "moon",
          type: "theme",
          subLabel: "Use system, light, or dark mode",
        },
      ],
    },
    {
      group: "Support",
      items: [
        {
          label: "Privacy policy",
          icon: "shield",
          subLabel: "How Bickers uses your information",
          onPress: openPrivacyPolicy,
        },
        {
          label: "Help Centre",
          icon: "help-circle",
          subLabel: "Browse FAQs and app guidance",
          onPress: () => router.push("/help"),
        },
        {
          label: "About",
          icon: "info",
          subLabel: "Version and company information",
          onPress: () => router.push("/about"),
        },
        {
          label: "Working Terms",
          icon: "file-text",
          subLabel: "View the terms you have signed",
          onPress: () => router.push("/working-terms"),
        },
      ],
    },
  ];

  return (
    <PageShell
      appearance="grouped"
      mode="form"
      width="form"
      header={{
        variant: "compact",
        eyebrow: "Profile & App",
        title: "Settings",
        onBack: router.back,
      }}
    >
      <View style={{ gap: t.spacing.md }}>
      {!securityStatus.loading && incompleteSetupItems.length > 0 ? (
        <PageSection title="Finish Setup" divided={false}>
          {incompleteSetupItems.map((item) => (
            <ListRow key={item.key} title={item.label} subtitle={item.subLabel} leadingIcon={item.icon} onPress={item.onPress} />
          ))}
        </PageSection>
      ) : null}
      {settings.map((section) => (
        <PageSection key={section.group} title={section.group} divided={false}>
          <View>
            {section.items.map((item, index) => {
              const divider = index < section.items.length - 1;
              if (item.type === "theme" || item.type === "maintenance-reminder-time") {
                const isTheme = item.type === "theme";
                return (
                  <View key={item.label}>
                    <ListRow title={item.label} subtitle={item.subLabel} leadingIcon={item.icon} />
                    <SegmentedControl
                      accessibilityLabel={item.label}
                      selectionRole="radio"
                      pill
                      subtle
                      density="compact"
                      options={isTheme
                        ? [{ label: "System", value: "system" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }]
                        : maintenanceReminderTimes.map((time) => ({ label: time, value: time }))}
                      value={isTheme ? theme : maintenanceReminderTime}
                      onChange={isTheme ? handleSetTheme : handleMaintenanceReminderTimeChange}
                      disabled={!isTheme && maintenanceReminderSaving}
                    />
                  </View>
                );
              }
              if (item.type === "maintenance-reminder-toggle") {
                return maintenanceReminderError ? (
                  <ListRow key={item.label} title={item.label} subtitle="Could not load reminder preferences" leadingIcon={item.icon}
                    trailing={<AppButton label="Retry" variant="secondary" onPress={() => refreshMaintenancePreferences().catch(() => {})} />} />
                ) : (
                  <ToggleRow key={item.label} label={item.label} description={item.subLabel}
                    leadingIcon={item.icon}
                    value={maintenanceReminderEnabled} onChange={handleMaintenanceReminderToggle}
                    disabled={maintenanceReminderSaving || maintenanceReminderLoading || !securityStatus.notificationsGranted} />
                );
              }
              return (
                <ListRow key={item.label} title={item.label} subtitle={item.subLabel} leadingIcon={item.icon} divider={divider}
                  onPress={item.type === "notification-permission" ? undefined : item.onPress}
                  trailing={item.type === "notification-permission"
                    ? <AppButton label={item.actionLabel} variant="secondary" pill density="compact" onPress={item.onPress} accessibilityLabel={`${item.actionLabel} device notifications`} />
                    : undefined} />
              );
            })}
          </View>
        </PageSection>
      ))}
      </View>
      <AppText variant="metadata" tone="secondary" layoutStyle={{ alignSelf: "center", paddingVertical: t.spacing.md }}>
        Version {getCurrentAppVersion()}{Application.nativeBuildVersion ? ` (Build ${Application.nativeBuildVersion})` : ""}
      </AppText>
      <ChangePasswordModal
        visible={passwordModalVisible}
        colors={colors}
        values={passwordForm}
        saving={passwordSaving}
        onChange={handlePasswordFieldChange}
        onClose={handleClosePasswordModal}
        onSubmit={handleSubmitPasswordChange}
        onForgotPassword={handleForgotCurrentPassword}
      />
    </PageShell>
  );
}
