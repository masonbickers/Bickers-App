import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { servicePalette as COLORS } from "../semantics.js";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  viewer: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: t.spacing.xs,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  imageWrapper: {
    flex: 1,
    backgroundColor: staticColors.hex_000_yhlkvq,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
