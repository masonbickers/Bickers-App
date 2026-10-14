import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  scrollContent: { padding: t.spacing.md, paddingTop: t.spacing.xxs, paddingBottom: 110 },

  /* SUMMARY CARD */
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: t.spacing.sm,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: t.controls.chipMinHeight,
    marginRight: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.card,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: t.radius.pill,
    marginRight: t.spacing.xxs,
  },
  summaryText: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textHigh,
    fontWeight: "600",
  },

  /* SECTIONS */
  sectionHeaderRow: {
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xxs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  sectionHint: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },

  /* VEHICLE CARDS */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.controls.cardPadding,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xxs,
  },
  cardTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  cardReg: {
    marginTop: t.spacing.none,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  countImmediate: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    color: staticColors.hex_ed1c25_4py4qa,
  },
  countGeneral: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    color: COLORS.textMid,
  },
  badgeImmediate: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: staticColors.hex_ed1c25_4py4qa,
    marginRight: t.spacing.xs,
  },
  badgeGeneral: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_1bodets,
    borderWidth: 1,
    borderColor: staticColors.hex_ffcc00_5c6g4m,
    marginRight: t.spacing.xs,
  },
  badgeText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },

  defectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: t.spacing.xs,
  },
  defectText: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textHigh,
    flex: 1,
  },
  subSectionLabel: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    color: COLORS.textMid,
    marginBottom: t.spacing.none,
  },
  moreText: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },

  /* EMPTY STATE */
  emptyOuter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.spacing["2xl"],
  },
  emptyTitle: {
    marginTop: t.spacing.sm,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
  },
  emptySubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    textAlign: "center",
    color: COLORS.textMid,
  },
});
