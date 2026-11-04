const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function projectWorkshopSchedule(rows, { employeeId, companyId }) {
  if (!employeeId || !companyId) return [];
  return rows.flatMap(row => {
    if (row.companyId !== companyId || row.assignedEmployeeId !== employeeId ||
        row.source !== 'maintenance_booking' || !row.sourceMaintenanceBookingId ||
        !['full_service', 'mot_precheck'].includes(row.workType) ||
        !['open', 'completed'].includes(row.status)) return [];
    const bookingDates = [...new Set((Array.isArray(row.bookingDates) ? row.bookingDates : [])
      .filter(date => typeof date === 'string' && datePattern.test(date)))].sort();
    if (!bookingDates.length) return [];
    return [{
      bookingId: row.sourceMaintenanceBookingId,
      workType: row.workType,
      vehicleLabel: String(row.assetLabel || ''),
      bookingDates,
      appointmentTime: String(row.appointmentTime || ''),
      status: row.status,
    }];
  });
}

export function createWorkshopScheduleHandler(db) {
  return async (_req, res) => {
    const identity = res.locals.businessIdentity;
    if (!identity?.employeeId || !identity.companyId) {
      return res.status(403).json({ error: 'An active employee session is required.' });
    }
    try {
      const snapshot = await db.collection('workshopRequests')
        .where('companyId', '==', identity.companyId)
        .where('assignedEmployeeId', '==', identity.employeeId).get();
      return res.json({ entries: projectWorkshopSchedule(snapshot.docs.map(doc => doc.data()), identity) });
    } catch {
      return res.status(503).json({ error: 'Workshop schedule is temporarily unavailable.' });
    }
  };
}
