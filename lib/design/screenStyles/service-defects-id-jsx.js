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
    color: COLORS.textHigh,
  },
  pageSubtitle: {
    marginTop: t.spacing.none,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.spacing["2xl"],
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingBottom: t.spacing.xl,
  },
  card: { padding: t.spacing.sm },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: t.spacing.xs,
  },
  title: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  vehicleText: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  badge: {
    marginLeft: t.spacing.xs,
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  badgeText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "700",
  },
  divider: { marginVertical: t.spacing.xs },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: t.spacing.xxs,
  },
  fieldLabel: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textLow,
  },
  fieldValue: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    textAlign: "right",
    flex: 1,
    marginLeft: t.spacing.xs,
  },
  noteField: {
    paddingTop: t.spacing.xs,
  },
  noteLabel: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textLow,
    marginBottom: t.spacing.xxs,
  },
  noteValue: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
    lineHeight: t.typography.bodySmall.lineHeight,
    textAlign: "left",
  },
  completeButton: {
    marginTop: t.spacing.sm,
    minHeight: 50,
    borderRadius: t.radius.md,
    backgroundColor: COLORS.primaryAction,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  completeText: {
    color: COLORS.textHigh,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: staticColors.rgba_18a7uad,
    alignItems: "center",
    justifyContent: "center",
    padding: t.spacing.lg,
  },
  modalCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: t.componentRadius.modal,
    padding: t.spacing.md,
    backgroundColor: COLORS.card,
  },
  modalTitle: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  modalSubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  completionInput: {
    marginTop: t.spacing.sm,
    minHeight: 110,
    borderWidth: 1,
    borderRadius: t.radius.sm,
    padding: t.spacing.sm,
    fontSize: t.typography.body.fontSize,
    lineHeight: t.typography.body.lineHeight,
    color: COLORS.textHigh,
  },
  modalActions: {
    marginTop: t.spacing.sm,
    flexDirection: "row",
    gap: t.spacing.xs,
  },
  modalButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: t.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalCompleteButton: {
    backgroundColor: COLORS.primaryAction,
  },
  modalCancelText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  modalCompleteText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  emptyTitle: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  emptyText: {
    marginTop: t.spacing.xxs,
    textAlign: "center",
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
});
