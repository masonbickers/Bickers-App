const SAFE_SEGMENT = /^[A-Za-z0-9._:-]+$/;

function sanitizeIssueId(value) {
  return String(value || "issue")
    .trim()
    .replace(/[^A-Za-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "issue";
}

export function maintenancePhotoPath(uid, issueId) {
  const ownerUid = String(uid || "").trim();
  if (!ownerUid || !SAFE_SEGMENT.test(ownerUid)) {
    throw new Error("A valid signed-in user is required to save an issue photo.");
  }
  return `vehicleIssues/${ownerUid}/${sanitizeIssueId(issueId)}/issue.jpg`;
}

export function selectedMaintenancePhotoUri(result) {
  if (result?.canceled) return "";
  return String(result?.assets?.[0]?.uri || "").trim();
}
