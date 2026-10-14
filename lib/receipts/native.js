import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode as decodeBase64 } from "base-64";
import * as FileSystem from "expo-file-system/legacy";
import { ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "../../firebaseConfig";
import { extractReceipt, getReceiptWorkspace, receiptEvidenceUrl, sendReceiptCommand } from "../receiptApi";
import { createReceiptQueue, drainReceiptQueue, receiptOperationId, receiptScope } from "./queue";
import { detectReceiptFileType, receiptAssetType, RECEIPT_FILE_EXTENSIONS } from "./capture";
import { createReceiptWorkspaceCache } from "./workspaceCache";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
const queues = new Map();
const extensionFor = (type) => RECEIPT_FILE_EXTENSIONS[type] || "pdf";
const rootFor = (scope) => {
  if (!FileSystem.documentDirectory) throw new Error("Receipt storage is unavailable on this device.");
  return `${FileSystem.documentDirectory}receipt-v2/${scope}/`;
};

export function getDeviceReceiptQueue(companyId, uid, personId) {
  const scope = receiptScope(companyId, uid);
  if (!personId) throw new Error("Your staff identity is required to open saved receipts.");
  const identity = `${scope}/${encodeURIComponent(personId)}`;
  if (!queues.has(identity)) queues.set(identity, createReceiptQueue({ storage: AsyncStorage, companyId, uid, personId }));
  return queues.get(identity);
}
export const getDeviceReceiptCache = (queue) => createReceiptWorkspaceCache(AsyncStorage, queue);

export async function preserveReceiptFile(queue, asset) {
  const type = receiptAssetType(asset);
  const evidenceId = receiptOperationId();
  const directory = `${rootFor(queue.scope)}originals/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const uri = `${directory}${evidenceId}.${extensionFor(type)}`;
  // Keep the picked original; do not replace it with a compressed OCR image.
  await FileSystem.copyAsync({ from: asset.uri, to: uri });
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.size < 8 || info.size > MAX_FILE_BYTES) throw new Error("Each receipt file must be a valid document up to 15 MB.");
  const encodedHeader = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, position: 0, length: 16 });
  const header = Uint8Array.from(decodeBase64(encodedHeader), (character) => character.charCodeAt(0));
  if (detectReceiptFileType(header) !== type) throw new Error("This file is not a supported PDF or image matching its format. Select a PDF, JPEG, PNG, WebP or GIF.");
  return { evidenceId, uri, fileName: String(asset.fileName || asset.name || `receipt.${extensionFor(type)}`), fileType: type, fileSize: info.size };
}

function assertAccount(queue, user, assertScope = () => {}) {
  assertScope();
  if (auth.currentUser?.uid !== queue.uid || user?.uid !== queue.uid) throw new Error("Sign back into the account that saved this receipt to continue.");
}

export async function syncDeviceReceipts(queue, user, onProgress, assertScope = () => {}) {
  const guard = () => assertAccount(queue, user, assertScope);
  guard();
  const response = await getReceiptWorkspace(user, queue.companyId, { assertAccount: guard });
  guard();
  queue.verifyWorkspace(response);
  await getDeviceReceiptCache(queue).write(response);
  guard();
  return drainReceiptQueue(queue, {
    assertAccount: guard, onProgress,
    command: (action, payload, operationId) => {
      guard();
      return sendReceiptCommand(user, queue.companyId, action, payload, operationId, { assertAccount: guard, assertWorkspace: (snapshot) => queue.verifyWorkspace(snapshot) });
    },
    extract: (receiptId, evidenceIds) => extractReceipt(user, queue.companyId, receiptId, evidenceIds, { assertAccount: guard }),
    upload: async (file, progress) => {
      guard();
      const info = await FileSystem.getInfoAsync(file.uri);
      if (!info.exists || info.size !== file.fileSize) throw new Error("The saved attachment could not be verified. Keep this receipt and contact support.");
      const response = await fetch(file.uri);
      const blob = await response.blob();
      guard();
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(ref(storage, file.storagePath), blob, { contentType: file.fileType });
        const stopAuth = auth.onAuthStateChanged((current) => { if (current?.uid !== queue.uid) task.cancel(); });
        task.on("state_changed", (snapshot) => { try { guard(); progress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)); } catch { task.cancel(); } }, (error) => { stopAuth(); blob.close?.(); reject(error); }, () => { stopAuth(); blob.close?.(); resolve(); });
      });
    },
  });
}

export async function openSavedEvidence(queue, user, evidenceId, fileType = "application/pdf", assertScope = () => {}) {
  const guard = () => assertAccount(queue, user, assertScope);
  guard();
  const saved = (await queue.list()).flatMap((row) => [...(row.files || []), ...(row.previousCorrectionDrafts || []).flatMap((draft) => draft.files || [])]).find((file) => file.evidenceId === evidenceId);
  if (saved?.uri) {
    const original = await FileSystem.getInfoAsync(saved.uri);
    guard();
    if (original.exists && original.size === saved.fileSize) return { uri: saved.uri, fileType: saved.fileType };
  }
  const directory = `${rootFor(queue.scope)}evidence/${encodeURIComponent(queue.personId || "legacy")}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const path = `${directory}${encodeURIComponent(evidenceId)}.${extensionFor(fileType)}`;
  try {
    const metadata = JSON.parse(await FileSystem.readAsStringAsync(`${path}.json`));
    const cached = await FileSystem.getInfoAsync(path, { md5: true });
    guard();
    if (metadata.evidenceId === evidenceId && metadata.scope === queue.scope && metadata.fileType === fileType && cached.exists && cached.size === metadata.fileSize && cached.md5 && cached.md5 === metadata.md5) return { uri: path, fileType };
  } catch { guard(); }
  const token = await user.getIdToken();
  guard();
  // An explicit preview should finish or fail with this foreground interaction.
  const result = await FileSystem.downloadAsync(receiptEvidenceUrl(evidenceId, queue.companyId), path, {
    sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result.status !== 200) throw new Error("The receipt attachment could not be opened.");
  guard();
  const info = await FileSystem.getInfoAsync(result.uri, { md5: true });
  if (!info.exists || info.size < 8 || !info.md5) throw new Error("The downloaded receipt could not be verified.");
  await FileSystem.writeAsStringAsync(`${path}.json`, JSON.stringify({ evidenceId, scope: queue.scope, fileType, fileSize: info.size, md5: info.md5 }));
  guard();
  return { uri: result.uri, fileType };
}

export const receiptAndroidContentUri = (uri) => FileSystem.getContentUriAsync(uri);
