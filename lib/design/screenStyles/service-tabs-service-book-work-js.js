import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerCard: {
    marginHorizontal: t.spacing.md,
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.none,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  backButton: {
    paddingRight: t.spacing.xs,
  },
  pageTitle: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  pageSubtitle: {
    fontSize: t.typography.metadata.fontSize,
    marginTop: t.spacing.none,
    color: COLORS.textMid,
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingTop: t.spacing.xxs,
    paddingBottom: 140,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.md,
    borderWidth: 1,
  },
  priorityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: t.spacing.xxs,
  },
  priorityEyebrow: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
    letterSpacing: 1,
  },
  priorityStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.sm,
    marginTop: t.spacing.sm,
    paddingTop: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priorityStat: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },
  infoTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    marginBottom: t.spacing.xxs,
  },
  infoSubtitle: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  /* SERVICE DUE */
  serviceCard: { padding: t.spacing.sm },
  serviceLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceLoadingText: {
    marginLeft: t.spacing.xs,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  emptyServiceState: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyServiceText: {
    marginLeft: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
  },
  serviceGroupTitle: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    color: COLORS.textMid,
    marginBottom: t.spacing.xxs,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: t.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  serviceRowContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: t.spacing.xs,
  },
  serviceTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: t.spacing.xs,
  },
  serviceRowRecommended: {
    backgroundColor: staticColors.rgba_mxgb83,
  },
  serviceVehicle: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "600",
    color: COLORS.textHigh,
    flexShrink: 1,
  },
  serviceMeta: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.none,
    flexShrink: 1,
  },
  serviceBadgeOverdue: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_mxgb17,
    borderWidth: 1,
    borderColor: COLORS.primaryAction,
    flexShrink: 0,
  },
  serviceBadgeSoon: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_1boderh,
    borderWidth: 1,
    borderColor: staticColors.hex_ffcc00_5c6g4m,
    flexShrink: 0,
  },
  serviceBadgeText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  recommendedTag: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
    color: COLORS.primaryAction,
  },
  nextPriorityTag: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
    color: staticColors.hex_ffcc00_5c6g4m,
  },

  /* DRAFT CARD */
  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    minHeight: 72,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryAction,
  },
  draftIconWrap: {
    width: 32,
    height: 32,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_mxgb9x,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  draftTitle: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  draftMeta: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  draftHint: {
    marginTop: t.spacing.none,
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
  },
  filterRow: {
    flexDirection: "row",
    marginTop: t.spacing.md,
    marginBottom: t.spacing.xs,
  },
  filterChip: {
    minHeight: t.controls.chipMinHeight,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    marginRight: t.spacing.xs,
  },
  filterText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
  },
  sectionHeaderRow: {
    alignItems: "flex-start",
    gap: t.spacing.xxs,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.xs,
  },
  requestsSectionHeader: {
    marginTop: t.spacing.none,
  },
  sectionTitle: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  sectionSubtitle: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  addTaskCard: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addLabel: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    color: COLORS.textMid,
    marginBottom: t.spacing.xxs,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    color: COLORS.textHigh,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    fontSize: t.typography.body.fontSize,
  },
  addButton: {
    marginTop: t.spacing.sm,
    borderRadius: t.radius.pill,
    minHeight: t.controls.buttonHeight,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xxs,
  },
  addButtonText: {
    color: COLORS.textHigh,
    fontWeight: "700",
    fontSize: t.typography.body.fontSize,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: t.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  taskCheckWrap: {
    paddingRight: t.spacing.xs,
    paddingTop: t.spacing.xxs,
  },
  taskCheckEmpty: {
    width: 20,
    height: 20,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: COLORS.textMid,
  },
  taskCheckFilled: {
    width: 20,
    height: 20,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTitle: {
    fontSize: t.typography.body.fontSize,
    color: COLORS.textHigh,
    fontWeight: "600",
  },
  taskTypePill: {
    borderRadius: t.radius.pill,
    borderWidth: 1,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.none,
    marginRight: t.spacing.xs,
  },
  taskTypeText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },
  taskHint: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: t.spacing.xl,
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
    color: COLORS.textMid,
  },
});
