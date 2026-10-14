// Prioritise overdue vehicles, keeping each record in the attention list once.
export function selectServiceAttention(vehicles, limit = 5) {
  const overdue = vehicles.filter((vehicle) => vehicle.worstCode === "overdue");
  const upcoming = vehicles.filter((vehicle) => vehicle.worstCode === "due-soon");
  return [...overdue, ...upcoming].slice(0, limit);
}
