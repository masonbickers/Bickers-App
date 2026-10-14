const fs = require('node:fs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const deps = '/Users/masonbickers/Desktop/Projects/Bickers-Booking1/node_modules/';
const { initializeTestEnvironment } = require(deps + '@firebase/rules-unit-testing');
const sdk = require(deps + 'firebase/firestore');
const source = fs.readFileSync('app/(protected)/vehicle-check.js', 'utf8');
const start = source.indexOf('  const loadData = useCallback(async () => {');
const body = source.slice(start + '  const loadData = useCallback(async () => {'.length, source.indexOf('\n  }, [', start));
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: process.env.SECURITY_TEST_PROJECT_ID || 'demo-vehicle-check-loader', firestore: {
    ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {host:'127.0.0.1',port:8185}),
    rules: fs.readFileSync(process.env.MOBILE_RULES_PATH || 'output/shared-vehicle-prep-20261014/active-firestore.rules', 'utf8'),
  } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await sdk.setDoc(sdk.doc(db, 'users', 'staff'), {uid:'staff',employeeId:'employee-staff',mobileAccessStatus:'active',isEnabled:true,companyId:'company-a',role:'user', appAccess: { user: true } });
    for (const [id, driverUid, odometer] of [['older', 'staff', '100'], ['today', 'staff', '200'], ['other-driver', 'other', '999']]) {
      await sdk.setDoc(sdk.doc(db, 'vehicleChecks', id), { companyId: 'company-a', driverUid, status: 'draft', odometer });
    }
    await sdk.setDoc(sdk.doc(db, 'vehicleChecks', 'foreign'), { companyId: 'company-b', driverUid: 'staff', status: 'draft', odometer: '999' });
  });
});
after(async () => env?.cleanup());
async function loadDraft(checkDocId) {
  const result = { errors: [], existing: [], odometer: null };
  const inputs = {
    ...sdk, db: env.authenticatedContext('staff',{firebase:{sign_in_provider:'password'},auth_time:100}).firestore(), loading: false, isAuthed: true,
    jobId: '', checkDocId, user: { uid: 'staff' }, employee: { companyId: 'company-a' },
    vehiclesResource: { data: [] }, findVehicleRecord: () => null,
    setLoadingDoc() {}, setLoadError: (value) => result.errors.push(value),
    setHasExisting: (value) => result.existing.push(value),
    setOdometer: (value) => { result.odometer = value; },
    setTrailerId() {}, setNotes() {}, setPhotos() {}, console: { warn() {} },
  };
  await new Function(...Object.keys(inputs), `return async () => {${body}}`)(...Object.values(inputs))();
  return result;
}
test('a missing daily draft opens as a new check under the deployed rules', async () => {
  const result = await loadDraft('missing');
  assert.deepEqual(result.errors, ['']);
  assert.deepEqual(result.existing, [false]);
  assert.equal(result.odometer, null);
});
test('only the matching daily draft is resumed', async () => {
  const result = await loadDraft('today');
  assert.deepEqual(result.errors, ['']);
  assert.deepEqual(result.existing, [true]);
  assert.equal(result.odometer, '200');
});
test('another driver or company draft is not restored', async () => {
  for (const id of ['other-driver', 'foreign']) {
    const result = await loadDraft(id);
    assert.deepEqual(result.errors, ['']);
    assert.deepEqual(result.existing, [false]);
    assert.equal(result.odometer, null);
  }
});
test('a new check can save, resume, and submit without overwriting the submitted record', async () => {
  const db = env.authenticatedContext('staff',{firebase:{sign_in_provider:'password'},auth_time:100}).firestore();
  const draftRef = sdk.doc(db, 'vehicleChecks', 'saved-daily');
  const draft = { companyId: 'company-a', driverUid: 'staff', recordVersion: 2, status: 'draft', odometer: '345', items: [], notes: 'Saved draft' };
  await sdk.setDoc(draftRef, draft);
  const resumed = await loadDraft('saved-daily');
  assert.deepEqual(resumed.errors, ['']);
  assert.equal(resumed.odometer, '345');
  const submittedRef = sdk.doc(db, 'vehicleChecks', 'submitted-daily');
  const batch = sdk.writeBatch(db);
  batch.set(submittedRef, { ...draft, status: 'submitted', submittedAt: sdk.serverTimestamp(), submissionSnapshot: { odometer: '345', notes: 'Saved draft', driverUid: 'staff' } });
  batch.set(draftRef, { companyId: 'company-a', status: 'submitted-copy', submittedCheckId: submittedRef.id }, { merge: true });
  await batch.commit();
  assert.deepEqual((await loadDraft('saved-daily')).existing, [false]);
  const submitted = await sdk.getDoc(submittedRef);
  assert.equal(submitted.data().submissionSnapshot.odometer, '345');
  await assert.rejects(sdk.updateDoc(submittedRef, { odometer: '999' }), (error) => error.code === 'permission-denied');
});
