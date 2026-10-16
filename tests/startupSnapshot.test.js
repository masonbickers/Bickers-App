import { Buffer } from 'node:buffer';
import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../lib/startup/snapshot.js').catch(() => ({}));
const identity = { clerkUserId: 'User/A', clerkSessionId: 'session:1', uid: 'UID', companyId: 'Co', employeeId: 'E' };
const input = { identity, generation: 2, verifiedAt: 1000, savedAt: 1100, route: 'schedule', selectedDateISO: '2026-10-16', selectedJobId: 'a', completeDates: ['2026-10-16'], jobs: [{ id: 'a', dateISO: '2026-10-16', title: 'Job', jobNumber: '123', callTime: '09:00', location: 'Yard', salary: 99, attachments: ['secret'] }] };
test('projection excludes private fields and unsupported routes without changing exact identities', () => {
  assert.equal(typeof api.projectStartupSnapshot, 'function');
  const view = api.projectStartupSnapshot({ ...input, route: 'me' });
  assert.equal(view.route, 'home');
  assert.deepEqual(view.identity, identity);
  assert.deepEqual(Object.keys(view.jobs[0]).sort(), ['callTime','dateISO','id','jobNumber','location','title']);
  assert.equal(api.validateSnapshot(view, { now: 1200 })?.jobs[0].title, 'Job');
  assert.notEqual(api.identityKey(identity), api.identityKey({ ...identity, uid: 'uid' }));
});
test('expiry, clock rollback, corrupt and incompatible snapshots fail closed', () => {
  assert.equal(typeof api.projectStartupSnapshot, 'function');
  const view = api.projectStartupSnapshot(input);
  for (const [candidate, now] of [[view, 1000 + 86400000], [view, 999], [{...view, version: 2},1200], [{...view, identity: {...identity, uid:''}},1200], [{...view,jobs:[{...view.jobs[0],attachments:['private']}]},1200]]) {
    assert.equal(api.validateSnapshot(candidate, { now }), null);
  }
  assert.ok(api.validateSnapshot(view, { now: 1000 + 86400000 - 1 }));
});
test('bounded snapshots never claim complete empty work after truncation; invalid selection is discarded', () => {
  assert.equal(typeof api.projectStartupSnapshot, 'function');
  const view = api.projectStartupSnapshot({ ...input, selectedJobId: 'missing', jobs: Array.from({length:250}, (_,i) => ({...input.jobs[0],id:String(i),title:'😀'.repeat(1000)})) });
  assert.ok(view.jobs.length <= 200);
  assert.ok(Buffer.byteLength(JSON.stringify(view)) <= 256*1024);
  assert.equal(view.truncated,true);
  assert.deepEqual(view.completeDates,[]);
  assert.equal(view.selectedJobId,null);
  const empty = api.projectStartupSnapshot({...input,jobs:[],selectedJobId:null});
  assert.deepEqual(empty.completeDates,['2026-10-16']);
});

test('saved Home keeps only bounded visible header and day labels, excluding underlying account and leave records', () => {
  const view=api.projectStartupSnapshot({...input,home:{name:'Saved employee',userCode:'123',email:'private',days:[{dateISO:'2026-10-16',label:'Yard Based',reason:'private'},{dateISO:'2026-10-17',label:'Off'},{dateISO:'bad',label:'Off'},{dateISO:'2026-10-18',label:'private text'}]}});
  assert.deepEqual(view.home,{name:'Saved employee',userCode:'123',days:[{dateISO:'2026-10-16',label:'Yard Based'},{dateISO:'2026-10-17',label:'Off'}]});
  assert.ok(api.validateSnapshot(view,{now:1200}));
});
