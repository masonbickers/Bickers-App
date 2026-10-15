import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { staticColors } from "../staticColors.js";

const pagePadding = 14;
const gridGap = 10;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: pagePadding,
    paddingTop: t.spacing.xs,
    paddingBottom: 200,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: t.spacing.none,
    paddingHorizontal: t.spacing.none,
    gap: t.spacing.sm,
  },

  heroIntro: {
    flex: 1,
    paddingTop: t.spacing.none,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    marginRight: t.spacing.xxs,
  },

  heroLogo: {
    width: 132,
    height: 38,
    marginBottom: t.spacing.xxs,
    marginLeft: -10,
    alignSelf: "flex-start",
  },

  userIcon: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  headerButtonMaterial: {
    borderRadius: t.componentRadius.iconButton,
  },

  userInitials: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    letterSpacing: 0.2,
  },

  heroEyebrow: {
    ...t.typography.label,
    letterSpacing: 0.6,
  },

  heroTitle: {
    ...t.typography.pageTitle,
    marginTop: t.spacing.xxs,
    letterSpacing: 0.2,
  },

  heroSubtitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
    fontWeight: "600",
  },

  userPresence: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: t.radius.pill,
    right: 2,
    bottom: 2,
    borderWidth: 2,
  },

  userNotificationBadge: {
    position: "absolute",
    minWidth: 20,
    height: 20,
    borderRadius: t.radius.md,
    right: -6,
    top: -6,
    borderWidth: 2,
    paddingHorizontal: t.spacing.xxs,
    alignItems: "center",
    justifyContent: "center",
  },

  userNotificationBadgeText: {
    color: staticColors.hex_fff_yhjmu8,
    fontSize: t.typography.micro.fontSize,
    lineHeight: t.typography.micro.lineHeight,
    fontWeight: t.typography.pageTitle.fontWeight,
  },

  heroCard: {
    position: "relative",
    borderRadius: t.radius.xl,
    overflow: "hidden",
    paddingHorizontal: t.spacing.none,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.none,
  },

  dashboardBody: {
    gap: t.spacing.xs,
    paddingBottom: t.spacing.xl,
  },

  heroMetaRow: {
    marginTop: t.spacing.xxs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    flexWrap: "wrap",
  },

  heroMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
    minHeight: 26,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderWidth: 1,
  },

  heroMetaText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "700",
  },

  heroUpdateStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
    minHeight: t.controls.chipMinHeight,
  },

  heroUpdateText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: "600",
  },

  block: {
    padding: t.spacing.sm,
    borderRadius: t.radius.xl,
    borderWidth: 1,
  },

  flatSectionBlock: {
    paddingHorizontal: t.spacing.none,
    paddingTop: t.spacing.none,
    paddingBottom: t.spacing.none,
    borderWidth: 0,
  },

  blockHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: t.spacing.xxs,
    gap: t.spacing.xs,
  },

  blockTitleWrap: {
    flex: 1,
  },

  blockTitle: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    letterSpacing: 0.2,
  },

  blockSubTitle: {
    fontSize: t.typography.metadata.fontSize,
    marginTop: t.spacing.none,
    fontWeight: "600",
  },

  countPill: {
    minWidth: 34,
    minHeight: 26,
    borderRadius: t.radius.pill,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: t.spacing.xs,
    borderWidth: 1,
  },

  countPillText: {
    fontWeight: t.typography.pageTitle.fontWeight,
    fontSize: t.typography.metadata.fontSize,
  },

  statusSummary: {
    minHeight: t.controls.buttonHeightLg,
    marginTop: t.spacing.xxs,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
  },

  statusSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: t.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  statusSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },

  statusSummaryTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    lineHeight: t.typography.bodyLarge.lineHeight,
    fontWeight: t.typography.pageTitle.fontWeight,
  },

  statusSummaryText: {
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    fontWeight: "600",
  },

  emptyState: {
    marginTop: t.spacing.xxs,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    padding: t.spacing.sm,
    alignItems: "center",
  },

  emptyIcon: {
    width: 34,
    height: 34,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: t.spacing.xxs,
  },

  statusText: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    textAlign: "center",
  },

  emptySubText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: "600",
    textAlign: "center",
    marginTop: t.spacing.xxs,
  },

  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
  },

  dayNavBtn: {
    width: 32,
    height: 32,
    borderRadius: t.componentRadius.iconButton,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  jobCard: { flexDirection: "row", padding: t.spacing.xs, marginTop: t.spacing.xs, overflow: "hidden" },

  jobAccent: {
    width: 4 + t.spacing.xs,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderTopLeftRadius: t.radius.lg,
    borderBottomLeftRadius: t.radius.lg,
  },

  jobContent: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: t.spacing.xxs,
    gap: t.spacing.xs,
  },

  jobTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    flex: 1,
  },

  callTimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xxs,
    paddingVertical: t.spacing.xxs,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.pill,
    borderWidth: 1,
  },

  callTime: {
    fontWeight: t.typography.pageTitle.fontWeight,
    fontSize: t.typography.metadata.fontSize,
  },

  jobDetail: {
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
    marginBottom: t.spacing.none,
  },

  jobLabel: {
    fontWeight: t.typography.bodyStrong.fontWeight,
  },

  jobFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: t.spacing.xxs,
    gap: t.spacing.xs,
  },

  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
    borderWidth: 1,
  },

  statusBadgeText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
  },

  jobOpenHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.none,
  },

  jobOpenText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
  },

  notesBox: {
    marginTop: t.spacing.xxs,
    borderRadius: t.radius.md,
    borderWidth: 1,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },

  recceBtn: {
    marginTop: t.spacing.xs,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    borderRadius: t.radius.md,
    alignSelf: "flex-start",
  },

  recceBtnText: {
    fontWeight: t.typography.pageTitle.fontWeight,
    fontSize: t.typography.bodySmall.fontSize,
    color: staticColors.hex_fff_yhjmu8,
  },

  groupSection: {
    borderRadius: t.radius.xl,
  },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: t.spacing.xs,
  },

  groupTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    marginRight: t.spacing.xs,
  },

  groupDividerLine: {
    height: 1,
    flex: 1,
    borderRadius: t.radius.sm,
  },

  moreList: {
    padding: t.spacing.none,
    overflow: "hidden",
  },

  moreActionRow: {
    minHeight: t.controls.buttonHeightLg + t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
  },

  moreActionIcon: {
    width: 36,
    height: 36,
    borderRadius: t.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  moreActionCopy: {
    flex: 1,
    minWidth: 0,
  },

  moreActionTitle: {
    fontSize: t.typography.body.fontSize,
    lineHeight: t.typography.body.lineHeight,
    fontWeight: t.typography.pageTitle.fontWeight,
  },

  moreActionMeta: {
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    fontWeight: "600",
  },

  grid: {
    width: "100%",
  },

  gridRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: gridGap,
  },

  gridRowLast: {
    marginBottom: t.spacing.none,
  },

  gridItemSpacing: {
    marginRight: gridGap,
  },

  button: {
    flex: 1,
    minWidth: 0,
    minHeight: t.controls.buttonHeightLg + t.spacing.lg,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: t.spacing.xs,
    padding: t.spacing.sm,
  },

  buttonIconWrap: {
    width: 34,
    height: 34,
    borderRadius: t.radius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    flexShrink: 0,
  },

  buttonTextWrap: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  buttonText: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    lineHeight: t.typography.bodySmall.lineHeight,
    textAlign: "left",
  },

  buttonMeta: {
    marginTop: t.spacing.none,
    fontSize: t.typography.caption.fontSize,
    lineHeight: t.typography.caption.lineHeight,
    fontWeight: "600",
    textAlign: "left",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: staticColors.rgba_18a7u5b,
    justifyContent: "center",
    alignItems: "center",
    padding: t.spacing.md,
  },

  modalContent: {
    padding: t.spacing.md,
    borderRadius: t.radius.xl,
    width: "92%",
    maxHeight: "82%",
    borderWidth: 1,
  },

  recceModalContent: {
    padding: t.spacing.md,
    borderRadius: t.radius.xl,
    width: "94%",
    maxHeight: "88%",
    borderWidth: 1,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: t.radius.pill,
    backgroundColor: staticColors.rgba_r89e45,
    alignSelf: "center",
    marginBottom: t.spacing.xs,
  },

  modalTitle: {
    fontSize: t.typography.titleSmall.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    marginBottom: t.spacing.xxs,
    textAlign: "center",
  },

  modalSubtitle: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: t.spacing.xs,
  },

  modalInfoBox: {
    borderRadius: t.radius.lg,
    borderWidth: 0,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.none,
    marginTop: t.spacing.xxs,
    marginBottom: t.spacing.xs,
  },

  modalDetailRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },

  modalDetailTextWrap: {
    flex: 1,
  },

  modalDetailLabel: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: t.typography.bodyStrong.fontWeight,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    marginBottom: t.spacing.none,
  },

  modalDetailValue: {
    fontSize: t.typography.body.fontSize,
    fontWeight: "700",
    lineHeight: t.typography.body.lineHeight,
  },

  accountIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
  accountIdentityCopy: {
    flex: 1,
    minWidth: 0,
    gap: t.spacing.xxs,
  },
  accountFooterButton: {
    flex: 1,
  },

  modalPrimaryButton: {
    minHeight: 42,
    borderRadius: t.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
  },

  modalPrimaryButtonText: {
    color: staticColors.hex_fff_yhjmu8,
    fontWeight: t.typography.pageTitle.fontWeight,
    fontSize: t.typography.body.fontSize,
  },

  modalSecondaryButton: {
    minHeight: 42,
    borderRadius: t.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    borderWidth: 0,
  },

  modalSecondaryButtonText: {
    fontWeight: t.typography.pageTitle.fontWeight,
    fontSize: t.typography.body.fontSize,
  },

  recceScroll: {
    maxHeight: 470,
  },

  recceScrollContent: {
    paddingBottom: t.spacing.xl,
  },

  inputLabel: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: t.typography.pageTitle.fontWeight,
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xxs,
    letterSpacing: 0.25,
  },

  input: {
    borderWidth: 1,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    marginBottom: t.spacing.xxs,
    fontSize: t.typography.body.fontSize,
    fontWeight: "600",
  },

  photoButtonRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
    marginBottom: t.spacing.xs,
  },

  photoButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: t.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: t.spacing.xs,
  },

  photoButtonText: {
    fontWeight: t.typography.pageTitle.fontWeight,
    fontSize: t.typography.bodySmall.fontSize,
  },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.spacing.xs,
    marginBottom: t.spacing.xxs,
  },

  photoWrap: {
    position: "relative",
  },

  photoThumb: {
    width: 82,
    height: 82,
    borderRadius: t.radius.md,
  },

  photoRemove: {
    position: "absolute",
    top: -7,
    right: -7,
    backgroundColor: staticColors.hex_c8102e_6za5cb,
    borderRadius: t.radius.pill,
    minWidth: 22,
    minHeight: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.spacing.xxs,
  },

  photoRemoveText: {
    color: staticColors.hex_fff_yhjmu8,
    fontWeight: t.typography.pageTitle.fontWeight,
    fontSize: t.typography.body.fontSize,
    lineHeight: t.typography.body.lineHeight,
  },

  emptyPhotosText: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: "700",
    paddingVertical: t.spacing.xxs,
  },

  recceActionRow: {
    flexDirection: "row",
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
});
