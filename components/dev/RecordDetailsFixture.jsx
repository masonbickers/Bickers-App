import { View } from "react-native";
import { designTokens as t } from "../../lib/design/tokens";
import { styles as defectStyles } from "../../lib/design/screenStyles/service-defects-id-jsx";
import { styles as resolvedStyles } from "../../lib/design/screenStyles/service-resolved-defects-id-jsx";
import { styles as serviceStyles } from "../../lib/design/screenStyles/service-service-record-id-jsx";
import { useTheme } from "../../providers/ThemeProvider";
import PageShell from "../layout/PageShell";
import { AppText, Divider } from "../ui/AppPrimitives";
import RecordDetailRow from "../ui/RecordDetailRow";

const values = [
  ["Vehicle", "Workshop support vehicle · AB12 CDE"],
  ["Technician", "Test technician"],
  ["Notes", "A long read-only value that wraps over multiple lines on a small phone"],
  ["Empty", ""],
  ["Count", 0],
];

// Frozen pre-migration presentation oracle. The three original rows use these
// exact styles and theme overrides; value formatting is tested at the caller.
function LegacyRow({ label, value, styles }) {
  const { colors } = useTheme();
  return <View style={styles.fieldRow}>
    <AppText style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</AppText>
    <AppText style={[styles.fieldValue, { color: colors.text }]}>{value}</AppText>
  </View>;
}

export default function RecordDetailsFixture() {
  const { colors } = useTheme();
  return <PageShell header={{ title: "Read-only record details" }}>
    <View testID="divider-before"><View style={{ height: 1, backgroundColor: colors.border, opacity: 0.6, marginVertical: t.spacing.xs }} /></View>
    <View testID="divider-after"><Divider variant="record" layoutStyle={{ marginVertical: t.spacing.xs }} /></View>
    {[defectStyles, resolvedStyles, serviceStyles].map((styles, index) => (
      <View key={index}>
        <View testID={`record-before-${index}`}>
          {values.map(([label, value]) => <LegacyRow key={label} label={label} value={value} styles={styles} />)}
        </View>
        <View testID={`record-after-${index}`}>
          {values.map(([label, value]) => <RecordDetailRow key={label} label={label} value={value} />)}
        </View>
      </View>
    ))}
  </PageShell>;
}
