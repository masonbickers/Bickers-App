import { createContext, useContext, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { getCardSurfaceStyle } from "../lib/design/cardSurface";
import { designTokens as t } from "../lib/design/tokens";
import { useTheme } from "../providers/ThemeProvider";

const PulseContext = createContext(null);

function Shape({ style, fill, border }) {
  const opacity = useContext(PulseContext);
  return <Animated.View style={[styles.shape, { backgroundColor: fill, borderColor: border, opacity }, style]} />;
}

function Section({ titleWidth, fill, border, navigation = false, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Shape style={[styles.sectionTitle, { width: titleWidth }]} fill={fill} border={border} />
          <Shape style={styles.sectionSubtitle} fill={fill} border={border} />
        </View>
        {navigation ? (
          <View style={styles.dayNavigation}>
            <Shape style={styles.dayButton} fill={fill} border={border} />
            <Shape style={styles.dayButton} fill={fill} border={border} />
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function WorkCard({ fill, border }) {
  const { colors } = useTheme();
  return <View style={[styles.workCard, getCardSurfaceStyle(colors)]}>
    <Shape style={styles.moreIcon} fill={fill} border={border} />
    <View style={styles.workContent}>
      <Shape style={styles.workTitle} fill={fill} border={border} />
      <Shape style={styles.workLineWide} fill={fill} border={border} />
    </View>
  </View>;
}

export default function DashboardSkeleton({ columns = 2 }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.65)).current;
  const fill = colors.surfaceAlt;
  const border = colors.border;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.8);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.95, duration: 1100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.55, duration: 1100, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reduceMotion]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading dashboard sections"
      style={styles.root}
    >
      <PulseContext.Provider value={opacity}>
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Shape style={styles.logo} fill={fill} border={border} />
              <Shape style={styles.eyebrow} fill={fill} border={border} />
              <Shape style={styles.name} fill={fill} border={border} />
              <Shape style={styles.date} fill={fill} border={border} />
            </View>
            <View style={styles.headerActions}>
              <Shape style={styles.circle} fill={fill} border={border} />
              <Shape style={styles.circle} fill={fill} border={border} />
            </View>
          </View>
          <Shape style={styles.meta} fill={fill} border={border} />
        </View>

        <Section titleWidth={138} fill={fill} border={border}>
          <WorkCard fill={fill} border={border} />
        </Section>

        <Section titleWidth={112} fill={fill} border={border} navigation>
          <WorkCard fill={fill} border={border} />
        </Section>

        <Section titleWidth={128} fill={fill} border={border}>
          <View style={styles.actionGrid}>
            {Array.from({ length: 4 }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.actionCard,
                  getCardSurfaceStyle(colors),
                  { width: columns > 1 ? "48.5%" : "100%" },
                ]}
              >
                <Shape style={styles.actionIcon} fill={fill} border={border} />
                <View style={styles.actionCopy}>
                  <Shape style={styles.actionTitle} fill={fill} border={border} />
                  <Shape style={styles.actionSubtitle} fill={fill} border={border} />
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section titleWidth={62} fill={fill} border={border}>
          <View style={[styles.moreCard, getCardSurfaceStyle(colors)]}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={styles.moreRow}>
                <Shape style={styles.moreIcon} fill={fill} border={border} />
                <Shape style={styles.moreLine} fill={fill} border={border} />
              </View>
            ))}
          </View>
        </Section>
      </PulseContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: t.spacing.xs, paddingBottom: t.spacing.xl },
  shape: { borderWidth: 1, borderRadius: t.radius.pill },
  hero: { paddingTop: t.spacing.sm },
  heroRow: { flexDirection: "row", justifyContent: "space-between", gap: t.spacing.sm },
  heroText: { flex: 1 },
  logo: { width: 132, height: 38, marginBottom: t.spacing.xxs },
  eyebrow: { width: 84, height: 12, marginBottom: t.spacing.xxs },
  name: { width: "70%", height: 27, marginBottom: t.spacing.xxs },
  date: { width: 146, height: 15 },
  headerActions: { flexDirection: "row", gap: t.spacing.xs },
  circle: { width: 44, height: 44, borderRadius: t.radius.pill },
  meta: { width: 104, height: 26, marginTop: t.spacing.xxs },
  section: { paddingTop: t.spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: t.spacing.xs, marginBottom: t.spacing.xxs },
  sectionCopy: { flex: 1 },
  sectionTitle: { height: 20 },
  sectionSubtitle: { width: 170, height: 12, marginTop: t.spacing.xxs },
  dayNavigation: { flexDirection: "row", gap: t.spacing.xs },
  dayButton: { width: 44, height: 44, borderRadius: t.componentRadius.pill },
  workCard: { minHeight: 80, marginTop: t.spacing.xs, flexDirection: "row", alignItems: "center", gap: t.spacing.sm, padding: t.spacing.sm, overflow: "hidden" },
  workAccent: { width: 4 + t.spacing.xs, paddingRight: t.spacing.xxs },
  accentLine: { width: 4, height: "100%", borderRadius: t.radius.pill },
  workContent: { flex: 1, gap: t.spacing.xxs },
  workTitle: { width: "46%", height: 19, marginBottom: t.spacing.xxs },
  workLineWide: { width: "88%", height: 12 },
  workLineMid: { width: "72%", height: 12 },
  workLineShort: { width: "58%", height: 12 },
  workFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: t.spacing.xxs },
  workBadge: { width: 72, height: 22 },
  workHint: { width: 48, height: 12 },
  workNote: { height: 30, borderWidth: 1, borderRadius: t.radius.md, justifyContent: "center", paddingHorizontal: t.spacing.xs, marginTop: t.spacing.xxs },
  workNoteLine: { width: "45%", height: 11 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: t.spacing.xs },
  actionCard: { minHeight: t.controls.buttonHeightLg + t.spacing.lg, flexDirection: "row", alignItems: "center", gap: t.spacing.xs, padding: t.spacing.sm },
  actionIcon: { width: 34, height: 34, borderRadius: t.radius.md },
  actionCopy: { flex: 1, gap: t.spacing.xxs },
  actionTitle: { width: "86%", height: 13 },
  actionSubtitle: { width: "68%", height: 10 },
  moreCard: { overflow: "hidden" },
  moreRow: { minHeight: t.controls.buttonHeightLg + t.spacing.sm, paddingHorizontal: t.spacing.sm, flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  moreIcon: { width: 36, height: 36, borderRadius: t.radius.md },
  moreLine: { width: "54%", height: 14 },
});
