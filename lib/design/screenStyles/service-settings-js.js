import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";

export const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingRight: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  headerTitle: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: "600",
  },
  headerSubtitle: {
    marginTop: t.spacing.none,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  scrollContent: {
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.xl,
    paddingTop: t.spacing.sm,
  },
  section: {
    marginBottom: t.spacing.xl,
  },
  sectionTitle: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: t.spacing.xs,
  },
  item: { padding: t.spacing.sm, marginBottom: t.spacing.xs, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: t.spacing.sm,
  },
  itemTextWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: t.spacing.xs,
  },
  itemText: {
    fontSize: t.typography.bodyLarge.fontSize,
  },
  itemSubText: {
    fontSize: t.typography.metadata.fontSize,
    lineHeight: t.typography.metadata.lineHeight,
    marginTop: t.spacing.xxs,
  },
  timeButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: t.spacing.xxs,
    maxWidth: "55%",
  },
  timeButton: {
    minWidth: 54,
    alignItems: "center",
    paddingVertical: t.spacing.xxs,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.sm,
    borderWidth: 1,
  },
  timeButtonText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "700",
  },
  themeButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  themeButton: {
    paddingVertical: t.spacing.xxs,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.pill,
    borderWidth: 1,
  },
  logoutButton: {
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    marginLeft: t.spacing.xs,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
  },
});
