import { useState } from "react";
import { ServiceSettingsView } from "../../app/(protected)/service/settings";
import { useTheme } from "../../providers/ThemeProvider";
export default function RestoredSettingsFixture() {
  const { colors } = useTheme();
  const [theme, setTheme] = useState("system");
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState("09:00");
  const settings = [
    { group: "Workshop Account", items: [{ label: "Edit Profile", icon: "user", onPress: () => {} }] },
    { group: "Service Notifications", items: [
      { label: "Job & Workshop Alerts", icon: "bell", type: "toggle" },
      { label: "Maintenance Job Reminders", icon: "clock", type: "maintenance-reminder-toggle", subLabel: "Day-before alerts for booked maintenance jobs" },
      { label: "Reminder Time", icon: "watch", type: "maintenance-reminder-time", subLabel: "When the day-before alert should arrive" },
    ] },
    { group: "Appearance", items: [{ label: "Theme", icon: "moon", type: "theme" }] },
  ];
  return <ServiceSettingsView router={{ back: () => {} }} colors={colors} theme={theme} settings={settings} notificationsEnabled={enabled} setNotificationsEnabled={setEnabled} maintenanceReminderEnabled={enabled} handleMaintenanceReminderToggle={setEnabled} maintenanceReminderSaving={false} maintenanceReminderLoading={false} maintenanceReminderTimes={["07:00", "09:00", "12:00", "17:00"]} maintenanceReminderTime={time} handleMaintenanceReminderTimeChange={setTime} handleSetTheme={setTheme} handleLogout={() => {}} passwordModalVisible={false} passwordForm={{}} />;
}
