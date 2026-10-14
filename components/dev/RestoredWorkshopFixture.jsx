import { useState } from "react";
import { View } from "react-native";
import { WorkshopFormsView } from "../../app/(protected)/(service-tabs)/service/work";
import { AppText } from "../ui/AppPrimitives";
const drafts = [{ id: "long", title: "Workshop support vehicle with a long descriptive name", registration: "AB12 CDE", serviceType: "Full service with additional maintenance checks", serviceDate: "18/09/2026", type: "service", route: "/service/service-form/sample-draft" }];
export default function RestoredWorkshopFixture({ initialState = "ready" }) {
  const [state, setState] = useState(initialState);
  const [destination, setDestination] = useState("");
  return <View style={{ flex: 1 }}><WorkshopFormsView router={{ push: setDestination }} serviceDrafts={["empty", "loading"].includes(state) ? [] : drafts} draftsLoading={state === "loading"} draftErrors={state === "error" ? 1 : 0} loadDrafts={() => setState("ready")} /><AppText testID="workshop-destination">{destination}</AppText></View>;
}
