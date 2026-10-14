import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";
import { staticColors } from "../staticColors.js";

export const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: t.controls.listRowHeight,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.hex_262626_70t9oi,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  title: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "600",
    color: COLORS.textHigh,
    marginBottom: t.spacing.none,
  },
  subtitle: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textLow,
  },
  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: t.controls.listRowHeight,
    paddingVertical: t.spacing.sm,
    marginBottom: t.spacing.xs,
    borderBottomWidth: 1,
    borderColor: COLORS.primaryAction,
  },
  draftIconWrap: {
    width: 32,
    height: 32,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_6el2ey,
    alignItems: "center",
    justifyContent: "center",
    marginRight: t.spacing.xs,
  },
  draftTitle: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
    marginBottom: t.spacing.none,
  },
  draftSubtitle: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textLow,
  },
});

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  backButton: {
    paddingRight: t.spacing.xs,
  },
  pageTitle: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: "600",
    color: COLORS.textHigh,
  },
  pageSubtitle: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  scrollContent: {
    padding: t.spacing.md,
    paddingTop: t.spacing.none,
    paddingBottom: 140,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: t.spacing.xs,
  },
  sectionTitle: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: "600",
    color: COLORS.textHigh,
    paddingRight: t.spacing.xs,
  },
  draftsWrap: {
    marginTop: t.spacing.none,
    marginBottom: t.spacing.sm,
  },
  draftsTitle: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
    marginBottom: t.spacing.xs,
  },
});
