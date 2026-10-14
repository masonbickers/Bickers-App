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
    padding: t.spacing.md,
    paddingBottom: 110,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: t.spacing.xs,
  },
  sectionTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  sectionHint: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "700",
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: t.componentRadius.card,
    backgroundColor: COLORS.card,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  flatSectionContent: {
    gap: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  label: {
    marginBottom: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "700",
    color: COLORS.textMid,
  },
  labelSmall: {
    marginBottom: t.spacing.xxs,
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
    textTransform: "uppercase",
    color: COLORS.textMid,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: t.radius.sm,
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    marginBottom: t.spacing.sm,
    fontSize: t.typography.body.fontSize,
    color: COLORS.textHigh,
  },
  multiline: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  searchBox: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: t.radius.sm,
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    paddingHorizontal: t.spacing.xs,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: t.typography.body.fontSize,
  },
  centerRow: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  selectedVehicleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleDetailsToggle: {
    alignSelf: "flex-start",
    paddingVertical: t.spacing.xs,
  },
  vehicleMetaRow: {
    marginTop: t.spacing.xs,
  },
  vehicleMeta: {
    fontSize: t.typography.metadata.fontSize,
    lineHeight: t.typography.metadata.lineHeight,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: t.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  vehicleRowActive: {
    backgroundColor: staticColors.rgba_qyx95c,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.xs,
  },
  vehicleName: {
    fontSize: t.typography.body.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  vehicleReg: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  sectionTitleAlt: {
    marginBottom: t.spacing.sm,
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  saveButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.sm,
    backgroundColor: COLORS.primaryAction,
  },
  saveButtonText: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
});
