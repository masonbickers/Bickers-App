import { useState } from "react";
import { View } from "react-native";
import { EquipmentListView } from "../../app/(protected)/service/equipment-list";
import { ServiceListView } from "../../app/(protected)/(service-tabs)/service/service-list";
import { AppText } from "../ui/AppPrimitives";

const dueSoon = new Date(Date.now() + 10 * 86400000).toISOString();
const equipment = [
  { id: "lift", name: "Workshop lifting equipment with a long descriptive name", serialNumber: "SERIAL-123456789", asset: "Heavy vehicle workshop", category: "Lifting equipment", location: "North inspection bay", nextInspectionDate: "2000-01-01", inspectionFrequency: 12 },
  { id: "future", name: "Future inspection equipment", nextInspectionDate: "2099-01-01" },
  { id: "soon", name: "Equipment due soon", nextInspectionDate: dueSoon },
];
const vehicles = [
  { id: "van", name: "Workshop support vehicle with a long descriptive name", registration: "AB12 CDE", manufacturer: "Manufacturer", model: "Long wheelbase support", nextMot: "2000-01-01", nextService: "2099-01-01", mileage: 123456 },
  { id: "inactive", name: "Inactive vehicle", operationalStatus: "inactive" },
  { id: "soon", name: "Vehicle due soon", nextMot: dueSoon, nextService: "2099-01-01" },
];
export default function RestoredServiceFixtures({ kind, initialState = "ready" }) {
  const [state, setState] = useState(initialState);
  const [destination, setDestination] = useState("");
  const rows = state === "error" ? [] : kind === "equipment" ? equipment : vehicles;
  const resource = { rows, data: rows, loading: false, isInitialLoading: false, isRefreshing: false, error: state === "error" ? new Error("Fixture unavailable") : null, refresh: () => setState("ready") };
  const router = { push: (target) => setDestination(typeof target === "string" ? target : `${target.pathname}?equipmentDocId=${target.params.equipmentDocId}`) };
  const Screen = kind === "equipment" ? EquipmentListView : ServiceListView;
  const equipmentResource = { ...resource, rows: equipment, data: equipment, error: null };
  return <View style={{ flex: 1 }}><Screen resource={resource} equipmentResource={equipmentResource} router={router} /><AppText testID="restored-destination">{destination}</AppText></View>;
}
