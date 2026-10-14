import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";

export const styles = StyleSheet.create({
  contactEmptyState: { borderRadius: t.componentRadius.card },
  // 🔹 No colours here – layout only
  container: { flex: 1 },
  content: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.xs,
    paddingBottom: 200,
  },

  /* Hero */
  heroCard: {
    position: "relative",
    borderRadius: t.radius.xl,
    overflow: "hidden",
  },
  heroContent: {
    paddingHorizontal: t.spacing.none,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.none,
  },
  heroEyebrow: {
    ...t.typography.label,
    letterSpacing: 0.6,
  },
  heroTitle: {
    ...t.typography.pageTitle,
    marginTop: t.spacing.xxs,
    letterSpacing: 0.4,
  },
  heroSubTitle: {
    fontSize: t.typography.bodySmall.fontSize,
    marginTop: t.spacing.xxs,
    lineHeight: t.typography.bodySmall.lineHeight,
    fontWeight: "600",
  },
  heroMetaRow: {
    marginTop: t.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.xs,
  },
  heroMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  heroMetaText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },

  /* Search */
  contactsBody: { gap: t.spacing.xs },
  searchRow: {},
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: t.radius.xl,
    borderWidth: 1,
    paddingHorizontal: t.spacing.sm,
    height: t.controls.buttonHeight,
  },
  searchInput: {
    flex: 1,
    fontSize: t.typography.body.fontSize,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnText: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },

  /* Empty state */
  emptyWrap: {
    marginTop: t.spacing["2xl"],
    borderRadius: t.radius.xl,
    paddingVertical: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    marginBottom: t.spacing.xxs,
  },
  emptySubtitle: {
    fontSize: t.typography.bodySmall.fontSize,
    textAlign: "center",
  },

  /* Contact card */
  letterHeading: {
    marginTop: t.spacing.xs,
    paddingHorizontal: t.spacing.xxs,
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    fontWeight: t.typography.pageTitle.fontWeight,
    letterSpacing: 0.8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.controls.cardPadding,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: t.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  avatarText: {
    fontWeight: t.typography.bodyStrong.fontWeight,
    fontSize: t.typography.bodyLarge.fontSize,
  },

  contactCopy: { flex: 1, minWidth: 0 },
  name: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    marginBottom: t.spacing.none,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: t.spacing.xxs,
  },
  infoIcon: { marginRight: t.spacing.xxs },
  meta: {
    flex: 1,
    fontSize: t.typography.bodySmall.fontSize,
  },

  /* Actions */
  actionsCol: {
    marginLeft: t.spacing.xs,
    flexDirection: "row",
    gap: t.spacing.xxs,
  },
  btn: {
    alignItems: "center",
    justifyContent: "center",
    width: t.controls.iconButton,
    height: t.controls.iconButton,
    borderRadius: t.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
