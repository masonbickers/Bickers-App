import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ScrollView,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Feather";

import {
  filterSelectOptions,
  isDateSelectable,
  normalizeSelectOptions,
  resolveInteractionState,
  runConfirmation,
} from "../../lib/design/controlState";
import { designTokens as t } from "../../lib/design/tokens";
import { getCardSurfaceStyle } from "../../lib/design/cardSurface";
import { getConcentricRadius } from "../../lib/design/radius";
import { resolvePageDensity } from "../../lib/design/pageDensity";
import { formatISODateDDMMYYYY } from "../../lib/dateFormat";
import { createActionLock, getServiceStatusColors, getStatusColors } from "../../lib/design/semantics";
import { useTheme } from "../../providers/ThemeProvider";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import AppleMaterialSurface, { isNativeGlassAvailable } from "./AppleMaterialSurface";

function useResolvedDensity(density) {
  const pathname = usePathname();
  return resolvePageDensity(pathname, density);
}

const textVariants = {
  settingsRow: t.typography.settingsRow,
  settingsDetail: t.typography.settingsDetail,
  settingsSection: t.typography.settingsSection,
  bodyLargeStrong: t.typography.bodyLargeStrong,
  sectionHeading: t.typography.sectionHeading,
  micro: t.typography.micro,
  display: t.typography.display,
  tabLabel: t.typography.tabLabel,
  button: t.typography.button,
  pageTitle: t.typography.pageTitle,
  titleSmall: t.typography.titleSmall,
  sectionTitle: t.typography.sectionTitle,
  body: t.typography.body,
  bodyStrong: t.typography.bodyStrong,
  bodySmall: t.typography.bodySmall,
  bodyLarge: t.typography.bodyLarge,
  formLabel: t.typography.formLabel,
  label: t.typography.label,
  metadata: t.typography.metadata,
  caption: t.typography.caption,
  link: t.typography.link,
};

function textTone(tone, colors) {
  const tones = {
    settings: colors.groupedText || colors.text,
    primary: colors.text,
    secondary: colors.textMuted,
    muted: colors.textMuted,
    inverse: colors.textOnAccent,
    link: colors.link,
    accent: colors.accentText || colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    disabled: colors.disabledText,
  };
  return tones[tone] || colors.text;
}

export function useAsyncAction({ action, loading = false, disabled = false, onError }) {
  const [pending, setPending] = useState(false);
  const runLocked = useRef(createActionLock()).current;
  const busy = loading || pending;
  const inactive = disabled || busy;

  const run = () => {
    if (inactive || typeof action !== "function") return;
    setPending(true);
    runLocked(action)
      .catch((error) => {
        if (typeof onError === "function") onError(error);
        else console.error("Shared action failed", error);
      })
      .finally(() => setPending(false));
  };

  return { busy, inactive, run };
}

function controlBorderColor(state, colors) {
  if (state.visual === "error") return colors.danger;
  if (state.visual === "focused") return colors.focusRing;
  if (state.visual === "selected") return colors.accent;
  return colors.inputBorder;
}

function androidRipple(color, borderless = false) {
  return t.platformControls.androidRipple ? { color, borderless } : undefined;
}

export function AppText({
  children,
  variant = "body",
  tone,
  align,
  style,
  layoutStyle,
  ...props
}) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <Text
      key={Platform.OS === "ios" ? fontScale : undefined}
      style={[
        textVariants[variant] || textVariants.body,
        { color: textTone(tone || "primary", colors) },
        align ? { textAlign: align } : null,
        style,
        layoutStyle,
        // Explicit semantic appearance wins over compatibility styles. When
        // omitted, legacy consumers retain their existing colour overrides.
        tone !== undefined ? { color: textTone(tone, colors) } : null,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

export function AppCalendar({
  markedDates,
  onDayPress,
  disabled = false,
  layoutStyle,
  theme: _theme,
  ...props
}) {
  const { colors } = useTheme();
  return (
    <View style={layoutStyle} pointerEvents={disabled ? "none" : "auto"} accessibilityState={{ disabled }}>
      <Calendar
        {...props}
        markedDates={markedDates}
        onDayPress={disabled ? undefined : onDayPress}
        theme={{
          calendarBackground: colors.surfaceAlt,
          backgroundColor: colors.surfaceAlt,
          dayTextColor: colors.text,
          monthTextColor: colors.text,
          textDisabledColor: colors.disabledText,
          arrowColor: colors.accent,
          selectedDayBackgroundColor: colors.accentFill || colors.accent,
          selectedDayTextColor: colors.textOnAccent,
          todayTextColor: colors.accentText || colors.accent,
        }}
      />
    </View>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
  testID,
  layoutStyle,
  leadingIcon,
}) {
  const { colors } = useTheme();
  const native = Platform.OS === "ios" || Platform.OS === "android";
  const Row = native ? View : Pressable;
  return (
    <Row
      {...(!native ? {
        accessibilityRole: "switch",
        accessibilityLabel: label,
        accessibilityHint: description,
        accessibilityState: { checked: value, disabled },
        "aria-checked": value,
        "aria-disabled": disabled,
        disabled,
        onPress: () => onChange?.(!value),
      } : {})}
      testID={testID}
      style={native ? [styles.toggleRow, leadingIcon && styles.listRow, { opacity: disabled ? t.opacity.disabled : 1 }, layoutStyle] : ({ pressed, focused }) => [
        styles.toggleRow,
        leadingIcon && styles.listRow,
        { opacity: disabled ? 0.55 : pressed ? 0.78 : 1 },
        focused && { borderColor: colors.focusRing, borderWidth: t.focus.width },
        layoutStyle,
      ]}
    >
      {leadingIcon ? <View style={[styles.listRowLeading, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}><Icon name={leadingIcon} size={t.iconSize.md} color={colors.textMuted} /></View> : null}
      <View style={styles.toggleCopy}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? <AppText variant="bodySmall" tone="secondary">{description}</AppText> : null}
      </View>
      {native ? <Switch
        accessibilityLabel={label}
        accessibilityHint={description}
        value={Boolean(value)}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.disabled, true: colors.accentFill || colors.accent }}
        style={{ minHeight: t.controls.buttonHeight, minWidth: t.controls.buttonHeight }}
      /> : <View style={[styles.webToggleTrack, { backgroundColor: value ? colors.accentSoft : colors.disabled }]}>
        <View
          style={[
            styles.webToggleThumb,
            { backgroundColor: value ? colors.accent : colors.textMuted },
            value && styles.webToggleThumbSelected,
          ]}
        />
      </View>}
    </Row>
  );
}

export function IconBadge({ icon, tone = "neutral", label, size = "medium", layoutStyle }) {
  const { colorScheme } = useTheme();
  const semantic = useMemo(() => getStatusColors(tone, colorScheme), [colorScheme, tone]);
  const metric = size === "small" ? t.controls.chipMinHeight : t.controls.iconButton;
  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.iconBadge,
        { width: metric, height: metric, backgroundColor: semantic.background, borderColor: semantic.border },
        layoutStyle,
      ]}
    >
      <Icon name={icon} size={size === "small" ? t.iconSize.sm : t.iconSize.md} color={semantic.foreground} />
    </View>
  );
}

