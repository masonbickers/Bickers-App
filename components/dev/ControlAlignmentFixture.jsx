import { useState } from "react";
import { View } from "react-native";
import PageShell from "../layout/PageShell";
import { AppButton, FormField } from "../ui/AppPrimitives";
import { designTokens as t } from "../../lib/design/tokens";

// Exercises the same shared inputs and actions as Sign In and profile/settings.
// Sample values are local fixture data; no authentication or API calls occur.
export default function ControlAlignmentFixture() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("sample-password");
  const [visible, setVisible] = useState(false);
  return <PageShell mode="form" header={{ title: "Control alignment" }}>
    <View style={{ gap: t.spacing.md, width: "100%", maxWidth: 420, alignSelf: "center" }}>
      <FormField label="Work email" value={email} onChangeText={setEmail} inputProps={{ keyboardType: "email-address", autoCapitalize: "none" }} />
      <FormField label="Password" value={password} onChangeText={setPassword} rightAction={{ label: visible ? "Hide password" : "Show password", icon: visible ? "eye-off" : "eye", onPress: () => setVisible(!visible) }} inputProps={{ secureTextEntry: !visible }} />
      <FormField label="Empty input" placeholder="Text centred inside the input" />
      <FormField label="Disabled input" value="Disabled value" disabled />
      <AppButton label="Sign In" onPress={() => {}} fullWidth />
      <View style={{ flexDirection: "row", gap: t.spacing.sm }}>
        <AppButton label="Edit" icon="edit-2" variant="secondary" onPress={() => {}} />
        <AppButton label="Add" icon="plus" variant="secondary" onPress={() => {}} />
        <AppButton label="Turn off" variant="secondary" onPress={() => {}} />
      </View>
    </View>
  </PageShell>;
}
