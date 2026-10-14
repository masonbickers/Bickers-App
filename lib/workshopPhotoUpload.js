// Retain successful uploads for the lifetime of a form, so a retry sends the
// original URLs rather than changing an already committed submission's hash.
export function createWorkshopPhotoUploader(upload) {
  const pending = new Map();
  let sequence = 0;
  return (uri, basePath) => {
    const key = JSON.stringify([basePath, uri]);
    if (!pending.has(key)) {
      const path = `${basePath}/${Date.now()}-${sequence++}.jpg`;
      const result = Promise.resolve().then(() => upload(uri, path));
      pending.set(key, result);
      result.catch(() => { if (pending.get(key) === result) pending.delete(key); });
    }
    return pending.get(key);
  };
}
