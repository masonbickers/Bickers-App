import { useState } from "react";
import { AppText, SettingsGroup, SettingsRow } from "../ui/AppPrimitives";
import NativeActionButton from "../ui/NativeActionButton";
import NativeSettingsSheet from "../ui/NativeSettingsSheet";
import NativeSegmentedControl from "../ui/NativeSegmentedControl";
import NativeTimeSelect from "../ui/NativeTimeSelect";
import { Platform, useWindowDimensions } from "react-native";
import { designTokens as t } from "../../lib/design/tokens";

const options = Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, "0")}:${String(index % 4 * 15).padStart(2, "0")}`);
export default function NativeUIPilotFixture({ refreshOnly = false }) {
  const [open, setOpen] = useState(!refreshOnly);
  const [refreshCount, setRefreshCount] = useState(0);
  const [type, setType] = useState("yard");
  const [start, setStart] = useState("08:00");
  const [finish, setFinish] = useState("16:30");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const { width } = useWindowDimensions();
  if (refreshOnly) return <>
    <NativeActionButton label="Refresh" variant="secondary" size="small" systemImage="arrow.clockwise" icon="refresh-ccw" accessibilityLabel="Refresh timesheets" onPress={async () => { await new Promise((resolve) => setTimeout(resolve, 300)); setRefreshCount((count) => count + 1); }} />
    <AppText testID="refresh-result">Refreshes: {refreshCount}</AppText>
  </>;
  return <>
    <SettingsGroup><SettingsRow title="Timesheet Autofill" subtitle={`${type} · ${start}–${finish}`} onPress={() => setOpen(true)} /></SettingsGroup>
    <AppText variant="settingsDetail" tone="secondary" testID="native-pilot-result">{saved || "No changes saved"}</AppText>
    <NativeSettingsSheet visible={open} title="Autofill Settings" busy={saving} presentation={Platform.OS === "ios" && width < t.layout.tabletBreakpoint ? "sheet" : "dialog"} appearance="grouped" onRequestClose={() => setOpen(false)} actions={<>
      <NativeActionButton label="Cancel" role="cancel" variant="secondary" disabled={saving} onPress={() => setOpen(false)} />
      <NativeActionButton label={saving ? "Saving…" : "Save"} loading={saving} onPress={async () => {
        setSaving(true);
        try { await Promise.resolve(); setSaved(`${type} · ${start}–${finish}`); setOpen(false); }
        finally { setSaving(false); }
      }} />
    </>}>
      <AppText variant="settingsDetail" tone="secondary">Choose one default type and set its times.</AppText>
      <NativeSegmentedControl value={type} disabled={saving} onChange={(next) => { setType(next); setStart(next === "office" ? "09:00" : "08:00"); setFinish(next === "office" ? "17:00" : "16:30"); }} options={[{ label: "Yard", value: "yard" }, { label: "Office", value: "office" }, { label: "Workshop", value: "workshop" }]} />
      <SettingsGroup>
        <NativeTimeSelect label="Start" value={start} onChange={setStart} options={options} disabled={saving} divider />
        <NativeTimeSelect label="Finish" value={finish} onChange={setFinish} options={options} disabled={saving} />
      </SettingsGroup>
    </NativeSettingsSheet>
  </>;
}
