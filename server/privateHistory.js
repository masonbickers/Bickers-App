import { classifyIdentitySession } from './historyPolicy/identitySession.js';
import { ownHrEmployee, assertOwnHrAccountLink, collectHrCandidates, selectHrHistory } from './historyPolicy/hrHistory.js';
import { getHolidayBalanceVerification } from './historyPolicy/holidayBalanceVerification.js';

const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const denied = () => Object.assign(new Error('Sign in again to verify your private history.'), {status:401});

// The Firebase signature/revocation check precedes this fresh canonical snapshot.
// Clerk leases use the same server-owned mirror enforced by Firestore rules.
function historyActor(token, user, now) {
  const kind = classifyIdentitySession(token, user);
  if (kind === 'denied' || !identifier(user.companyId) || !identifier(user.employeeId)) throw denied();
  if (kind === 'clerk') {
    const lease = user.clerkSessionLeases?.[token.clerkSessionId];
    if (token.clerkLeaseVersion !== 1 || user.clerkLeaseRequired !== true || !lease
      || lease.status !== 'active' || lease.uid !== token.uid || lease.companyId !== user.companyId
      || lease.clerkUserId !== token.clerkUserId || lease.clerkSessionId !== token.clerkSessionId
      || !Number.isFinite(lease.sessionCreatedAt) || lease.sessionCreatedAt <= (user.sessionValidAfter ?? 0)
      || !Number.isFinite(lease.validUntilMs) || lease.validUntilMs <= now) throw denied();
  } else if (user.mobileAccessStatus !== 'active') throw denied();
  const rawRole=String(user.role || '').toLowerCase();
  const role=rawRole==='platformadmin'?'platformAdmin':rawRole==='admin'?'admin':'user';
  if (user.appAccess?.user !== true && !['admin','platformAdmin'].includes(role)) throw Object.assign(denied(),{status:403});
  return {...user,uid:token.uid,role};
}

export function createPrivateHistoryHandler({verifyIdToken,withSnapshot,now=Date.now}) {
  return async (req,res) => {
    res.set('Cache-Control','private, no-store');
    const authorization=req.headers?.authorization || '';
    if (!/^Bearer \S+$/.test(authorization)) return res.status(401).json({error:'Sign in again.'});
    const collection=req.query?.collection;
    if (!['holidays','timesheets'].includes(collection) || Object.keys(req.query).some(k=>k!=='collection')) return res.status(400).json({error:'Invalid private history request.'});
    let token;
    try { token=await verifyIdToken(authorization.slice(7),true); if(!identifier(token?.uid))throw denied(); }
    catch { return res.status(401).json({error:'Sign in again.'}); }
    try {
      const result=await withSnapshot(async snapshot=>{
        const profile=await snapshot.readDocument('users',token.uid);
        const actor=historyActor(token,profile?.data || {},now());
        const directory=await snapshot.queryDocuments('employees');
        const employee=ownHrEmployee(actor,directory);
        if (employee.data.isEnabled===false || employee.data.active===false || employee.data.disabled===true || employee.data.appDisabled===true || employee.data.archived===true || employee.data.isArchived===true) throw denied();
        await assertOwnHrAccountLink(snapshot,actor,employee,directory);
        const rows=await collectHrCandidates(snapshot,collection,[employee],directory);
        const history=selectHrHistory(actor,collection,directory,rows);
        if(collection==='holidays') {
          const date=new Date(now());
          const year=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric'}).format(date));
          const review=await snapshot.readDocument('holidayBalanceReviews',`${actor.companyId}_${actor.employeeId}_${year}`);
          history.balanceVerification=getHolidayBalanceVerification(actor,directory,rows,review?.data,{now:date,withheldCount:history.withheldCount});
        }
        return history;
      });
      return res.json(result);
    } catch(error) {
      const status=[401,403,409].includes(error.status)?error.status:503;
      return res.status(status).json({error:status===409?'Canonical employee identity requires reconciliation.':status===503?'Private history is temporarily unavailable. Retry.':'Sign in again to verify your private history.'});
    }
  };
}

// Firestore Admin read-only transactions keep account, directory and record
// ownership consistent. Reads never update records, leases or review markers.
function timestampString(value) {
  return new Date(value.seconds * 1000).toISOString().replace(/\.000Z$/, `.${String(value.nanoseconds).padStart(9,'0')}Z`);
}
function historyJson(value) {
  if(value && typeof value.toDate==='function' && Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds)) return timestampString(value);
  if(value instanceof Date) return value.toISOString();
  if(Array.isArray(value)) return value.map(historyJson);
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,historyJson(item)]));
  return value;
}
export function createHistorySnapshotRunner(db) {
  return callback=>db.runTransaction(async transaction=>{
    const row=document=>document?.exists?{id:document.id,data:historyJson(document.data()),updateTime:timestampString(document.updateTime)}:null;
    return callback({
      async readDocument(collection,id) { return row(await transaction.get(db.collection(collection).doc(id))); },
      async queryDocuments(collection,field=null,value=null,fields=null) {
        let query=db.collection(collection);
        if(field) query=query.where(field,'==',value);
        if(fields) query=query.select(...fields);
        const result=await transaction.get(query);
        return result.docs.map(row);
      },
    });
  },{readOnly:true});
}
