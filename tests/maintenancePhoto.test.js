import assert from "node:assert/strict";
import test from "node:test";

test("maintenance photos use a stable user-owned issue path", async () => {
  let photoPath;
  try {
    ({ maintenancePhotoPath: photoPath } = await import("../lib/maintenancePhoto.js"));
  } catch {
    // The first TDD run intentionally reaches this assertion before the module exists.
  }

  assert.equal(typeof photoPath, "function");
  assert.equal(
    photoPath("user_123", "issue#42"),
    "vehicleIssues/user_123/issue-42/issue.jpg"
  );
  assert.throws(() => photoPath("unsafe/user", "issue-42"), /valid signed-in user/);
});

test("cancelled image selection never creates a maintenance photo", async () => {
  let selectedPhotoUri;
  try {
    ({ selectedMaintenancePhotoUri: selectedPhotoUri } = await import("../lib/maintenancePhoto.js"));
  } catch {
    // The first TDD run intentionally reaches this assertion before the module exists.
  }

  assert.equal(typeof selectedPhotoUri, "function");
  assert.equal(selectedPhotoUri({ canceled: true, assets: [{ uri: "file://ignored.jpg" }] }), "");
  assert.equal(selectedPhotoUri({ canceled: false, assets: [{ uri: "file://issue.jpg" }] }), "file://issue.jpg");
  assert.equal(selectedPhotoUri({ canceled: false, assets: [] }), "");
});
