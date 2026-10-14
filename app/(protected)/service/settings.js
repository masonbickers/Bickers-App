import { routeColors } from "../../../lib/design/routePresentation/service-settings-js.js";
import { styles } from "../../../lib/design/screenStyles/service-settings-js.js";
import { SectionCard, AppText as Text, AppPressable as TouchableOpacity } from "../../../components/ui/AppPrimitives";
import {
  servicePalette as COLORS, getServiceStatusColors } from "../../../lib/design/semantics";
// app/(protected)/service/settings.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Switch,
  View } from "react-native";

import Icon from "react-native-vector-icons/Feather";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";
import ChangePasswordModal from "../../../components/ChangePasswordModal";
import { auth } from "../../../firebaseConfig";
import { useAuth } from "../../../providers/AuthProvider";
import { useNotificationPreferences } from "../../../providers/NotificationPreferencesProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { designTokens as t } from "../../../lib/design/tokens";
import PageShell from "../../../components/layout/PageShell";
import SettingsPage from "../settings";

/* --------- SERVICE STYLE COLOURS --------- */

export default function ServiceSettingsPage() {
  const router = useRouter();
  const { signOutAccount, reloadSession, user, employee } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
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

  const { theme, colors, setTheme } = useTheme();
  const maintenanceReminderTimes = ["07:00", "09:00", "12:00", "17:00"];

  const settings = [
    {
      group: "Workshop Account",
      items: [
        {
          label: "Edit Profile",
          icon: "user",
          onPress: () => router.push("/(protected)/edit-profile"),
        },
        {
          label: "Change Password",
          icon: "lock",
          onPress: () => handleChangePassword(),
        },
      ],
    },
    {
      group: "Service Notifications",
      items: [
        {
          label: "Job & Workshop Alerts",
          icon: "bell",
          type: "toggle",
        },
        {
          label: "Maintenance Job Reminders",
          icon: "clock",
          type: "maintenance-reminder-toggle",
          subLabel: "Day-before alerts for booked maintenance jobs",
        },
        {
          label: "Reminder Time",
          icon: "watch",
          type: "maintenance-reminder-time",
          subLabel: "When the day-before alert should arrive",
        },
      ],
    },
    {
      group: "Appearance",
      items: [
        { label: "Theme", icon: "moon", type: "theme" }, // theme buttons
      ],
    },
    {
      group: "Support",
      items: [
        {
          label: "Help Centre",
          icon: "info",
          onPress: () => router.push("/(protected)/help"),
        },
        {
          label: "About",
          icon: "info",
          onPress: () => router.push("/(protected)/about"),
        },
      ],
    },
  ];

  const handleSetTheme = (mode) => {
    setTheme(mode); // "system" | "light" | "dark"
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

  const handleChangePassword = () => {
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

  // 🔐 LOGOUT – mirror HomeScreen behaviour so root layout sends you to (auth)/login
  const handleLogout = async () => {
    try {
      // clear role + employee session
      await AsyncStorage.multiRemove([
        "sessionRole",
        "sessionIsService",
        "sessionUserAccess",
        "sessionServiceAccess",
        "sessionCompanyId",
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
      ]);

      global.employee = null;
      await signOutAccount();
      await reloadSession();
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return <SettingsPage />;
}

export function ServiceSettingsView({ router, colors, theme, settings, notificationsEnabled, setNotificationsEnabled, maintenanceReminderError, refreshMaintenancePreferences, maintenanceReminderEnabled, handleMaintenanceReminderToggle, maintenanceReminderSaving, maintenanceReminderLoading, maintenanceReminderTimes, maintenanceReminderTime, handleMaintenanceReminderTimeChange, handleSetTheme, handleLogout, passwordModalVisible, passwordForm, passwordSaving, handlePasswordFieldChange, handleClosePasswordModal, handleSubmitPasswordChange, handleForgotCurrentPassword }) {
  const { colorScheme } = useTheme();
  const selection = getServiceStatusColors("danger", colorScheme);
  return (
    <PageShell mode="form" width="form" header={{
      variant: "compact",
      title: "Service Settings",
      subtitle: "Workshop preferences and account controls.",
      onBack: router.back,
    }}>
      {/* HEADER */}


      <>
        {settings.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text
              tone={"muted"} style={[
                styles.sectionTitle,
              ]}
            >
              {section.group}
            </Text>

            {section.items.map((item, index) => (
              <SectionCard
                key={index}
                testID={`setting-${item.type || item.label}`}
                tone="subtle" layoutStyle={styles.item}
              >
                <View style={styles.itemLeft}>
                  <Icon
                    name={item.icon}
                    size={20}
                    color={colors.textMuted || COLORS.textMid}
                  />
                  <View style={styles.itemTextWrap}>
                    <Text
                      tone={"primary"} style={[
                        styles.itemText,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {!!item.subLabel && (
                      <Text
                        tone={"muted"} style={[
                          styles.itemSubText,
                        ]}
                      >
                        {item.subLabel}
                      </Text>
                    )}
                  </View>
                </View>

                {item.type === "toggle" ? (
                  <Switch
                    accessibilityLabel={item.label}
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{
                      false: routeColors.hex_444_yhlhma,
                      true: colors.accent || COLORS.primaryAction,
                    }}
                    thumbColor={notificationsEnabled ? routeColors.hex_fff_yhjmu8 : routeColors.hex_888_yhlrem}
                  />
                ) : item.type === "maintenance-reminder-toggle" ? (
                  maintenanceReminderError ? (
                    <TouchableOpacity
                      onPress={() => refreshMaintenancePreferences().catch(() => {})}
                      accessibilityRole="button"
                      accessibilityLabel="Retry loading maintenance reminder settings"
                      style={{ paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.xs }}
                    >
                      <Text
                        style={{
                          color: colors.accent || COLORS.primaryAction,
                          fontWeight: "700",
                        }}
                      >
                        Retry
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Switch
                      accessibilityLabel={item.label}
                      value={maintenanceReminderEnabled}
                      onValueChange={handleMaintenanceReminderToggle}
                      disabled={maintenanceReminderSaving || maintenanceReminderLoading}
                      trackColor={{
                        false: routeColors.hex_444_yhlhma,
                        true: colors.accent || COLORS.primaryAction,
                      }}
                      thumbColor={maintenanceReminderEnabled ? routeColors.hex_fff_yhjmu8 : routeColors.hex_888_yhlrem}
                    />
                  )
                ) : item.type === "maintenance-reminder-time" ? (
                  <View style={styles.timeButtonsRow}>
                    {maintenanceReminderTimes.map((time) => {
                      const active = maintenanceReminderTime === time;
                      return (
                        <TouchableOpacity
                          key={time}
                          accessibilityRole="button"
                          accessibilityLabel={`Reminder time ${time}`}
                          aria-pressed={active}
                          accessibilityState={{ selected: active, disabled: maintenanceReminderSaving }}
                          onPress={() => handleMaintenanceReminderTimeChange(time)}
                          activeOpacity={0.85}
                          disabled={maintenanceReminderSaving}
                          style={[
                            styles.timeButton,
                            {
                              borderColor: active
                                ? selection.border
                                : colors.border || COLORS.border,
                              backgroundColor: active
                                ? selection.background
                                : colors.surface || COLORS.card,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.timeButtonText,
                              {
                                color: active
                                  ? selection.onBackground
                                  : colors.text || COLORS.textHigh,
                              },
                            ]}
                          >
                            {time}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : item.type === "theme" ? (
                  <View className="themeButtonsRow" style={styles.themeButtonsRow}>
                    {["system", "light", "dark"].map((mode, i) => {
                      const active = theme === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          accessibilityRole="button"
                          accessibilityLabel={`Theme ${mode}`}
                          aria-pressed={active}
                          accessibilityState={{ selected: active }}
                          onPress={() => handleSetTheme(mode)}
                          style={[
                            styles.themeButton,
                            {
                              marginLeft: i === 0 ? 0 : 6,
                              borderColor: active
                                ? selection.border
                                : colors.border || COLORS.border,
                              backgroundColor: active
                                ? selection.background
                                : colors.surface || COLORS.card,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active
                                ? selection.onBackground
                                : colors.text || COLORS.textHigh,
                              fontSize: t.typography.metadata.fontSize,
                              fontWeight: active ? "700" : "500",
                              textTransform: "capitalize",
                            }}
                          >
                            {mode}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={item.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <Icon
                      name="chevron-right"
                      size={20}
                      color={colors.textMuted || COLORS.textMid}
                    />
                  </TouchableOpacity>
                )}
              </SectionCard>
            ))}
          </View>
        ))}

        {/* 🚪 Logout section – styled like the main settings page */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleLogout}
            style={[
              styles.logoutButton,
              {
                borderColor: colors.accent || COLORS.primaryAction,
                backgroundColor: "transparent",
              },
            ]}
          >
            <Icon
              name="log-out"
              size={20}
              color={colors.accent || COLORS.primaryAction}
            />
            <Text
              style={[
                styles.logoutText,
                { color: colors.accent || COLORS.primaryAction },
              ]}
            >
              Log Out
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </>
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
