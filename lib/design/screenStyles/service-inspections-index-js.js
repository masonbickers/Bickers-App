import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";

export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: t.typography.titleSmall.fontSize, fontWeight: t.typography.bodyStrong.fontWeight },
  pageSubtitle: { marginTop: t.spacing.none, fontSize: t.typography.bodySmall.fontSize },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryAction,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    marginLeft: t.spacing.sm,
  },
  newButtonText: {
    color: COLORS.textHigh,
    fontWeight: "700",
    fontSize: t.typography.body.fontSize,
    marginLeft: t.spacing.xxs,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: t.spacing.md, paddingTop: t.spacing.sm },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: t.spacing.xl,
  },
  emptyTitle: { marginTop: t.spacing.sm, fontSize: t.typography.sectionTitle.fontSize, fontWeight: "700" },
  emptySubtitle: { marginTop: t.spacing.xxs, fontSize: t.typography.bodySmall.fontSize, textAlign: "center" },
  card: {
    borderRadius: t.componentRadius.card,
    borderWidth: 1,
    padding: t.spacing.sm,
    marginBottom: t.spacing.xs,
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: t.spacing.xs,
  },
  cardTitle: { fontSize: t.typography.bodyLarge.fontSize, fontWeight: "700" },
  cardSub: { fontSize: t.typography.metadata.fontSize, marginTop: t.spacing.none },
  statusPill: {
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    marginLeft: t.spacing.xs,
    alignSelf: "flex-start",
  },
  statusPillText: { fontSize: t.typography.caption.fontSize, fontWeight: "700" },
  cardMeta: { flexDirection: "row", gap: t.spacing.sm },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: t.typography.metadata.fontSize },
  cardChevron: { position: "absolute", right: 12, top: "50%" },
});
