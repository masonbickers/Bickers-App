import { getEmployeeNotifications } from "./authApi";
import { addToInbox } from "./notificationInbox";
import { isTimesheetReminder } from "./timesheetNotification";

export async function saveRemoteNotificationToInbox(notification, employeeId) {
  if (!notification?.id) return null;
  const data = notification.data || {};
  const personalUpdate = data.bookingId || data.holidayId || isTimesheetReminder(data);
  return addToInbox({
    id: `web:${notification.id}`,
    title: notification.title,
    body: notification.body,
    data: {
      ...data,
      ...(personalUpdate && employeeId && !data.recipientEmployeeId && !data.recipientPersonId && !data.recipientUid
        ? { recipientEmployeeId: employeeId }
        : {}),
      notificationId: notification.id,
      source: notification.source || "web",
    },
    createdAt: new Date(notification.createdAt).getTime() || Date.now(),
    read: false,
  });
}

export async function syncRemoteNotificationsToInbox({ user, employee }) {
  if (!user || !employee?.employeeId) return 0;
  let response;
  try {
    response = await getEmployeeNotifications({
      idToken: await user.getIdToken(),
      employeeId: employee.employeeId,
      employeeCode: employee.userCode,
      email: employee.email || user.email,
    });
  } catch (error) {
    if (String(error?.message || "").includes("is not configured")) return 0;
    throw error;
  }
  const notifications = Array.isArray(response?.notifications)
    ? response.notifications
    : [];
  for (const notification of notifications) {
    await saveRemoteNotificationToInbox(notification, employee.employeeId);
  }
  return notifications.length;
}
