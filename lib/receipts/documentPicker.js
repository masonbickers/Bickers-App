export async function pickReceiptDocuments(options, loadPicker = () => import('expo-document-picker')) {
  let picker;
  try {
    picker = await loadPicker();
  } catch (error) {
    if (/Cannot find native module.*ExpoDocumentPicker/.test(String(error?.message || error))) {
      throw new Error('File attachments are unavailable in this app version. You can attach a photo instead.');
    }
    throw error;
  }
  return picker.getDocumentAsync(options);
}
