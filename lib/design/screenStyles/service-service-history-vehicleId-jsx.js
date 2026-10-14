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
    width: 32,
    height: 32,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  title: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  subtitle: {
    fontSize: t.typography.metadata.fontSize,
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

  /* Vehicle summary */
  vehicleCard: {
    paddingVertical: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  vehicleRowTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xs,
  },
  vehicleNameText: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  vehicleRegText: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.none,
  },
  mileageChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
  },
  mileageChipText: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textMid,
    fontWeight: "600",
  },
  vehicleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: t.spacing.xxs,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
  },
  metaValue: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.none,
  },
  metaDivider: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.border,
    marginHorizontal: t.spacing.xs,
    opacity: 0.8,
  },

  /* Stats strip */
  statsStrip: {
    flexDirection: "row",
    paddingVertical: t.spacing.xs,
    marginBottom: t.spacing.md,
  },
  statsItem: {
    flex: 1,
  },
  statsLabel: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
  },
  statsValue: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textHigh,
    fontWeight: "600",
    marginTop: t.spacing.none,
  },

  /* History list */
  card: { padding: t.spacing.sm },
  emptyText: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  row: {
    paddingVertical: t.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.rgba_5ns94m,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.none,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xxs,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.chipBg,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
  },
  typePillText: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textHigh,
    fontWeight: "600",
  },
  recentPill: {
    marginLeft: t.spacing.xxs,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.accentSoft,
  },
  recentPillText: {
    fontSize: t.typography.micro.fontSize,
    color: COLORS.accent,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  rowMeta: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
  },
  rowSummary: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    marginTop: t.spacing.xxs,
  },
  tapHint: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
    marginTop: t.spacing.xxs,
  },
});
