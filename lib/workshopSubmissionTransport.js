export function createWorkshopSubmissionTransport({ getBaseUrl, getToken, fetchImpl }) {
  return async payload => {
    const token = await getToken(payload);
    if (!token) throw Object.assign(new Error('Sign in to submit workshop work.'), { code: 'unauthenticated' });
    const response = await fetchImpl(`${getBaseUrl()}/workshop/submissions`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(result.error || 'Workshop submission could not be confirmed. Retry the same saved form.'), { code: response.status >= 500 ? 'unavailable' : response.status === 401 ? 'unauthenticated' : response.status === 403 ? 'permission-denied' : 'invalid-argument' });
    return result;
  };
}
