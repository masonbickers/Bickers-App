import TimeChoiceRow from "../ui/TimeChoiceRow";
import { useState } from "react";
import { View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { styles as weekStyles } from "../../lib/design/screenStyles/week-id-index-js";
import { designTokens as t } from "../../lib/design/tokens";
import { useTheme } from "../../providers/ThemeProvider";
import PageShell from "../layout/PageShell";
import { AppPressable, AppText, AppButton } from "../ui/AppPrimitives";

export function LegacyTimeChoice({ label, selected, onPress, disabled }) {
  const { colors } = useTheme();
  return <AppPressable disabled={disabled} style={[
    weekStyles.modalItem,
    { borderBottomColor: colors.border },
    selected && { backgroundColor: colors.accentSoft, borderBottomColor: colors.accent },
  ]} onPress={onPress}>
    <AppText style={{ color: selected ? colors.accent : colors.text, fontWeight: selected ? "800" : "400" }}>{label}</AppText>
    {selected ? <View style={weekStyles.modalSelectedIcon}><Icon name="check" size={15} color={colors.accent} /></View> : null}
  </AppPressable>;
}

export default function TimeChoiceFixture({ Row = TimeChoiceRow }) {
  const [value, setValue] = useState("03:30 AM");
  const [loading, setLoading] = useState(false);
  const options = ["03:30 AM", "11:45 PM", "12:00 AM · next day", "12:15 AM · next day"];
  return <PageShell header={{ title: "Timesheet picker rows" }}>
    <AppText testID="chosen-time">{value}</AppText>
    <AppButton label={loading ? "Finish loading" : "Simulate loading"} onPress={() => setLoading(!loading)} />
    <View testID="time-choice-list" style={{ flexShrink: 0, minHeight: options.length * Math.max(42, t.controls.buttonHeight) }}>
      {options.map((label) => <Row key={label} label={label} selected={label === value} onPress={() => setValue(label)} disabled={loading} />)}
    </View>
    <View testID="time-choice-empty"><AppText tone="muted">No time options</AppText></View>
  </PageShell>;
}
