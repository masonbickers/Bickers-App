import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";

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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingBottom: t.spacing["2xl"],
  },
  summaryCard: {
    flexDirection: "row",
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    marginBottom: t.spacing.xs,
  },
  summaryItem: {
    flex: 1,
    paddingRight: t.spacing.xs,
  },
  summaryValue: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  summaryLabel: {
    fontSize: t.typography.micro.fontSize,
  },
  filterCard: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    marginBottom: t.spacing.sm,
  },
  searchBox: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.xs,
    marginBottom: t.spacing.xs,
  },
  searchInput: {
    flex: 1,
    minHeight: 36,
    fontSize: t.typography.bodySmall.fontSize,
  },
  filterBlock: {
    marginTop: t.spacing.sm,
    gap: t.spacing.xxs,
  },
  filterLabel: {
    fontSize: t.typography.micro.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    textTransform: "uppercase",
  },
  filterChip: {
    minHeight: t.controls.chipMinHeight,
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipsContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.xs,
  },
  filterChipsSingleLine: {
    flexWrap: "nowrap",
  },
  filterChipText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  activityCard: {
    flexDirection: "row",
    position: "relative",
    borderWidth: 1,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
    backgroundColor: COLORS.primaryAction,
  },
  activityHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  activityTitle: {
    flex: 1,
    paddingRight: t.spacing.xs,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  activityDate: {
    maxWidth: 112,
    fontSize: t.typography.caption.fontSize,
    textAlign: "right",
  },
  activityVehicle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
  },
  activitySubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
    paddingRight: t.spacing.sm,
  },
  cardChevron: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  emptyState: { alignItems: "center", padding: t.spacing.xl },
  emptyTitle: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  emptySubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
    textAlign: "center",
  },
});
