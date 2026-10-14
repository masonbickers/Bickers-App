function notificationGroupLabel(ts, now) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const dayDifference = Math.round((today.getTime() - day.getTime()) / 86400000);

  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";
  if (dayDifference <= 7) return "Last 7 days";
  return "Earlier";
}

// Group by label rather than adjacent items: remote and local events can interleave.
export function groupNotificationItems(items, now = Date.now()) {
  const groups = new Map();
  for (const item of items) {
    const label = notificationGroupLabel(item.createdAt, now);
    if (!groups.has(label)) groups.set(label, { label, items: [] });
    groups.get(label).items.push(item);
  }
  return ["Today", "Yesterday", "Last 7 days", "Earlier"]
    .filter((label) => groups.has(label))
    .map((label) => groups.get(label));
}
