import { parsePhoneNumberWithError } from "libphonenumber-js/max";

export function profilePhoneError(value) {
  const input = String(value || "").trim();
  if (!input) return "Enter a phone number.";
  try {
    // Parse the entire field, not a phone-like fragment embedded in other text.
    const number = parsePhoneNumberWithError(input, { defaultCountry: "GB", extract: false });
    if (number.isValid()) return null;
  } catch {
    // Invalid or incomplete input remains in the field for correction.
  }
  return "Enter a valid UK phone number or an international number with its country code.";
}
