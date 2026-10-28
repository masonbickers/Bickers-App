// Office verifies the current provider/session, canonical employee and protected
// policy mirrors. Never authorize business data using a client claim or cache.
const fail = () => Object.assign(new Error('Business access is not available for this account.'), { status: 403 });
const own = (o,k) => Object.prototype.hasOwnProperty.call(o || {},k);
const map = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const title = employee => (Array.isArray(employee?.jobTitle) ? employee.jobTitle : [employee?.jobTitle]).some(v => typeof v === 'string' && ['freelance','freelancer'].includes(v.trim().toLowerCase()));

// Called again inside writes, from the same transaction's user/employee reads.
export function assertLifecyclePolicy(user, employee) {
  if (!map(user) || !map(employee)) throw fail();
  const canonical = employee.freelanceAccess;
  const mirror = user.freelanceAccess;
  const restricted = title(employee) && (canonical?.timesheets === false || canonical?.expenses === false);
  if (own(user,'jobOnlyAccess') && typeof user.jobOnlyAccess !== 'boolean' ||
      own(employee,'freelanceAccess') && (!map(canonical) || ['timesheets','expenses'].some(k => typeof canonical[k] !== 'boolean')) ||
      own(user,'freelanceAccess') && (!map(mirror) || ['timesheets','expenses'].some(k => typeof mirror[k] !== 'boolean')) ||
      restricted !== (user.jobOnlyAccess === true) ||
      ['timesheets','expenses'].some(k => canonical?.[k] !== mirror?.[k]) || title(employee) && (canonical?.timesheets === false || canonical?.expenses === false) && !restricted) throw fail();
  return restricted;
}

export function assertBusinessPolicy(user, employee) {
  if (assertLifecyclePolicy(user, employee)) throw fail();
}

const lifecycle = new Set([
  'GET /app-config', 'POST /device-tokens',
  'POST /auth/employee-setup-lookup', 'GET /auth/working-terms-acceptance',
  'POST /auth/sync-employee-auth', 'POST /auth/phone/start', 'POST /auth/phone/check',
  'POST /auth/app-password-setup', 'GET /auth/password-transition',
  'POST /auth/password-transition/email', 'POST /auth/password-transition/complete',
]);
export function createJobOnlyBusinessGate({ origin = process.env.JOB_ONLY_OFFICE_ORIGIN || process.env.AUTH_WEB_ORIGIN || process.env.RECEIPTS_WEB_ORIGIN, fetchImpl = globalThis.fetch, verifyIdToken, readCurrentUser, production = process.env.NODE_ENV === 'production' } = {}) {
  return async (req,res,next) => {
    const path = String(req.path || '').toLowerCase().replace(/\/$/,'');
    if (lifecycle.has(`${String(req.method).toUpperCase()} ${path}`)) return next();
    res.set('Cache-Control','private, no-store');
    const authorization = req.headers?.authorization;
    if (typeof authorization !== 'string' || !/^Bearer \S+$/i.test(authorization)) return res.status(401).json({error:'Sign in again.',code:'SIGN_IN_REQUIRED'});
    let base;
    try {
      base = new URL(origin || '');
      if (base.username || base.password || base.pathname !== '/' || base.search || base.hash || !['http:','https:'].includes(base.protocol) || production && base.protocol !== 'https:') throw new Error();
    } catch { return res.status(503).json({error:'Business authorization is not configured.',code:'SESSION_SERVICE_UNAVAILABLE'}); }
    try {
      const decoded = await verifyIdToken(authorization.replace(/^Bearer /i,''),true);
      const currentUser = await readCurrentUser(decoded.uid);
      if (!currentUser || currentUser.uid !== decoded.uid) return res.status(403).json({error:'Current identity could not be confirmed.',code:'BUSINESS_ACCESS_DENIED'});
      const upstream = await fetchImpl(new URL('/api/mobile/session',base).href,{method:'GET',headers:{Authorization:authorization},redirect:'error',signal:AbortSignal.timeout(15000)});
      if (!upstream.ok) return res.status([401,403].includes(upstream.status) ? upstream.status : 503).json({error:'Current business access could not be confirmed.',code:'BUSINESS_ACCESS_DENIED'});
      const session = await upstream.json();
      if (session?.version !== 1 || !map(session.identity) || typeof session.identity.uid !== 'string' || !session.identity.uid || typeof session.capabilities?.jobOnlyAccess !== 'boolean' || session.jobOnlyAccess !== session.capabilities.jobOnlyAccess || session.identity.uid !== decoded.uid || session.identity.companyId !== currentUser.companyId || (session.identity.employeeId || '') !== (currentUser.employeeId || '')) throw new Error();
      if (session.capabilities.jobOnlyAccess) return res.status(403).json({error:'Only assigned work is available for this account.',code:'JOB_ONLY_ACCESS'});
      return next();
    } catch { return res.status(503).json({error:'Business authorization is temporarily unavailable.',code:'SESSION_SERVICE_UNAVAILABLE'}); }
  };
}

