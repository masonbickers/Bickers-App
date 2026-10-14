import { designTokens as t } from "./tokens";
import { getConcentricRadius } from "./radius";

/** Visual-only card treatment. Existing wrappers keep their own layout and events. */
export function getCardSurfaceStyle(colors, { surface = "grouped", borderTone = "neutral", borderAccent, inset } = {}) {
  const backgroundColor = surface === "grouped"
    ? colors.groupedSurface || colors.surface
    : surface === "subtle" ? colors.surfaceAlt : colors.surface;
  return {
    backgroundColor,
    borderColor: borderAccent ?? (borderTone === "neutral" ? colors.border : colors[borderTone] || colors.border),
    borderWidth: 1,
    borderRadius: inset === undefined ? t.componentRadius.card : getConcentricRadius(t.componentRadius.card, inset),
  };
}
