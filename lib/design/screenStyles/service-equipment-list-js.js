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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: t.spacing.xs,
    color: COLORS.textMid,
    fontSize: t.typography.bodySmall.fontSize,
  },
  summaryStrip: {
    flexDirection: "row",
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.xxs,
    paddingBottom: t.spacing.none,
    justifyContent: "space-between",
  },
  summaryPill: {
    flex: 1,
    minHeight: 36,
    paddingVertical: t.spacing.xxs,
    paddingHorizontal: t.spacing.xxs,
    marginRight: t.spacing.xxs,
  },
  summaryValue: {
    fontSize: t.typography.sectionTitle.fontSize,
    lineHeight: t.typography.sectionTitle.lineHeight,
    fontWeight: "600",
  },
  summaryLabel: {
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
  },
  controlsContainer: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.xxs,
    paddingBottom: t.spacing.none,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  searchInput: {
    flex: 1,
    fontSize: t.typography.bodySmall.fontSize,
    paddingVertical: t.spacing.none,
    marginRight: t.spacing.xxs,
  },
  filterRow: {
    marginTop: t.spacing.xs,
    paddingBottom: t.spacing.none,
  },
  filterChip: {
    minHeight: t.controls.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    marginRight: t.spacing.xs,
  },
  filterChipText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.none,
    paddingBottom: 104,
  },
  sectionBlock: {
    marginBottom: t.spacing.xs,
  },
  sectionHeaderRow: {
    minHeight: t.controls.buttonHeight,
    gap: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: t.spacing.xxs,
    paddingBottom: t.spacing.none,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
  },
  sectionCount: {
    flexShrink: 0,
    fontSize: t.typography.metadata.fontSize,
  },
  sectionDescription: {
    fontSize: t.typography.caption.fontSize,
    marginBottom: t.spacing.xxs,
  },
  equipmentCard: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    marginTop: t.spacing.xxs,
    padding: t.spacing.sm,
    borderLeftWidth: 3,
  },
  equipmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xxs,
  },
  equipmentTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
  },
  equipmentMeta: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
  },
  cardHint: {
    fontSize: t.typography.caption.fontSize,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: t.spacing.xxs,
    alignItems: "center",
  },
  statusPill: {
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    marginRight: t.spacing.xs,
    marginBottom: t.spacing.xxs,
  },
  statusPillText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "600",
  },
  neutralPill: {
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    marginRight: t.spacing.xs,
    marginBottom: t.spacing.xxs,
    backgroundColor: staticColors.rgba_y8isnm,
  },
  neutralPillText: {
    color: COLORS.textMid,
    fontSize: t.typography.caption.fontSize,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: t.spacing.xs,
  },
  metaItem: {
    marginRight: t.spacing.md,
    marginBottom: t.spacing.none,
  },
  metaLabel: {
    fontSize: t.typography.caption.fontSize,
  },
  metaValue: {
    fontSize: t.typography.metadata.fontSize,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: t.spacing.sm,
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
  },
});
