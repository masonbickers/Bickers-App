import { SegmentedControl } from "./AppPrimitives";
import { getNativeUI } from "./nativeUI";
import { useTheme } from "../../providers/ThemeProvider";

export default function NativeSegmentedControl({ options, value, onChange, disabled = false }) {
  const { colors, colorScheme, reduceTransparency } = useTheme();
  const native = getNativeUI(reduceTransparency);
  if (!native) return <SegmentedControl options={options} value={value} onChange={onChange} disabled={disabled} appearance="settings" />;
  const { Host, Picker, Text } = native.components;
  const m = native.modifiers;
  return <Host matchContents={{ vertical: true }} style={{ width: "100%" }} colorScheme={colorScheme}>
    <Picker label="Default work type" selection={value} onSelectionChange={(next) => { if (!disabled && options.some((option) => option.value === next)) onChange?.(next); }} modifiers={[m.pickerStyle("segmented"), m.tint(colors.accent), m.disabled(disabled), m.accessibilityLabel("Default work type")]}>
      {options.map((option) => <Text key={option.value} modifiers={[m.tag(option.value)]}>{option.label}</Text>)}
    </Picker>
  </Host>;
}
