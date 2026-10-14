import test from 'node:test';import assert from 'node:assert/strict';
import * as prep from '../lib/vehiclePrepStatus.js';
const op={companyId:'a',bookingId:'booking',vehicleId:'van',desiredCompleted:true,expectedRevision:0,mutationId:'one',actorUid:'staff',attribution:{uid:'staff',employeeId:'employee',name:'Prep Employee',code:'P1'}};
const transition=(row,input=op)=>prep.buildPrepStatusTransition?.(row,input,'SERVER_TIME')||{};
test('completion patches status only and preserves unrelated checklist fields',()=>{
 const result=transition({companyId:'a',bookingId:'booking',vehicleId:'van',checks:[{done:false}],notes:'original'});
 assert.equal(result.patch?.completed,true);assert.equal(result.patch?.statusRevision,1);assert.equal(result.patch?.completedAt,'SERVER_TIME');
 assert.equal(result.patch?.completedByName,'Prep Employee');assert.equal('checks' in (result.patch||{}),false);assert.equal('notes' in (result.patch||{}),false);
});
test('stale completion or reopening fails instead of replacing newer state',()=>{
 for(const desiredCompleted of [true,false])assert.throws(()=>transition({companyId:'a',bookingId:'booking',vehicleId:'van',statusRevision:2},{...op,desiredCompleted}),e=>e.code==='prep/conflict');
});
test('idempotent replay returns no patch and cannot clear newer history',()=>{
 assert.equal(transition({companyId:'a',bookingId:'booking',vehicleId:'van',statusRevision:1,statusMutationId:'one'}).duplicate,true);
});
test('reopening clears active attribution and records previous completion in the event',()=>{
 const result=transition({companyId:'a',bookingId:'booking',vehicleId:'van',statusRevision:1,completed:true,completedAt:'OLD',completedByName:'Previous',completedByUid:'staff',completedByEmployeeId:'employee'},{...op,desiredCompleted:false,expectedRevision:1,mutationId:'two'});
 assert.equal(result.patch?.completed,false);assert.equal(result.patch?.completedByName,null);assert.equal(result.event?.previous?.completedByName,'Previous');assert.equal(result.event?.previous?.completedAt,'OLD');
});
test('missing identity, foreign existing identity and missing completion attribution are rejected',()=>{
 for(const input of [{...op,companyId:''},{...op,mutationId:'bad/id'},{...op,attribution:{}},{...op,actorUid:'other'},{...op,expectedRevision:-1}])assert.throws(()=>transition(null,input));
 assert.throws(()=>transition({companyId:'b',bookingId:'booking',vehicleId:'van'}),e=>e.code==='prep/identity');
});
test('write gate refuses production and requires explicit emulator-only opt in',()=>{
 assert.equal(prep.prepWritesAllowed?.({enabled:'true',isDev:true,projectId:'bickers-booking',emulatorConnected:true}),false);
 assert.equal(prep.prepWritesAllowed?.({enabled:'true',isDev:false,projectId:'demo-prep-shared',emulatorConnected:true}),false);
 assert.equal(prep.prepWritesAllowed?.({enabled:'true',isDev:true,projectId:'demo-prep-shared',emulatorConnected:true}),true);
});
test('a captured draft version rejects changed server notes even at the same status revision',()=>{
 assert.throws(()=>transition({companyId:'a',bookingId:'booking',vehicleId:'van',updatedAt:'new'},{...op,expectedRecordVersion:'old'}),e=>e.code==='prep/conflict');
});
test('both completion and checklist replay are rejected for another author or disabled gate',()=>{
 for(const type of ['prepStatus','prepChecklist'])for(const context of [{enabled:false,actorUid:'staff'},{enabled:true,actorUid:'other'}])assert.throws(()=>prep.validatePrepReplayContext?.({...op,type},context)||false);
});
test('updating a completed preparation preserves the original completion time and employee',()=>{
 const result=transition({companyId:'a',bookingId:'booking',vehicleId:'van',completed:true,completedAt:'ORIGINAL_TIME',completedByUid:'original-author',completedByEmployeeId:'original-employee',completedByName:'Original Employee',completedByCode:'O1'});
 assert.equal(result.patch.completedAt,'ORIGINAL_TIME');assert.equal(result.patch.completedByUid,'original-author');assert.equal(result.patch.completedByName,'Original Employee');
});
