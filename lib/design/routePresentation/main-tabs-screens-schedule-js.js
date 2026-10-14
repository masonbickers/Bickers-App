import { designTokens as t } from "../tokens.ts";
import { staticColors as routeColors } from "../staticColors.js";

export { routeColors };

export function scheduleJobMarkStyles() {
  return {
    container: { backgroundColor: routeColors.hex_1c3c7a_8m76oi, borderRadius: t.radius.md },
    text: { color: routeColors.hex_fff_yhjmu8, fontWeight: "700" },
  };
}

export function scheduleHolidayMarkStyles(isUnpaid) {
  const baseContainer = { backgroundColor: routeColors.hex_126536_a7xuir, borderRadius: t.radius.md };
  const unpaidBorder = isUnpaid
    ? { borderWidth: 2, borderColor: routeColors.hex_ffd60a_5c6r45 }
    : {};
  return {
    container: { ...baseContainer, ...unpaidBorder },
    text: { color: routeColors.hex_fff_yhjmu8, fontWeight: "700" },
  };
}

export function scheduleBankHolidayMarkStyles(bankHolidayColor) {
  return {
    container: { backgroundColor: bankHolidayColor, borderRadius: t.radius.md },
    text: { color: routeColors.hex_fff_yhjmu8, fontWeight: t.typography.bodyStrong.fontWeight },
  };
}

export function scheduleSelectedDayTextStyles(markedDay, accentColor) {
  return {
    color: markedDay ? routeColors.hex_fff_yhjmu8 : accentColor,
    fontWeight: t.typography.pageTitle.fontWeight,
  };
}
