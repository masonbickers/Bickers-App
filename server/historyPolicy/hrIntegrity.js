export const HR_COLLECTIONS = new Set(['timesheets','holidays','shiftChangeRequests','sickLeave']);
// Legacy approval markers remain authoritative until a server correction.
export function hrRecordApproved(record) {
  return record.approved === true || record.isApproved === true || Boolean(record.approvedAt) || Boolean(record.approvedDate)
    || ['status','approvalStatus','holidayStatus','state'].some(field => /^(approved|accepted|certified)/i.test(String(record[field] || '').trim()));
}
export function validateHrRecordEmployee(actor, record, employee) {
  const employeeUid = employee?.authUid || employee?.uid || employee?.userId || '';
  if (!employee || !record.employeeId || employee.companyId !== actor.companyId || record.companyId !== actor.companyId || (record.ownerUid && record.ownerUid !== employeeUid)) throw Object.assign(new Error('Canonical employee ownership mismatch.'),{status:403});
  if (employeeUid && actor.employeeId === record.employeeId && actor.uid !== employeeUid && !['admin','platformAdmin'].includes(actor.role)) throw Object.assign(new Error('Canonical employee identity mismatch.'),{status:403});
}

export function canReviewHrRecord(actor, record, collection) {
  if (!actor.companyId || actor.companyId !== record.companyId) return false;
  if (['admin','platformAdmin'].includes(actor.role)) return true;
  const scope = actor.hrApprovalAccess;
  return !!actor.employeeId && actor.appAccess?.user === true && ['timesheets','holidays'].includes(collection)
    && scope?.enabled === true && scope.companyId === actor.companyId
    && Array.isArray(scope.employeeIds) && scope.employeeIds.includes(record.employeeId)
    && !!record.employeeId && !ownsHrRecord(actor, record);
}

// The approval view needs work and leave details, never embedded payroll fields.
const APPROVAL_ENTRY_FIELDS=new Set(['mode','hours','totalHours','note','notes','start','end','startTime','endTime','leaveTime','arriveBack','arriveTime','callTime','wrapTime','homeTime','finishTime','precallDuration','travelStart','travelEnd','travelDay','overnight','lunchSupplied','halfDay','startHalfDay','endHalfDay','jobNumber','jobName','bookingId','type','date','day','duration','breakMinutes','breakDeduction','workshopJobs','yardSegments','segments','entries','yardStart','yardEnd','workshopStart','workshopEnd','officeStart','officeEnd','hotelReturn','description','overallHours']);
function projectApprovalEntry(value) {
 if(Array.isArray(value))return value.map(projectApprovalEntry);
 if(!value || typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([key])=>APPROVAL_ENTRY_FIELDS.has(key)).map(([key,item])=>[key,projectApprovalEntry(item)]));
}

export function projectHrApprovalRecord(record, actor, collection) {
  if (record.companyId !== actor.companyId || (!ownsHrRecord(actor,record) && !canReviewHrRecord(actor,record,collection))) throw Object.assign(new Error('HR record access denied.'),{status:403});
  const fields=['companyId','employeeId','employeeCode','employeeName','ownerUid','weekStart','days','entries','hours','totalHours','notes','status','submitted','startDate','endDate','holidayDateKeys','startHalfDay','startAMPM','endHalfDay','endAMPM','holidayReason','paidStatus','leaveType','updatedAt'];
  return Object.fromEntries(fields.filter(field=>record[field]!==undefined).map(field=>[field,field==='days' ? Object.fromEntries(Object.entries(record[field] || {}).map(([day,entry])=>[day,projectApprovalEntry(entry)])) : field==='entries' ? projectApprovalEntry(record[field]) : record[field]]));
}

export function validateHrApprovalAssignment(actor, target, enabled, employeeIds, employees, now = new Date().toISOString()) {
  const reject = message => { throw Object.assign(new Error(message), {status:403}); };
  if (!['admin','platformAdmin'].includes(actor.role) || !actor.uid || !actor.companyId || actor.companyId !== target.companyId) reject('Company administrator required.');
  if (typeof enabled !== 'boolean' || !Array.isArray(employeeIds) || employeeIds.length > 100 || employeeIds.some(id => typeof id !== 'string' || !/^[\w-]{1,160}$/.test(id)) || new Set(employeeIds).size !== employeeIds.length) reject('Explicit employee scope required.');
  if (enabled && (!employeeIds.length || !target.uid || !target.employeeId || target.appAccess?.user !== true || target.isEnabled !== true)) reject('Enabled User workspace and employee scope required.');
  if (!enabled && employeeIds.length) reject('Disabled delegation must have an empty scope.');
  if (employeeIds.some(id => id === target.employeeId || !employees[id] || employees[id].companyId !== target.companyId || (employees[id].authUid || employees[id].uid || employees[id].userId || '') === target.uid)) reject('Delegation cannot include the manager or another company.');
  return {enabled,companyId:target.companyId,employeeIds:[...employeeIds],assignedByUid:actor.uid,assignedAt:now};
}