export function Avatar({ source, initials, label, size = "medium", badge, layoutStyle }) {
  const { colors } = useTheme();
  const metric = size === "small"
    ? t.controls.avatarSmall
    : size === "large"
      ? t.controls.avatarLarge
      : t.controls.avatar;
  return (
    <View accessibilityLabel={label} style={[styles.avatarWrap, { width: metric, height: metric }, layoutStyle]}>
      {source ? (
        <Image source={source} style={[styles.avatarImage, { borderColor: colors.border }]} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
          <AppText variant={size === "large" ? "titleSmall" : "bodyStrong"} tone="accent">{initials || "?"}</AppText>
        </View>
      )}
      {badge ? <View style={styles.avatarBadge}>{badge}</View> : null}
    </View>
  );
}

export function MediaThumbnail({ uri, source, label = "View image", onPress, disabled = false, aspectRatio = 4 / 3, layoutStyle }) {
  const { colors } = useTheme();
  const content = (
    <Image
      source={source || (uri ? { uri } : undefined)}
      resizeMode="cover"
      style={[styles.mediaThumbnailImage, { aspectRatio, borderColor: colors.border }]}
    />
  );
  if (!onPress) return <View style={layoutStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      android_ripple={androidRipple(colors.pressed)}
      style={({ pressed, focused }) => [
        {
          minHeight: t.controls.buttonHeight,
          minWidth: t.controls.buttonHeight,
          borderRadius: t.componentRadius.card,
          overflow: "hidden",
          opacity: disabled ? t.opacity.disabled : pressed && Platform.OS !== "android" ? t.opacity.pressed : 1,
        },
        focused && { borderColor: colors.focusRing, borderWidth: t.focus.width },
        layoutStyle,
      ]}
    >
      {content}
    </Pressable>
  );
}

/**
 * Compatibility pressable for legacy screen actions. It accepts the
 * TouchableOpacity surface API while applying the shared touch target,
 * disabled, pressed, and keyboard-focus behaviour.
 */
export function AppPressable({
  children,
  style,
  layoutStyle,
  activeOpacity = 0.72,
  disabled = false,
  accessibilityState,
  ...props
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      accessibilityState={{ disabled, ...accessibilityState }}
      android_ripple={androidRipple(colors.pressed)}
      style={(state) => [
        styles.appPressable,
        { opacity: disabled ? 0.5 : state.pressed ? activeOpacity : 1 },
        typeof style === "function" ? style(state) : style,
        state.focused && styles.appPressableFocused,
        state.focused && { borderColor: colors.focusRing },
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

/** Solid content groups and full-row settings actions share one visual contract. */
export function SettingsGroup({ children, layoutStyle, testID, outlined = false }) {
  const { colors } = useTheme();
  return <View testID={testID} style={[styles.settingsGroup, outlined ? getCardSurfaceStyle(colors) : { backgroundColor: colors.groupedSurface || colors.surface }, layoutStyle]}>{children}</View>;
}

export function SettingsRow({ title, subtitle, value, trailing, onPress, disabled = false, divider = false, accessibilityLabel, testID, titleVariant = "settingsRow", subtitleVariant = "settingsDetail", titleTone = "settings" }) {
  const { colors } = useTheme();
  const Root = onPress ? Pressable : View;
  const content = <>
    <View style={styles.settingsCopy}>
      <AppText variant={titleVariant} tone={titleTone}>{title}</AppText>
      {subtitle ? <AppText variant={subtitleVariant} tone="secondary">{subtitle}</AppText> : null}
    </View>
    {value ? <AppText variant="settingsRow" tone="secondary" layoutStyle={styles.settingsValue}>{value}</AppText> : null}
    {trailing}
    {onPress ? <Icon name="chevron-right" size={t.iconSize.sm} color={colors.textMuted} /> : null}
  </>;
  const geometry = [styles.settingsRow, disabled && styles.inactive];
  return <Root
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel || [title, value, typeof subtitle === "string" ? subtitle : null].filter(Boolean).join(", ")}
      accessibilityState={onPress ? { disabled } : undefined}
      disabled={onPress ? disabled : undefined}
      onPress={onPress ? () => { if (!disabled) onPress(); } : undefined}
      style={onPress ? ({ pressed, focused }) => [geometry, { backgroundColor: pressed ? colors.glassPressed : "transparent" }, focused && { borderColor: colors.focusRing, borderWidth: t.focus.width }] : geometry}
    >{content}{divider ? <View style={[styles.settingsDivider, styles.settingsRowDivider, { backgroundColor: colors.divider }]} /> : null}</Root>;
}

export function SectionCard({
  children,
  tone = "default",
  style,
  layoutStyle,
  accessibilityLabel,
  density,
  onPress,
  selected = false,
  disabled = false,
  testID,
}) {
  const { colors } = useTheme();
  const resolvedDensity = useResolvedDensity(density);
  const padding = t.density[resolvedDensity]?.cardPadding || t.density.standard.cardPadding;
  const surfaceStyle = getCardSurfaceStyle(colors, { surface: tone === "grouped" ? "grouped" : tone === "subtle" ? "subtle" : "surface" });
  const background = surfaceStyle.backgroundColor;
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={androidRipple(colors.pressed)}
        testID={testID}
        style={({ pressed, focused }) => {
          const state = resolveInteractionState({ selected, disabled, pressed, focused });
          return [
            styles.sectionCard,
            surfaceStyle,
            {
              backgroundColor: selected ? colors.selected : background,
              borderColor: state.visual === "focused" ? colors.focusRing : selected ? colors.accent : colors.border,
              borderWidth: state.visual === "focused" ? t.focus.width : 1,
              opacity: state.opacity,
              minHeight: t.controls.buttonHeight,
              padding,
            },
            style,
            layoutStyle,
          ];
        }}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.sectionCard, surfaceStyle, { padding }, style, layoutStyle]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  actionLabel,
  actionIcon,
  actionVariant = "ghost",
  onAction,
  density,
  style,
}) {
  const { colors } = useTheme();
  const resolvedDensity = useResolvedDensity(density);
  const actionNode = action || (actionLabel && onAction ? (
    <AppButton
      label={actionLabel}
      icon={actionIcon}
      variant={actionVariant}
      onPress={onAction}
      density={resolvedDensity}
      size="small"
    />
  ) : null);
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeaderText}>
        <AppText variant="sectionTitle" accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</AppText>
        ) : null}
      </View>
      {actionNode ? <View style={styles.sectionAction}>{actionNode}</View> : null}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  metadata,
  leading,
  leadingIcon,
  trailing,
  status,
  onPress,
  selected = false,
  disabled = false,
  divider = false,
  density,
  accessibilityLabel,
  testID,
  style,
  layoutStyle,
}) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stackStatus = width / fontScale < t.layout.compactBreakpoint;
  const resolvedDensity = useResolvedDensity(density);
  const content = (
    <>
      {leading || leadingIcon ? (
        <View style={[styles.listRowLeading, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          {leading || <Icon name={leadingIcon} size={t.iconSize.md} color={selected ? colors.accent : colors.textMuted} />}
        </View>
      ) : null}
      <View style={styles.listRowCopy}>
        <AppText variant="bodyStrong" numberOfLines={fontScale > 1.5 ? undefined : 2}>{title}</AppText>
        {subtitle ? <AppText variant="bodySmall" tone="secondary" numberOfLines={fontScale > 1.5 ? undefined : 2}>{subtitle}</AppText> : null}
        {metadata ? <AppText variant="metadata" tone="secondary" numberOfLines={1}>{metadata}</AppText> : null}
        {status && stackStatus ? <View style={styles.listRowStackedStatus}>{status}</View> : null}
      </View>
      {status && !stackStatus ? <View style={styles.listRowStatus}>{status}</View> : null}
      {trailing || (onPress ? <Icon name="chevron-right" size={t.iconSize.sm} color={colors.textMuted} /> : null)}
    </>
  );
  const minHeight = resolvedDensity === "compact" ? t.controls.buttonHeight : t.controls.listRowHeight;
  const row = onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || String(title || "")}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={androidRipple(colors.pressed)}
      testID={testID}
      style={({ pressed, focused }) => {
        const state = resolveInteractionState({ selected, disabled, pressed, focused });
        return [
          styles.listRow,
          {
            minHeight,
            backgroundColor: selected ? colors.selected : "transparent",
            borderColor: state.visual === "focused" ? colors.focusRing : "transparent",
            opacity: state.opacity,
          },
          style,
          layoutStyle,
        ];
      }}
    >
      {content}
    </Pressable>
  ) : (
    <View testID={testID} style={[styles.listRow, { minHeight, borderColor: "transparent" }, disabled && styles.inactive, style, layoutStyle]}>
      {content}
    </View>
  );
  return <View>{row}{divider ? <Divider /> : null}</View>;
}

