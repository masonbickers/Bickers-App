import { Platform, TextStyle, ViewStyle } from "react-native";
import { navigationMetrics } from "./navigation.js";
import { getPlatformControlMetrics } from "./platform";

export const platformControls = getPlatformControlMetrics(Platform.OS);

export const spacing = {
  none: 0,
  xxxs: 2,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
} as const;

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 28,
  xl: 18,
  pill: 999,
} as const;

export const opacity = {
  disabled: 0.55,
  pressed: 0.78,
  subduedPressed: 0.75,
} as const;

export const motion = {
  sheetEnter: 280,
  sheetExit: 200,
  tabCompress: 75,
  tabExpand: 125,
  tabSpring: { damping: 24, stiffness: 260, mass: 0.8, overshootClamping: true },
  tabReselectSpring: { damping: 6, stiffness: 230, mass: 0.65 },
} as const;

export const materials = {
  blurIntensity: 80,
  pressScale: 0.97,
} as const;

// Purpose mappings are the public visual-language contract. Screens should
// consume shared components instead of selecting radii by appearance.
export const componentRadius = {
  nestedControl: radius.sm,
  nestedCard: radius.xl,
  control: radius.md,
  field: radius.pill,
  card: radius.lg,
  modal: radius.xl,
  iconButton: radius.pill,
  pill: radius.pill,
} as const;

export const typography = {
  settingsRow: { fontSize: 17, lineHeight: 22, fontWeight: "400" } satisfies TextStyle,
  settingsDetail: { fontSize: 15, lineHeight: 20, fontWeight: "400" } satisfies TextStyle,
  settingsSection: { fontSize: 15, lineHeight: 20, fontWeight: "600" } satisfies TextStyle,
  micro: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
  } satisfies TextStyle,
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  } satisfies TextStyle,
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "600",
  } satisfies TextStyle,
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  } satisfies TextStyle,
  bodyStrong: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  } satisfies TextStyle,
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  } satisfies TextStyle,
  bodyLarge: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
  } satisfies TextStyle,
  bodyLargeStrong: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  } satisfies TextStyle,
  sectionHeading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
  } satisfies TextStyle,
  metadata: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  } satisfies TextStyle,
  button: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  } satisfies TextStyle,
  formLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  } satisfies TextStyle,
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    letterSpacing: -0.2,
  } satisfies TextStyle,
  titleSmall: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    letterSpacing: -0.3,
  } satisfies TextStyle,
  pageTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  } satisfies TextStyle,
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.6,
  } satisfies TextStyle,
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  } satisfies TextStyle,
} as const;

const iosShadow = (
  shadowOpacity: number,
  shadowRadius: number,
  height: number
): ViewStyle => ({
  shadowColor: "#000",
  shadowOpacity,
  shadowRadius,
  shadowOffset: { width: 0, height },
});

export const shadows = {
  none: {} satisfies ViewStyle,
  sm: Platform.select<ViewStyle>({
    ios: iosShadow(0.12, 4, 2),
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle,
  md: Platform.select<ViewStyle>({
    ios: iosShadow(0.16, 8, 4),
    android: { elevation: 6 },
    default: {},
  }) as ViewStyle,
  lg: Platform.select<ViewStyle>({
    ios: iosShadow(0.2, 14, 8),
    android: { elevation: 10 },
    default: {},
  }) as ViewStyle,
} as const;

export const controls = {
  buttonHeight: platformControls.minimumTouchTarget,
  buttonHeightLg: platformControls.minimumTouchTarget,
  iconButton: platformControls.minimumTouchTarget,
  iconButtonSm: platformControls.minimumTouchTarget,
  chipMinHeight: 32,
  avatarSmall: 44,
  avatar: 56,
  avatarLarge: 72,
  listRowHeight: 56,
  cardPadding: 12,
  cardPaddingLg: 16,
} as const;

export const density = {
  standard: {
    controlHeight: 48,
    controlPaddingHorizontal: spacing.md,
    controlPaddingVertical: spacing.sm,
    cardPadding: spacing.md,
    sectionGap: spacing.md,
    rowGap: spacing.sm,
  },
  compact: {
    // Compact spacing retains native minimum targets: iOS 44pt, Android 48dp.
    controlHeight: platformControls.minimumTouchTarget,
    controlPaddingHorizontal: spacing.sm,
    controlPaddingVertical: spacing.xs,
    cardPadding: spacing.sm,
    sectionGap: spacing.sm,
    rowGap: spacing.xs,
  },
} as const;

export type PageDensity = keyof typeof density;

export const layout = {
  compactBreakpoint: 480,
  tabletBreakpoint: 768,
  wideBreakpoint: 1180,
  compactGutter: 16,
  tabletGutter: 24,
  wideGutter: 32,
  maxContentWidth: 1080,
  maxFormWidth: 760,
} as const;

export const focus = {
  width: 2,
  offset: 2,
} as const;

export const designTokens = {
  spacing,
  radius,
  opacity,
  motion,
  platformControls,
  materials,
  typography,
  shadows,
  controls,
  layout,
  focus,
  iconSize,
  density,
  componentRadius,
  navigation: navigationMetrics,
} as const;

export type DesignTokens = typeof designTokens;
