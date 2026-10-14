const sessionKeys = new Set([
  'sessionRole', 'sessionIsService', 'sessionCompanyId', 'sessionUserAccess', 'sessionServiceAccess',
  'displayName', 'employeeId', 'employeeEmail', 'employeeUserCode', 'userCode',
  'timesheetYardStart', 'timesheetYardEnd', 'timesheetOfficeStart', 'timesheetOfficeEnd',
  'timesheetWorkshopStart', 'timesheetWorkshopEnd', 'timesheetDefaultType',
]);
export async function clearAccountSessionCache(storage) {
  const keys = (await storage.getAllKeys()).filter(key => sessionKeys.has(key)
    || key.startsWith('@bickers.dataCache.v2.') || key.startsWith('@bickers.service.cache.v1.'));
  if (keys.length) await storage.multiRemove(keys);
  // Outbox rows and drafts retain their original UID/company ownership. They
  // remain quarantined until that exact employee is verified again.
}
