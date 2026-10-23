import {ownHrEmployee,resolveHrRecordOwner} from './hrHistory.js';

export function holidayHistoryVersion(value) {
 const match=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?Z$/.exec(String(value || ''));
 return match ? `${match[1]}.${(match[2] || '').padEnd(9,'0')}Z` : null;
}

// A server-only, owner-confirmed annual review qualifies balance confidence;
// it never grants record access or changes company-wide history completeness.
export function getHolidayBalanceVerification(actor,directory,rows,review,{now=new Date(),withheldCount=0}={}) {
 ownHrEmployee(actor,directory);
 const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(now));
 const incomplete={year,complete:false};
 if(withheldCount)return incomplete;
 const unresolved=rows.filter(row=>!resolveHrRecordOwner(row,'holidays',directory) && (!row.data.companyId || row.data.companyId===actor.companyId));
 if(!unresolved.length)return {year,complete:true};
 if(!review || review.version!==1 || review.year!==year || review.ownerUid!==actor.uid || review.companyId!==actor.companyId || review.employeeId!==actor.employeeId
  || review.reviewedByUid!==actor.uid || actor.role!=='platformAdmin' || !Array.isArray(review.excludedRecords) || review.excludedRecords.length>2000
  || !Number.isFinite(Date.parse(review.reviewedAt)) || Date.parse(review.reviewedAt)>now.getTime()
  || Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(new Date(review.reviewedAt)))!==year)return incomplete;
 const versions=new Map();
 for(const item of review.excludedRecords) {
  const version=holidayHistoryVersion(item?.updateTime);
  if(typeof item?.id!=='string' || !/^[A-Za-z0-9_-]{1,160}$/.test(item.id) || !version || versions.has(item.id))return incomplete;
  versions.set(item.id,version);
 }
 return {year,complete:unresolved.every(row=>{
  const version=holidayHistoryVersion(row.updateTime);
  return !!version && versions.get(row.id)===version;
 })};
}
