/** Platform presentation policy; screen and business logic stay shared. */
export function getPlatformControlMetrics(platform: string) {
  return {
    minimumTouchTarget: platform === "android" ? 48 : 44,
    androidRipple: platform === "android",
  } as const;
}
