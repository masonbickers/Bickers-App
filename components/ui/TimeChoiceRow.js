import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { useTheme } from "../../providers/ThemeProvider";
import { designTokens as t } from "../../lib/design/tokens";
import { AppPressable, AppText } from "./AppPrimitives";

// A centred option for chronological time lists. The caller formats labels,
// resolves midnight offsets and owns value selection and modal dismissal.
export default function TimeChoiceRow({ label, selected = false, disabled = false, onPress }) {
  const { colors } = useTheme();
  return <AppPressable disabled={disabled} onPress={onPress} style={[
    styles.row,
    { borderBottomColor: colors.border },
    selected && { backgroundColor: colors.accentSoft, borderBottomColor: colors.accent },
  ]}>
    <AppText style={{ color: selected ? colors.accent : colors.text, fontWeight: selected ? "800" : "400" }}>{label}</AppText>
    {selected ? <View style={styles.selectedIcon}><Icon name="check" size={15} color={colors.accent} /></View> : null}
  </AppPressable>;
}

const styles = StyleSheet.create({
  row: { height: 42, paddingHorizontal: t.spacing.xs, borderBottomWidth: 1, justifyContent: "center", alignItems: "center" },
  selectedIcon: { position: "absolute", right: t.spacing.sm },
});
