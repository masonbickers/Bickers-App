export const RECEIPT_FILE_TYPES = Object.freeze(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
export const RECEIPT_FILE_EXTENSIONS = Object.freeze({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" });
const EXTENSION_TYPES = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
export function receiptAssetType(asset) {
  const reported = String(asset.mimeType || asset.fileType || "").toLowerCase();
  const extension = String(asset.fileName || asset.name || asset.uri || "").split("?")[0].split(".").pop().toLowerCase();
  const type = reported && reported !== "application/octet-stream" ? reported : EXTENSION_TYPES[extension];
  if (!RECEIPT_FILE_TYPES.includes(type)) throw new Error("Choose a PDF, JPEG, PNG, WebP or GIF. For HEIC photos, use Photos so the picker supplies a compatible image.");
  return type;
}
export function detectReceiptFileType(bytes) {
  const ascii = (start, length) => Array.from(bytes.slice(start, start + length), (byte) => String.fromCharCode(byte)).join("");
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  return "";
}
export function receiptAmountInput(grossPence, isRefund = false) {
  const amount = Number(grossPence || 0);
  return { isRefund: amount < 0 || (amount === 0 && isRefund), text: amount ? (Math.abs(amount) / 100).toFixed(2) : "" };
}
export function signedReceiptPence(value, isRefund) {
  const cleaned = String(value || "").trim();
  if (!/^\d*(?:[.,]\d{0,2})?$/.test(cleaned)) return 0;
  const pence = Math.round(Number(cleaned.replace(",", ".")) * 100);
  return Number.isSafeInteger(pence) ? pence * (isRefund ? -1 : 1) : 0;
}
