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
    color: COLORS.textHigh,
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: t.spacing.xs,
    color: COLORS.textMid,
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingTop: t.spacing.xs,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    padding: t.spacing.sm,
    borderRadius: t.componentRadius.card,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryAction,
  },
  infoTextTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "700",
    marginBottom: t.spacing.xxs,
  },
  infoTextDetail: {
    color: COLORS.textMid,
    fontSize: t.typography.body.fontSize,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: t.spacing.xs,
  },
  filterChip: {
    borderRadius: t.radius.pill,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    marginRight: t.spacing.xs,
    marginBottom: t.spacing.xs,
    backgroundColor: COLORS.card,
  },
  filterText: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "600",
    color: COLORS.textMid,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  sectionTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    paddingRight: t.spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: t.spacing.sm,
    paddingHorizontal: t.spacing.xl,
  },
  emptyTitle: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "700",
  },
  emptySubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.body.fontSize,
    textAlign: "center",
  },
  vehicleCard: {
    backgroundColor: COLORS.card,
    padding: t.spacing.sm,
    borderRadius: t.componentRadius.card,
    marginBottom: t.spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.border,
  },
  vehicleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xs,
  },
  vehicleTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  vehicleReg: {
    marginTop: t.spacing.none,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: t.spacing.xxs,
    marginBottom: t.spacing.xxs,
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
  defectPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    backgroundColor: COLORS.recceAction,
    marginBottom: t.spacing.xxs,
  },
  defectText: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textHigh,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: t.spacing.xxs,
  },
  metaText: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
    marginRight: t.spacing.sm,
    marginTop: t.spacing.none,
  },
});
