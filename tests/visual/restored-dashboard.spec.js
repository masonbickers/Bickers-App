const { expect, test } = require("@playwright/test");
for (const width of [320, 390, 820]) for (const theme of ["light", "dark"]) {
  test(`service dashboard · ${width} · ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/service/design-system?scenario=restored-dashboard&theme=${theme}`);
    await expect(page.getByTestId("dashboard-summary-With defects")).toHaveText("120");
    await expect(page.getByText("99+", { exact: true })).toBeVisible();
    for (const card of await page.getByTestId(/^dashboard-action-/).all()) {
      expect(await card.evaluate((root) => {
        const bounds = root.getBoundingClientRect();
        return [...root.querySelectorAll("*")].every((el) => { const box = el.getBoundingClientRect(); return !box.width || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1); });
      })).toBe(true);
    }
    await page.screenshot({ path: `output/apple-design/restored-dashboard/${width}-${theme}.png` });
    for (const [label, route] of [["All MOT & Service", "service-list"], ["Equipment", "equipment-list"], ["Defects & Issues", "defects"], ["Advisories", "advisories"], ["Activity History", "activity-history"], ["Open service settings", "settings"]]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByTestId("dashboard-destination")).toHaveText(`/(protected)/service/${route}`);
    }
  });
}
for (const state of ["empty", "loading", "error", "partial"]) {
  test(`service dashboard ${state}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=restored-dashboard&state=${state}`);
    if (state === "empty") await expect(page.getByTestId("dashboard-summary-Total vehicles")).toHaveText("0");
    if (state === "loading") await expect(page.getByText("Loading fleet data…", { exact: true })).toBeVisible();
    if (state === "error" || state === "partial") {
      await page.getByRole("button", { name: "Retry fleet data", exact: true }).click();
      await expect(page.getByTestId("dashboard-summary-With defects")).toHaveText("120");
      await expect(page.getByRole("button", { name: "Retry fleet data", exact: true })).toHaveCount(0);
    }
  });
}

for (const theme of ["light", "dark"]) {
  test(`dashboard summary and badge contrast · ${theme}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=restored-dashboard&theme=${theme}`);
    const labels = page.getByTestId(/^dashboard-(summary-|badge-)/);
    await expect(labels).toHaveCount(7);
    const ratios = await labels.evaluateAll((elements) => {
      const rgba = (value) => { const channels = value.match(/[\d.]+/g).map(Number); return [...channels.slice(0, 3), channels[3] ?? 1]; };
      const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]));
      const luminance = (rgb) => rgb.map((value) => { const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }).reduce((total, channel, index) => total + channel * [.2126, .7152, .0722][index], 0);
      return elements.map((element) => {
        const ancestors = []; for (let parent = element; parent; parent = parent.parentElement) ancestors.unshift(parent);
        const background = ancestors.reduce((color, parent) => blend(rgba(getComputedStyle(parent).backgroundColor), color), [255, 255, 255]);
        const foreground = blend(rgba(getComputedStyle(element).color), background);
        const [a, b] = [luminance(foreground), luminance(background)];
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
    });
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
}
