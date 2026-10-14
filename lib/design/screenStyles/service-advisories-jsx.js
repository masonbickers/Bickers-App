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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.bodySmall.fontSize,
  },
  scrollContent: {
    padding: t.spacing.md,
  },
  summaryCard: { flexDirection: "row", padding: t.spacing.sm, marginBottom: t.spacing.sm },
  summaryItem: {
    flex: 1,
  },
  summaryValue: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  summaryLabel: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
  },
  filterCard: { padding: t.spacing.sm, marginBottom: t.spacing.sm },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: t.radius.sm,
    borderWidth: 1,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: t.typography.bodyLarge.fontSize,
  },
  filterRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  filterPill: {
    borderRadius: t.radius.pill,
    borderWidth: 1,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
  filterPillText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  emptyState: { padding: t.spacing.lg, alignItems: "center" },
  emptyTitle: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  emptySubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    textAlign: "center",
  },
  advisoryGroupCard: { padding: t.spacing.sm, marginBottom: t.spacing.xs },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xs,
  },
  assetTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  groupMetaText: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
  },
  countPill: {
    minWidth: 26,
    height: 26,
    borderRadius: t.radius.lg,
    backgroundColor: COLORS.primaryAction,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.spacing.xs,
  },
  countPillText: {
    color: staticColors.hex_ffffff_5c2ocm,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
  },
  advisoryItemRow: {
    flexDirection: "row",
    paddingTop: t.spacing.xs,
  },
  advisoryItemDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: t.spacing.xs,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.spacing.xs,
  },
  advisoryTitle: {
    flex: 1,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  daysPill: {
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_iz9fu0,
    borderWidth: 1,
    borderColor: staticColors.rgba_iz9cnj,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  daysPillText: {
    color: COLORS.amber,
    fontSize: t.typography.caption.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  detailsText: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
  },
  metaText: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  actionButton: {
    minHeight: 32,
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
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
});
