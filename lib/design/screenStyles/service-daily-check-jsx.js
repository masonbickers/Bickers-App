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
    paddingRight: t.spacing.xs,
  },
  title: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  subtitle: {
    marginTop: t.spacing.none,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  content: {
    flex: 1,
    padding: t.spacing.md,
    justifyContent: "center",
  },
  card: { padding: t.spacing.none, alignItems: "center", paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.xl },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.sm,
    backgroundColor: staticColors.rgba_qyx9sr,
  },
  cardTitle: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  cardText: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.body.fontSize,
    lineHeight: t.typography.body.lineHeight,
    textAlign: "center",
    color: COLORS.textMid,
  },
});
