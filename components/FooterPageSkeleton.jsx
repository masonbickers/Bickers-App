import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { getCardSurfaceStyle } from "../lib/design/cardSurface";
import { designTokens as t } from "../lib/design/tokens";
import { useTheme } from "../providers/ThemeProvider";

// Only the data-dependent region: existing page headers, calendar and tabs stay put.
export default function FooterPageSkeleton({ page = "contacts" }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.65)).current;
  useEffect(() => {
    if (reduceMotion) { opacity.setValue(0.8); return; }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.95, duration: 1100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.55, duration: 1100, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduceMotion]);
  const block = (width = "65%", height = 14, round = false) => <View style={{ width, height, borderRadius: round ? t.componentRadius.pill : t.radius.sm, backgroundColor: colors.surfaceAlt }} />;
  const copy = () => <View style={styles.copy}>{block("78%", 18)}{block("60%", 12)}</View>;
  const card = (children, key, layout) => <View key={key} style={[getCardSurfaceStyle(colors), styles.card, layout]}>{children}</View>;
  let content;
  if (page === "contacts") {
    content = <>{block(130, 12)}{block("100%", t.controls.buttonHeightLg)}{block("75%", 12)}{[0, 1, 2, 3, 4].map(i => card(<>{block(42, 42, true)}{copy()}{block(36, 36, true)}{block(36, 36, true)}</>, i, styles.contact))}</>;
  } else if (page === "jobs" || page === "schedule") {
    content = <>{[0, 1].map(i => card(<><View style={styles.row}>{copy()}{block(72, 28, true)}</View>{block("90%")}{block("76%")}{block("60%")}{block("100%", 42)}</>, i))}</>;
  } else {
    content = <>
      <View style={styles.row}>{block(48, 48, true)}{copy()}{block(44, 44, true)}{block(68, 44, true)}</View>
      <View style={styles.row}>{copy()}{block(80, 44, true)}</View>
      {block(120, 24)}{block(190, 14)}
      {card(<View style={styles.row}>{[0, 1, 2].map(i => <View key={i} style={styles.metric}>{block("85%", 12)}{block(32, 24)}</View>)}</View>, "timesheet")}
      {block(190, 24)}{block("80%", 14)}
      {card(<View style={styles.row}>{[0, 1].map(i => <View key={i} style={styles.copy}>{block(28, 28)}{block("90%", 18)}{block("75%", 12)}</View>)}</View>, "expenses")}
      {block(110, 24)}{card(<>{block("70%", 14)}{block("90%", 14)}{block("60%", 14)}</>, "holidays")}
    </>;
  }
  return <Animated.View accessibilityRole="progressbar" accessibilityLabel={`Loading ${page === "me" ? "profile" : page}`} style={[styles.root, { opacity }]}><View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.root}>{content}</View></Animated.View>;
}
const styles = StyleSheet.create({
  root: { gap: t.spacing.md },
  card: { padding: t.controls.cardPadding, gap: t.spacing.md },
  contact: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: t.spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs },
  copy: { flex: 1, minWidth: 0, gap: t.spacing.xs },
  metric: { flex: 1, alignItems: "center", gap: t.spacing.sm },
});
