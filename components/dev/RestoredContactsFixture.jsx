import { useState } from "react";
import { View } from "react-native";
import { ContactsView } from "../../app/(protected)/(main-tabs)/contacts";
import { AppText } from "../ui/AppPrimitives";

const data = [
  { id: "long", name: "Alexandra Montgomery-Wellington", mobile: "07700 900123", jobTitle: ["Senior workshop coordinator", "Vehicle maintenance supervisor"] },
  { id: "missing", name: "Blake Taylor", mobile: "", jobTitle: "Operations" },
];
const resource = { data, isInitialLoading: false, isRefreshing: false, error: null, refresh: () => {} };

export default function RestoredContactsFixture() {
  const [action, setAction] = useState("");
  return <View style={{ flex: 1 }}>
    <ContactsView contactsResource={resource} onCall={(phone) => setAction(`Call ${phone}`)} onMessage={(phone, name) => setAction(`Message ${name} ${phone}`)} />
    <AppText testID="contact-action">{action}</AppText>
  </View>;
}
