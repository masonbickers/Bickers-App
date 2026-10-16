import { withAlpha } from './color';

// Existing Home action treatments, shared by restoring and verified Home.
export function getHomeActionSurfaces(tint) {
  return {
    moreIcon: { backgroundColor: withAlpha(tint, 0.08), borderColor: withAlpha(tint, 0.24) },
    quickBorder: withAlpha(tint, 0.14),
    quickIcon: { backgroundColor: withAlpha(tint, 0.06), borderColor: withAlpha(tint, 0.18) },
  };
}
export function getHomeCountSurface(colors) {
  return {backgroundColor:withAlpha(colors.accent,0.15),borderColor:withAlpha(colors.accent,0.45)};
}
