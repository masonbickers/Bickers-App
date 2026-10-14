import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";

export const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: t.spacing.xs }, tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderBottomWidth: 2 },
  row: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: t.spacing.sm, padding: t.spacing.sm },
  rowCopy: { flex: 1, minWidth: 0, gap: t.spacing.xxs }, empty: { paddingVertical: t.spacing.xl }, notice: { gap: t.spacing.sm },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.xs, marginTop: t.spacing.sm },
  attachment: { borderWidth: 1, borderRadius: t.radius.md, padding: t.spacing.sm, flexDirection: "row", alignItems: "center", gap: t.spacing.sm, marginVertical: t.spacing.xxs },
  thumbnail: { width: 52, height: 64, borderRadius: t.radius.sm }, suggestions: { borderWidth: 1, borderRadius: t.radius.md, padding: t.spacing.sm, gap: t.spacing.xs },
  amountFields: { flexDirection: "row", gap: t.spacing.sm }, currency: { width: 95 },
  previewPanel: { gap: t.spacing.sm }, attachmentPreview: { height: 440 }, previewImage: { flex: 1, width: "100%" },
});
