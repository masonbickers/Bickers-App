import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createStartupSnapshotStore} from '../lib/startup/snapshotStore.js';

const entryPoints = [
  ['Home', 'app/(protected)/(main-tabs)/screens/homescreen.js', 'handleLogout'],
  ['Profile', 'app/(protected)/edit-profile.js', 'handleLogout'],
  ['Service settings', 'app/(protected)/service/settings.js', 'handleLogout'],
  ['Working Terms', 'app/(protected)/working-terms.jsx', 'handleClose'],
];
function handler(path, name, dependencies) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const match = source.match(new RegExp(`const ${name} = (async \\(\\) => \\{[\\s\\S]*?\\n  \\});`));
  assert.ok(match, `actual ${name} handler must be found`);
  return vm.runInNewContext(`(${match[1]})`, {
    global: {}, console: {error() {}}, Alert: {alert() {}},
    setAllowLogout() {}, setClosing() {}, closing: false, submitting: false, workingTermsAccepted: false,
    router: {replace() {}}, reloadSession: async () => {}, ...dependencies,
  });
}
async function savedStore() {
  const disk = new Map();
  const storage = {getItem: async key => disk.get(key), setItem: async (key, value) => disk.set(key, value), removeItem: async key => disk.delete(key)};
  const dependencies = {secureStorage: storage, dataStorage: storage, now: () => 1000};
  const store = createStartupSnapshotStore(dependencies);
  const generation = await store.activate({clerkUserId: 'clerk', clerkSessionId: 'session', uid: 'firebase', companyId: 'company', employeeId: 'employee'}, 1000);
  await store.save({route: 'home', selectedDateISO: '2026-10-16', jobs: [{id: 'job', dateISO: '2026-10-16', title: 'Saved work'}], completeDates: []}, generation);
  return {store, dependencies};
}
for (const [label, path, name] of entryPoints) {
  test(`${label} logout invalidates before preference deletion can suspend or fail`, async () => {
    const {store, dependencies} = await savedStore();
    let release, started = false;
    const gate = new Promise(resolve => {release = resolve;});
    const logout = handler(path, name, {
      AsyncStorage: {multiRemove: async () => {started = true; await gate;}},
      signOutAccount: () => store.invalidate('signed-out'),
    });
    const pending = logout();
    try {
      await new Promise(setImmediate);
      assert.equal(started, true);
      assert.equal(store.getState().snapshot, null, 'logout intent must hide the preview');
      const relaunched = createStartupSnapshotStore(dependencies);
      await relaunched.restore();
      assert.equal(relaunched.getState().snapshot, null, 'relaunch while preferences are pending must not restore the old account');
    } finally {release(); await pending;}
  });
  test(`${label} logout cannot clear preferences or report success after durable sign-out fails`, async () => {
    let removals = 0, navigations = 0;
    await handler(path, name, {
      AsyncStorage: {multiRemove: async () => {removals++;}},
      signOutAccount: async () => {throw Error('secure storage unavailable');},
      router: {replace() {navigations++;}},
    })();
    assert.equal(removals, 0);
    assert.equal(navigations, 0);
  });
}
