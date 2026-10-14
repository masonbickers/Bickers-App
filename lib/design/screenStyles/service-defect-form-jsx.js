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
    fontSize: t.typography.bodySmall.fontSize,
    marginTop: t.spacing.none,
    color: COLORS.textMid,
  },
  content: {
    padding: t.spacing.md,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flatSectionContent: {
    gap: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },

  /* SECTION HEADERS */
  sectionHeaderRow: {
    marginTop: t.spacing.xxs,
    marginBottom: t.spacing.xxs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  sectionTitleAlt: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
    marginBottom: t.spacing.xs,
  },
  sectionHint: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },

  /* LABELS / INPUTS */
  label: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    color: COLORS.textMid,
    marginTop: t.spacing.xxs,
    marginBottom: t.spacing.xxs,
  },
  labelSmall: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "600",
    color: COLORS.textLow,
    marginBottom: t.spacing.xxs,
  },
  input: {
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textHigh,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    fontSize: t.typography.body.fontSize,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },

  /* VEHICLE SELECTION – MATCH MINOR SERVICE */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textHigh,
    fontSize: t.typography.body.fontSize,
  },
  centerRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: t.spacing.xs,
  },
  emptyText: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: t.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vehicleRowActive: {
    backgroundColor: staticColors.rgba_mxgb69,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.xs,
  },
  vehicleName: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "600",
    color: COLORS.textHigh,
  },
  vehicleReg: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
  },
  selectedVehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: t.spacing.xxs,
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
    color: COLORS.textMid,
  },

  /* SEVERITY / SWITCH */
  pillRow: {
    flexDirection: "row",
    marginTop: t.spacing.xxs,
    marginBottom: t.spacing.xxs,
  },
  severityPill: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    marginRight: t.spacing.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  severityPillActive: {
    backgroundColor: staticColors.rgba_mxgb17,
    borderColor: COLORS.primaryAction,
  },
  severityPillText: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    fontWeight: "600",
  },
  severityPillTextActive: {
    color: COLORS.primaryAction,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: t.spacing.xs,
  },
  switchHint: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textLow,
    marginTop: t.spacing.none,
  },

  /* PHOTOS */
  photosHint: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    marginBottom: t.spacing.xs,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addPhotoText: {
    marginLeft: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    color: COLORS.textHigh,
  },
  photoThumbWrapper: {
    marginRight: t.spacing.xs,
    marginTop: t.spacing.xxs,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: t.radius.sm,
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_11xlynb,
    alignItems: "center",
    justifyContent: "center",
  },

  /* SAVE */
  saveButton: {
    marginTop: t.spacing.xxs,
    borderRadius: t.radius.pill,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
});
