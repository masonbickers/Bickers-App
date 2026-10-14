import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  requestNotice: { marginBottom: t.spacing.sm },
  calendarCard: {
    borderRadius: t.componentRadius.card,
    overflow: "hidden",
  },
  container: { flex: 1, backgroundColor: staticColors.hex_0b0b0b_9v81ck },

  heroCard: {
    marginHorizontal: t.spacing.sm,
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xs,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBackButton: {
    width: 38,
    height: 38,
    borderRadius: t.radius.pill,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  heroTitleWrap: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: t.spacing.sm,
  },
  heroSpacer: {
    width: 38,
    height: 38,
  },
  heroContent: {
    paddingBottom: t.spacing.xxs,
    paddingTop: t.spacing.none,
  },
  heroTitle: {
    ...t.typography.pageTitle,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  heroSubTitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
    fontWeight: "600",
    textAlign: "center",
  },
  heroMetaRow: {
    marginTop: t.spacing.xs,
    flexDirection: "row",
    gap: t.spacing.xs,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  heroMetaText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },

});
