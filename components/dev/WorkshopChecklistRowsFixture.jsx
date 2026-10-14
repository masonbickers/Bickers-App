import { useState } from "react";
import { View } from "react-native";
import { ChecklistRow as Minor } from "../../app/(protected)/service/minor-service/[id]";
import { ChecklistRow as Mot } from "../../app/(protected)/service/mot-precheck/[id]";
import { ChecklistRow as Inspection } from "../../app/(protected)/service/inspections/inspection-form/[id]";
import PageShell from "../layout/PageShell";
import { useTheme } from "../../providers/ThemeProvider";
export default function WorkshopChecklistRowsFixture({ kind = "minor" }) {
  const { colors } = useTheme();
  const [checked, setChecked] = useState(false);
  const [na, setNA] = useState(false);
  const [rating, setRating] = useState("");
  const [note, setNote] = useState("");
  const Row = kind === "mot" ? Mot : kind === "inspection" ? Inspection : Minor;
  return <PageShell mode="form" width="form" header={{ title: "Workshop checklist" }}><View testID="workshop-check-row"><Row label="Check the equipment and vehicle braking system for visible damage" colors={colors} checked={checked} na={na} rating={rating} note={note} photos={[]} onToggle={() => setChecked(!checked)} onToggleNA={() => setNA(!na)} onMarkNA={() => { setNA(!na); setRating(""); setNote(""); }} onChangeRating={setRating} onChangeNote={setNote} onPressPhoto={() => {}} onRemovePhoto={() => {}} /></View></PageShell>;
}
