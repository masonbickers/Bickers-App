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
  },
  sectionContent: {
    marginBottom: t.spacing.md,
  },
  overviewHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reg: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.body.fontSize,
    color: COLORS.textMid,
  },
  sub: {
    marginTop: t.spacing.none,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textLow,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
  },
  chipText: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textMid,
    fontWeight: "600",
  },
  statusControlRow: {
    marginBottom: t.spacing.md,
    gap: t.spacing.sm,
  },
  statusControlTitle: {
    fontSize: t.typography.body.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  statusControlSub: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    lineHeight: t.typography.metadata.lineHeight,
  },
  statusToggle: {
    flexDirection: "row",
    padding: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_z8bbyx,
    alignSelf: "stretch",
  },
  statusToggleButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
  },
  statusToggleButtonActive: {
    backgroundColor: COLORS.primaryAction,
  },
  statusToggleText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textLow,
  },
  statusToggleTextActive: {
    color: COLORS.textHigh,
  },
  sectionHeaderRow: {
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  sectionTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: t.spacing.xs,
  },
  fieldLabel: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textLow,
  },
  fieldValue: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textHigh,
    fontWeight: t.typography.bodyStrong.fontWeight,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: t.spacing.sm,
  },
  notesText: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
    lineHeight: t.typography.bodySmall.lineHeight,
    marginTop: t.spacing.xxs,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.xxs,
    marginBottom: t.spacing.xs,
  },
  statusPill: {
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  statusPillText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: t.spacing.xs,
    opacity: 0.6,
  },

  /* ACTIONS */
  actionsHint: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    marginBottom: t.spacing.xs,
  },
  actionsRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
    flexWrap: "wrap",
  },
  actionButton: {
    flex: 1,
    minWidth: "48%",
    minHeight: 72,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  actionFull: {
    backgroundColor: COLORS.primaryAction,
  },
  actionMinor: {
    backgroundColor: staticColors.hex_444_yhlhma,
  },
  actionLabel: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  actionSub: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.none,
  },
  timelineButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  timelineIconWrap: {
    width: 34,
    height: 34,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
    backgroundColor: COLORS.primaryAction,
  },
  timelineButtonTitle: {
    fontSize: t.typography.body.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  timelineButtonSub: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
  },

  /* SERVICE HISTORY LIST */
  historyItem: {
    paddingVertical: t.spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.rgba_5ns8wh,
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: t.spacing.none,
  },
  historyTitle: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  historyMeta: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
  },
  historySummary: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },

  /* FULL-WIDTH VIEW ALL BUTTON */
  viewAllButton: {
    width: "100%",
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: staticColors.hex_191919_acxwha,
  },
  viewAllButtonText: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },

  /* ATTACHMENTS */
  attachmentsLabel: {
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    color: COLORS.textLow,
  },
  attachmentButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.sm,
    backgroundColor: staticColors.hex_191919_acxwha,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: t.spacing.xxs,
  },
  attachmentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.chipBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  attachmentName: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textHigh,
    fontWeight: "600",
  },
  attachmentSub: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
    marginTop: t.spacing.none,
  },
  attachmentChevron: {
    marginLeft: t.spacing.xs,
  },
});
