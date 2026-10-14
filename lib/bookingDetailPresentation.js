import { formatDateDDMMYYYY } from "./dateFormat.js";
import { getBookingVehicleReferences, getVehicleDisplayList } from "./fleetSchema.js";
const text = (...values) => values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
const people = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .map((person) => typeof person === "string" ? person : text(person?.name, person?.label, person?.employeeName)).filter(Boolean).join("\n");
export function bookingDetailRows(booking) {
  const start = formatDateDDMMYYYY(booking.startDate || booking.date);
  const end = formatDateDDMMYYYY(booking.endDate);
  const dates = Array.isArray(booking.dates) ? booking.dates.map(formatDateDDMMYYYY).filter(Boolean).join(", ") : "";
  return [
    { label: "Client", value: text(booking.client, booking.customerName), icon: "briefcase" },
    { label: "Dates", value: start ? end && end !== start ? `${start} → ${end}` : start : dates, icon: "calendar" },
    { label: "Call time", value: text(booking.callTime, booking.calltime, booking.call_time), icon: "clock" },
    { label: "Location", value: text(booking.location, booking.locationName, booking.address), icon: "map-pin" },
    { label: "Crew", value: people(booking.employees || booking.crew), icon: "users" },
    { label: "Vehicles", value: getVehicleDisplayList(getBookingVehicleReferences(booking)).join("\n"), icon: "truck" },
    { label: "Reference / PO", value: text(booking.purchaseOrder, booking.poNumber, booking.bookingReference, booking.reference), icon: "file-text" },
    { label: "Notes", value: text(booking.notes, booking.note, booking.description), icon: "align-left" },
  ].filter((row) => row.value);
}
