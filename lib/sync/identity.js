let verifiedIdentity = null;
let verifiedEmployeeId = null;

// Bound by AuthProvider after canonical employee resolution. Firebase UID is
// checked again by callers, so a stale React session cannot adopt another user.
export function bindSyncIdentity(employee) {
  verifiedEmployeeId = employee?.employeeId || null;
  verifiedIdentity = employee?.uid && employee?.companyId
    ? { uid: employee.uid, companyId: employee.companyId }
    : null;
}

export function getSyncEmployeeIdentity(firebaseUid) {
  const identity = getSyncIdentity(firebaseUid);
  return identity && verifiedEmployeeId ? { ...identity, employeeId: verifiedEmployeeId } : null;
}

export function getSyncIdentity(firebaseUid) {
  return verifiedIdentity && verifiedIdentity.uid === firebaseUid
    ? { ...verifiedIdentity }
    : null;
}

export function sameSyncIdentity(left, right) {
  return !!left?.uid && !!left?.companyId
    && left.uid === right?.uid && left.companyId === right?.companyId;
}
