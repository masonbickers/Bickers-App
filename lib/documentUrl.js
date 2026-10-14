// Read from useRoute().params: React Navigation has already decoded the query
// string. Expo Router's useLocalSearchParams decodes it again, corrupting %2F,
// %26 and other escapes that belong to the document URL itself.
export function documentUrlFromRoute(params) {
  const value = Array.isArray(params?.url) ? params.url[0] : params?.url;
  try {
    const parsed = new URL(String(value || ""));
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}
