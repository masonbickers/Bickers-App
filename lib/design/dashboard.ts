import { getCardSurfaceStyle } from "./cardSurface";
import { ViewStyle } from "react-native";

import { designTokens as t } from "./tokens";

type DashboardColors = {
  surface: string;
  surfaceAlt: string;
  border: string;
  groupedSurface?: string;
};

export function createDashboardCardStyles(colors: DashboardColors, presentation = "default") {
  const sectionBase: ViewStyle = {
    borderRadius: t.componentRadius.card,
    padding: t.spacing.sm,
  };

  return {
    heroCard: {
      backgroundColor: "transparent",
      borderRadius: t.componentRadius.modal,
    } satisfies ViewStyle,
    sectionCard: {
      ...sectionBase,
      backgroundColor: "transparent",
    } satisfies ViewStyle,
    nestedCard: {
      ...sectionBase,
      backgroundColor: colors.surface,
      borderRadius: t.componentRadius.nestedCard,
      paddingHorizontal: 10,
      paddingVertical: 10,
    } satisfies ViewStyle,
    statCard: {
      ...sectionBase,
      backgroundColor: colors.surface,
      borderRadius: t.componentRadius.nestedCard,
      paddingHorizontal: 6,
      paddingVertical: 10,
    } satisfies ViewStyle,
    quickActionCard: {
      ...sectionBase,
      ...(presentation === "grouped" ? getCardSurfaceStyle(colors) : { backgroundColor: colors.surfaceAlt }),
      ...t.shadows.sm,
    } satisfies ViewStyle,
  };
}
