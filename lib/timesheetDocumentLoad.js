// A company-filtered query can omit legacy documents. Only a successful read
// of the exact weekly document can establish that it is safe to start a draft.
export async function loadTimesheetDocument(currentRow, documentId, readDocument) {
  if (currentRow) return currentRow;
  const snapshot = await readDocument(documentId);
  return snapshot.exists() ? { ...snapshot.data(), id: documentId } : null;
}
