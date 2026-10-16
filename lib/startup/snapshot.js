import { HOME_DAY_ICONS } from '../homeDayStatus.js';
/** Display metadata only. Never use this identity or snapshot as authorization. */
/** @typedef {{clerkUserId:string, clerkSessionId:string, uid:string, companyId:string, employeeId:string}} StartupIdentity */
/** @typedef {{id:string,dateISO:string,title:string,jobNumber:string,callTime:string,location:string}} StartupJob */
export const SNAPSHOT_MAX_AGE = 24 * 60 * 60 * 1000;
export const SNAPSHOT_MAX_BYTES = 256 * 1024;
const identityFields = ['clerkUserId', 'clerkSessionId', 'uid', 'companyId', 'employeeId'];
const jobFields = { id: 128, dateISO: 10, title: 200, jobNumber: 80, callTime: 40, location: 200 };
export const validIdentity = value => !!value && identityFields.every(key => typeof value[key] === 'string' && value[key].trim() && value[key].length <= 256);
export const identityKey = identity => validIdentity(identity) ? encodeURIComponent(JSON.stringify(identityFields.map(key => identity[key]))) : null;
export const sameIdentity = (a, b) => validIdentity(a) && validIdentity(b) && identityKey(a) === identityKey(b);
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const clip = (value, length) => typeof value === 'string' ? Array.from(value).slice(0, length).join('') : '';
export const utf8Size = value => Array.from(value).reduce((n, char) => n + (char.codePointAt(0) > 0xffff ? 4 : char.codePointAt(0) > 0x7ff ? 3 : char.codePointAt(0) > 0x7f ? 2 : 1), 0);

export function projectStartupSnapshot(input) {
  if (!validIdentity(input?.identity) || !validDate(input.selectedDateISO)) return null;
  const source = Array.isArray(input.jobs) ? input.jobs : [];
  const jobs = [];
  const seen = new Set();
  let truncated = input.truncated === true;
  for (const job of source) {
    if (!job?.id || typeof job.id !== 'string' || job.id.length > 128 || !validDate(job.dateISO)) { truncated = true; continue; }
    const key = JSON.stringify([job.id, job.dateISO]);
    if (seen.has(key)) continue;
    seen.add(key);
    if (jobs.length === 200) { truncated = true; break; }
    jobs.push(Object.fromEntries(Object.entries(jobFields).map(([field, max]) => [field, clip(job[field], max)])));
  }
  const snapshot = {
    version: 1, identity: Object.fromEntries(identityFields.map(key => [key, input.identity[key]])),
    generation: input.generation, verifiedAt: input.verifiedAt, savedAt: input.savedAt,
    route: input.route === 'schedule' ? 'schedule' : 'home', selectedDateISO: input.selectedDateISO,
    selectedJobId: jobs.some(job => job.id === input.selectedJobId && job.dateISO === input.selectedDateISO) ? input.selectedJobId : null,
    jobs, completeDates: truncated ? [] : [...new Set((input.completeDates || []).filter(validDate))].slice(0, 62), truncated,
  };
  if (input.home && typeof input.home === 'object') {
    snapshot.home = {
      name: clip(input.home.name, 200), userCode: clip(input.home.userCode, 80),
      days: [...new Map((Array.isArray(input.home.days) ? input.home.days : [])
        .filter(day => validDate(day?.dateISO) && Object.hasOwn(HOME_DAY_ICONS, day?.label))
        .map(day => [day.dateISO, { dateISO: day.dateISO, label: day.label }])).values()].slice(0, 62),
    };
  }
  while (utf8Size(JSON.stringify(snapshot)) > SNAPSHOT_MAX_BYTES && snapshot.jobs.length) {
    snapshot.jobs.pop(); snapshot.truncated = true; snapshot.completeDates = [];
  }
  if (!snapshot.jobs.some(job => job.id === snapshot.selectedJobId && job.dateISO === snapshot.selectedDateISO)) snapshot.selectedJobId = null;
  return snapshot;
}

export function validateSnapshot(value, { identity, now = Date.now() } = {}) {
  if (!value || value.version !== 1 || !Number.isInteger(value.generation) || value.generation < 1 ||
      !Number.isFinite(now) || !Number.isFinite(value.verifiedAt) || !Number.isFinite(value.savedAt) ||
      value.verifiedAt > now || value.savedAt > now || value.savedAt < value.verifiedAt ||
      now - value.verifiedAt >= SNAPSHOT_MAX_AGE || (identity && !sameIdentity(identity, value.identity))) return null;
  try {
    const projected = projectStartupSnapshot(value);
    // Stored records are already projected. Reject unexpected fields or any lossy repair.
    if (!projected || JSON.stringify(projected) !== JSON.stringify(value) || utf8Size(JSON.stringify(value)) > SNAPSHOT_MAX_BYTES) return null;
    return projected;
  } catch { return null; }
}
