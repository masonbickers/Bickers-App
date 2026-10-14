const { test, expect } = require("@playwright/test");
for (const width of [320, 390, 820]) for (const theme of ["light", "dark"]) {
  test(`native pilot fallback · ${width} · ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/design-system?scenario=native-ui-pilot&theme=${theme}`);
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Office", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toContainText("09:00");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByRole("button", { name: "09:15", exact: true }).click();
    await expect(page.getByRole("button", { name: "Start", exact: true })).toContainText("09:15");
    await page.screenshot({ path: `output/ios26-native-pilot/web-${width}-${theme}.png` });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByTestId("native-pilot-result")).toHaveText("office · 09:15–17:00");
    await page.getByRole("button", { name: /Timesheet Autofill/ }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  });
}