// Re-read policy in the handler's transaction so a request authorized before a
// downgrade cannot commit a service write under the earlier business grant.
export async function assertTransactionBusinessPolicy({ tx, db, user, uid, token }) {
  const employeeId = user.employeeId;
  if (employeeId == null || employeeId === '') {
    if (own(user,'jobOnlyAccess') || own(user,'freelanceAccess')) throw fail();
    return; // Existing unmarked legacy service/admin accounts have no employee.
  }
  if (typeof employeeId !== 'string' || !/^[A-Za-z0-9_-]{1,180}$/.test(employeeId)) throw fail();
  const snapshot = await tx.get(db.collection('employees').doc(employeeId));
  const employee = snapshot.exists ? snapshot.data() : null;
  if (!map(employee) || employee.companyId !== user.companyId ||
      employee.isEnabled === false || employee.active === false || employee.disabled === true ||
      employee.appDisabled === true || employee.archived === true || employee.isArchived === true ||
      employee.status === 'disabled') throw fail();
  const clerk = token?.firebase?.sign_in_provider === 'custom' && token.authMethod === 'clerk';
  const links = [employee.uid,employee.authUid,employee.auth?.uid,employee.userId,
    ...(!clerk ? [employee.codeLoginUid,employee.auth?.codeLoginUid] : []),
  ].filter(value => value != null && value !== '');
  if (!links.length || links.some(value => value !== uid)) throw fail();
  assertBusinessPolicy(user,employee);
}

// Legacy code login can mint an alternate UID, so it is never a provisioning
// route for restrictive employees. Canonical provisioning remains office-owned.
export function assertLegacyEmployeeProvisionAllowed(employee, user = {}) {
  if (!map(employee) || own(employee,'jobOnlyAccess') && employee.jobOnlyAccess !== false ||
      own(user,'jobOnlyAccess') && user.jobOnlyAccess !== false ||
      [employee,user].some(record => own(record,'freelanceAccess') &&
        (!map(record.freelanceAccess) || ['timesheets','expenses'].some(k =>
          record.freelanceAccess[k] !== true)))) throw fail();
}

export function projectLifecycleResponse(payload, user, employee) {
  if (!assertLifecyclePolicy(user,employee)) return payload;
  const source = payload.employee || employee;
  const allowed = ['id','companyId','uid','authUid','name','displayName','email','userCode','jobTitle','isEnabled','active','disabled','archived','isArchived','appDisabled'];
  const safe = Object.fromEntries(allowed.filter(k => ['string','boolean'].includes(typeof source[k]) || k === 'jobTitle' && Array.isArray(source[k]) && source[k].every(v => typeof v === 'string')).map(k => [k,source[k]]));
  safe.jobOnlyAccess = true;
  safe.freelanceAccess = {timesheets:employee.freelanceAccess.timesheets,expenses:employee.freelanceAccess.expenses};
  safe.mobileAccess = Object.fromEntries(['status','approvedEmail'].filter(k => typeof source.mobileAccess?.[k] === 'string').map(k => [k,source.mobileAccess[k]]));
  const session = payload.sessionData || {};
  const safeSession = Object.fromEntries(['uid','companyId','employeeId','displayName','email','userCode'].filter(k => typeof session[k] === 'string').map(k => [k,session[k]]));
  return {employee:safe,sessionData:{...safeSession,jobOnlyAccess:true,freelanceAccess:{...safe.freelanceAccess},appAccess:{user:true,service:false},isService:false,role:'user'}};
}

export function assertDeviceRegistrationPolicy({ user, employee, uid, registrationUid, isAnonymous, userExists }) {
  const suspect = [user,employee].some(record => own(record,'jobOnlyAccess') && record.jobOnlyAccess !== false || own(record,'freelanceAccess') && (!map(record.freelanceAccess) || ['timesheets','expenses'].some(k => record.freelanceAccess[k] !== true)));
  if (!suspect) return;
  assertLifecyclePolicy(user,employee);
  const aliases = [employee.uid,employee.authUid,employee.userId,employee.auth?.uid].filter(value => value != null && value !== '');
  if (!userExists || isAnonymous || user.uid !== uid || registrationUid !== uid ||
      user.employeeId !== employee.id || user.companyId !== employee.companyId ||
      !aliases.length || aliases.some(value => value !== uid)) throw fail();
}
