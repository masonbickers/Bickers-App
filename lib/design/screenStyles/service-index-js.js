import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pageTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: "600",
  },
  pageSubtitle: {
    marginTop: t.spacing.xxs,
    color: COLORS.textMid,
    fontSize: t.typography.bodySmall.fontSize,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: t.spacing.xs,
    color: COLORS.textMid,
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingTop: t.spacing.xs,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    padding: t.spacing.sm,
    borderRadius: t.componentRadius.card,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryAction,
  },
  infoTextTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "700",
    marginBottom: t.spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  sectionTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    paddingRight: t.spacing.xs,
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: t.spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: t.spacing.xxs,
    paddingHorizontal: t.spacing.xl,
  },
  emptyTitle: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
  },
  emptySubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    textAlign: "center",
  },
  vehicleCard: {
    backgroundColor: COLORS.card,
    padding: t.spacing.sm,
    borderRadius: t.componentRadius.card,
    marginBottom: t.spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.border,
  },
  vehicleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xxs,
  },
  vehicleTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  vehicleReg: {
    marginTop: t.spacing.none,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: t.spacing.xxs,
    alignItems: "center",
  },
  statusPill: {
    maxWidth: "100%",
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    marginRight: t.spacing.xs,
    marginBottom: t.spacing.xxs,
  },
  statusPillText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "600",
  },
  defectPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    backgroundColor: COLORS.recceAction,
    marginBottom: t.spacing.xxs,
  },
  defectText: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textHigh,
    fontWeight: "600",
  },
});

export const quickStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.hex_262626_70t9oi,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.xs,
  },
  title: {
    color: COLORS.textHigh,
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
    marginBottom: t.spacing.none,
    flexShrink: 1,
  },
  subtitle: {
    color: COLORS.textLow,
    fontSize: t.typography.metadata.fontSize,
    flexShrink: 1,
  },
});

export const summaryStyles = StyleSheet.create({
  item: {
    flex: 1,
    minWidth: 0,
    paddingRight: t.spacing.sm,
  },
  value: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: "600",
  },
  label: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.none,
  },
});
