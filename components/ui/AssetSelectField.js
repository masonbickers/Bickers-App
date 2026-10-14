import { useMemo } from "react";
import { SelectField } from "./AppPrimitives";
import { buildAssetSelectOptions } from "../../lib/assetSelectOptions";

export default function AssetSelectField({ type = "vehicle", records = [], value, onChange, loading = false, ...props }) {
  const options = useMemo(() => buildAssetSelectOptions(records, type), [records, type]);
  const label = type === "equipment" ? "Equipment" : "Vehicle";
  return (
    <SelectField
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={`Select ${label.toLowerCase()}`}
      searchPlaceholder={type === "equipment" ? "Name, serial, asset or location" : "Name, registration, make or model"}
      emptyMessage={`No ${label.toLowerCase()} available`}
      loading={loading}
      searchable
      showSelectedDescription
      {...props}
    />
  );
}
