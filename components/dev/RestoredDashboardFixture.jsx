import { useState } from "react";
import { View } from "react-native";
import { ServiceDashboardView } from "../../app/(protected)/(service-tabs)/service/home";
import { AppText } from "../ui/AppPrimitives";
const names = ["vehiclesResource", "checksResource", "issuesResource", "serviceRecordsResource", "defectsResource", "prepResource", "motResource", "inspectionsResource", "equipmentResource"];
const data = {
  vehiclesResource: [{ id: "van", name: "Workshop support vehicle with a long descriptive name", nextMot: "2000-01-01", nextService: new Date(Date.now() + 10 * 86400000).toISOString() }],
  defectsResource: Array.from({ length: 120 }, (_, index) => ({ id: `defect-${index}`, status: "open", category: "Workshop inspection", createdAt: "2026-09-18" })),
  equipmentResource: [{ id: "lift", nextInspectionDate: "2000-01-01" }],
};
export default function RestoredDashboardFixture({ initialState = "ready" }) {
  const [state, setState] = useState(initialState);
  const [destination, setDestination] = useState("");
  const resources = Object.fromEntries(names.map((name) => [name, {
    data: ["empty", "loading", "error"].includes(state) ? [] : data[name] || [],
    isInitialLoading: state === "loading", isRefreshing: false,
    error: state === "error" || (state === "partial" && name === "inspectionsResource") ? new Error("Fixture unavailable") : null,
    refresh: () => setState("ready"),
  }]));
  return <View style={{ flex: 1 }}><ServiceDashboardView router={{ push: setDestination }} employee={null} resources={resources} /><AppText testID="dashboard-destination">{destination}</AppText></View>;
}
