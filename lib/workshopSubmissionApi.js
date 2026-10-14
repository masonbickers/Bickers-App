import NetInfo from '@react-native-community/netinfo';
import { auth } from '../firebaseConfig';
import { getApiBaseUrl } from './api';
import { fetchWithServiceWakeRetry } from './serviceRetry';
import { createWorkshopSubmissionTransport } from './workshopSubmissionTransport';
import { enqueueOutboxMutation } from './sync/outbox';
import { getSyncIdentity } from './sync/identity';
import { isTransientNetworkError } from './sync/errors';

export const sendWorkshopSubmission = createWorkshopSubmissionTransport({
  getBaseUrl: () => getApiBaseUrl('Workshop service'),
  getToken: async payload => {
    if (payload.ownerUid !== auth.currentUser?.uid) throw Object.assign(new Error('Sign in with the account that saved this workshop form.'), { code: 'permission-denied' });
    return auth.currentUser?.getIdToken();
  },
  fetchImpl: async (url, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try { return await fetchWithServiceWakeRetry(url, { ...init, signal: controller.signal }); }
    catch (error) { throw Object.assign(new Error(error.name === 'AbortError' ? 'Workshop service timeout.' : error.message), { code: 'unavailable' }); }
    finally { clearTimeout(timeout); }
  },
});

export async function submitOrQueueWorkshopRecord(payload) {
  const originalIdentity = getSyncIdentity(auth.currentUser?.uid);
  const submission = { ...payload, ownerUid: auth.currentUser?.uid };
  if (!submission.ownerUid) throw new Error('Sign in to submit workshop work.');
  const queue = async () => {
    await enqueueOutboxMutation({ target: 'workshop', operation: 'submit', data: submission, entityType: 'serviceRecord', entityId: payload.recordId }, originalIdentity);
    return { queued: true };
  };
  let network;
  try { network = await NetInfo.fetch(); } catch { /* Attempt the service if connectivity cannot be read. */ }
  if (network?.isConnected === false || network?.isInternetReachable === false) return queue();
  try { return { ...await sendWorkshopSubmission(submission), queued: false }; }
  catch (error) { if (isTransientNetworkError(error)) return queue(); throw error; }
}
