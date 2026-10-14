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
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: t.radius.pill,
    borderWidth: 1,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    marginLeft: t.spacing.xs,
  },
  editButtonText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "700",
    marginLeft: t.spacing.xxs,
  },
  title: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  subtitle: {
    fontSize: t.typography.bodySmall.fontSize,
    marginTop: t.spacing.none,
    color: COLORS.textMid,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.body.fontSize,
    color: COLORS.textMid,
  },
  content: {
    padding: t.spacing.md,
    paddingBottom: t.spacing.xl,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  section: {
    marginBottom: t.spacing.md,
  },
  emptyCard: {
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xs,
  },
  mainTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  summaryMeta: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.none,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    marginLeft: t.spacing.xs,
  },
  chipText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },
  divider: { marginVertical: t.spacing.xs },
  sectionTitle: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
    marginBottom: t.spacing.xs,
  },
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
  checkSummaryText: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  wheelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.xs,
  },
  wheelRecordCard: {
    width: "48%",
    minWidth: 132,
    flexGrow: 1,
    borderRadius: t.componentRadius.nestedCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    padding: t.spacing.xs,
  },
  wheelRecordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    marginBottom: t.spacing.xs,
  },
  wheelRecordBadge: {
    width: 26,
    height: 26,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelRecordBadgeText: {
    color: COLORS.textHigh,
    fontSize: t.typography.micro.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
  },
  wheelRecordTitle: {
    flex: 1,
    color: COLORS.textHigh,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  wheelRecordMetric: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  wheelRecordMetricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
  },
  wheelRecordMetricLabel: {
    color: COLORS.textLow,
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },
  wheelRecordStatusDot: {
    width: 8,
    height: 8,
    borderRadius: t.radius.pill,
  },
  wheelRecordMetricValue: {
    color: COLORS.textMid,
    fontSize: t.typography.caption.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  wheelRecordNote: {
    marginTop: t.spacing.xxs,
    paddingTop: t.spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: staticColors.rgba_5ns92s,
    color: COLORS.textMid,
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
  },
  defectActionRecordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.rgba_5ns91z,
  },
  defectActionRecordTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  defectActionRecordMeta: {
    color: COLORS.textLow,
    fontSize: t.typography.caption.fontSize,
    marginTop: t.spacing.none,
  },
  defectActionRecordBadge: {
    color: COLORS.textMid,
    fontSize: t.typography.caption.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    textAlign: "right",
  },
  monitorRecordRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.rgba_5ns91z,
  },
  monitorRecordBadge: {
    width: 26,
    height: 26,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.hex_f59e0b_4zbh7f,
    alignItems: "center",
    justifyContent: "center",
  },
  monitorRecordBadgeText: {
    color: COLORS.textHigh,
    fontSize: t.typography.caption.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
  },
  monitorRecordTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  monitorRecordDetails: {
    color: COLORS.textLow,
    fontSize: t.typography.caption.fontSize,
    marginTop: t.spacing.none,
    lineHeight: t.typography.caption.lineHeight,
  },

  /* Checklist details */
  checkRowWrapper: {
    paddingVertical: t.spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.rgba_5ns94m,
  },
  checkRowTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: t.spacing.xs,
  },
  checkIconWrap: {
    marginRight: t.spacing.xs,
  },
  checkIconEmpty: {
    width: 22,
    height: 22,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: COLORS.textLow,
  },
  checkIconFilled: {
    width: 22,
    height: 22,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
  naIcon: {
    minWidth: 32,
    height: 22,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: COLORS.textMid,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.spacing.xxs,
    backgroundColor: staticColors.rgba_y8iv92,
  },
  naIconText: {
    fontSize: t.typography.micro.fontSize,
    color: COLORS.textMid,
    fontWeight: "600",
  },
  checkLabel: {
    flex: 1,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  checkRight: {
    minWidth: 70,
    alignItems: "flex-end",
  },
  checkRightText: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
  },

  checkNoteText: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },

  checkPhotoThumbWrapper: {
    marginRight: t.spacing.xs,
  },
  checkPhotoThumb: {
    width: 70,
    height: 70,
    borderRadius: t.radius.sm,
  },

  // Overall photos section
  photoThumbWrapper: {
    marginRight: t.spacing.xs,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: t.radius.sm,
  },
  deleteButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: t.radius.md,
    backgroundColor: "transparent",
    borderWidth: 1,
    paddingHorizontal: t.spacing.sm,
    marginTop: t.spacing.xs,
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: COLORS.primaryAction,
    fontSize: t.typography.body.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
});