export function PageSection({
  title,
  subtitle,
  action,
  children,
  divided = true,
  style,
  layoutStyle,
  contentStyle,
}) {
  return (
    <View style={[styles.pageSection, style, layoutStyle]}>
      {title ? (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          action={action}
          style={styles.pageSectionHeader}
        />
      ) : null}
      {title && divided ? <Divider /> : null}
      <View style={[styles.pageSectionContent, contentStyle]}>{children}</View>
    </View>
  );
}

export function FormStep({ number, title, hint, children, last = false, fullWidth = false, style }) {
  const { colors } = useTheme();
  if (fullWidth) {
    return (
      <View style={[styles.formStepFullWidth, last && styles.formStepContentLast, style]}>
        <View style={styles.formStep}>
          <View style={[styles.formStepBadge, { backgroundColor: colors.accentSoft }]}>
            <AppText variant="metadata" tone="accent" style={styles.formStepNumber}>{number}</AppText>
          </View>
          <View style={[styles.formStepHeader, styles.formStepFullWidthHeading]}>
            <AppText variant="bodyStrong">{title}</AppText>
            {hint ? <AppText variant="caption" tone="secondary">{hint}</AppText> : null}
          </View>
        </View>
        {children}
      </View>
    );
  }
  return (
    <View style={[styles.formStep, style]}>
      <View style={styles.formStepRail}>
        <View style={[styles.formStepBadge, { backgroundColor: colors.accentSoft }]}>
          <AppText variant="metadata" tone="accent" style={styles.formStepNumber}>
            {number}
          </AppText>
        </View>
        {!last ? <View style={[styles.formStepLine, { backgroundColor: colors.divider }]} /> : null}
      </View>
      <View style={[styles.formStepContent, last && styles.formStepContentLast]}>
        <View style={styles.formStepHeader}>
          <AppText variant="bodyStrong">{title}</AppText>
          {hint ? <AppText variant="caption" tone="secondary">{hint}</AppText> : null}
        </View>
        {children}
      </View>
    </View>
  );
}

function buttonColors(variant, colors) {
  if (variant === "glassSecondary") {
    return { background: "transparent", border: "transparent", text: colors.text, material: true };
  }
  if (variant === "glassPrimary") {
    return { background: "transparent", border: colors.glassBorder, text: colors.textOnAccent, material: true, tint: colors.accentFill || colors.accent };
  }
  if (variant === "danger") {
    const status = getServiceStatusColors("danger");
    return { background: status.background, border: status.border, text: status.onBackground, elevated: true };
  }
  if (variant === "secondary") {
    return { background: "transparent", border: colors.glassBorder, text: colors.text, material: true };
  }
  if (variant === "ghost") {
    return { background: "transparent", border: "transparent", text: colors.accentText || colors.accent };
  }
  return { background: colors.accentFill || colors.accent, border: colors.accentFill || colors.accent, text: colors.textOnAccent, elevated: true };
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  icon,
  selected = false,
  loading = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  size = "medium",
  density,
  fullWidth = false,
  iconOnly = false,
  pill,
  onError,
  testID,
  style,
  layoutStyle,
}) {
  const { colors, reduceTransparency } = useTheme();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const resolvedDensity = useResolvedDensity(density);
  const { busy, inactive, run } = useAsyncAction({ action: onPress, loading, disabled, onError });
  const tone = buttonColors(variant, colors);
  const foreground = variant === "secondary" && selected ? colors.accentText || colors.accent : tone.text;
  const buttonRadius = StyleSheet.flatten([style, layoutStyle])?.borderRadius ??
    (iconOnly || pill !== false ? t.componentRadius.pill : t.componentRadius.control);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...accessibilityState, disabled: inactive, selected, busy }}
      disabled={inactive}
      focusable
      onPress={run}
      android_ripple={androidRipple(colors.glassPressed)}
      testID={testID}
      style={({ pressed, focused }) => [
        styles.button,
        pill && { flexShrink: 0 },
        tone.elevated && !inactive && t.shadows.sm,
        {
          minHeight:
            iconOnly
              ? t.controls.iconButton
              : size === "small"
              ? t.controls.buttonHeight
              : t.density[resolvedDensity]?.controlHeight || t.density.standard.controlHeight,
          minWidth: t.controls.buttonHeight,
          paddingHorizontal:
            iconOnly
              ? t.spacing.none
              : t.density[resolvedDensity]?.controlPaddingHorizontal ||
                t.density.standard.controlPaddingHorizontal,
          paddingVertical:
            iconOnly
              ? t.spacing.none
              : t.density[resolvedDensity]?.controlPaddingVertical ||
                t.density.standard.controlPaddingVertical,
          alignSelf: fullWidth ? "stretch" : undefined,
          width: iconOnly ? t.controls.iconButton : undefined,
          height: iconOnly ? t.controls.iconButton : undefined,
          borderRadius: buttonRadius,
        },
        {
          backgroundColor: tone.background,
          borderColor: tone.material && isNativeGlassAvailable(reduceTransparency) ? "transparent" : tone.border,
          opacity: inactive ? t.opacity.disabled : pressed ? t.opacity.pressed : 1,
        },
        !inactive && pressed && !reduceMotion && { transform: [{ scale: t.materials.pressScale }] },
        focused && { borderColor: colors.focusRing, borderWidth: t.focus.width },
        style,
        layoutStyle,
      ]}
    >
      {({ pressed }) => (
        <>
          {tone.material ? (
            <AppleMaterialSurface
              selected={variant === "secondary" && selected}
              pressed={pressed}
              tintColor={tone.tint}
              fallbackColor={tone.tint}
              style={{ borderRadius: buttonRadius }}
            />
          ) : null}
          {busy ? <ActivityIndicator size="small" color={foreground} /> : null}
          {!busy && icon ? <Icon name={icon} size={t.iconSize.sm} color={foreground} /> : null}
          {!iconOnly ? <Text key={Platform.OS === "ios" ? fontScale : undefined} style={[styles.buttonText, { color: foreground }]}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  hint,
  onPress,
  disabled = false,
  selected = false,
  tone = "default",
  variant = "standard",
  compact = false,
  size = t.iconSize.sm,
  loading = false,
  onError,
  testID,
  style,
  layoutStyle,
}) {
  const { colors, reduceTransparency } = useTheme();
  const reduceMotion = useReducedMotion();
  const { busy, inactive, run } = useAsyncAction({ action: onPress, loading, disabled, onError });
  const foreground = tone === "danger" ? colors.danger : selected ? colors.accent : colors.text;
  const ghost = variant === "ghost";
  const background = "transparent";
  const border = ghost
    ? "transparent"
    : selected
    ? colors.glassBorder
    : tone === "danger"
    ? colors.danger
    : colors.glassBorder;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, selected, busy }}
      disabled={inactive}
      focusable
      hitSlop={compact ? t.spacing.sm : t.spacing.xxs}
      onPress={run}
      android_ripple={androidRipple(colors.glassPressed)}
      testID={testID}
      style={({ pressed, focused }) => [
        styles.iconButton,
        {
          backgroundColor: background,
          borderColor: tone !== "danger" && isNativeGlassAvailable(reduceTransparency) ? "transparent" : border,
          opacity: resolveInteractionState({ selected, disabled: inactive, pressed, focused }).opacity,
        },
        !inactive && pressed && !reduceMotion && { transform: [{ scale: t.materials.pressScale }] },
        focused && { borderColor: colors.focusRing, borderWidth: t.focus.width },
        style,
        layoutStyle,
      ]}
    >
      {({ pressed }) => (
        <>
          {!ghost ? <AppleMaterialSurface selected={selected} pressed={pressed} style={styles.iconButtonMaterial} /> : null}
          {busy ? <ActivityIndicator size="small" color={foreground} /> : <Icon name={icon} size={size} color={foreground} />}
        </>
      )}
    </Pressable>
  );
}

