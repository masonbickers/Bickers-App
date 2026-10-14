export type RectangleSize = Readonly<{ width: number; height: number }>;

function nonnegativeFinite(value: number, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, nonnegative number`);
  }
  return value;
}

/**
 * Matching rounded rectangles with a uniform inset share corner centres.
 * Include the parent's border in the inset. Supply outer bounds for capsules
 * or small rectangles, whose effective radius is capped by their dimensions.
 * Asymmetric insets and different shapes require layout-specific geometry.
 */
export function getConcentricRadius(
  outerRadius: number,
  inset: number,
  outerSize?: RectangleSize
): number {
  let effectiveRadius = nonnegativeFinite(outerRadius, "outerRadius");
  nonnegativeFinite(inset, "inset");
  if (outerSize !== undefined) {
    const width = nonnegativeFinite(outerSize.width, "width");
    const height = nonnegativeFinite(outerSize.height, "height");
    effectiveRadius = Math.min(effectiveRadius, width / 2, height / 2);
  }
  return Math.max(0, effectiveRadius - inset);
}
