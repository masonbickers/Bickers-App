import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { staticColors } from "../staticColors.js";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: staticColors.hex_0b0b0b_9v81ck },
  content: { padding: t.spacing.sm, paddingBottom: t.spacing.xl, overflow: 'visible' },

  heroCard: {
    position: 'relative',
    marginBottom: t.spacing.sm,
    overflow: 'hidden',
  },
  heroContent: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.md,
  },
  heroEyebrow: {
    fontSize: t.typography.metadata.fontSize,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.pageTitle.fontSize,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  heroSubTitle: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    lineHeight: t.typography.bodySmall.lineHeight,
    fontWeight: '600',
  },
  heroMetaRow: {
    marginTop: t.spacing.sm,
    flexDirection: 'row',
    gap: t.spacing.xs,
    flexWrap: 'wrap',
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xxs,
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  heroMetaText: {
    fontSize: t.typography.caption.fontSize,
    fontWeight: '700',
  },

  dayCard: { padding: t.spacing.md, marginBottom: t.spacing.sm },
  dayTitle: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: '900',
    marginBottom: t.spacing.sm,
  },
  fieldBlock: {
    marginBottom: t.spacing.sm,
  },
  label: {
    fontSize: t.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: t.spacing.xxs,
  },
  dropdown: {
    borderWidth: 1,
  },
  dropdownContainer: {
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: t.typography.body.fontSize,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.spacing.xs,
    paddingTop: t.spacing.xs,
    borderTopWidth: 1,
  },
  lunchToggleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
  },
  lunchChoiceText: {
    fontSize: t.typography.metadata.fontSize,
    fontWeight: '800',
  },
  lunchChoiceLeft: {
    flex: 1,
    textAlign: 'right',
  },
  lunchChoiceRight: {
    flex: 1,
    textAlign: 'left',
  },
  lunchChoiceActive: {
    fontWeight: '900',
  },
  notesInput: {
    borderRadius: t.radius.md,
    padding: t.spacing.xs,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginVertical: t.spacing.sm,
  },
  previewContainer: { padding: t.spacing.sm, marginTop: t.spacing.sm },
  previewHeader: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: '900',
    marginBottom: t.spacing.sm,
  },
  previewSummaryCard: {
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  previewSummaryTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: '900',
  },
  previewSummaryText: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  previewCard: {
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
  },
  previewDay: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: '900',
    marginBottom: t.spacing.xxs,
  },
  previewText: {
    fontSize: t.typography.bodySmall.fontSize,
    marginBottom: t.spacing.none,
    fontWeight: '600',
  },
  summaryCard: { padding: t.spacing.sm, marginBottom: t.spacing.sm },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.xs,
  },
  summaryTitle: {
    fontSize: t.typography.bodyLarge.fontSize,
    fontWeight: '900',
  },
  summaryTotal: {
    fontSize: t.typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  summaryMetaText: {
    marginTop: t.spacing.xxs,
    fontSize: t.typography.metadata.fontSize,
    fontWeight: '600',
  },
  summaryGrid: {
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  summaryDayRow: {
    borderWidth: 1,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
  },
  summaryDayLabel: {
    fontSize: t.typography.bodySmall.fontSize,
    fontWeight: '800',
  },
  summaryDaySubLabel: {
    marginTop: t.spacing.none,
    fontSize: t.typography.caption.fontSize,
    fontWeight: '600',
  },
  summaryDayHours: {
    fontSize: t.typography.body.fontSize,
    fontWeight: '900',
  },
  confirmButton: {
    borderWidth: 1,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    marginTop: t.spacing.lg,
  },
  confirmButtonText: {
    fontWeight: '900',
    fontSize: t.typography.body.fontSize,
  },
  backButton: {
    borderWidth: 1,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    marginTop: t.spacing.xs,
  },
  backButtonText: {
    fontWeight: '800',
    fontSize: t.typography.body.fontSize,
  },
  
  submittedBanner: {
    borderWidth: 1,
    padding: t.spacing.xs,
    borderRadius: t.radius.md,
    marginBottom: t.spacing.sm,
  },
  submittedBannerText: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: t.typography.bodySmall.fontSize,
  },
  
});
