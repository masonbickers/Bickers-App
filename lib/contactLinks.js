import { parsePhoneNumberWithError } from "libphonenumber-js/max";

function contactNumber(raw) {
  try {
    const number = parsePhoneNumberWithError(String(raw ?? "").trim(), { defaultCountry: "GB", extract: false });
    return number.isValid() ? number : null;
  } catch {
    return null;
  }
}

export function contactPhoneMatches(raw, query) {
  const needle = String(query ?? "").trim();
  if (!needle || /[^\d+\s().-]/.test(needle)) return false;
  const digits = needle.replace(/\D/g, "");
  return Boolean(digits && String(raw ?? "").replace(/\D/g, "").includes(digits));
}

export function callUrl(raw) {
  const number = contactNumber(raw);
  return number ? `tel:${number.number}` : null;
}

export function whatsappUrl(raw, name) {
  const number = contactNumber(raw);
  if (!number) return null;
  const digits = number.number.slice(1);

  const greeting = encodeURIComponent(`Hi ${name || ""}`.trim());
  return `https://wa.me/${digits}?text=${greeting}`;
}
