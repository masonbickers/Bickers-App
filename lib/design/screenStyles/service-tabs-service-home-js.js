import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContent: {
    paddingHorizontal: t.spacing.none,
    paddingTop: t.spacing.xxs,
    paddingBottom: t.spacing.sm,
  },
  header: {
    paddingHorizontal: t.spacing.none,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: t.spacing.none,
  },
  pageTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: "600",
  },
  pageSubtitle: {
    marginTop: t.spacing.xxs,
    color: COLORS.textMid,
    fontSize: t.typography.bodySmall.fontSize,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: t.spacing.sm,
    color: COLORS.textMid,
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingTop: t.spacing.none,
    paddingBottom: 140,
  },
  fleetOverview: {
    paddingVertical: t.spacing.xs,
  },
  infoTextTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "700",
    marginBottom: t.spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    color: COLORS.textHigh,
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "600",
    paddingRight: t.spacing.xs,
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: t.spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
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
  vehicleCard: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.border,
  },
  vehicleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xxs,
  },
  vehicleTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  vehicleReg: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  cardHint: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
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
    color: COLORS.textLow,
  },
  metaValue: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
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
});

export const quickStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    paddingRight: t.spacing.xl,
    borderWidth: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.hex_262626_70t9oi,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.xs,
  },
  badge: {
    position: "absolute",
    top: -7,
    right: -9,
    minWidth: 18,
    height: 18,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.xxs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: staticColors.hex_ed1c25_4py4qa,
    borderWidth: 1,
    borderColor: staticColors.hex_ffffff_5c2ocm,
  },
  badgeText: {
    color: staticColors.hex_ffffff_5c2ocm,
    fontSize: t.typography.micro.fontSize,
    lineHeight: t.typography.micro.lineHeight,
    fontWeight: "600",
  },
  title: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
    marginBottom: t.spacing.none,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: t.typography.metadata.fontSize,
    flexShrink: 1,
  },
});

export const summaryStyles = StyleSheet.create({
  item: {
    flex: 1,
    minWidth: 0,
    paddingRight: t.spacing.sm,
  },
  value: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: "600",
  },
  label: {
    fontSize: t.typography.bodySmall.fontSize,
    marginTop: t.spacing.none,
  },
});
