import { AppButton, useAsyncAction } from "./AppPrimitives";
import { getNativeUI } from "./nativeUI";
import { designTokens as t } from "../../lib/design/tokens";
import { useTheme } from "../../providers/ThemeProvider";

/** Pilot adapter: native action semantics; unchanged AppButton fallback. */
export default function NativeActionButton(props) {
  const theme = useTheme();
  const native = getNativeUI(theme.reduceTransparency);
  if (!native) {
    const secondary = props.variant === "secondary";
    return <AppButton {...props} variant={secondary ? "glassSecondary" : props.variant} pill={secondary || props.pill} />;
  }
  return <SwiftUIAction {...props} native={native} theme={theme} />;
}

function SwiftUIAction({ label, onPress, variant = "primary", size = "medium", systemImage, loading, disabled, onError, accessibilityLabel, accessibilityHint, role, testID, hosted = false, availableWidth, native, theme }) {
  const { busy, inactive, run } = useAsyncAction({ action: onPress, loading, disabled, onError });
  const { Host, Button, HStack, ProgressView, Text } = native.components;
  const m = native.modifiers;
  const primary = variant === "primary" || variant === "glassPrimary";
  const style = native.glass ? primary ? "glassProminent" : "glass" : primary ? "borderedProminent" : "bordered";
  const button = <Button
      label={busy ? undefined : label}
      systemImage={busy ? undefined : systemImage}
      role={role}
      onPress={run}
      modifiers={[
        m.buttonStyle(style), m.controlSize(size === "small" ? "regular" : "large"),
        primary ? m.tint(theme.colors.accentFill) : m.foregroundColor(theme.colors.text),
        m.disabled(inactive), m.fixedSize({ horizontal: !hosted, vertical: true }),
        // The sheet owns the row width; expanding each hosted button to it
        // separates the actions and makes the footer fight for space.
        m.frame({ minHeight: t.platformControls.minimumTouchTarget, minWidth: t.platformControls.minimumTouchTarget, maxWidth: hosted ? undefined : availableWidth }),
        m.accessibilityLabel(accessibilityLabel || label),
        ...(accessibilityHint ? [m.accessibilityHint(accessibilityHint)] : []),
      ]}
      testID={testID}
    >
      {busy ? <HStack spacing={t.spacing.xs} modifiers={[m.fixedSize({ horizontal: !hosted, vertical: true })]}>
        <ProgressView />
        <Text>{label}</Text>
      </HStack> : null}
    </Button>;
  return hosted ? button : <Host matchContents useViewportSizeMeasurement colorScheme={theme.colorScheme}>{button}</Host>;
}
