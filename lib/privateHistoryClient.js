const collections=new Set(['timesheets','holidays']);
const same=(a,b)=>!!a?.uid && !!a?.companyId && !!a?.employeeId && a.uid===b?.uid && a.companyId===b.companyId && a.employeeId===b.employeeId;
export function updateHistoryCache(current,update) {
 return Array.isArray(current) ? update(current) : {...current,records:update(current?.records || [])};
}
export function createPrivateHistoryClient({getIdentity,getToken,request}) {
 async function call(path,init={}) {
  const identity=getIdentity();if(!same(identity,identity))throw Error('Your employee identity is not ready. Sign in again.');
  const token=await getToken();if(!same(identity,getIdentity()))throw Error('Your account changed. Reload your private history.');
  const result=await request(path,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
  if(!same(identity,getIdentity()))throw Error('Your account changed. Reload your private history.');
  return {result,identity};
 }
 return {
  async history(collection) {
   if(!collections.has(collection))throw Error('Unsupported private history.');
   const {result,identity}=await call(`/hr/history?collection=${collection}`);
   if(typeof result?.historyComplete!=='boolean' || !Array.isArray(result?.records) || !Number.isInteger(result.withheldCount) || result.withheldCount<0 || result.records.some(row=>row.ownerUid!==identity.uid || row.companyId!==identity.companyId || row.employeeId!==identity.employeeId || typeof row.id!=='string'))throw Error('Private history ownership could not be verified.');
   if(result.balanceVerification!==undefined && (collection!=='holidays' || !Number.isInteger(result.balanceVerification?.year) || typeof result.balanceVerification?.complete!=='boolean'))throw Error('Holiday balance verification could not be verified.');
   return result;
  },
  async cancelHoliday(record) {
   const identity=getIdentity();if(!record?.updateTime || record.ownerUid!==identity?.uid || record.companyId!==identity?.companyId || record.employeeId!==identity?.employeeId)throw Error('Private holiday ownership could not be verified.');
   const {result}=await call('/hr/records',{method:'POST',body:JSON.stringify({collection:'holidays',id:record.id,action:'cancelPendingHoliday',expectedUpdateTime:record.updateTime})});
   return result;
  },
 };
}
