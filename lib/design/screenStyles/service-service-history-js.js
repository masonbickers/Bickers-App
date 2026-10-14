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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    paddingRight: t.spacing.xs,
  },
  pageTitle: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  pageSubtitle: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
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
  },
  summaryCard: { padding: t.spacing.sm, marginBottom: t.spacing.md },
  summaryTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
    marginBottom: t.spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
    marginTop: t.spacing.none,
  },
  vehicleCard: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  vehicleHeaderRow: {
    flexDirection: "row",
    marginBottom: t.spacing.xxs,
  },
  vehicleTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  vehicleReg: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.none,
  },
  vehicleSub: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textLow,
    marginTop: t.spacing.none,
  },
  historyBlock: {
    marginTop: t.spacing.xs,
  },
  blockTitle: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    color: COLORS.textMid,
    marginBottom: t.spacing.xxs,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: t.spacing.none,
  },
  historyLabel: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textLow,
  },
  historyValue: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textHigh,
  },
  notesBlock: {
    marginTop: t.spacing.xs,
  },
  notesLabel: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textLow,
    marginBottom: t.spacing.none,
  },
  notesText: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: t.spacing["2xl"],
    paddingHorizontal: t.spacing.xl,
  },
  emptyTitle: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  emptySubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    textAlign: "center",
    color: COLORS.textMid,
  },
  viewHistoryButton: {
    marginTop: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingVertical: t.spacing.xxs,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.hex_1f2933_8in7ju,
  },
  viewHistoryText: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textHigh,
    fontWeight: "600",
    marginRight: t.spacing.xxs,
  },
});

export const summaryStyles = StyleSheet.create({
  item: {
    flex: 1,
    minWidth: 0,
    marginBottom: t.spacing.xxs,
  },
  value: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  label: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.none,
    flexShrink: 1,
  },
});
