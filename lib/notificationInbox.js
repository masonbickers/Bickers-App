// lib/notificationInbox.js
import { receiptNotificationIdentity } from "./receipts/navigation.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@bickers_notifications_v1";
const MAX_ITEMS = 200;
const listeners = new Set();
let writeQueue = Promise.resolve();

function enqueueWrite(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.catch(() => {});
  return result;
}

function publishInbox(list) {
  listeners.forEach((listener) => {
    try {
      listener(list);
    } catch (error) {
      console.warn("notification inbox listener failed:", error);
    }
  });
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

async function readInboxState() {
  const raw = await AsyncStorage.getItem(KEY);
  const stored = safeJsonParse(raw, []);
  // Keep old installations' inboxes when adding persistent dismissal history.
  if (Array.isArray(stored)) return { items: stored, dismissedIds: [] };
  return {
    items: Array.isArray(stored?.items) ? stored.items : [],
    dismissedIds: Array.isArray(stored?.dismissedIds) ? stored.dismissedIds : [],
  };
}

async function readInbox() {
  return (await readInboxState()).items;
}

export async function getInbox() {
  await writeQueue;
  return readInbox();
}

function inboxDisplayKey(item = {}) {
  const data = item?.data || {};
  return JSON.stringify([
    String(item?.title || "").trim().toLowerCase(),
    String(item?.body || "").trim().replace(/\s+/g, " ").toLowerCase(),
    String(data.bookingId || ""),
    String(data.holidayId || ""),
    String(data.weekStartISO || data.weekStart || ""),
    String(data.dateISO || data.jobDate || ""),
    String(data.companyId || ""),
    String(data.recipientEmployeeId || data.recipientPersonId || ""),
    String(data.recipientUid || ""),
    String(data.employeeCode || ""),
    ...receiptNotificationIdentity(data, item.id),
  ]);
}

export function collapseInboxDuplicates(list) {
  const result = [];
  const keys = new Map();

  (Array.isArray(list) ? list : []).forEach((item) => {
    const key = inboxDisplayKey(item);
    if (keys.has(key)) {
      const index = keys.get(key);
      if (item.read && !result[index].read) result[index] = { ...result[index], read: true };
      return;
    }
    keys.set(key, result.length);
    result.push(item);
  });

  return result;
}

async function persistInbox(list, dismissedIds) {
  const dismissed = dismissedIds ?? (await readInboxState()).dismissedIds;
  const trimmed = Array.isArray(list) ? list.slice(0, MAX_ITEMS) : [];
  await AsyncStorage.setItem(KEY, JSON.stringify({ items: trimmed, dismissedIds: dismissed }));
  publishInbox(trimmed);
  return trimmed;
}

export function setInbox(list) {
  return enqueueWrite(() => persistInbox(list));
}

export function subscribeToInbox(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function addToInbox(item) {
  const now = Date.now();
  const payload = {
    id: item?.id || `${now}-${Math.random().toString(16).slice(2)}`,
    title: String(item?.title || "Notification"),
    body: String(item?.body || ""),
    data: item?.data || {},
    createdAt: Number(item?.createdAt || now),
    read: !!item?.read,
  };

  return enqueueWrite(async () => {
    const { items: list, dismissedIds } = await readInboxState();
    // Server fetches and native delivered-notification reconciliation can replay
    // old IDs. A clear action acknowledges those IDs permanently on this device.
    if (dismissedIds.includes(payload.id)) return null;
    const displayKey = inboxDisplayKey(payload);
    payload.read ||= list.some((entry) => entry.read && inboxDisplayKey(entry) === displayKey);
    const existingIndex = list.findIndex((entry) => entry?.id === payload.id);
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const updated = { ...payload, createdAt: existing.createdAt, read: existing.read || payload.read };
      if (JSON.stringify(existing) !== JSON.stringify(updated)) {
        const next = list.slice();
        next[existingIndex] = updated;
        await persistInbox(next);
      }
      return updated;
    }
    const insertionIndex = list.findIndex((entry) => Number(entry.createdAt || 0) < payload.createdAt);
    const next = list.slice();
    next.splice(insertionIndex < 0 ? next.length : insertionIndex, 0, payload);
    await persistInbox(next);
    return payload;
  });
}

export async function markRead(id) {
  return enqueueWrite(async () => {
    const list = await readInbox();
    const item = list.find((n) => n.id === id);
    if (!item) return list;
    const key = inboxDisplayKey(item);
    const matches = (n) => inboxDisplayKey(n) === key;
    if (!list.some((n) => matches(n) && !n.read)) return list;
    return persistInbox(list.map((n) => (matches(n) ? { ...n, read: true } : n)));
  });
}

export async function markAllRead(matches = () => true) {
  return enqueueWrite(async () => {
    const list = await readInbox();
    if (!list.some((n) => matches(n) && !n.read)) return list;
    return persistInbox(list.map((n) => matches(n) ? { ...n, read: true } : n));
  });
}

export async function clearInbox(matches = () => true) {
  return enqueueWrite(async () => {
    const { items, dismissedIds } = await readInboxState();
    const removed = items.filter(matches);
    if (!removed.length) return items;
    return persistInbox(
      items.filter((item) => !matches(item)),
      [...new Set([...dismissedIds, ...removed.map((item) => item.id)])]
    );
  });
}
