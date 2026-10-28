import { assertBusinessPolicy } from './jobOnlyBusiness.js';
import { mobilePasswordAccessAllowed } from './appPasswordSetup.js';
import { sharedBusinessSessionAllowed } from './sharedBusinessSession.mjs';

const fail = (status, message) => Object.assign(new Error(message), { status });
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 180 && value.trim() === value && !value.includes('/');
const email = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const blocked = value => !value || value.isEnabled === false || value.active === false || value.disabled === true || value.appDisabled === true || value.archived === true || value.isArchived === true || value.status === 'disabled';
const time = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// The client supplies values only. Current canonical records choose the target.
export function createTimesheetDefaultsCommand({ db, auth, sessionOptions = {} }) {
  return async function saveTimesheetDefaults(idToken, input) {
    if (typeof idToken !== 'string' || !idToken.trim()) throw fail(401, 'Sign in to save defaults.');
    let token;
    try { token = await auth.verifyIdToken(idToken, true); }
    catch { throw fail(401, 'Sign in again with your current account.'); }
    if (!identifier(token?.uid)) throw fail(401, 'Sign in again with your current account.');
    if (!input || typeof input !== 'object' || Array.isArray(input)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(input))
      || Object.keys(input).length !== 3 || Object.keys(input).some(key => !['mode', 'start', 'end'].includes(key))
      || !['yard', 'office', 'workshop'].includes(input.mode) || !time(input.start) || !time(input.end)) {
      throw fail(400, 'Supply only a valid mode, start and end in HH:mm format.');
    }
    const { mode, start, end } = input;
    return db.runTransaction(async transaction => {
      const userSnapshot = await transaction.get(db.collection('users').doc(token.uid));
      const user = userSnapshot.exists ? userSnapshot.data() : null;
      if (blocked(user) || user.uid !== token.uid || user.mobileAccessStatus !== 'active'
        || user.appAccess?.user !== true || user.featureFlags?.user === false
        || user.passwordResetRequired === true || user.appPasswordSetupRequired === true
        || user.firebasePasswordResetAfter || user.clerkPasswordResetAfter
        || !identifier(user.companyId) || !identifier(user.employeeId)
        || !mobilePasswordAccessAllowed(token, user) || !sharedBusinessSessionAllowed(token, user, sessionOptions)) {
        throw fail(403, 'Current approved employee access is required.');
      }
      const employeeRef = db.collection('employees').doc(user.employeeId);
      const employeeSnapshot = await transaction.get(employeeRef);
      const employee = employeeSnapshot.exists ? employeeSnapshot.data() : null;
      const clerk = token.firebase?.sign_in_provider === 'custom' && token.authMethod === 'clerk';
      // Clerk's canonical mobile identity uses these active links. Code-login
      // UIDs and old auth emails remain historical migration metadata.
      const links = [employee?.uid, employee?.authUid, employee?.auth?.uid,
        ...(!clerk ? [employee?.userId, employee?.codeLoginUid, employee?.auth?.codeLoginUid] : []),
      ].filter(value => value != null && value !== '');
      const verifiedEmail = email(clerk ? token.companyEmail : token.email);
      if (blocked(employee) || employeeSnapshot.id !== user.employeeId
        || employee.companyId !== user.companyId || employee.mobileAccess?.status !== 'active'
        || !links.length || links.some(value => value !== token.uid)
        || !verifiedEmail || email(employee.mobileAccess?.approvedEmail) !== verifiedEmail
        || !clerk && (user.email && email(user.email) !== verifiedEmail
          || employee.auth?.email && email(employee.auth.email) !== verifiedEmail)) {
        throw fail(403, 'The approved employee identity could not be verified.');
      }
      assertBusinessPolicy(user, employee);
      // Dot paths preserve every other mode and unrelated employee field.
      transaction.update(employeeRef, {
        timesheetDefaultType: mode,
        'timesheetDefaults.defaultType': mode,
        [`timesheetDefaults.${mode}Start`]: start,
        [`timesheetDefaults.${mode}End`]: end,
        [`${mode}StartTime`]: start,
        [`${mode}EndTime`]: end,
        [`${mode}Start`]: start,
        [`${mode}End`]: end,
      });
      return { uid: token.uid, employeeId: user.employeeId, companyId: user.companyId, defaults: { mode, start, end } };
    });
  };
}

export function createTimesheetDefaultsHandler(dependencies) {
  const command = createTimesheetDefaultsCommand(dependencies);
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const header = req.headers?.authorization;
    const match = typeof header === 'string' ? /^Bearer (\S+)$/i.exec(header) : null;
    try { return res.json(await command(match?.[1] || '', req.body)); }
    catch (error) {
      const status = [400, 401, 403].includes(error?.status) ? error.status : 503;
      return res.status(status).json({ error: status === 503 ? 'Defaults could not be saved. Please retry.' : error.message });
    }
  };
}
