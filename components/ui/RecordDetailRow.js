import { StyleSheet, View } from "react-native";
import { designTokens as t } from "../../lib/design/tokens";
import { AppText } from "./AppPrimitives";

// Read-only workshop record details. Formatting remains with the caller.
export default function RecordDetailRow({ label, value }) {
  return (
    <View style={styles.row}>
      <AppText tone="muted" style={styles.label}>{label}</AppText>
      <AppText tone="primary" style={styles.value}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: t.spacing.xxs,
  },
  label: { fontSize: t.typography.metadata.fontSize },
  value: {
    fontSize: t.typography.metadata.fontSize,
    textAlign: "right",
    flex: 1,
    marginLeft: t.spacing.xs,
  },
});
