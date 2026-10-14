import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";

export const styles = StyleSheet.create({
  container: { flex: 1 },
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
    paddingVertical: t.spacing.xxs,
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
  },

  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    marginBottom: t.spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "600",
    color: COLORS.textLow,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryMain: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
    marginTop: t.spacing.none,
  },
  summaryDate: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "600",
    color: COLORS.textMid,
    marginTop: t.spacing.none,
  },
  summaryEquipment: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "500",
    color: COLORS.textMid,
    marginTop: t.spacing.none,
  },

  sectionHeaderRow: {
    marginTop: t.spacing.xxs,
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
  sectionSubtitle: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    marginBottom: t.spacing.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: t.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  checkIconWrap: {
    paddingRight: t.spacing.xs,
    paddingTop: t.spacing.xxs,
  },
  checkEmpty: {
    width: 20,
    height: 20,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: COLORS.textMid,
  },
  checkFilled: {
    width: 20,
    height: 20,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    flex: 1,
    fontSize: t.typography.body.fontSize,
    color: COLORS.textHigh,
    fontWeight: "500",
  },

  notesInput: {
    minHeight: 100,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.inputBg,
    color: COLORS.textHigh,
    fontSize: t.typography.body.fontSize,
    textAlignVertical: "top",
  },

  buttonRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
    marginTop: t.spacing.xxs,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    paddingVertical: t.spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "600",
    color: COLORS.textMid,
  },
  primaryButton: {
    flex: 1.4,
    borderRadius: t.radius.pill,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
});
