import { getCardSurfaceStyle } from "../../lib/design/cardSurface";
import { StyleSheet, View } from "react-native";
import { AppPressable, AppText } from "./AppPrimitives";
import { designTokens as t } from "../../lib/design/tokens";
import { useTheme } from "../../providers/ThemeProvider";

export default function DocumentCard({ title, subtitle, type = "PDF", onPress, titleLines = 1 }) {
  const { colors } = useTheme();
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${title}`}
      style={[styles.card, getCardSurfaceStyle(colors)]}
    >
      <View style={[styles.badge, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
        <AppText variant="micro" tone="accent" style={styles.badgeText}>{type}</AppText>
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong" numberOfLines={titleLines}>{title}</AppText>
        <AppText variant="metadata" tone="secondary">{subtitle}</AppText>
      </View>
      <View style={styles.action}>
        <AppText variant="metadata" tone="accent" style={styles.actionText}>View</AppText>
      </View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs, paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.sm, marginBottom: t.spacing.xs },
  badge: { width: 34, height: 34, borderRadius: t.radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badgeText: { fontWeight: "700" },
  copy: { flex: 1, minWidth: 0 },
  action: { width: 52, alignItems: "flex-end", justifyContent: "center" },
  actionText: { fontWeight: t.typography.bodyStrong.fontWeight },
});
