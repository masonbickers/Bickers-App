import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppButton, AppModal, AppText, Checkbox, FormField, ListRow, StatusChip } from "../ui/AppPrimitives";
import { designTokens as t } from "../../lib/design/tokens";

export default function LayoutStressFixture() {
  const [checked, setChecked] = useState(false);
  const [visible, setVisible] = useState(false);
  const [notes, setNotes] = useState("");
  return (
    <View style={styles.stack}>
      <ListRow testID="stress-list" title="Workshop vehicle requiring an annual inspection" subtitle="A long vehicle description should remain readable" status={<StatusChip label="Awaiting replacement parts and workshop approval" tone="warning" />} onPress={() => setVisible(true)} />
      <View testID="stress-checkbox">
        <Checkbox label="I have checked the vehicle and recorded every outstanding maintenance issue before completing this inspection" checked={checked} onChange={setChecked} />
      </View>
      <View testID="stress-field">
        <FormField label="Inspection notes" value={notes} onChangeText={setNotes} maxLength={500} showCount error="Please describe the replacement action and the checks required before this vehicle can return to service." />
      </View>
      <AppButton label="Open inspection details" onPress={() => setVisible(true)} />
      <AppModal testID="stress-modal" visible={visible} onRequestClose={() => setVisible(false)} title="Inspection details and outstanding maintenance requirements" presentation="adaptive" scrollable actions={<AppButton label="Save inspection and return to the workshop" onPress={() => setVisible(false)} />}>
        <AppText>Review all outstanding maintenance requirements before returning the vehicle to service.</AppText>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: t.spacing.md } });
