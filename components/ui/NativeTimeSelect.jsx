import { SelectField } from "./AppPrimitives";
export default function NativeTimeSelect({ label, value, onChange, options, disabled, divider }) {
  return <SelectField label={label} value={value} onChange={onChange} options={options.map((time) => ({ label: time, value: time }))} disabled={disabled} presentation="settingsRow" divider={divider} />;
}
