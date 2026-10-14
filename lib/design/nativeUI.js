/** Native UI is opt-in and must be present in the installed binary, not just JS. */
export function resolveNativeUIPolicy({ platform, version, moduleAvailable, glassAvailable, apiAvailable, reduceTransparency }) {
  const native = platform === "ios" && Number.parseInt(String(version), 10) >= 26 && Boolean(moduleAvailable);
  return { native, glass: native && !reduceTransparency && Boolean(glassAvailable) && Boolean(apiAvailable) };
}

export function timePickerDate(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
}

export function timePickerValue(date, options) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const value = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return options.includes(value) ? value : null;
}
