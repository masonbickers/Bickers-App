function first(...values) {
  return values.find((value) => String(value ?? "").trim()) || "";
}

export function buildAssetSelectOptions(records = [], type = "vehicle") {
  return records
    .filter((record) => record && first(record.id, record.key))
    .map((record) => {
      if (type === "equipment") {
        const name = first(record.name, record.equipmentName, record.label, "Unnamed equipment");
        const identifier = first(record.serialNumber, record.asset, record.assetNumber);
        const category = first(record.category, record.equipmentType, record.type);
        const location = first(record.location);
        return {
          value: String(first(record.key, record.id)),
          label: String(name),
          description: [identifier, category, location].filter(Boolean).join(" · "),
          keywords: [name, identifier, record.asset, category, location].filter(Boolean).map(String),
        };
      }

      const name = first(record.name, record.vehicleName, record.label, record.title, "Unnamed vehicle");
      const registration = first(record.registration, record.reg, record.registrationNumber, record.plate, record.license);
      const manufacturer = first(record.manufacturer, record.make);
      const model = first(record.model);
      return {
        value: String(record.id),
        label: String(name),
        description: [registration, [manufacturer, model].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
        keywords: [name, registration, manufacturer, model].filter(Boolean).map(String),
      };
    });
}
