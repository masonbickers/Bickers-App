import { useState } from "react";
import { ChecklistSection } from "../../app/(protected)/service/service-form/[id]";
import PageShell from "../layout/PageShell";
const label = "Brake system checked for leaks, visible damage and correct operation";
export default function ServiceChecklistFixture() {
  const [checked, setChecked] = useState(false);
  const [na, setNA] = useState(false);
  const [rating, setRating] = useState("");
  const [note, setNote] = useState("");
  return <PageShell mode="form" width="form" header={{ title: "Service checklist" }}><ChecklistSection title="Engine, fluids and vehicle safety inspection" hint="Complete every applicable item" items={[label]} checks={{ [label]: checked }} checkNA={{ [label]: na }} checkRatings={{ [label]: rating }} checkNotes={{ [label]: note }} checkPhotos={{}} toggleCheck={() => setChecked(!checked)} toggleNA={() => setNA(!na)} updateRating={(_, value) => setRating(value)} updateNote={(_, value) => setNote(value)} openPhotoPickerForLabel={() => {}} removePhotoForLabel={() => {}} /></PageShell>;
}
