import { useState } from "react";
import { View } from "react-native";
import { NotificationsView } from "../../app/(protected)/notifications";
import { AppText } from "../ui/AppPrimitives";

const initialItems = [
  { id: "long", title: "Workshop allocation changed for the upcoming vehicle maintenance appointment", body: "Please review the revised workshop allocation and confirm the equipment and vehicle preparation details before your next scheduled appointment.", read: false, createdAt: Date.now(), data: { bookingId: "sample" } },
  { id: "general", title: "Team update", body: "Your workshop information is available.", read: true, createdAt: Date.now(), data: {} },
];

export default function RestoredNotificationsFixture({ initialState = "ready" }) {
  const [state, setState] = useState(initialState);
  const [items, setItems] = useState(initialState === "empty" || initialState === "loading" ? [] : initialItems);
  const [action, setAction] = useState("");
  return <View style={{ flex: 1 }}>
    <NotificationsView items={items} displayItems={items} unreadCount={items.filter((item) => !item.read).length} vehicles={[]} loading={state === "loading"} error={state === "error"} refreshing={false} onRefresh={() => setState("ready")} onBack={() => setAction("Back")} openInboxActions={() => setAction("Actions")} onTap={(item) => { setAction(item.id); setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, read: true } : row)); }} />
    <AppText testID="notification-action">{action}</AppText>
  </View>;
}
