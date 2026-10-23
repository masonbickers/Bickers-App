import {canReviewHrRecord,projectHrApprovalRecord,hrRecordApproved} from './hrIntegrity.js';

const ID_FIELDS=['employeeId','employeeDocId','staffId'];
const UID_FIELDS=['ownerUid','authUid','employeeUid','uid','userId'];
const CODE_FIELDS=['employeeCode','userCode','staffCode','code'];
const value=v=>typeof v==='string' && v.trim() && !/[\s/]/.test(v) ? v : null;
const values=(data,fields)=>fields.filter(k=>data[k]!=null && data[k]!=='').map(k=>value(data[k]));
const codes=data=>values(data,CODE_FIELDS);
export function canonicalHrEmployeeUid(data) {
  const uids=values(data,['authUid','uid','userId']);
  if(uids.includes(null) || new Set(uids).size>1)return null;
  return uids[0] || '';
}
function weeklyCode(row,collection) {
  if(collection!=='timesheets')return '';
  const match=/^([^/\s]+)_([0-9]{4}-[0-9]{2}-[0-9]{2})$/.exec(row.id || '');
  if(!match)return '';
  if(row.data.weekStart!=null && row.data.weekStart!==match[2])return null;
  return match[1];
}

// Directory includes archived and foreign employees. Names, email and actors
// are never ownership evidence. The caller must provide a complete snapshot.
export function resolveHrRecordOwner(row,collection,directory) {
  const data=row.data || {},ids=values(data,ID_FIELDS),uids=values(data,UID_FIELDS),recordCodes=codes(data);
  const pathCode=weeklyCode(row,collection);
  if(pathCode===null || [...ids,...uids,...recordCodes].includes(null))return null;
  if(pathCode)recordCodes.push(pathCode);
  let candidates=directory;
  if(ids.length)candidates=candidates.filter(e=>ids.every(id=>e.id===id));
  if(uids.length)candidates=candidates.filter(e=>uids.every(uid=>canonicalHrEmployeeUid(e.data)===uid));
  if(recordCodes.length)candidates=candidates.filter(e=>recordCodes.every(code=>codes(e.data).includes(code)));
  if(!ids.length && !uids.length && !recordCodes.length)return null;
  // A strong ID disambiguates a reused weak code, but code-only records do not.
  if(candidates.length!==1)return null;
  const employee=candidates[0],uid=canonicalHrEmployeeUid(employee.data);
  if(uid===null || !value(employee.id) || !value(employee.data.companyId))return null;
  if(uid && directory.filter(e=>canonicalHrEmployeeUid(e.data)===uid).length!==1)return null;
  if(data.companyId!=null && data.companyId!=='' && data.companyId!==employee.data.companyId)return null;
  return employee;
}

