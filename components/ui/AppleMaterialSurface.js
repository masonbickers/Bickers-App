import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, StyleSheet, View } from "react-native";

import { designTokens as t } from "../../lib/design/tokens";
import { useTheme } from "../../providers/ThemeProvider";

/**
 * Shared, non-interactive material background. The parent Pressable retains
 * ownership of focus, pointer input, accessibility, shape, and clipping.
 */
export default function AppleMaterialSurface({ selected = false, pressed = false, tintColor, fallbackColor, style }) {
  const { colors, colorScheme, reduceTransparency } = useTheme();
  const usesIOSMaterial = Platform.OS === "ios" && !reduceTransparency;
  const usesLiquidGlass = usesIOSMaterial && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  const solidColor = fallbackColor || (Platform.OS === "android" || (Platform.OS === "ios" && reduceTransparency)
    ? colors.surfaceElevated
    : colors.glassSurface);
  // The native effect resolves its own corners; wrapper clipping alone doesn't
  // give UIKit the shape needed for refraction. Don't forward layout offsets.
  const resolvedStyle = StyleSheet.flatten(style) || {};
  const shape = Object.fromEntries(Object.entries(resolvedStyle).filter(([key]) =>
    key === "borderCurve" || /^border(?:Top|Bottom)?(?:Left|Right|Start|End)?Radius$/.test(key)
  ));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, style]}>
      {usesLiquidGlass ? (
        <GlassView
          colorScheme={colorScheme}
          glassEffectStyle="regular"
          tintColor={tintColor || (selected ? colors.glassSelected : undefined)}
          style={[StyleSheet.absoluteFill, shape]}
        />
      ) : usesIOSMaterial ? (
        <BlurView
          tint={colorScheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
          intensity={t.materials.blurIntensity}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: solidColor }]} />
      )}
      {tintColor && usesIOSMaterial && !usesLiquidGlass ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tintColor, opacity: 0.95 }]} />
      ) : null}
      {selected && !usesLiquidGlass ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassSelected }]} />
      ) : null}
      {pressed ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassPressed }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
});
