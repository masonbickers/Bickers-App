import {auth} from '../firebaseConfig';
import {getApiBaseUrl} from './api';
import {getSyncEmployeeIdentity} from './sync/identity';
import {createPrivateHistoryClient} from './privateHistoryClient';
function employeeClient(user,employee) {
 return createPrivateHistoryClient({
  getIdentity:()=>{
   const current=getSyncEmployeeIdentity(auth.currentUser?.uid);
   return current?.uid===employee?.uid && current?.companyId===employee?.companyId && current?.employeeId===employee?.employeeId ? current : null;
  },
  getToken:()=>user.getIdToken(),
  request:async(path,init)=>{
   const response=await fetch(`${getApiBaseUrl('Private employee history')}${path}`,{...init,signal:AbortSignal.timeout(45000)});
   const body=await response.json();if(!response.ok)throw Object.assign(Error(body?.error || 'Private employee history is unavailable.'),{status:response.status});return body;
  },
 });
}
export const fetchEmployeeHistory=(user,employee,collection)=>employeeClient(user,employee).history(collection);
export const cancelEmployeeHoliday=(user,employee,record)=>employeeClient(user,employee).cancelHoliday(record);