export function ownHrEmployee(actor,directory) {
  const employee=directory.find(e=>e.id===actor.employeeId);
  const uid=employee && canonicalHrEmployeeUid(employee.data);
  if(!value(actor.uid) || !value(actor.companyId) || (actor.appAccess?.user!==true && !['admin','platformAdmin'].includes(actor.role)) || !employee || employee.data.companyId!==actor.companyId || uid===null || (uid && uid!==actor.uid) || (uid && directory.filter(e=>canonicalHrEmployeeUid(e.data)===uid).length!==1))throw Object.assign(Error('Canonical employee identity requires reconciliation.'),{status:409});
  return employee;
}
export async function assertOwnHrAccountLink(snapshot,actor,employee,directory) {
  ownHrEmployee(actor,directory);
  if(canonicalHrEmployeeUid(employee.data)==='') {
    const users=await snapshot.queryDocuments('users','employeeId',employee.id);
    if(users.length!==1 || users[0].id!==actor.uid || users[0].data.uid!==actor.uid || users[0].data.companyId!==actor.companyId)throw Object.assign(Error('Canonical employee link requires reconciliation.'),{status:409});
  }
}
const canonical=(row,employee)=>({...row.data,companyId:employee.data.companyId,employeeId:employee.id,ownerUid:canonicalHrEmployeeUid(employee.data) || '',employeeCode:row.data.employeeCode || employee.data.userCode || employee.data.employeeCode || employee.data.code || '',id:row.id,updateTime:row.updateTime});
const touches=(row,employee,collection)=>{
  const data=row.data || {};
  return values(data,ID_FIELDS).includes(employee.id) || values(data,UID_FIELDS).includes(canonicalHrEmployeeUid(employee.data)) || codes(data).some(code=>codes(employee.data).includes(code)) || codes(employee.data).includes(weeklyCode(row,collection));
};
export function selectHrHistory(actor,collection,directory,rows) {
  if(!['timesheets','holidays'].includes(collection))throw Object.assign(Error('Private history collection not supported.'),{status:400});
  const own=ownHrEmployee(actor,directory);let withheldCount=0;const records=[];
  for(const row of rows) {
    const employee=resolveHrRecordOwner(row,collection,directory);
    if(employee?.id===own.id)records.push({...canonical(row,employee),ownerUid:actor.uid});
    else if(!employee && touches(row,own,collection))withheldCount++;
  }
  const unresolvedRelevant=rows.some(row=>!resolveHrRecordOwner(row,collection,directory) && (!row.data.companyId || row.data.companyId===actor.companyId));
  return {records,withheldCount,historyComplete:withheldCount===0 && !unresolvedRelevant};
}
export function reviewHrEmployees(actor,directory) {
  if(!value(actor.uid) || !value(actor.companyId))throw Object.assign(Error('Company review access required.'),{status:403});
  if(['admin','platformAdmin'].includes(actor.role))return directory.filter(e=>e.data.companyId===actor.companyId);
  ownHrEmployee(actor,directory);
  const scope=actor.hrApprovalAccess;
  if(scope?.enabled!==true || scope.companyId!==actor.companyId || !Array.isArray(scope.employeeIds) || !scope.employeeIds.length || scope.employeeIds.length>100 || new Set(scope.employeeIds).size!==scope.employeeIds.length)throw Object.assign(Error('Assigned employee review access required.'),{status:403});
  const employees=scope.employeeIds.map(id=>directory.find(e=>e.id===id));
  if(employees.some(e=>!e || e.data.companyId!==actor.companyId || e.id===actor.employeeId || canonicalHrEmployeeUid(e.data)===actor.uid || canonicalHrEmployeeUid(e.data)===null))throw Object.assign(Error('Assigned employee identity requires reconciliation.'),{status:409});
  return employees;
}
export function selectHrReviews(actor,collection,directory,rows) {
  if(!['timesheets','holidays'].includes(collection))throw Object.assign(Error('Review collection not supported.'),{status:400});
  const assigned=reviewHrEmployees(actor,directory);let withheldCount=0;const records=[];
  for(const row of rows) {
    const employee=resolveHrRecordOwner(row,collection,directory);
    if(!employee) {if(assigned.some(e=>touches(row,e,collection)))withheldCount++;continue;}
    const record=canonical(row,employee);
    if(assigned.some(e=>e.id===employee.id) && canReviewHrRecord(actor,record,collection))records.push({...projectHrApprovalRecord(record,actor,collection),id:row.id,updateTime:row.updateTime,approved:hrRecordApproved(record),canApprove:!hrRecordApproved(record) && ['requested','submitted','recorded','pending'].includes(String(record.status || (collection==='holidays'?'requested':'draft')).toLowerCase())});
  }
  return {records,withheldCount};
}

// Read candidates using exact authoritative identities, then resolve every row.
// Query results alone never confer authority. All queries share a read snapshot.
export async function collectHrCandidates(snapshot,collection,employees,directory=employees) {
  // A complete identity-only catalog also detects unassignable legacy records.
  // Zero matches in the indexed queries is not proof of complete leave history.
  const fields=['companyId',...ID_FIELDS,...UID_FIELDS,...CODE_FIELDS,'weekStart'];
  const metadata=await snapshot.queryDocuments(collection,null,null,fields),rows=[];
  const selected=new Set(employees.map(e=>e.id));
  for(const row of metadata) {
    const owner=resolveHrRecordOwner(row,collection,directory);
    rows.push(owner && selected.has(owner.id) ? await snapshot.readDocument(collection,row.id) : row);
  }
  return rows.filter(Boolean);
}
