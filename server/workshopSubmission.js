import { planWorkshopMaintenanceCompletion } from "./maintenanceRuntime.mjs";
import { createHash } from 'node:crypto';
import { classifyIdentitySession } from './identitySession.js';
import { sharedBusinessSessionAllowed } from './sharedBusinessSession.mjs';

const fields = new Set(('companyId assetType equipmentId equipmentName serialNumber vehicleId vehicleName registration manufacturer model serviceType recordType serviceDate serviceDateOnly serviceTime completedDate odometer workSummary repairSummary repairReason partsUsed extraNotes signedBy completedBy nextServiceDate nextService serviceFormNumber serviceFormNumberValue checks checkRatings checkNA checkNotes wheelInspection monitorReport serviceDefectActions checkPhotoURIs checkPhotoURLs photoURIs photoURLs workshopRequestId workshopWorkType workshopBookingVersion').split(' '));
const serviceTypes = new Set(['Full service', 'Interim service', 'Interim / minor service', 'Oil & filter change', 'Inspection only', 'Other', 'General repair']);
const admins = new Set(['admin', 'companyadmin', 'company admin', 'platformadmin', 'platform admin', 'superadmin', 'super admin']);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const text = value => String(value ?? '').trim();
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,180}$/.test(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;

export async function submitWorkshopRecord({ db, uid, token, body, now = new Date().toISOString() }) {
  if (!uid || !body || !id(body.recordId) || !body.record || Array.isArray(body.record)) throw fail('A valid workshop record is required.');
  if (body.ownerUid && body.ownerUid !== uid) throw fail('This workshop form belongs to another signed-in account.', 403);
  const kind = body.kind || 'service';
  if (!['service', 'minor', 'mot', 'defect'].includes(kind)) throw fail('Unsupported workshop submission.');
  const mot = kind === 'mot';
  const standaloneDefect = kind === 'defect';
  const allowedFields = mot ? new Set('companyId vehicleId vehicleName registration manufacturer model precheckDateTime precheckDateOnly precheckTime odometer status summary faultsFound workRecommended checks checkRatings checkNA signedBy workshopRequestId workshopWorkType workshopBookingVersion'.split(' ')) : standaloneDefect ? new Set('companyId assetType equipmentId equipmentName serialNumber vehicleId vehicleName registration location description severity priority offRoad reportedBy notes status photoURIs photoURLs'.split(' ')) : fields;
  const record = {};
  for (const [key, value] of Object.entries(body.record)) {
    if (['createdAt', 'updatedAt'].includes(key)) continue;
    if (!allowedFields.has(key)) throw fail(`Unsupported workshop field: ${key}.`);
    record[key] = value;
  }
  const repair = record.serviceType === 'General repair';
  if (!mot && !standaloneDefect && (!serviceTypes.has(record.serviceType) || repair !== (record.recordType === 'repair') && record.recordType)) throw fail('Unsupported workshop record type.');
  if (!standaloneDefect && (!date(mot ? record.precheckDateOnly : record.serviceDateOnly) || record.nextServiceDate && !date(record.nextServiceDate))) throw fail('Invalid service date.');
  if (record.odometer != null && (typeof record.odometer !== 'number' || !Number.isFinite(record.odometer) || record.odometer < 0)) throw fail('Invalid odometer.');
  if (record.vehicleId != null && !id(record.vehicleId)) throw fail('Invalid vehicle ID.');
  const assetType = record.assetType || 'vehicle';
  if (!['vehicle', 'equipment'].includes(assetType)) throw fail('Invalid asset type.');
  const equipment = assetType === 'equipment';
  if (equipment && (!(repair || standaloneDefect) || mot || kind === 'minor' || record.vehicleId || !id(record.equipmentId) || record.odometer != null)) throw fail('Select equipment for a defect or general repair without vehicle mileage.');
  if (!equipment && (record.equipmentId || record.equipmentName || record.serialNumber)) throw fail('Equipment details require an equipment asset.');
  const assetId = equipment ? record.equipmentId : record.vehicleId;
  if (!equipment && !record.vehicleId && (!(repair || standaloneDefect) || !text(record.vehicleName || record.registration))) throw fail('Select a vehicle.');
  if (!text(record.signedBy) && !repair && !standaloneDefect) throw fail('A signature is required.');
  if (!text(record.workSummary || record.repairSummary) && repair) throw fail('A repair summary is required.');
  if (kind === 'minor' && (repair || record.serviceType === 'Full service')) throw fail('Select a minor service type.');
  if (mot && !['Ready for MOT', 'Requires work before MOT', 'Do not drive – unsafe'].includes(record.status)) throw fail('Select a MOT pre-check status.');
  if (standaloneDefect && (!text(record.description) || !['Immediate', 'General'].includes(record.severity))) throw fail('A description and valid defect severity are required.');
  if (record.workshopRequestId && !id(record.workshopRequestId)) throw fail('Invalid workshop request.');
  const defects = body.defects || [];
  if (!Array.isArray(defects) || defects.length > 100 || defects.some(d => !id(d.id) || !d.data || !text(d.data.description)) || new Set(defects.map(d => d.id)).size !== defects.length) throw fail('Invalid workshop defects.');
  if ((repair || mot || standaloneDefect || kind === 'minor') && defects.length) throw fail('Repair records cannot create service-sheet defects.');
  const hashRecord = value => createHash('sha256').update(JSON.stringify(canonical({ record: value, defects, ...(kind !== 'service' ? { kind } : {}) }))).digest('hex');
  // Ownership is canonical server data. Its optional transport field must not
  // turn a retry of the same signed submission into a new write or conflict.
  const neutralRecord = { ...record };
  delete neutralRecord.companyId;
  const hash = hashRecord(neutralRecord);
  const collection = mot ? 'motPreChecks' : standaloneDefect ? 'defectReports' : 'serviceRecords';
  const recordRef = db.collection(collection).doc(body.recordId);
  return db.runTransaction(async tx => {
    const user = (await tx.get(db.collection('users').doc(uid))).data() || {};
    const companyId = text(user.companyId);
    if (token?.uid !== uid || classifyIdentitySession(token, user) === 'denied' || !sharedBusinessSessionAllowed(token, user)) throw fail('Sign in again and complete any required password recovery.', 401);
    if (!companyId || user.isEnabled !== true || user.disabled === true || user.active === false || user.appDisabled === true || user.archived === true || user.isArchived === true || user.featureFlags?.service === false || user.appPasswordSetupRequired === true || !(user.appAccess?.service === true || admins.has(text(user.role).toLowerCase()))) throw fail('Service workspace access is required.', 403);
    if (record.companyId && record.companyId !== companyId) throw fail('Record belongs to another company.', 403);
    const existing = await tx.get(recordRef);
    let previous = null;
    if (existing.exists) {
      previous = existing.data();
      // Retain pre-upgrade hashes as-is, accepting both historical encodings.
      // Actor authorization above is required even for a replay acknowledgement.
      const compatibleHashes = new Set([hash, hashRecord(record), hashRecord({ ...neutralRecord, companyId })]);
      if (previous.companyId === companyId && previous.submittedByUid === uid && compatibleHashes.has(previous.submissionHash)) return { recordId: body.recordId, replayed: true, record: previous };
      const unsigned = !previous.signedBy && !previous.signedAt && !previous.signature && !previous.signatureSvgPath && !['complete', 'completed', 'closed', 'cancelled', 'archived', 'submitted'].includes(text(previous.status).toLowerCase());
      if ((mot || standaloneDefect || body.mode !== 'update') || previous.companyId !== companyId || !unsigned || previous.submissionHash) throw fail('This record is already saved and immutable. Open a new form for further work.', 409);
    }
    const vehicleRef = assetId ? db.collection(equipment ? 'equipment' : 'vehicles').doc(assetId) : null;
    const vehicle = vehicleRef ? (await tx.get(vehicleRef)).data() : null;
    if (vehicleRef && (!vehicle || vehicle.companyId !== companyId)) throw fail('Asset belongs to another company or is unavailable.', 403);
    const requestRef = record.workshopRequestId ? db.collection('workshopRequests').doc(record.workshopRequestId) : null;
    const request = requestRef ? (await tx.get(requestRef)).data() : null;
    const workType = mot ? 'mot_precheck' : kind === 'minor' ? 'minor_service' : repair ? 'general_repair' : 'full_service';
    if (requestRef && (!request || request.companyId !== companyId || request.status !== 'open' || String(request.assetId || '') !== String(assetId || '') || (request.assetType || 'vehicle') !== assetType || request.workType !== workType || record.workshopWorkType !== workType || workType === 'full_service' && record.serviceType !== 'Full service')) throw fail('Workshop request is not open for this vehicle and form.', 409);
    const defectWrites = [];
    for (const defect of defects) {
      const ref = db.collection('defectReports').doc(defect.id);
      if ((await tx.get(ref)).exists) throw fail('Defect record already exists.', 409);
      const source = defect.data;
      defectWrites.push({ ref, data: {
        companyId, vehicleId: record.vehicleId, vehicleName: record.vehicleName || '', registration: record.registration || '',
        location: 'Service form', description: text(source.description), severity: 'Immediate', priority: 'high', offRoad: false,
        reportedBy: text(record.signedBy), reporterUid: uid, notes: text(source.notes), status: 'open', source: 'serviceForm',
        sourceRecordId: body.recordId, sourceDefectKey: text(source.sourceDefectKey), photoURIs: [], photoURLs: [], createdAt: now, updatedAt: now,
      } });
    }
    if (equipment) {
      record.equipmentName = text(vehicle.name || vehicle.equipmentName || vehicle.label) || 'Unnamed equipment';
      record.serialNumber = text(vehicle.serialNumber || vehicle.asset || vehicle.assetNumber);
      record.vehicleName = '';
      record.registration = '';
    }
    const saved = { ...(previous || {}), ...record, companyId, signedBy: text(record.signedBy) || text(user.displayName || user.name) || uid, submittedByUid: uid, submissionHash: hash, createdAt: previous?.createdAt || now, updatedAt: now };
    if (standaloneDefect) {
      delete saved.signedBy;
      Object.assign(saved, { description: text(record.description), status: 'open', reporterUid: uid, priority: record.severity === 'Immediate' ? 'high' : 'medium', offRoad: record.offRoad === true, reportedBy: text(record.reportedBy) || text(user.displayName || user.name) || uid });
    }
    let vehiclePatch = null;
    if (vehicleRef) {
      vehiclePatch = {};
      const history = {
        completedDate: record.serviceDateOnly, serviceRecordId: body.recordId,
        notes: [record.workSummary, record.extraNotes].filter(Boolean).join(' '), odometer: record.odometer ?? null,
        partsUsed: record.partsUsed || '', recordedAt: now,
      };
      if (standaloneDefect) {
        vehiclePatch.defects = [...(Array.isArray(vehicle.defects) ? vehicle.defects : []), { ...saved, defectReportId: body.recordId }];
      } else if (mot) {
        const latestPrecheck = text(vehicle.motPrecheckDate).slice(0, 10);
        if (!date(latestPrecheck) || latestPrecheck <= record.precheckDateOnly) Object.assign(vehiclePatch, { motPrecheckStatus: record.status, motPrecheckDate: record.precheckDateTime, preChecks: { checks: record.checks || {}, checkRatings: record.checkRatings || {}, checkNA: record.checkNA || {} }, preChecksSummary: record.summary || '', preChecksNotes: [record.faultsFound, record.workRecommended].filter(Boolean).join(' ') });
      } else if (repair) {
        vehiclePatch.repairHistory = [...(Array.isArray(vehicle.repairHistory) ? vehicle.repairHistory : []), { ...history, type: 'General repair', repairRecordId: body.recordId, completedBy: saved.signedBy }];
        if (!vehicle.lastRepair?.date || vehicle.lastRepair.date <= record.serviceDateOnly) vehiclePatch.lastRepair = { date: record.serviceDateOnly, summary: record.repairSummary || record.workSummary, serviceRecordId: body.recordId };
      } else {
        vehiclePatch.serviceHistory = [...(Array.isArray(vehicle.serviceHistory) ? vehicle.serviceHistory : []), { ...history, serviceFormNumber: record.serviceFormNumber || '' }];
        const latestService = [vehicle.lastService, vehicle.lastServiceDate].map(value => text(value).slice(0, 10)).filter(date).sort().at(-1);
        if (!latestService || latestService <= record.serviceDateOnly) {
          Object.assign(vehiclePatch, { lastService: record.serviceDateOnly, lastServiceDate: record.serviceDateOnly });
          if (record.nextServiceDate) Object.assign(vehiclePatch, { nextService: record.nextServiceDate, nextServiceDate: record.nextServiceDate, serviceDueDate: record.nextServiceDate });
        }
      }
      const oldOdo = Math.max(0, ...[vehicle.odometer, vehicle.mileage, vehicle.serviceOdometer].map(Number).filter(Number.isFinite));
      if (!equipment && record.odometer != null && (!Number.isFinite(oldOdo) || record.odometer >= oldOdo)) Object.assign(vehiclePatch, { odometer: record.odometer, mileage: record.odometer, serviceOdometer: record.odometer });
      if (defectWrites.length) vehiclePatch.defects = [...(Array.isArray(vehicle.defects) ? vehicle.defects : []), ...defectWrites.map(d => ({ ...d.data, defectReportId: d.ref.id }))];
    }
    const maintenanceWrites = request?.sourceMaintenanceBookingId
      ? await planWorkshopMaintenanceCompletion({ db, tx, request, requestId: record.workshopRequestId,
          record: saved, recordId: body.recordId, formCollection: collection, uid, user, now, vehiclePatch })
      : [];
    // All reads, including recurrence/counters, finish before the first write.
    tx.set(recordRef, saved);
    for (const defect of defectWrites) tx.set(defect.ref, defect.data);
    if (vehicleRef && vehiclePatch && Object.keys(vehiclePatch).length) tx.update(vehicleRef, vehiclePatch);
    for (const write of maintenanceWrites) {
      const ref = db.collection(write.collection).doc(write.documentId);
      if (write.exists === false) tx.create(ref, write.patch);
      else tx.update(ref, write.patch);
    }
    if (requestRef) tx.update(requestRef, { status: 'completed', formCollection: collection, formRecordId: body.recordId, completedBy: saved.signedBy, completedAt: now, updatedAt: now });
    const canonicalVehiclePatch = maintenanceWrites.find(write => write.collection === 'vehicles' && write.documentId === record.vehicleId)?.patch;
    const finalAssetPatch = { ...vehiclePatch, ...canonicalVehiclePatch };
    return { recordId: body.recordId, replayed: false, record: saved, vehiclePatch: equipment ? null : finalAssetPatch, assetPatch: finalAssetPatch };
  });
}

export function createWorkshopSubmissionHandler({ db, verifyIdToken }) {
  return async (req, res) => {
    const token = /^Bearer (\S+)$/i.exec(String(req.headers.authorization || ''))?.[1];
    if (!token) return res.status(401).json({ error: 'Sign in to submit workshop work.' });
    try {
      const decoded = await verifyIdToken(token, true);
      if (decoded.firebase?.sign_in_provider === 'anonymous') return res.status(403).json({ error: 'Sign in with your approved account.' });
      const result = await submitWorkshopRecord({ db, uid: decoded.uid, token: decoded, body: req.body });
      res.set('Cache-Control', 'private, no-store');
      return res.json(result);
    } catch (error) {
      return res.status(error.status || (String(error.code || '').startsWith('auth/') ? 401 : 500)).json({ error: error.status ? error.message : 'Workshop submission could not be confirmed. Retry the same saved form.' });
    }
  };
}
