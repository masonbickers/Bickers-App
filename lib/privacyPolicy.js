import { Alert, Linking } from "react-native";

export const PRIVACY_POLICY_URL = "https://bickers-v2.vercel.app/privacy-policy";

export async function openPrivacyPolicy() {
  try {
    await Linking.openURL(PRIVACY_POLICY_URL);
  } catch {
    Alert.alert("Unable to open privacy policy", `Please visit ${PRIVACY_POLICY_URL}`);
  }
}
