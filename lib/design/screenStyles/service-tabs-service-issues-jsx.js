import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.bodySmall.fontSize,
  },
  headerCard: {
    marginHorizontal: t.spacing.md,
    marginTop: t.spacing.none,
    marginBottom: t.spacing.none,
  },
  headerContent: {
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.xs,
  },
  headerEyebrow: {
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
  },
  headerTitle: {
    fontSize: t.typography.titleSmall.fontSize,
    lineHeight: t.typography.titleSmall.lineHeight,
    marginTop: t.spacing.none,
  },
  headerSubtitle: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    lineHeight: t.typography.metadata.lineHeight,
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingTop: t.spacing.xxs,
    paddingBottom: 140,
  },
  contentStack: {
    gap: t.spacing.md,
  },
  sectionBlock: {
    gap: t.spacing.sm,
  },
  sectionHeaderRow: {
    gap: t.spacing.xs,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "600",
  },
  sectionSubtitle: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
  },
  sectionCount: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "600",
  },
  emptyCard: { padding: t.spacing.sm },
  emptyText: {
    fontSize: t.typography.bodySmall.fontSize,
  },
  issueCard: {
    flexDirection: "row",
    borderRadius: t.componentRadius.card,
    borderWidth: 1,
    padding: t.spacing.sm,
  },
  vehicleGroup: {
    gap: t.spacing.xs,
  },
  vehicleGroupHeader: {
    minHeight: t.controls.chipMinHeight,
    paddingHorizontal: t.spacing.xxs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
  },
  vehicleGroupTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "600",
  },
  vehicleGroupCount: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },
  groupedIssueList: { padding: t.spacing.none, overflow: "hidden" },
  groupedIssueRow: {
    minHeight: 64,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
  },
  groupedIssueIcon: {
    width: 28,
    height: 28,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  groupedIssueCopy: {
    flex: 1,
    minWidth: 0,
  },
  groupedIssueTitle: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "600",
  },
  groupedIssueMeta: {
    marginTop: t.spacing.xxs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
  },
  groupedIssueDetail: {
    flex: 1,
    minWidth: 0,
    fontSize: t.typography.caption.fontSize,
  },
  compactResolveButton: {
    width: t.controls.buttonHeight,
    height: t.controls.buttonHeight,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  groupToggle: {
    minHeight: t.controls.buttonHeight,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: t.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xxs,
  },
  groupToggleText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  issueMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    marginTop: t.spacing.xxs,
  },
  issueMetaAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
    flexShrink: 0,
  },
  issueTitle: {
    flex: 1,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "600",
  },
  issueDate: {
    fontSize: t.typography.caption.fontSize,
  },
  assetText: {
    flex: 1,
    minWidth: 0,
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
  },
  assetSpacer: {
    flex: 1,
  },
  detailText: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  actionButton: {
    minHeight: t.controls.buttonHeight,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    paddingHorizontal: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
  },
  resolveButton: {
    backgroundColor: staticColors.rgba_13f5dp4,
  },
  actionText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
  },
});
