const { expect, test } = require("@playwright/test");
for (const width of [320, 390, 820]) for (const theme of ["light", "dark"]) {
  test(`service checklist · ${width} · ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/service/design-system?scenario=service-checklist&theme=${theme}`);
    const row = page.getByTestId("service-check-row");
    await expect(row).toBeVisible();
    for (const text of ["Engine, fluids and vehicle safety inspection", "Complete every applicable item"]) {
      expect(await page.getByText(text, { exact: true }).evaluate((element) => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth; })).toBe(true);
    }
    const check = page.getByRole("checkbox");
    await check.click();
    await expect(check).toHaveAttribute("aria-checked", "true");
    for (const status of ["Green", "Amber", "Red"]) {
      const control = page.getByRole("button", { name: new RegExp(`: ${status}$`) });
      await control.click();
      await expect(control).toHaveAttribute("aria-pressed", "true");
      expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
      expect((await control.boundingBox()).width).toBeGreaterThanOrEqual(44);
      if (status !== "Green") await expect(page.getByText("Notes are required for this status.", { exact: true })).toBeVisible();
    }
    await page.getByRole("textbox").fill("Repair required before release.");
    await expect(page.getByText("Notes are required for this status.", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /: Not applicable$/ }).click();
    await expect(page.getByRole("button", { name: /: Not applicable$/ })).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: `output/apple-design/service-checklist/${width}-${theme}.png` });
  });
}

for (const theme of ["light", "dark"]) {
  test(`service checklist rating contrast · ${theme}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=service-checklist&theme=${theme}`);
    await page.getByRole("button", { name: /: Red$/ }).click();
    await page.getByRole("button", { name: /: Not applicable$/ }).click();
    const labels = page.getByText(/^(Green|Amber|Red|N\/A)$/, { exact: true });
    await expect(labels).toHaveCount(4);
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
