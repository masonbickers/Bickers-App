import { StyleSheet } from "react-native";
import { getConcentricRadius } from "../radius.ts";
import { designTokens as t } from "../tokens.ts";

export const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
  },

  backButton: {
    paddingRight: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
  },

  pageTitle: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  pageSubtitle: {
    fontSize: t.typography.metadata.fontSize,
    marginTop: t.spacing.none,
  },

  scrollContent: {
    padding: t.spacing.md,
  },

  /* SUMMARY */
  summaryCard: {
    padding: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  summaryLabel: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryMain: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    marginTop: t.spacing.none,
  },
  summaryDate: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "600",
    marginTop: t.spacing.none,
  },
  completionMeta: {
    marginTop: t.spacing.sm,
    padding: t.spacing.xs,
    borderRadius: getConcentricRadius(t.componentRadius.card, t.spacing.sm + 1),
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
  },
  completionMetaCopy: { flex: 1, minWidth: 0 },
  completionMetaTitle: {
    fontSize: t.typography.metadata.fontSize,
    lineHeight: t.typography.metadata.lineHeight,
    fontWeight: t.typography.pageTitle.fontWeight,
  },
  completionMetaText: {
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    fontWeight: "600",
  },

  /* SECTION TITLES */
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
  },
  sectionSubtitle: {
    fontSize: t.typography.metadata.fontSize,
  },

  /* CARDS */
  card: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    marginBottom: t.spacing.md,
  },

  /* CHECKLIST */
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: t.spacing.xs,
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
  },
  checkFilled: {
    width: 20,
    height: 20,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    flex: 1,
    fontSize: t.typography.body.fontSize,
    fontWeight: "500",
  },

  /* NOTES */
  notesInput: {
    minHeight: 100,
    padding: t.spacing.xs,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    fontSize: t.typography.body.fontSize,
    textAlignVertical: "top",
  },

  /* BUTTONS */
  secondaryActionLayout: { flex: 1 },
  primaryActionLayout: { flex: 1.4 },
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
  },
  secondaryButtonText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1.4,
    borderRadius: t.radius.pill,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
  },
});
