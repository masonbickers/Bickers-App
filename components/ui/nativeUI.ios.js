import { requireOptionalNativeModule } from "expo";
import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform } from "react-native";
import { resolveNativeUIPolicy } from "../../lib/design/nativeUI";

let sdk;
export function getNativeUI(reduceTransparency = false) {
  const moduleAvailable = Number.parseInt(String(Platform.Version), 10) >= 26 && Boolean(requireOptionalNativeModule("ExpoUI"));
  const policy = resolveNativeUIPolicy({
    platform: Platform.OS, version: Platform.Version, moduleAvailable, reduceTransparency,
    glassAvailable: moduleAvailable && !reduceTransparency && isLiquidGlassAvailable(),
    apiAvailable: moduleAvailable && !reduceTransparency && isGlassEffectAPIAvailable(),
  });
  if (!policy.native) return null;
  sdk ||= { components: require("@expo/ui/swift-ui"), modifiers: require("@expo/ui/swift-ui/modifiers") };
  return { ...sdk, glass: policy.glass };
}
