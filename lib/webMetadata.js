const pageNames = {
  login: "Sign in", about: "About", help: "Help Centre", settings: "Settings",
  homescreen: "Home", schedule: "Schedule", job: "Jobs", bookings: "Bookings",
  me: "My account", contacts: "Contacts", "edit-profile": "Edit profile",
  timesheet: "Timesheets", "add-timesheet": "Add timesheet", week: "Weekly timesheet",
  holidaypage: "Holidays", "holiday-request": "Request holiday", expenses: "Expenses",
  receipts: "Receipts", "working-terms": "Working terms", notifications: "Notifications",
  notification: "Notification", "spec-sheets": "Spec sheets", insurance: "Insurance",
  maintenance: "Maintenance", "work-diary": "Work diary", "work-diary-board": "Work diary board",
  "recce-form": "Recce", "vehicle-check": "Vehicle check", "vehicle-prep": "Vehicle preparation",
  "document-viewer": "Document viewer", uploader: "Upload documents", work: "Work",
  service: "Workshop", home: "Workshop home", vehicles: "Vehicles", defects: "Defects",
  issues: "Issues", "book-work": "Book workshop work", "service-list": "Workshop jobs",
  "service-history": "Service history", "service-record": "Service record",
  "service-form": "Service", "minor-service": "Minor service", "mot-precheck": "MOT precheck",
  "daily-check": "Daily vehicle check", "defect-form": "Report defect", "repair-form": "Repair",
  "tyre-brake-check": "Tyre and brake check", inspections: "Inspections",
  "inspection-form": "Inspection", "resolved-defects": "Resolved defects",
  advisories: "Advisories", "equipment-list": "Equipment", "activity-history": "Activity history",
  "vehicle-timeline": "Vehicle history", "file-viewer": "File viewer", query: "Enquiry",
};

export function getWebMetadata(pathname = "/", webOrigin = "") {
  const parts = String(pathname).split(/[/?#]/).filter(Boolean);
  const page = parts.map((part) => pageNames[part]).filter(Boolean).at(-1);
  let image = null;
  try {
    const url = new URL(webOrigin);
    if (url.protocol === "https:" && !url.username && !url.password &&
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      image = new URL("/social-preview.png", url.origin).href;
    }
  } catch {}
  return {
    title: page ? `${page} | Bickers` : "Bickers",
    description: "Bickers Action employee app for bookings, timesheets, holidays and workshop operations.",
    robots: "noindex, nofollow",
    image,
  };
}
