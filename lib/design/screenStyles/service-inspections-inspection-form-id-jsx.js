import { Platform, StyleSheet } from "react-native";
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
  },
  backButton: {
    paddingRight: t.spacing.xs,
  },
  pageTitle: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    color: COLORS.textHigh,
  },
  pageSubtitle: {
    marginTop: t.spacing.none,
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textMid,
  },

  scrollContent: { padding: t.spacing.md, paddingTop: t.spacing.xs, paddingBottom: 110 },
  centerRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: t.spacing.xs,
  },
  loadingText: { color: COLORS.textMid, marginLeft: t.spacing.xs, fontSize: t.typography.bodySmall.fontSize },

  sectionHeaderRow: {
    marginTop: t.spacing.xxs,
    marginBottom: t.spacing.xxs,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: t.spacing.xs,
  },
  sectionTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: "700",
    color: COLORS.textHigh,
  },
  sectionHint: {
    fontSize: t.typography.metadata.fontSize,
    color: COLORS.textMid,
    flexShrink: 1,
    maxWidth: "100%",
  },

  card: { padding: t.spacing.sm, marginBottom: t.spacing.xs },
  flatSectionContent: {
    marginBottom: t.spacing.xs,
  },
  fieldGroup:    { marginBottom: t.spacing.sm },
  fieldLabel:    { fontSize: t.typography.bodySmall.fontSize, fontWeight: "600", color: COLORS.textMid, marginBottom: t.spacing.xxs },
  input: {
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textHigh,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    fontSize: t.typography.bodyLarge.fontSize,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  readonlyField: {
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    minHeight: t.density.compact.controlHeight,
    borderRadius: t.componentRadius.field,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    justifyContent: "center",
  },
  readonlyText: { color: COLORS.textHigh, fontSize: t.typography.body.fontSize },
  selectedEquipmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xs,
  },
  equipmentDetailsToggle: {
    alignSelf: "flex-start",
    paddingVertical: t.spacing.xs,
  },
  selectedEquipmentName: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  selectedEquipmentMeta: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
  },
  changeText: {
    color: COLORS.primaryAction,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textHigh,
    fontSize: t.typography.bodyLarge.fontSize,
  },
  selectorList: {
    maxHeight: 180,
    marginBottom: t.spacing.sm,
  },
  selectorEmptyText: {
    marginBottom: t.spacing.sm,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
  },
  equipmentOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: t.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  equipmentOptionActive: {
    backgroundColor: staticColors.rgba_qyx95c,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.xs,
  },
  equipmentOptionName: {
    fontSize: t.typography.body.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  equipmentOptionMeta: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
  },

  checkRowWrapper: {
    paddingVertical: t.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: t.spacing.xxs,
    marginBottom: t.spacing.xxs,
  },
  checkIconWrap: {
    paddingRight: t.spacing.xs,
  },
  checkIconEmpty: {
    width: 30,
    height: 30,
    borderRadius: t.radius.pill,
    borderWidth: 2.5,
    borderColor: COLORS.textMid,
  },
  checkIconFilled: {
    width: 30,
    height: 30,
    borderRadius: t.radius.pill,
    backgroundColor: COLORS.primaryAction,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    flex: 1,
    fontSize: t.typography.body.fontSize,
    color: COLORS.textLow,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: t.spacing.xxs,
    marginBottom: t.spacing.xxs,
  },
  conditionPill: {
    minWidth: t.controls.buttonHeight,
    minHeight: t.controls.buttonHeight,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  conditionText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  conditionTextActive: {
    color: COLORS.textHigh,
  },
  naPill: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  naPillActive: {
    backgroundColor: staticColors.rgba_1tlzw3k,
    borderColor: COLORS.textMid,
  },
  naText: {
    fontSize: t.typography.bodySmall.fontSize,
    color: COLORS.textLow,
  },
  naTextActive: {
    color: COLORS.textMid,
    fontWeight: "600",
  },
  photoIconButton: {
    marginLeft: t.spacing.xxs,
    width: t.controls.iconButton,
    height: t.controls.iconButton,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  photoBadge: {
    position: "absolute", top: -5, right: -5,
    minWidth: 15, height: 15, borderRadius: t.radius.sm,
    backgroundColor: COLORS.primaryAction,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: t.spacing.xxs,
  },
  photoBadgeText: { color: staticColors.hex_fff_yhjmu8, fontSize: t.typography.micro.fontSize, fontWeight: t.typography.bodyStrong.fontWeight },
  checkNoteInput: {
    marginTop: t.spacing.xxs,
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    fontSize: t.typography.body.fontSize,
    color: COLORS.textHigh,
    textAlignVertical: "top",
    minHeight: 48,
  },
  checkNoteInputRequired: {
    borderWidth: 2,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reportBadge: {
    width: 28,
    height: 28,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  reportBadgeText: {
    color: COLORS.textHigh,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
  },
  reportTitle: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
  },
  reportDetails: {
    marginTop: t.spacing.none,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    lineHeight: t.typography.metadata.lineHeight,
  },

  resultRow: { flexDirection: "row", gap: t.spacing.xs },
  resultButton: {
    flex: 1, borderWidth: 2, borderRadius: t.radius.sm,
    paddingVertical: t.spacing.sm, alignItems: "center",
  },
  resultButtonText: { fontSize: t.typography.bodyLarge.fontSize, fontWeight: "700" },

  signatureInfo: {
    fontSize: t.typography.caption.fontSize,
    color: COLORS.textMid,
  },

  photoButtonsRow: { flexDirection: "row", gap: t.spacing.xs },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: t.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: t.spacing.xs,
    backgroundColor: staticColors.hex_ffffff_5c2ocm,
  },
  photoAddText: { color: COLORS.textHigh, fontSize: t.typography.body.fontSize, fontWeight: "600" },
  photoThumbWrapper: { marginRight: t.spacing.xs, position: "relative" },
  photoThumb: { width: 70, height: 70, borderRadius: t.radius.sm },
  photoRemoveBadge: {
    position: "absolute", top: -4, right: -4,
    width: 18, height: 18, borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_18a7ub6,
    alignItems: "center", justifyContent: "center",
  },

  submitButton: {
    marginTop: t.spacing.xs,
    backgroundColor: COLORS.primaryAction,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  submitText: { color: COLORS.textHigh, fontSize: t.typography.bodyLarge.fontSize, fontWeight: "700" },

  modalOverlay: {
    flex: 1, backgroundColor: staticColors.rgba_11xlyme,
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: t.spacing.lg, paddingBottom: Platform.OS === "ios" ? 36 : 20,
  },
  modalTitle: { fontSize: t.typography.bodyLarge.fontSize, fontWeight: "700", marginBottom: t.spacing.md },
  modalOption: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: t.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  modalOptionText: { fontSize: t.typography.bodyLarge.fontSize },
  modalCancelText: { fontSize: t.typography.body.fontSize, textAlign: "center", flex: 1 },
});
