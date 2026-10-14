import Constants from "expo-constants";
import { receiptLocalDemo } from "./receipts/localDemo";
import { validateServiceUrl } from "./serviceUrl";

const extra =
  Constants.expoConfig?.extra ||
  Constants.manifest2?.extra ||
  Constants.manifest?.extra ||
  {};

const appEnv = String(
  process.env.EXPO_PUBLIC_APP_ENV || extra.appEnv || process.env.NODE_ENV || ""
).toLowerCase();

export function getApiBaseUrl(serviceName = "API") {
  if (receiptLocalDemo) return receiptLocalDemo.apiUrl;
  const localDevelopmentUrl =
    typeof __DEV__ !== "undefined" && __DEV__ ? "http://localhost:3002" : "";
  const raw = String(
    process.env.EXPO_PUBLIC_API_URL ||
      extra.EXPO_PUBLIC_API_URL ||
      extra.apiUrl ||
      localDevelopmentUrl ||
      ""
  ).trim();

  if (!raw) {
    throw new Error(`${serviceName} is not configured. Set EXPO_PUBLIC_API_URL.`);
  }

  const urlEnv = typeof __DEV__ !== "undefined" && !__DEV__ ? "production" : appEnv;
  return validateServiceUrl(raw, urlEnv, serviceName);
}
