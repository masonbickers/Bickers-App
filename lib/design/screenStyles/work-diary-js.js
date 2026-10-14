import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    marginBottom: t.spacing.sm,
  },
  searchInputWrap: {
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    fontSize: t.typography.body.fontSize,
  },
  clearSearchBtn: {
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    minHeight: t.controls.buttonHeight,
    justifyContent: "center",
  },
  clearSearchText: { fontSize: t.typography.metadata.fontSize, fontWeight: t.typography.bodyStrong.fontWeight },
  quickDateRow: {
    marginTop: t.spacing.xs,
    flexDirection: "row",
    gap: t.spacing.xs,
  },
  quickDateBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    minHeight: t.controls.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  quickDateText: { fontSize: t.typography.metadata.fontSize, fontWeight: t.typography.bodyStrong.fontWeight },
  inactiveToggle: {
    minHeight: t.controls.buttonHeight,
    marginTop: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    borderWidth: 1,
    borderRadius: t.radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xxs,
  },
  inactiveToggleText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  weekStrip: { padding: t.spacing.xxs, marginBottom: t.spacing.xs, flexDirection: "row" },
  weekDay: {
    flex: 1,
    minHeight: 64,
    borderRadius: t.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDayName: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },
  weekDayNumber: {
    ...t.typography.body,
    fontWeight: t.typography.bodyStrong.fontWeight,
    marginTop: t.spacing.none,
  },
  weekDayDot: {
    width: 4,
    height: 4,
    borderRadius: t.radius.pill,
    marginTop: t.spacing.none,
  },
  filterRow: {
    gap: t.spacing.xxs,
    paddingBottom: t.spacing.xs,
  },
  filterChip: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
  },
  filterChipText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "700",
  },
  monthToggle: {
    minHeight: t.controls.buttonHeight,
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.sm,
    marginBottom: t.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xs,
  },
  monthToggleText: {
    flex: 1,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  card: { padding: t.spacing.none, overflow: "hidden", marginBottom: t.spacing.sm },

  /* Sections */
  section: {
    padding: t.spacing.none,
    marginBottom: t.spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: t.spacing.xs,
  },
  sectionTitle: { fontSize: t.typography.bodyLarge.fontSize, fontWeight: t.typography.bodyStrong.fontWeight },
  upcomingHeader: { marginBottom: t.spacing.xs, marginTop: t.spacing.none },

  badge: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.none,
    borderRadius: t.radius.md,
  },
  badgeText: { fontSize: t.typography.metadata.fontSize, fontWeight: t.typography.bodyStrong.fontWeight },
  smallChip: {
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.none,
    borderRadius: t.radius.pill,
    borderWidth: 1,
  },
  smallChipMuted: {},
  smallChipText: { fontSize: t.typography.caption.fontSize, fontWeight: t.typography.bodyStrong.fontWeight },
  smallChipTextMuted: {},
  legendTone: {
    width: 10,
    height: 10,
    borderRadius: t.radius.pill,
  },
  jobCard: {
    flexDirection: "row",
    padding: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  leftBar: {
    width: 4,
    borderRadius: t.radius.sm,
    marginRight: t.spacing.xs,
  },
  leftActive: { backgroundColor: staticColors.hex_22c55e_74qlvk }, // default green
  leftMuted: { backgroundColor: staticColors.hex_6b7280_3k0ytb }, // grey
  leftMaintenance: { backgroundColor: staticColors.hex_f97316_oh807u }, // orange
  leftFirstPencil: { backgroundColor: staticColors.hex_facc15_p8audh }, // yellow
  leftSecondPencil: { backgroundColor: staticColors.hex_ef4444_sj3rhh }, // red
  leftNightShoot: { backgroundColor: staticColors.hex_a855f7_u9x9hq }, // purple

  jobHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: t.spacing.xxs,
  },
  jobTitle: { fontWeight: t.typography.bodyStrong.fontWeight, flexShrink: 1, paddingRight: t.spacing.xs },
  statusRow: { marginTop: t.spacing.xxs, flexDirection: "row", gap: t.spacing.xs },
  jobStatus: {
    fontSize: t.typography.metadata.fontSize,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.none,
    borderRadius: t.radius.sm,
  },
  jobStatusMuted: {},
  jobMeta: { fontSize: t.typography.bodySmall.fontSize, marginTop: t.spacing.none },
  jobMetaMuted: {},
  jobResourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
    marginTop: t.spacing.none,
  },
  jobResourceText: {
    flex: 1,
    minWidth: 0,
    fontSize: t.typography.bodySmall.fontSize,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: staticColors.rgba_18a7ub6,
    justifyContent: "center",
    alignItems: "center",
    padding: t.spacing.md,
  },
  modalCard: {
    width: "92%",
    borderWidth: 1,
    borderRadius: t.radius.lg,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderBottomWidth: 1,
  },
  modalHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  modalEyebrow: {
    ...t.typography.label,
  },
  modalTitle: {
    ...t.typography.titleSmall,
    marginTop: t.spacing.none,
  },
  modalPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.xxs,
    marginTop: t.spacing.xs,
  },
  modalPill: {
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.none,
  },
  modalPillText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    paddingHorizontal: t.spacing.md,
    paddingBottom: t.spacing.lg,
  },
  modalSection: {
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
  },
  modalSectionTitle: {
    ...t.typography.label,
    marginBottom: t.spacing.xxs,
  },
  modalDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  modalDetailIcon: {
    width: 36,
    height: 36,
    borderRadius: t.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDetailCopy: {
    flex: 1,
    minWidth: 0,
  },
  modalDetailLabel: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
  },
  modalDetailValue: {
    fontSize: t.typography.body.fontSize,
    lineHeight: t.typography.body.lineHeight,
    fontWeight: "600",
  },
});
