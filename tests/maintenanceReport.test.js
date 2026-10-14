import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const maintenanceSource = readFileSync(
  new URL("../app/(protected)/maintenance.js", import.meta.url),
  "utf8"
);

test("employees can submit their own open maintenance reports without Service access", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const issueRules = rules.slice(rules.indexOf("match /vehicleIssues/{docId}"), rules.indexOf("match /vehicleUsageNotes/{docId}"));
  assert.match(issueRules, /allow create: if canCreateServiceTenantDoc\(\)\s*\|\| \(canCreateUserTenantDoc\(\)/);
  assert.match(issueRules, /request\.resource\.data\.companyId == currentUserCompanyId\(\)/);
  assert.match(issueRules, /request\.resource\.data\.reporterUid == request\.auth\.uid/);
  assert.match(issueRules, /request\.resource\.data\.status == "open"/);
  assert.match(issueRules, /allow update: if canUpdateServiceTenantDoc\(\)/);
  assert.match(issueRules, /allow delete: if canDeleteServiceTenantDoc\(\)/);
});

test("maintenance reports use company-scoped asset resources", () => {
  assert.match(maintenanceSource, /const vehiclesResource = useVehicles\(\)/);
  assert.match(maintenanceSource, /const equipmentResource = useEquipment\(\)/);
  assert.match(maintenanceSource, /const issueRef = doc\(collection\(db, "vehicleIssues"\)\)/);
  assert.match(maintenanceSource, /await setDoc\(issueRef, \{\s*companyId,/);
});

test("fleet vehicles remain available as maintenance report targets", () => {
  assert.match(maintenanceSource, /const reportableVehicles = normalizedVehicles/);
  assert.doesNotMatch(maintenanceSource, /filter\(.*fleet vehicles/i);
});

test("vehicle options and reports include the number plate", () => {
  assert.match(maintenanceSource, /getVehicleDisplayLabel\(asset, vehicles\)/);
  assert.match(maintenanceSource, /registration: getVehicleRegistration\(asset\)/);
  assert.match(maintenanceSource, /\{selectedRegistration\}/);
});

test("equipment can be selected and identified in maintenance reports", () => {
  assert.match(maintenanceSource, /\{ label: "Equipment", value: "equipment" \}/);
  assert.match(maintenanceSource, /equipmentDocId: asset\.id/);
  assert.match(maintenanceSource, /equipmentName: getEquipmentName\(asset\)/);
  assert.match(maintenanceSource, /serialNumber: String\(asset\.serialNumber/);
});

test("maintenance is the shared component-library pilot", () => {
  for (const primitive of ["Banner", "PageSection", "FormStep", "SelectField", "StateView", "TextArea", "AppButton"]) {
    assert.match(maintenanceSource, new RegExp(`<${primitive}\\b`));
  }
  assert.doesNotMatch(maintenanceSource, /function Select\b|<TextInput\b|<Picker\b|density="compact"/);
  assert.match(maintenanceSource, /testID="category-select"/);
  assert.match(maintenanceSource, /testID="vehicle-select"/);
});

test("maintenance reports support a native photo selector and persist the uploaded evidence", () => {
  assert.match(maintenanceSource, /ActionSheetIOS\.showActionSheetWithOptions/);
  assert.match(maintenanceSource, /ImagePicker\.launchCameraAsync/);
  assert.match(maintenanceSource, /ImagePicker\.launchImageLibraryAsync/);
  assert.match(maintenanceSource, /photoURLs:\s*photoURL\s*\?\s*\[photoURL\]\s*:\s*\[\]/);

  const storageRules = readFileSync(new URL("../storage.rules", import.meta.url), "utf8");
  const photoRules = storageRules.slice(
    storageRules.indexOf("match /vehicleIssues/{uid}/{issueId}"),
    storageRules.indexOf("match /profilePictures/")
  );
  assert.match(photoRules, /request\.auth\.uid == uid/);
  assert.match(photoRules, /isSafeMimeType\('image\/\.\*'\)/);
});
