import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetSelectOptions } from "../lib/assetSelectOptions.js";
import { filterSelectOptions } from "../lib/design/controlState.js";

test("vehicle options expose a clear name, registration and searchable model", () => {
  const options = buildAssetSelectOptions([
    { id: "v1", name: "Atlas E-Bike", reg: "AY19 DDL", manufacturer: "Zero", model: "DS Sport" },
  ], "vehicle");
  assert.deepEqual(options, [{
    value: "v1",
    label: "Atlas E-Bike",
    description: "AY19 DDL · Zero DS Sport",
    keywords: ["Atlas E-Bike", "AY19 DDL", "Zero", "DS Sport"],
  }]);
});

test("equipment options show identifiers and keep duplicate names distinct", () => {
  const options = buildAssetSelectOptions([
    { key: "e1", name: "Lift", serialNumber: "SN-42", category: "Rigging", location: "Bay 2" },
    { key: "e2", name: "Lift", asset: "AS-15", category: "Rigging" },
  ], "equipment");
  assert.equal(options[0].value, "e1");
  assert.equal(options[0].description, "SN-42 · Rigging · Bay 2");
  assert.equal(options[1].value, "e2");
  assert.equal(options[1].description, "AS-15 · Rigging");
});

test("search finds registrations with or without spaces", () => {
  const options = buildAssetSelectOptions([
    { id: "v1", name: "Atlas E-Bike", reg: "AY19 DDL" },
  ]);
  assert.equal(filterSelectOptions(options, "ay19ddl")[0]?.value, "v1");
});

test("legacy asset labels and identifiers remain visible", () => {
  const [vehicle] = buildAssetSelectOptions([{ id: "v2", title: "Sprinter", plate: "AB12 CDE" }]);
  const [equipment] = buildAssetSelectOptions([{ id: "e3", label: "Jack", assetNumber: "AS-3", equipmentType: "Tools" }], "equipment");
  assert.equal(vehicle.label, "Sprinter");
  assert.equal(vehicle.description, "AB12 CDE");
  assert.equal(equipment.label, "Jack");
  assert.equal(equipment.description, "AS-3 · Tools");
});
