import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";

export const styles = StyleSheet.create({
  assetSwitch: {
    marginBottom: t.spacing.xs,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    marginHorizontal: t.spacing.md,
    marginTop: t.spacing.none,
    marginBottom: t.spacing.none,
  },
  header: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: t.controls.iconButtonSm,
    height: t.controls.iconButtonSm,
    borderRadius: t.controls.iconButtonSm / 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  pageTitle: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "600",
  },
  pageSubtitle: {
    marginTop: t.spacing.xxs,
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
    fontSize: t.typography.bodySmall.fontSize,
  },

  /* SUMMARY STRIP */
  summaryStrip: {
    flexDirection: "row",
    gap: t.spacing.xxs,
    justifyContent: "space-between",
  },
  summaryPill: {
    flex: 1,
    minHeight: 36,
    paddingVertical: t.spacing.xxs,
    paddingHorizontal: t.spacing.xxs,
  },
  summaryValue: {
    fontSize: t.typography.sectionTitle.fontSize,
    lineHeight: t.typography.sectionTitle.lineHeight,
    fontWeight: "600",
  },
  summaryLabel: {
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    color: COLORS.textMid,
  },

  controlsContainer: {
    gap: t.spacing.xxs,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  searchInput: {
    flex: 1,
    fontSize: t.typography.bodySmall.fontSize,
    paddingVertical: t.spacing.none,
    marginRight: t.spacing.xxs,
  },
  filterLabel: {
    marginTop: t.spacing.sm,
    fontSize: t.typography.micro.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    textTransform: "uppercase",
  },
  filterRow: {
    gap: t.spacing.xs,
  },
  filterChip: {
    minHeight: t.controls.buttonHeight,
      minWidth: t.controls.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    borderWidth: 1,
    borderRadius: t.radius.pill,
  },
  filterChipText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
  },

  scrollContent: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.none,
    paddingBottom: 140,
  },

  /* STATUS SECTIONS */
  sectionBlock: {
    gap: t.spacing.xxs,
  },
  sectionHeaderRow: {
    minHeight: t.controls.buttonHeight,
    gap: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: t.spacing.xxs,
    paddingBottom: t.spacing.none,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "600",
  },
  sectionCount: {
    flexShrink: 0,
    fontSize: t.typography.metadata.fontSize,
  },
  sectionDescription: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textMid,
  },

  vehicleCard: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.xs,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  vehicleHeaderRow: {
    marginBottom: t.spacing.xxs,
  },
  vehicleTitle: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
  },
  vehicleIdentity: {
    marginTop: t.spacing.none,
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textMid,
  },
  cardHint: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: t.spacing.xxs,
    alignItems: "center",
  },
  statusPill: {
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
  metaSummary: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textMid,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: t.spacing.sm,
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
});
