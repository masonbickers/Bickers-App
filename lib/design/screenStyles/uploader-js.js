import { StyleSheet } from "react-native";
import { designTokens as t } from "../tokens.ts";
import { staticColors } from "../staticColors.js";

const THUMB = 92;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: staticColors.hex_000_yhlkvq },
  content: { padding: t.spacing.md },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.spacing.sm,
  },
  title: { color: staticColors.hex_fff_yhjmu8, fontSize: t.typography.titleSmall.fontSize, fontWeight: '800' },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  btn: {
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    borderRadius: t.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginLeft: t.spacing.xs,
  },
  btnPrimary: { backgroundColor: staticColors.hex_c8102e_6za5cb, borderColor: staticColors.hex_a40e25_u1mmqp },
  btnGhost: { backgroundColor: staticColors.hex_141414_a6icwz, borderColor: staticColors.hex_232323_72yy4n },
  btnText: { color: staticColors.hex_fff_yhjmu8, fontWeight: '800' },

  progress: { color: staticColors.hex_cfcfcf_r9h9nn, marginBottom: t.spacing.xs },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumbWrap: {
    position: 'relative',
    width: THUMB,
    height: THUMB,
    borderRadius: t.radius.sm,
    backgroundColor: staticColors.hex_1a1a1a_98rvna,
    marginBottom: t.spacing.xs,
  },
  thumb: { width: THUMB, height: THUMB, borderRadius: t.radius.sm },
  remove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: staticColors.hex_c8102e_6za5cb,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.xxs,
    paddingVertical: t.spacing.none,
    borderWidth: 1,
    borderColor: staticColors.hex_8e0b22_ezjn49,
  },
  removeText: { color: staticColors.hex_fff_yhjmu8, fontWeight: '900', fontSize: t.typography.body.fontSize },

  emptyHint: { color: staticColors.hex_8e8e8e_ezdnbv },

  sectionTitle: { color: staticColors.hex_fff_yhjmu8, fontWeight: '800', marginBottom: t.spacing.xxs, marginTop: t.spacing.xs },
  url: { color: staticColors.hex_9bd_yhlsqh, fontSize: t.typography.metadata.fontSize },
});
