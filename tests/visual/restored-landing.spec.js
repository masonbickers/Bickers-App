const { expect, test } = require("@playwright/test");
for (const width of [320, 390, 820]) {
  for (const theme of ["light", "dark"]) {
    test(`service landing · ${width} · ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/service/design-system?scenario=restored-landing&theme=${theme}`);
      const attention = page.getByTestId("attention-long");
      await expect(attention).toHaveCount(1);
      for (const card of await page.getByTestId(/^(attention-|quick-)/).all()) {
        expect(await card.evaluate((root) => {
          const bounds = root.getBoundingClientRect();
          return [...root.querySelectorAll("*")].every((el) => { const box = el.getBoundingClientRect(); return !box.width || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1); });
        })).toBe(true);
      }
      await page.screenshot({ path: `output/apple-design/restored-landing/${width}-${theme}.png` });
      for (const [label, destination] of [["All MOT & Service", "/service/service-list"], ["Defects & Issues", "/service/defects"], ["Book Workshop", "/service/book-work"]]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await expect(page.getByTestId("landing-destination")).toHaveText(destination);
      }
      await attention.click();
      await expect(page.getByTestId("landing-destination")).toHaveText("/service/vehicles/long");
    });
  }
}
for (const state of ["empty", "loading", "error", "partial"]) {
  test(`service landing ${state}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=restored-landing&state=${state}`);
    if (state === "empty") await expect(page.getByText("Nothing urgent", { exact: true })).toBeVisible();
    if (state === "loading") await expect(page.getByText("Loading fleet data…", { exact: true })).toBeVisible();
    if (state === "error" || state === "partial") {
      await page.getByRole("button", { name: "Retry fleet data", exact: true }).click();
      await expect(page.getByTestId("attention-long")).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry fleet data", exact: true })).toHaveCount(0);
    }
  });
}

for (const theme of ["light", "dark"]) {
  test(`landing status contrast · ${theme}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=restored-landing&theme=${theme}`);
    const labels = page.getByTestId(/^landing-(summary-|status-|defect-count)/);
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
