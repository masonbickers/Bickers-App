function normalise(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchesServiceSearch(query, values) {
  const needle = normalise(query);
  if (!needle) return true;
  const fields = (Array.isArray(values) ? values : [values]).map(normalise);
  if (fields.some((field) => field.includes(needle))) return true;

  // Registration numbers are commonly entered without their printed space.
  const compactNeedle = needle.replace(/[^a-z0-9]/g, "");
  return compactNeedle.length >= 3
    && fields.some((field) => field.replace(/[^a-z0-9]/g, "").includes(compactNeedle));
}