const EDITABLE = new Set(['draft','unsubmitted','requested','submitted','recorded','pending','reopened']);
export function ownsHrRecord(actor, record) { return record.ownerUid === actor.uid || Boolean(actor.employeeId && actor.employeeId === record.employeeId && (!record.ownerUid || record.ownerUid === actor.uid)); }
export function hrTransition(record, nextStatus, actor, {now = new Date().toISOString(), reason = '', collection = ''} = {}) {
  if (!actor.companyId || record.companyId !== actor.companyId) throw Object.assign(new Error('HR company ownership mismatch.'),{status:403});
  // Legacy holiday requests with no status are included in the HR approval queue.
  const legacyHolidayRequest = collection === 'holidays' && !String(record.status || '').trim();
  const previousStatus = legacyHolidayRequest ? 'requested' : String(record.status || 'draft').toLowerCase();
  const status = String(nextStatus || '').toLowerCase();
  const admin = ['admin','platformAdmin'].includes(actor.role);
  const reviewer = canReviewHrRecord(actor,record,collection);
  const owner = ownsHrRecord(actor, record);
  const employeeSubmit = owner && previousStatus !== 'reopened' && !hrRecordApproved(record) && EDITABLE.has(previousStatus) && ['requested','submitted'].includes(status);
  const review = reviewer && !hrRecordApproved(record) && ['requested','submitted','recorded','pending'].includes(previousStatus) && ['approved','declined'].includes(status);
  const reopen = collection === 'timesheets' && admin && hrRecordApproved(record) && status === 'reopened';
  const reapprove = collection === 'timesheets' && admin && previousStatus === 'reopened' && status === 'approved';
  if(reopen && !String(reason).trim())throw Object.assign(new Error('A reason is required to unapprove a timesheet.'),{status:400});
  const cancellation = owner && ['requested','submitted','recorded','pending','approved','certified'].includes(previousStatus) && status === 'cancellation_requested';
  const cancelReview = reviewer && (collection !== 'timesheets' || admin) && ['cancellation_requested','delete_requested','delete-requested'].includes(previousStatus) && ['cancelled','approved'].includes(status);
  if (!employeeSubmit && !review && !reopen && !reapprove && !cancellation && !cancelReview) throw Object.assign(new Error('HR transition is not permitted. Approved evidence is retained; request a change.'),{status:403});
  const previousApprovalEvidence=reopen ? Object.fromEntries(['isApproved','approvedAt','approvedDate','approvalStatus','holidayStatus','state'].filter(field=>record[field]!=null).map(field=>[field,record[field]])) : null;
  const clearedApprovalAliases=reopen ? Object.fromEntries(['isApproved','approvedDate','approvalStatus','holidayStatus','state'].filter(field=>record[field]!==undefined).map(field=>[field,field==='isApproved'?false:null])) : {};
  const event = {...(reopen ? {previousApprovalEvidence} : {}),previousStatus,newStatus:status,actorUid:actor.uid,actorEmployeeId:actor.employeeId || '',timestamp:now,reason:String(reason).slice(0,2000)};
  return {status,updatedAt:now,approvalHistory:[...(record.approvalHistory || []),event],...(review || cancelReview || reopen || reapprove ? {reviewerUid:actor.uid,decidedBy:actor.uid,decidedAt:now,approved:status === 'approved'} : {}),...(reopen ? {approvedAt:null,...clearedApprovalAliases} : {}),...(reapprove ? {approvedAt:now} : {})};
}

export function hrDraftEdit(record, patch, actor, now=new Date().toISOString()) {
  const reviewer=['admin','platformAdmin'].includes(actor.role);
  const status=String(record.status || 'draft').toLowerCase();
  const legacyUnsubmittedTimesheet=reviewer && Boolean(record.weekStart) && record.submitted===false && record.approved!==true && !record.approvedAt && !['approved','declined','cancelled'].includes(status);
  if (actor.companyId !== record.companyId || (!reviewer && !ownsHrRecord(actor,record)) || (!EDITABLE.has(status) && !legacyUnsubmittedTimesheet) || (!reviewer && status === 'reopened') || hrRecordApproved(record)) throw Object.assign(new Error('Only the owner or a company reviewer may edit pending HR records.'),{status:403});
  const allowed=new Set(['days','entries','hours','totalHours','notes','note','reason','holidayReason','startDate','endDate','startHalfDay','endHalfDay','startAMPM','endAMPM','date','startTime','finishTime','paidStatus','holidayDateKeys','payAdviceOverrides']);
  if(Object.keys(patch).some(key=>!allowed.has(key)))throw Object.assign(new Error('Protected HR fields cannot be edited.'),{status:403});
  if(patch.payAdviceOverrides !== undefined && !['admin','platformAdmin'].includes(actor.role))throw Object.assign(new Error('Payroll overrides require a company reviewer.'),{status:403});
  const paid = patch.paidStatus === undefined ? {} : {paid:patch.paidStatus === 'Paid',isPaid:patch.paidStatus === 'Paid',unpaid:patch.paidStatus === 'Unpaid',isUnpaid:patch.paidStatus === 'Unpaid'};
  return {...patch,...paid,updatedAt:now,approvalHistory:[...(record.approvalHistory || []),{previousStatus:record.status || 'draft',newStatus:record.status || 'draft',action:'edit',actorUid:actor.uid,timestamp:now}]};
}
