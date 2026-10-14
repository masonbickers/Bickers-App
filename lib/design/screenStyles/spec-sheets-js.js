import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";

export const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: t.spacing.sm,
  },
  search: {
    borderWidth: 1,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
  emptyBox: {
    padding: t.spacing.md,
    borderRadius: t.componentRadius.card,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyText: {},
  listContent: { paddingBottom: t.spacing.xs },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.sm,
    borderRadius: t.componentRadius.card,
    borderWidth: 1,
    marginBottom: t.spacing.xs,
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: t.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: t.typography.micro.fontSize, fontWeight: "700" },
  itemTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  itemText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    lineHeight: t.typography.body.lineHeight,
  },
  itemSubText: {
    fontSize: t.typography.metadata.fontSize,
    lineHeight: t.typography.metadata.lineHeight,
    marginTop: t.spacing.none,
  },
  itemAction: {
    width: 52,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  viewBtnText: { fontWeight: t.typography.bodyStrong.fontWeight, fontSize: t.typography.metadata.fontSize },
});
