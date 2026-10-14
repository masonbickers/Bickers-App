const ALLOWED_WORK_DIARY_CODES = new Set([
  "2996", "9453", "3514", "1906", "6978", "9759",
]);
const ALLOWED_WORK_DIARY_EMAILS = new Set(["max@bickers.co.uk"]);

// Use Firebase Auth email and linked Firestore profiles, never local storage identity.
export function resolveWorkDiaryAccess({ firebaseUid, firebaseEmail, userProfile, employeeProfile }) {
  if (!firebaseUid || !userProfile || !employeeProfile) return false;
  if (userProfile.id !== firebaseUid || userProfile.employeeId !== employeeProfile.id) return false;
  if (userProfile.mobileAccessStatus !== "active" || employeeProfile.mobileAccess?.status !== "active") return false;
  for (const profile of [userProfile, employeeProfile]) {
    if (profile.isEnabled === false || profile.active === false || profile.disabled === true || profile.appDisabled === true || profile.archived === true || profile.isArchived === true) return false;
  }
  return ALLOWED_WORK_DIARY_CODES.has(String(employeeProfile.userCode || "").trim())
    || ALLOWED_WORK_DIARY_EMAILS.has(String(firebaseEmail || "").trim().toLowerCase());
}

export function getWorkDiaryRedirect({ loading, isAuthed, workingTermsAccepted, employee }) {
  if (loading) return null;
  if (!isAuthed) return "/(auth)/login";
  if (!workingTermsAccepted) return "/(protected)/working-terms";
  if (employee?.workDiaryAccess === true) return null;
  return employee?.appAccess?.service && !employee?.appAccess?.user
    ? "/(protected)/service/home"
    : "/(protected)/screens/homescreen";
}
