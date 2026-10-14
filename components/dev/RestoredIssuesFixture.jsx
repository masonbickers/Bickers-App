import { useState } from "react";
import { View } from "react-native";
import { ServiceIssuesView } from "../../app/(protected)/(service-tabs)/service/issues";
import { AppText } from "../ui/AppPrimitives";

const title = "Inspection required for the workshop vehicle braking system";
const asset = "Workshop support vehicle with a long descriptive name · AB12 CDE";
const grouped = Array.from({ length: 4 }, (_, index) => ({ id: `group-${index}`, title: `${title} ${index + 1}`, details: "Check the vehicle before its next scheduled assignment.", asset, date: "2026-09-18", route: `/service/defects/sample-${index}` }));
const single = { id: "single", title: "Equipment needs inspection", details: "Review the equipment and record the repair details.", asset: "Lifting equipment with an unusually long identification number", date: "2026-09-18", route: "/service/defects/sample-single" };

export default function RestoredIssuesFixture({ initialState = "ready" }) {
  const [state, setState] = useState(initialState);
  const [action, setAction] = useState("");
  const [advisories, setAdvisories] = useState([single, ...grouped]);
  return <View style={{ flex: 1 }}>
    <ServiceIssuesView state={state} retry={() => setState("ready")} defects={state === "empty" ? [] : grouped} advisories={state === "empty" ? [] : advisories} onOpen={setAction} onResolve={(item) => { setAction(`Resolved ${item.id}`); setAdvisories((items) => items.filter((row) => row.id !== item.id)); }} />
    <AppText testID="issue-action">{action}</AppText>
  </View>;
}
