import { useState } from "react";
import { View } from "react-native";
import { ServiceLandingView } from "../../app/(protected)/service";
import { AppText } from "../ui/AppPrimitives";
const vehicles = [{ id: "long", name: "Workshop support vehicle with a long descriptive name", registration: "AB12 CDE", nextMot: "2000-01-01", nextService: new Date(Date.now() + 10 * 86400000).toISOString(), defects: ["Check brakes"] }];
export default function RestoredLandingFixture({ initialState = "ready" }) {
  const [state, setState] = useState(initialState);
  const [destination, setDestination] = useState("");
  const rows = ["empty", "error", "loading"].includes(state) ? [] : vehicles;
  const resource = { rows, loading: state === "loading", error: ["error", "partial"].includes(state) ? new Error("Fixture unavailable") : null, refresh: () => setState("ready") };
  return <View style={{ flex: 1 }}><ServiceLandingView resource={resource} router={{ push: setDestination }} /><AppText testID="landing-destination">{destination}</AppText></View>;
}
