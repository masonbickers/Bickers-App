export function validateServiceUrl(raw, env, serviceName = "API") {
  let url;
  try { url = new URL(raw); } catch { throw new Error(`${serviceName} URL is invalid.`); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error(`${serviceName} must use HTTP or HTTPS without embedded credentials.`);
  }
  if (String(env).toLowerCase() === "production") {
    if (url.protocol !== "https:") throw new Error(`Production ${serviceName} URL must use HTTPS.`);
    const host = url.hostname.toLowerCase();
    if (["localhost", "[::1]", "0.0.0.0"].includes(host) || host.endsWith(".localhost") || /^127\./.test(host)) {
      throw new Error(`Production ${serviceName} URL cannot point to localhost.`);
    }
  }
  return String(raw).trim().replace(/\/+$/, "");
}
