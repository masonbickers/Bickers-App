import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";

export const styles = StyleSheet.create({
  summaryCard: { padding: t.spacing.md },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
  },
  iconBubble: {
    width: 58,
    height: 58,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: { flex: 1, minWidth: 0 },
  notificationTitle: { fontSize: t.typography.titleSmall.fontSize, lineHeight: t.typography.titleSmall.lineHeight, fontWeight: t.typography.pageTitle.fontWeight },
  typeLabel: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.caption.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  messageCard: { marginTop: t.spacing.md, paddingTop: t.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: t.spacing.xs },
  messageLine: { flexDirection: "row", alignItems: "flex-start", gap: t.spacing.xs },
  messageDot: { width: 5, height: 5, marginTop: t.spacing.xs, borderRadius: t.radius.pill },
  body: { flex: 1, fontSize: t.typography.bodySmall.fontSize, lineHeight: t.typography.bodySmall.lineHeight, fontWeight: "700" },
  detailCard: { paddingHorizontal: t.spacing.md, overflow: "hidden" },
  detailRow: {
    minHeight: 52,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: t.spacing.md,
  },
  detailLabel: { fontSize: t.typography.bodySmall.fontSize, fontWeight: "700" },
  detailValue: { flex: 1, fontSize: t.typography.bodySmall.fontSize, fontWeight: t.typography.bodyStrong.fontWeight, textAlign: "right" },
  detailNote: {
    paddingVertical: t.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: t.spacing.xxs,
  },
  detailNoteValue: {
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
    fontWeight: "700",
  },

  cta: {
    marginTop: t.spacing.sm,
    minHeight: 52,
    borderRadius: t.radius.xl,
    paddingHorizontal: t.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaContent: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs },
  ctaText: { fontWeight: t.typography.pageTitle.fontWeight, fontSize: t.typography.bodyLarge.fontSize },

  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: t.spacing.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.sm,
  },
  emptyTitle: { fontSize: t.typography.sectionTitle.fontSize, fontWeight: t.typography.pageTitle.fontWeight },
  emptyText: { marginTop: t.spacing.xxs, fontSize: t.typography.bodySmall.fontSize, lineHeight: t.typography.bodySmall.lineHeight, textAlign: "center" },
});
