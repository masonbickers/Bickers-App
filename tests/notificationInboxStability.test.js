import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../lib/notificationInbox.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "")
  .replaceAll("export ", "");

function createInbox(storage = new Map()) {
  let writes = 0;
  const AsyncStorage = {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value); writes += 1; },
    removeItem: async (key) => { storage.delete(key); writes += 1; },
  };
  const load = new Function("AsyncStorage", "receiptNotificationIdentity", `${source}\nreturn { addToInbox, getInbox, markRead, markAllRead, clearInbox, collapseInboxDuplicates, subscribeToInbox };`);
  return { ...load(AsyncStorage, () => []), storage, writes: () => writes };
}

test("background fetch of existing notifications keeps row order and does not republish", async () => {
  const inbox = createInbox();
  await inbox.addToInbox({ id: "older", title: "Older", createdAt: 100 });
  await inbox.addToInbox({ id: "newer", title: "Newer", createdAt: 200 });
  const writes = inbox.writes();
  await inbox.addToInbox({ id: "older", title: "Older", createdAt: 100 });
  assert.deepEqual((await inbox.getInbox()).map((item) => item.id), ["newer", "older"]);
  assert.equal(inbox.writes(), writes);
});

test("cleared notifications stay dismissed after background sync and an app restart", async () => {
  const inbox = createInbox();
  const old = { id: "web:old", title: "Booking updated", data: { employeeCode: "9453" } };
  await inbox.addToInbox(old);
  const published = [];
  inbox.subscribeToInbox((items) => published.push(items));
  await inbox.clearInbox();
  await inbox.addToInbox(old);
  assert.deepEqual(await inbox.getInbox(), []);
  assert.deepEqual(published, [[]]);
  const restarted = createInbox(inbox.storage);
  await restarted.addToInbox(old);
  await restarted.addToInbox({ ...old, id: "web:new" });
  assert.deepEqual((await restarted.getInbox()).map((item) => item.id), ["web:new"]);
});

test("account clear removes only that account and does not lose a queued new notification", async () => {
  const inbox = createInbox();
  await inbox.addToInbox({ id: "mine", data: { employeeCode: "9453" } });
  await inbox.addToInbox({ id: "other", data: { employeeCode: "1234" } });
  await Promise.all([
    inbox.addToInbox({ id: "new", data: { employeeCode: "1234" } }),
    inbox.clearInbox((item) => item.data.employeeCode === "9453"),
    inbox.addToInbox({ id: "mine", data: { employeeCode: "9453" } }),
  ]);
  assert.deepEqual((await inbox.getInbox()).map((item) => item.id).sort(), ["new", "other"]);
});

test("opening a collapsed notification reads its duplicates without reading another account", async () => {
  const inbox = createInbox();
  const shared = { title: "Booking updated", body: "Crew changed", data: { bookingId: "9212", employeeCode: "9453" } };
  await inbox.addToInbox({ ...shared, id: "push", createdAt: 200 });
  await inbox.addToInbox({ ...shared, id: "web", createdAt: 100 });
  await inbox.addToInbox({ ...shared, id: "other", data: { ...shared.data, employeeCode: "1234" } });
  await inbox.markRead("push");
  await inbox.addToInbox({ ...shared, id: "web", createdAt: 300 });
  const items = await inbox.getInbox();
  assert.deepEqual(items.filter((item) => !item.read).map((item) => item.id), ["other"]);
});

test("collapsed duplicates preserve an existing read acknowledgement regardless of row order", () => {
  const inbox = createInbox();
  const shared = { title: "Booking updated", data: { bookingId: "9212", employeeCode: "9453" } };
  const items = inbox.collapseInboxDuplicates([
    { ...shared, id: "new", read: false },
    { ...shared, id: "old", read: true },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].read, true);
});

test("mark all read is scoped and includes notifications queued before the action", async () => {
  const inbox = createInbox();
  await inbox.addToInbox({ id: "other", data: { employeeCode: "1234" } });
  await Promise.all([
    inbox.addToInbox({ id: "mine", data: { employeeCode: "9453" } }),
    inbox.markAllRead((item) => item.data.employeeCode === "9453"),
  ]);
  assert.deepEqual((await inbox.getInbox()).filter((item) => !item.read).map((item) => item.id), ["other"]);
});

test("legacy inbox contents and read states survive the first dismissal", async () => {
  const storage = new Map([["@bickers_notifications_v1", JSON.stringify([
    { id: "read", title: "Old", read: true, data: {} },
    { id: "unread", title: "New", read: false, data: {} },
  ])]]);
  const inbox = createInbox(storage);
  await inbox.clearInbox((item) => item.id === "unread");
  const restarted = createInbox(storage);
  await restarted.addToInbox({ id: "unread", title: "New" });
  assert.deepEqual((await restarted.getInbox()).map((item) => [item.id, item.read]), [["read", true]]);
});

test("fetch and realtime writes merge by ID and preserve read state", async () => {
  const inbox = createInbox();
  await Promise.all([
    inbox.addToInbox({ id: "same", title: "First", createdAt: 100 }),
    inbox.addToInbox({ id: "same", title: "First", createdAt: 100 }),
    inbox.addToInbox({ id: "other", title: "Second", createdAt: 200 }),
  ]);
  await inbox.markRead("same");
  await inbox.addToInbox({ id: "same", title: "First", createdAt: 300 });
  assert.deepEqual((await inbox.getInbox()).map((item) => [item.id, item.read]), [
    ["other", false], ["same", true],
  ]);
});
