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
    color: COLORS.textMid,
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingBottom: t.spacing["2xl"],
  },
  timelineRow: {
    flexDirection: "row",
  },
  timelineRail: {
    width: 38,
    alignItems: "center",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryAction,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineCard: { flex: 1, padding: t.spacing.sm, marginBottom: t.spacing.sm },
  timelineHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineTitle: {
    flex: 1,
    paddingRight: t.spacing.xs,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  timelineDate: {
    maxWidth: 112,
    fontSize: t.typography.caption.fontSize,
    textAlign: "right",
  },
  timelineMeta: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
  },
  timelineSubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
  },
  photoThumb: {
    width: 70,
    height: 70,
    borderRadius: t.radius.sm,
    marginRight: t.spacing.xs,
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