export function StatusChip({ label, tone = "neutral", icon, selected = false, style, layoutStyle }) {
  const { colorScheme } = useTheme();
  const semantic = useMemo(() => getStatusColors(tone, colorScheme), [colorScheme, tone]);
  return (
    <View
      accessibilityLabel={`${label} status`}
      style={[
        styles.statusChip,
        {
          backgroundColor: semantic.background,
          borderColor: selected ? semantic.foreground : semantic.border,
        },
        style,
        layoutStyle,
      ]}
    >
      {icon ? <Icon name={icon} size={13} color={semantic.foreground} /> : null}
      <Text style={[styles.statusChipText, { color: semantic.foreground }]}>{label}</Text>
    </View>
  );
}

export function FormField({
  label,
  hint,
  error,
  value,
  onChangeText,
  placeholder,
  disabled = false,
  inputProps,
  required = false,
  density,
  multiline = false,
  autoGrow = false,
  maxLength,
  showCount = false,
  testID,
  style,
  layoutStyle,
  inputStyle,
  rightAction,
}) {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const resolvedDensity = useResolvedDensity(density);
  const [focused, setFocused] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const oneLineHeight = t.density[resolvedDensity]?.controlHeight || t.density.standard.controlHeight;
  const growingLineHeight = t.typography.body.lineHeight * fontScale;
  const growingBaseHeight = Math.max(oneLineHeight, growingLineHeight + t.spacing.xs * 2 + 2);
  const growingPadding = (growingBaseHeight - growingLineHeight - 2) / 2;
  const help = error || hint;
  const state = resolveInteractionState({ error: Boolean(error), focused, disabled });
  const {
    onFocus: inputOnFocus,
    onBlur: inputOnBlur,
    onContentSizeChange: inputOnContentSizeChange,
    scrollEnabled: inputScrollEnabled,
    ...restInputProps
  } = inputProps || {};
  return (
    <View style={[styles.formField, style, layoutStyle]}>
      {label ? (
        <AppText variant="formLabel" style={[styles.formLabel, { color: colors.text }]}>
          {label}{required ? " *" : ""}
        </AppText>
      ) : null}
      <View style={styles.inputContainer}>
        {autoGrow ? (
          <Text
            accessible={false}
            pointerEvents="none"
            style={[
              styles.inputMeasure,
              t.typography.body,
              { paddingHorizontal: t.spacing.sm },
              inputStyle,
            ]}
            onTextLayout={(event) => {
              const nextCount = Math.max(1, event.nativeEvent.lines.length);
              setLineCount((current) => current === nextCount ? current : nextCount);
            }}
          >
            {value || " "}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityState={{ disabled }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          testID={testID}
          editable={!disabled}
          multiline={multiline}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            multiline && { borderRadius: t.radius.xl },
            {
              color: colors.text,
              backgroundColor: colors.inputBackground,
              borderColor: controlBorderColor(state, colors),
              borderWidth: focused ? t.focus.width : 1,
              opacity: state.opacity,
              minHeight: multiline && !autoGrow ? 112 : oneLineHeight,
              ...(autoGrow ? {
                height: growingBaseHeight + (lineCount - 1) * growingLineHeight,
                paddingTop: growingPadding,
                paddingBottom: growingPadding,
              } : null),
              textAlignVertical: multiline ? "top" : "center",
              // Android adds asymmetric font padding around a centred line.
              // Keep multiline note spacing unchanged.
              includeFontPadding: Platform.OS === "android" && (!multiline || autoGrow) ? false : undefined,
              // UITextField centres its native font metrics, including secure text.
              // A paragraph line height shifts the baseline within that centred rect.
              lineHeight: Platform.OS === "ios" && (!multiline || autoGrow) ? undefined : t.typography.body.lineHeight,
            },
            inputStyle,
            rightAction ? styles.inputWithAction : null,
          ]}
          {...restInputProps}
          scrollEnabled={autoGrow ? false : inputScrollEnabled}
          maxLength={maxLength ?? restInputProps.maxLength}
          onContentSizeChange={(event) => {
            inputOnContentSizeChange?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            inputOnFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputOnBlur?.(event);
          }}
        />
        {rightAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightAction.label}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={rightAction.onPress}
            style={styles.inputAction}
          >
            <Icon name={rightAction.icon} size={t.iconSize.md} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {help || (showCount && maxLength) ? (
        <View style={styles.formFooter}>
          {help ? (
            <AppText variant="caption"
              accessibilityRole={error ? "alert" : undefined}
              style={[styles.formHelp, { color: error ? colors.danger : colors.textMuted }]}
            >
              {help}
            </AppText>
          ) : <View />}
          {showCount && maxLength ? (
            <AppText variant="metadata" tone="secondary">{String(value || "").length}/{maxLength}</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function Divider({ variant = "default", style, layoutStyle }) {
  const { colors } = useTheme();
  // Record sections use a full-point, subdued border-colour rule. Ordinary
  // dividers retain their hairline geometry and semantic divider colour.
  const record = variant === "record";
  return <View accessibilityRole="none" style={[
    record ? styles.recordDivider : styles.divider,
    { backgroundColor: record ? colors.border : colors.divider },
    style,
    layoutStyle,
  ]} />;
}

export function Checkbox({ checked, onChange, label, disabled = false, style, layoutStyle }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => onChange?.(!checked)}
      android_ripple={androidRipple(colors.pressed)}
      style={({ pressed, focused }) => [
        styles.checkboxRow,
        { opacity: disabled ? 0.55 : pressed ? 0.75 : 1 },
        focused && { borderColor: colors.focusRing },
        style,
        layoutStyle,
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? colors.accent : colors.inputBackground,
            borderColor: checked ? colors.accent : colors.inputBorder,
          },
        ]}
      >
        {checked ? <Icon name="check" size={t.iconSize.sm} color={colors.textOnAccent} /> : null}
      </View>
      <AppText variant="body" layoutStyle={styles.checkboxLabel}>{label}</AppText>
    </Pressable>
  );
}

export function Banner({
  title,
  children,
  tone = "info",
  presentation = "default",
  icon,
  actionLabel,
  onAction,
  dismissLabel = "Dismiss",
  onDismiss,
  style,
  layoutStyle,
}) {
  const { colorScheme } = useTheme();
  const { foreground, background, border } = getStatusColors(tone, colorScheme);
  return (
    <View accessibilityRole={tone === "danger" ? "alert" : undefined} style={[styles.banner, { backgroundColor: background, borderColor: border }, presentation === "card" && { borderRadius: t.componentRadius.card }, style, layoutStyle]}>
      {icon ? <Icon name={icon} size={t.iconSize.md} color={foreground} /> : null}
      <View style={styles.bannerContent}>
        {title ? <AppText variant="bodyStrong" style={{ color: foreground }}>{title}</AppText> : null}
        {typeof children === "string" ? <AppText variant="bodySmall" style={{ color: foreground }}>{children}</AppText> : children}
        {actionLabel && onAction ? (
          <AppPressable onPress={onAction} accessibilityRole="button" style={styles.bannerAction}>
            <AppText variant="link" style={{ color: foreground }}>{actionLabel}</AppText>
          </AppPressable>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel={dismissLabel} onPress={onDismiss} style={styles.bannerDismiss}>
          <Icon name="x" size={t.iconSize.sm} color={foreground} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function StateView({
  state = "empty",
  title,
  message,
  icon = null,
  action = null,
  actionLabel,
  onAction,
  actionLoading = false,
  tone = null,
  compact = false,
  style = null,
}) {
  const { colors } = useTheme();
  const defaults = {
    loading: { icon: "loader", title: "Loading…", tone: "secondary" },
    empty: { icon: "inbox", title: "Nothing here yet", tone: "secondary" },
    error: { icon: "alert-circle", title: "Something went wrong", tone: "danger" },
    success: { icon: "check-circle", title: "Complete", tone: "success" },
  }[state] || { icon: "inbox", title: "Nothing here yet", tone: "secondary" };
  const resolvedTone = tone || defaults.tone;
  const actionNode = action || (actionLabel && onAction ? (
    <AppButton label={actionLabel} onPress={onAction} loading={actionLoading} variant="secondary" />
  ) : null);
  return (
    <View style={[styles.stateView, compact && styles.stateViewCompact, style]}>
      {state === "loading" ? (
        <ActivityIndicator size={compact ? "small" : "large"} color={colors.accent} />
      ) : (
        <Icon name={icon || defaults.icon} size={t.iconSize.xl} color={textTone(resolvedTone, colors)} />
      )}
      <AppText variant={compact ? "bodyStrong" : "sectionTitle"} align="center">{title || defaults.title}</AppText>
      {message ? <AppText tone={resolvedTone} align="center">{message}</AppText> : null}
      {actionNode ? <View style={styles.stateAction}>{actionNode}</View> : null}
    </View>
  );
}

export function AppModal({
  visible,
  onRequestClose,
  title,
  children,
  actions,
  actionsLayoutStyle,
  style,
  keyboardAvoiding = true,
  presentation = "dialog",
  appearance = "default",
  scrollable = false,
  dismissible = true,
  busy = false,
  closeLabel = "Close modal",
  testID,
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const useSheet = presentation === "sheet" || (presentation === "adaptive" && width < t.layout.tabletBreakpoint);
  const [sheetMounted, setSheetMounted] = useState(visible);
  const sheetProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!useSheet) return;
    if (visible) setSheetMounted(true);
    const animation = Animated.timing(sheetProgress, {
      toValue: visible ? 1 : 0,
      duration: reducedMotion ? 0 : visible ? t.motion.sheetEnter : t.motion.sheetExit,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setSheetMounted(false);
    });
    return () => animation.stop();
  }, [visible, useSheet, sheetProgress, reducedMotion]);

  const requestClose = () => {
    if (!dismissible || busy) return;
    onRequestClose?.();
  };
  const body = scrollable ? (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
      {children}
    </ScrollView>
  ) : <View style={styles.modalBody}>{children}</View>;
  const content = (
    <View style={[styles.modalOverlay, useSheet && styles.modalOverlaySheet]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay, opacity: useSheet ? sheetProgress : 1 }]}
      />
      {dismissible && !busy ? <Pressable accessibilityLabel="Close modal" onPress={requestClose} style={styles.modalBackdrop} /> : null}
      <Animated.View
        accessibilityViewIsModal
        testID={testID}
        style={[
          styles.modalCard,
          useSheet && styles.modalSheet,
          { backgroundColor: appearance === "grouped" ? colors.groupedBackground : colors.surfaceElevated, borderColor: appearance === "grouped" ? "transparent" : colors.border },
          style,
          useSheet && !reducedMotion && { transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] },
        ]}
      >
        {title != null ? (
          <>
            <View style={styles.modalHeader}>
              <AppText variant="sectionTitle" accessibilityRole="header" layoutStyle={styles.modalTitle}>{title}</AppText>
              {dismissible ? <IconButton icon="x" label={closeLabel} onPress={requestClose} disabled={busy} /> : null}
            </View>
            <Divider />
          </>
        ) : null}
        {body}
        {actions ? <View style={[styles.modalActions, actionsLayoutStyle]}>{actions}</View> : null}
      </Animated.View>
    </View>
  );
  return (
    <Modal visible={useSheet ? visible || sheetMounted : visible} transparent animationType={useSheet || reducedMotion ? "none" : "fade"} onRequestClose={requestClose}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.keyboardForm} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : content}
    </Modal>
  );
}

export function MediaViewerModal({
  visible,
  onRequestClose,
  uri,
  source,
  accessibilityLabel = "Media preview",
  children,
  testID,
}) {
  const { colors } = useTheme();
  const resolvedSource = source || (uri ? { uri } : null);
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <SafeAreaView
        accessibilityViewIsModal
        testID={testID}
        style={[styles.mediaViewer, { backgroundColor: colors.mediaBackdrop }]}
      >
        <View style={styles.mediaViewerToolbar}>
          <IconButton
            icon="x"
            label="Close media preview"
            variant="ghost"
            onPress={onRequestClose}
            style={styles.mediaViewerClose}
          />
        </View>
        <View style={styles.mediaViewerContent}>
          {children || (resolvedSource ? (
            <Image
              source={resolvedSource}
              resizeMode="contain"
              accessibilityLabel={accessibilityLabel}
              style={styles.mediaViewerImage}
            />
          ) : null)}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function TextArea(props) {
  return <FormField multiline {...props} />;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Select…",
  hint,
  error,
  required = false,
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search options",
  loading = false,
  emptyMessage = "No options available",
  showSelectedDescription = false,
  hideLabel = false,
  material = false,
  presentation = "field",
  divider = false,
  density,
  testID,
  style,
}) {
  const { colors } = useTheme();
  const resolvedDensity = useResolvedDensity(density);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedOptions = useMemo(() => normalizeSelectOptions(options), [options]);
  const filteredOptions = useMemo(
    () => filterSelectOptions(normalizedOptions, query),
    [normalizedOptions, query]
  );
  const selectedOption = normalizedOptions.find(
    (option) => option.value === value || String(option.value) === String(value ?? "")
  );
  const selectedLabel = selectedOption?.label || "";
  const inactive = disabled || loading;
  const openSelect = () => {
    if (inactive) return;
    setQuery("");
    setOpen(true);
  };
  const selectOption = (option) => {
    if (option.disabled) return;
    onChange?.(option.value, option);
    setOpen(false);
  };
  return (
    <View style={[styles.formField, presentation === "settingsRow" && styles.settingsField, style]}>
      {!hideLabel && presentation !== "settingsRow" ? <AppText variant="formLabel">{label}{required ? " *" : ""}</AppText> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled: inactive, expanded: open }}
        disabled={inactive}
        onPress={openSelect}
        testID={testID}
        style={({ pressed, focused }) => [
          styles.selectField,
          presentation === "settingsRow" && styles.settingsSelect,
          {
            minHeight: presentation === "settingsRow" ? 56 : t.density[resolvedDensity]?.controlHeight || t.density.standard.controlHeight,
            backgroundColor: material || presentation === "settingsRow" ? "transparent" : colors.inputBackground,
            borderColor: controlBorderColor(resolveInteractionState({ error: Boolean(error), focused, disabled: inactive, pressed }), colors),
            borderWidth: focused ? t.focus.width : 1,
            opacity: resolveInteractionState({ error: Boolean(error), focused, disabled: inactive, pressed }).opacity,
            ...(presentation === "settingsRow" ? { borderWidth: focused ? t.focus.width : 0 } : null),
          },
        ]}
      >
        {material ? <AppleMaterialSurface style={{ borderRadius: t.componentRadius.field }} /> : null}
        {presentation === "settingsRow" ? <AppText variant="settingsRow" tone="settings" layoutStyle={styles.settingsCopy}>{label}{required ? " *" : ""}</AppText> : null}
        <View style={[styles.selectContent, presentation === "settingsRow" && styles.settingsSelectValue]}>
          <AppText variant={presentation === "settingsRow" ? "settingsRow" : "body"} tone={presentation === "settingsRow" ? "secondary" : selectedLabel ? "primary" : "muted"} numberOfLines={1}>
            {selectedLabel || placeholder}
          </AppText>
          {showSelectedDescription && selectedOption?.description ? (
            <AppText variant="bodySmall" tone="muted" numberOfLines={1}>
              {selectedOption.description}
            </AppText>
          ) : null}
        </View>
        {loading ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="chevron-down" size={t.iconSize.sm} color={colors.textMuted} />}
      </Pressable>
      {presentation === "settingsRow" && divider ? <View style={[styles.settingsDivider, { backgroundColor: colors.divider }]} /> : null}
      {error || hint ? <AppText variant="bodySmall" tone={error ? "danger" : "muted"}>{error || hint}</AppText> : null}
      <AppModal
        visible={open}
        onRequestClose={() => setOpen(false)}
        title={label}
        presentation="adaptive"
        testID={testID ? `${testID}-modal` : undefined}
      >
        {searchable ? (
          <FormField
            label="Search"
            value={query}
            onChangeText={setQuery}
            inputProps={{ placeholder: searchPlaceholder, autoCapitalize: "none", autoCorrect: false }}
            density={density}
          />
        ) : null}
        {loading ? (
          <StateView state="loading" compact title="Loading options…" />
        ) : filteredOptions.length ? (
          <FlatList
            data={filteredOptions}
            keyExtractor={(option, index) => `${String(option.value)}-${index}`}
            keyboardShouldPersistTaps="handled"
            style={styles.optionList}
            renderItem={({ item, index }) => (
              <ListRow
                title={item.label}
                subtitle={item.description}
                selected={item.value === value || String(item.value) === String(value ?? "")}
                trailing={
                  <View style={styles.selectOptionIndicator}>
                    {item.value === value || String(item.value) === String(value ?? "") ? (
                      <Icon name="check" size={t.iconSize.sm} color={colors.accentText} />
                    ) : null}
                  </View>
                }
                disabled={item.disabled}
                onPress={() => selectOption(item)}
                density={density}
                divider={index < filteredOptions.length - 1}
                testID={testID ? `${testID}-option-${String(item.value)}` : undefined}
              />
            )}
          />
        ) : (
          <StateView state="empty" compact title={query ? "No matches" : emptyMessage} />
        )}
      </AppModal>
    </View>
  );
}

const localTodayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function DateField({
  label,
  value,
  onChange,
  onChangeText,
  placeholder = "Select date",
  minDate,
  maxDate,
  disabledDates = [],
  clearable = false,
  required = false,
  hint,
  error,
  disabled = false,
  density,
  testID,
  style,
}) {
  const { colors } = useTheme();
  const resolvedDensity = useResolvedDensity(density);
  const [open, setOpen] = useState(false);
  const change = onChange || onChangeText;
  const markedDates = useMemo(() => {
    const marked = Object.fromEntries(
      (Array.isArray(disabledDates) ? disabledDates : []).map((date) => [date, { disabled: true, disableTouchEvent: true }])
    );
    if (value) marked[value] = { ...(marked[value] || {}), selected: true, selectedColor: colors.accent };
    return marked;
  }, [colors.accent, disabledDates, value]);
  const chooseDate = (day) => {
    if (!isDateSelectable(day.dateString, { minDate, maxDate, disabledDates })) return;
    change?.(day.dateString);
    setOpen(false);
  };
  return (
    <View style={[styles.formField, style]}>
      <AppText variant="formLabel">{label}{required ? " *" : ""}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        testID={testID}
        style={({ pressed, focused }) => {
          const state = resolveInteractionState({ error: Boolean(error), focused, disabled, pressed });
          return [
            styles.selectField,
            {
              minHeight: t.density[resolvedDensity]?.controlHeight || t.density.standard.controlHeight,
              backgroundColor: colors.inputBackground,
              borderColor: controlBorderColor(state, colors),
              borderWidth: focused ? t.focus.width : 1,
              opacity: state.opacity,
            },
          ];
        }}
      >
        <AppText tone={value ? "primary" : "muted"} style={styles.selectValue}>{value ? formatISODateDDMMYYYY(value) : placeholder}</AppText>
        <Icon name="calendar" size={t.iconSize.sm} color={colors.textMuted} />
      </Pressable>
      {error || hint ? <AppText variant="bodySmall" tone={error ? "danger" : "muted"}>{error || hint}</AppText> : null}
      <AppModal
        visible={open}
        onRequestClose={() => setOpen(false)}
        title={label}
        presentation="adaptive"
        actions={clearable && value ? <AppButton label="Clear date" variant="ghost" onPress={() => { change?.(""); setOpen(false); }} /> : null}
        testID={testID ? `${testID}-modal` : undefined}
      >
        <Calendar
          current={value || minDate || localTodayISO()}
          minDate={minDate}
          maxDate={maxDate}
          markedDates={markedDates}
          onDayPress={chooseDate}
          enableSwipeMonths
          theme={{
            calendarBackground: colors.surfaceElevated,
            dayTextColor: colors.text,
            monthTextColor: colors.text,
            textDisabledColor: colors.disabledText,
            todayTextColor: colors.accentText || colors.accent,
            arrowColor: colors.accent,
            selectedDayBackgroundColor: colors.accentFill || colors.accent,
            selectedDayTextColor: colors.textOnAccent,
          }}
        />
      </AppModal>
    </View>
  );
}

