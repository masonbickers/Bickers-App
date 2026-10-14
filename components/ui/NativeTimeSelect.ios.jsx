import DateTimePicker from "@react-native-community/datetimepicker";
import { SettingsRow } from "./AppPrimitives";
import { timePickerDate, timePickerValue } from "../../lib/design/nativeUI";
import { useTheme } from "../../providers/ThemeProvider";

/** UIKit's compact time picker preserves the existing quarter-hour value API. */
export default function NativeTimeSelect({ label, value, onChange, options, disabled, divider }) {
  const { colors, colorScheme } = useTheme();
  return <SettingsRow title={label} divider={divider} trailing={
    <DateTimePicker
      accessibilityLabel={label}
      value={timePickerDate(value) || timePickerDate("08:00")}
      mode="time" display="compact" minuteInterval={15} locale="en_GB"
      themeVariant={colorScheme} accentColor={colors.accent} disabled={disabled}
      onChange={(event, date) => {
        if (disabled || event.type !== "set") return;
        const next = timePickerValue(date, options);
        if (next !== null) onChange?.(next);
      }}
    />
  } />;
}
