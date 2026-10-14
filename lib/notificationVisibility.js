import { isReceiptNotification, receiptNotificationVisible } from "./receipts/navigation.js";

export function notificationVisibleToAccount(item, account = {}) {
  const data = item?.data || {};
  if (!account.uid || !account.personId || !account.companyId) return false;
  if (isReceiptNotification(data)) return receiptNotificationVisible(data, account);
  if (data.companyId && data.companyId !== account.companyId) return false;

  const recipientPersonId = data.recipientEmployeeId || data.recipientPersonId;
  if (recipientPersonId) {
    return recipientPersonId === account.personId &&
      (!data.recipientUid || data.recipientUid === account.uid);
  }
  if (data.recipientUid) return data.recipientUid === account.uid;
  if (data.employeeCode) return String(data.employeeCode) === String(account.employeeCode);
  return false;
}

export function maintenanceBookingAssignedToAccount(booking = {}, account = {}) {
  if (booking.companyId && booking.companyId !== account.companyId) return false;
  const matches = (values, identity) => Boolean(identity) && values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .some((value) => String(value || "") === String(identity));

  return matches([booking.employeeId, booking.assignedEmployeeId, booking.employeeIds, booking.assignedEmployeeIds], account.personId) ||
    matches([booking.employeeCode, booking.assignedEmployeeCode, booking.employeeCodes, booking.assignedEmployeeCodes], account.employeeCode) ||
    matches([booking.recipientUid, booking.assignedUid], account.uid);
}
