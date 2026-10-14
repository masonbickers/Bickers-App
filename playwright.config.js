const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/visual",
  testMatch: ["native-ui-pilot.spec.js", "time-choice.spec.js", "record-detail-equivalence.spec.js", "visual-regression.spec.js", "responsive-controls.spec.js", "concentric-controls.spec.js", "restored-layouts.spec.js", "restored-contacts.spec.js", "restored-notifications.spec.js", "restored-issues.spec.js", "restored-landing.spec.js", "restored-workshop.spec.js", "restored-settings.spec.js", "restored-dashboard.spec.js", "service-checklist.spec.js", "workshop-checklists.spec.js"],
  timeout: 30000,
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.005,
    },
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  outputDir: "test-results/visual",
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    colorScheme: "light",
    deviceScaleFactor: 1,
    locale: "en-GB",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run visual:serve",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
