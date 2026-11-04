import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkshopScheduleHandler, projectWorkshopSchedule } from '../server/workshopSchedule.js';

const identity = { employeeId: 'liam', companyId: 'bickers' };
const booking = {
  ...identity, assignedEmployeeId: 'liam', source: 'maintenance_booking',
  sourceMaintenanceBookingId: 'service1', workType: 'full_service',
  assetLabel: 'Van', bookingDates: ['2026-11-20'], appointmentTime: '09:00', status: 'open',
  notes: 'Internal workshop notes',
};

test('schedule includes booked and completed work, moves dates, and excludes removed or foreign work', () => {
  const rows = [
    booking,
    { ...booking, sourceMaintenanceBookingId: 'mot1', workType: 'mot_precheck', status: 'completed', bookingDates: ['2026-11-21'] },
    { ...booking, sourceMaintenanceBookingId: 'cancelled', status: 'cancelled' },
    { ...booking, sourceMaintenanceBookingId: 'unassigned', assignedEmployeeId: '' },
    { ...booking, companyId: 'foreign' },
    { ...booking, assignedEmployeeId: 'other' },
  ];
  const entries = projectWorkshopSchedule(rows, identity);
  assert.deepEqual(entries[0], { bookingId: 'service1', workType: 'full_service', vehicleLabel: 'Van',
    bookingDates: ['2026-11-20'], appointmentTime: '09:00', status: 'open' });
  assert.deepEqual(entries.map(entry => [entry.bookingId, entry.status]), [['service1', 'open'], ['mot1', 'completed']]);
  assert.deepEqual(projectWorkshopSchedule([{ ...booking, bookingDates: ['2026-11-22'] }], identity)[0].bookingDates, ['2026-11-22']);
});

test('handler queries only the session company and employee and ignores client identity parameters', async () => {
  const predicates = [];
  const query = { where(...args) { predicates.push(args); return this; }, async get() { return { docs: [{ data: () => booking }] }; } };
  const handler = createWorkshopScheduleHandler({ collection(name) { assert.equal(name, 'workshopRequests'); return query; } });
  const res = { locals: { businessIdentity: identity }, json: value => value };
  assert.equal((await handler({ query: { employeeId: 'other' } }, res)).entries.length, 1);
  assert.deepEqual(predicates, [['companyId', '==', 'bickers'], ['assignedEmployeeId', '==', 'liam']]);
});