export function SegmentedControl({ options, value, onChange, disabled = false, density, style, pill = false, subtle = false, appearance = "default", accessibilityLabel, selectionRole = "tab" }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const resolvedDensity = useResolvedDensity(density);
  return (
    <View accessibilityRole={selectionRole === "radio" ? "radiogroup" : "tablist"} accessibilityLabel={accessibilityLabel} style={[styles.segmented, pill && styles.pillSegmented, { backgroundColor: colors.surfaceAlt, borderColor: subtle ? "transparent" : colors.border }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole={selectionRole}
            accessibilityLabel={option.label}
            accessibilityState={selectionRole === "radio" ? { checked: selected, disabled: disabled || Boolean(option.disabled) } : { selected, disabled: disabled || option.disabled }}
            {...(selectionRole === "radio" ? { "aria-checked": selected } : { "aria-selected": selected })}
            aria-disabled={disabled || Boolean(option.disabled)}
            disabled={disabled || option.disabled}
            onPress={() => onChange?.(option.value)}
            android_ripple={androidRipple(colors.glassPressed)}
            style={({ pressed, focused }) => [
              styles.segment,
              option.icon && styles.segmentWithIcon,
              pill && styles.pillSegment,
              {
                minHeight: t.density[resolvedDensity]?.controlHeight || t.density.standard.controlHeight,
                backgroundColor: appearance === "settings" && selected ? colors.groupedSurface : "transparent",
                borderColor: focused ? colors.focusRing : appearance === "settings" ? "transparent" : selected && !subtle ? colors.glassBorder : "transparent",
                opacity: disabled || option.disabled ? t.opacity.disabled : pressed ? t.opacity.subduedPressed : 1,
              },
              !disabled && !option.disabled && pressed && !reduceMotion && { transform: [{ scale: t.materials.pressScale }] },
            ]}
          >
            {({ pressed }) => (
              <>
                {selected && appearance !== "settings" ? <AppleMaterialSurface selected={!subtle} pressed={pressed} style={[styles.segmentMaterial, pill && styles.pillSegment]} /> : null}
                {option.icon ? <Icon name={option.icon} size={t.iconSize.sm} color={selected ? colors.accentText : colors.textMuted} /> : null}
                <AppText variant={appearance === "settings" ? "settingsRow" : "metadata"} tone={selected ? "accent" : "secondary"} align="center">{option.label}</AppText>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function AttachmentButton({ label = "Add attachment", icon = "paperclip", ...props }) {
  return <AppButton label={label} icon={icon} variant="secondary" {...props} />;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  onError,
}) {
  const [pending, setPending] = useState(false);
  const [confirmationError, setConfirmationError] = useState("");
  const busy = loading || pending;

  useEffect(() => {
    if (!visible) {
      setConfirmationError("");
      setPending(false);
    }
  }, [visible]);

  const confirm = async () => {
    setConfirmationError("");
    setPending(true);
    const result = await runConfirmation(onConfirm, onError);
    setConfirmationError(result.message);
    setPending(false);
  };
  return (
    <AppModal
      visible={visible}
      onRequestClose={onCancel}
      title={title}
      busy={busy}
      actions={
        <>
          <AppButton label={cancelLabel} variant="secondary" onPress={onCancel} disabled={busy} />
          <AppButton label={confirmLabel} variant={destructive ? "danger" : "primary"} onPress={confirm} loading={busy} />
        </>
      }
    >
      <AppText tone="secondary">{message}</AppText>
      {confirmationError ? <Banner tone="danger" icon="alert-circle">{confirmationError}</Banner> : null}
    </AppModal>
  );
}

export function KeyboardForm({ children, contentContainerStyle, style, keyboardVerticalOffset = 0 }) {
  return (
    <KeyboardAvoidingView
      style={[styles.keyboardForm, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.keyboardFormContent, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  settingsGroup: { borderRadius: t.componentRadius.card, overflow: "hidden" },
  settingsRow: { minHeight: 56, padding: t.spacing.sm, paddingHorizontal: t.spacing.md, flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  settingsCopy: { flex: 1, minWidth: 0, gap: t.spacing.xxxs },
  settingsValue: { flexShrink: 1, maxWidth: "45%", textAlign: "right" },
  settingsDivider: { height: StyleSheet.hairlineWidth, marginLeft: t.spacing.md },
  settingsRowDivider: { position: "absolute", bottom: 0, left: 0, right: 0 },
  settingsField: { gap: t.spacing.none },
  settingsSelect: { borderRadius: t.spacing.none, paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.sm },
  settingsSelectValue: { alignItems: "flex-end" },
  appPressable: { minHeight: t.controls.buttonHeight, minWidth: t.controls.buttonHeight },
  appPressableFocused: {
    borderWidth: t.focus.width,
    borderRadius: t.componentRadius.nestedControl,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: t.componentRadius.card,
    padding: t.controls.cardPaddingLg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: t.spacing.sm,
    flexWrap: "wrap",
    marginBottom: t.spacing.sm,
  },
  sectionHeaderText: { flex: 1, minWidth: 180 },
  sectionTitle: { ...t.typography.sectionTitle },
  sectionSubtitle: { ...t.typography.bodySmall, marginTop: t.spacing.xxs },
  sectionAction: { minHeight: t.controls.buttonHeightLg, justifyContent: "center" },
  listRow: {
    width: "100%",
    borderWidth: t.focus.width,
    borderRadius: t.componentRadius.nestedControl,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
  },
  listRowLeading: {
    flexShrink: 0,
    width: t.controls.iconButton,
    height: t.controls.iconButton,
    borderWidth: 1,
    borderRadius: t.componentRadius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowCopy: { flex: 1, minWidth: 0, gap: t.spacing.xxxs },
  listRowStatus: { flexShrink: 1, maxWidth: "40%" },
  listRowStackedStatus: { alignSelf: "flex-start", maxWidth: "100%", marginTop: t.spacing.xxs },
  inactive: { opacity: 0.55 },
  pageSection: {
    gap: t.spacing.sm,
  },
  pageSectionHeader: {
    marginBottom: t.spacing.none,
  },
  pageSectionContent: {
    gap: t.spacing.sm,
  },
  formStep: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: t.spacing.sm,
  },
  formStepFullWidth: { gap: t.spacing.xs, paddingBottom: t.spacing.lg },
  formStepFullWidthHeading: { flex: 1, minWidth: 0 },
  formStepRail: {
    width: 30,
    alignItems: "center",
  },
  formStepBadge: {
    width: 30,
    height: 30,
    borderRadius: t.componentRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  formStepNumber: {
    fontWeight: "900",
  },
  formStepLine: {
    width: StyleSheet.hairlineWidth,
    flex: 1,
    marginVertical: t.spacing.xxs,
  },
  formStepContent: {
    flex: 1,
    minWidth: 0,
    gap: t.spacing.xs,
    paddingBottom: t.spacing.lg,
  },
  formStepContentLast: {
    paddingBottom: t.spacing.xs,
  },
  formStepHeader: {
    gap: t.spacing.xxxs,
  },
  button: {
    maxWidth: "100%",
    minWidth: 0,
    flexShrink: 1,
    minHeight: t.controls.buttonHeightLg,
    borderWidth: 1,
    borderRadius: t.componentRadius.control,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xs,
  },
  buttonText: { ...t.typography.button, flexShrink: 1, textAlign: "center" },
  toggleRow: {
    minHeight: t.controls.buttonHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    borderWidth: t.focus.width,
    borderColor: "transparent",
    borderRadius: t.componentRadius.control,
  },
  toggleCopy: { flex: 1, minWidth: 0, gap: t.spacing.xxxs },
  webToggleTrack: {
    width: t.spacing["2xl"],
    height: t.spacing.lg,
    borderRadius: t.componentRadius.pill,
    padding: t.spacing.xxxs,
  },
  webToggleThumb: {
    width: t.spacing.md,
    height: t.spacing.md,
    borderRadius: t.componentRadius.pill,
  },
  webToggleThumbSelected: { transform: [{ translateX: t.spacing.sm }] },
  iconBadge: {
    borderWidth: 1,
    borderRadius: t.componentRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    position: "relative",
    borderRadius: t.componentRadius.pill,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderRadius: t.componentRadius.pill,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderWidth: 1,
    borderRadius: t.componentRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: { position: "absolute", right: 0, bottom: 0 },
  mediaThumbnailImage: {
    width: "100%",
    borderWidth: 1,
    borderRadius: t.componentRadius.card,
  },
  iconButton: {
    width: t.controls.iconButton,
    minWidth: t.controls.iconButton,
    height: t.controls.iconButton,
    borderWidth: 1,
    borderRadius: t.componentRadius.iconButton,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonMaterial: { borderRadius: t.componentRadius.iconButton },
  statusChip: {
    maxWidth: "100%",
    flexShrink: 1,
    minHeight: t.controls.chipMinHeight,
    borderWidth: 1,
    borderRadius: t.componentRadius.pill,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: t.spacing.xxs,
  },
  statusChipText: { ...t.typography.metadata, flexShrink: 1, minWidth: 0 },
  formField: { gap: t.spacing.xxs },
  formLabel: { ...t.typography.formLabel },
  inputContainer: { position: "relative" },
  inputMeasure: { position: "absolute", top: 0, left: 0, right: 0, opacity: 0 },
  inputWithAction: { paddingRight: t.spacing["3xl"] + t.spacing.sm },
  inputAction: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: t.spacing["3xl"] + t.spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: t.controls.buttonHeightLg,
    borderWidth: 1,
    borderRadius: t.componentRadius.field,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    ...t.typography.body,
  },
  formHelp: { ...t.typography.bodySmall, flexShrink: 1, minWidth: 0 },
  formFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: t.spacing.xs,
  },
  divider: { height: StyleSheet.hairlineWidth, width: "100%" },
  recordDivider: { height: 1, opacity: 0.6 },
  checkboxRow: {
    minHeight: t.controls.buttonHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    borderWidth: t.focus.width,
    borderColor: "transparent",
    borderRadius: t.componentRadius.nestedControl,
  },
  checkbox: {
    flexShrink: 0,
    width: 24,
    height: 24,
    borderWidth: 1,
    borderRadius: t.componentRadius.nestedControl,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: { flex: 1, minWidth: 0 },
  banner: {
    borderWidth: 1,
    borderRadius: t.componentRadius.control,
    padding: t.spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.spacing.sm,
  },
  bannerContent: { flex: 1, gap: t.spacing.xxs },
  bannerAction: { alignSelf: "flex-start", justifyContent: "center" },
  bannerDismiss: {
    width: t.controls.iconButton,
    height: t.controls.iconButton,
    alignItems: "center",
    justifyContent: "center",
    margin: -t.spacing.xs,
  },
  stateView: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xs,
    padding: t.spacing.xl,
  },
  stateViewCompact: {
    minHeight: 120,
    padding: t.spacing.md,
  },
  stateAction: { marginTop: t.spacing.xs, alignSelf: "stretch" },
  modalOverlay: { flex: 1, justifyContent: "center", padding: t.spacing.md },
  modalOverlaySheet: { justifyContent: "flex-end", padding: t.spacing.none },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: t.componentRadius.modal,
    ...t.shadows.lg,
  },
  modalSheet: {
    maxWidth: "100%",
    borderBottomLeftRadius: t.spacing.none,
    borderBottomRightRadius: t.spacing.none,
  },
  modalHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: t.spacing.sm,
    padding: t.spacing.md,
  },
  modalTitle: { flex: 1, minWidth: 0 },
  modalBody: {
    minHeight: 0,
    flexShrink: 1,
    padding: t.spacing.md,
    gap: t.spacing.sm,
  },
  modalScrollContent: { padding: t.spacing.md, gap: t.spacing.sm },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: t.spacing.sm,
    padding: t.spacing.md,
  },
  mediaViewer: { flex: 1 },
  mediaViewerToolbar: {
    minHeight: t.controls.iconButton,
    paddingHorizontal: t.spacing.md,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  mediaViewerClose: { borderColor: "transparent" },
  mediaViewerContent: { flex: 1, padding: t.spacing.md },
  mediaViewerImage: { width: "100%", height: "100%" },
  selectField: {
    borderWidth: 1,
    borderRadius: t.componentRadius.field,
    paddingHorizontal: t.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
  },
  selectValue: { flex: 1 },
  selectContent: { flex: 1, justifyContent: "center", paddingVertical: t.spacing.xxs },
  optionList: { maxHeight: t.layout.compactBreakpoint },
  selectOptionIndicator: { width: t.iconSize.sm, alignItems: "center", justifyContent: "center" },
  segmented: {
    borderWidth: 1,
    borderRadius: t.componentRadius.control,
    padding: t.spacing.xxs,
    flexDirection: "row",
    alignItems: "stretch",
  },
  pillSegmented: { borderRadius: t.componentRadius.pill },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderRadius: getConcentricRadius(t.componentRadius.control, t.spacing.xxs + 1),
    paddingHorizontal: t.spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentWithIcon: { flexDirection: "row", gap: t.spacing.xxs },
  segmentMaterial: { borderRadius: getConcentricRadius(t.componentRadius.control, t.spacing.xxs + 2) },
  pillSegment: { borderRadius: t.componentRadius.pill },
  keyboardForm: { flex: 1 },
  keyboardFormContent: { flexGrow: 1, gap: t.spacing.md },
});
