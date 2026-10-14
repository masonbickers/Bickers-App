import test from 'node:test';import assert from 'node:assert/strict';import {findVehiclePrepRecord} from '../lib/vehiclePrep.js';
test('booking prep never inherits a standalone service record from the same vehicle/date',()=>{
 assert.equal(findVehiclePrepRecord([{id:'service',companyId:'a',vehicleId:'van',prepDate:'2026-10-15',completed:true}],{companyId:'a',bookingId:'booking',vehicleId:'van',date:'2026-10-15'}),null);
});
test('deterministic id cannot override contradictory stored identity',()=>{
 assert.equal(findVehiclePrepRecord([{id:'job_booking__vehicle_van',companyId:'a',bookingId:'different',vehicleId:'van',completed:true}],{companyId:'a',bookingId:'booking',vehicleId:'van'}),null);
});
