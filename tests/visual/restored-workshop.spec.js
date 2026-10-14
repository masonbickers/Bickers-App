const { expect, test } = require("@playwright/test");
for (const width of [320, 390, 820]) {
  for (const theme of ["light", "dark"]) {
    test(`workshop forms · ${width} · ${theme}`, async ({ page }) => {
      const iconWarnings = [];
      page.on("console", (message) => { if (/not a valid icon|Unrecognized font family/i.test(message.text())) iconWarnings.push(message.text()); });
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/service/design-system?scenario=restored-workshop&theme=${theme}`);
      const draft = page.getByTestId("workshop-draft-long");
      await expect(draft).toBeVisible();
      for (const card of await page.getByTestId(/^workshop-(form-|draft-)/).all()) {
        expect((await card.boundingBox()).height).toBeGreaterThanOrEqual(44);
        expect(await card.evaluate((root) => {
          const bounds = root.getBoundingClientRect();
          return [...root.querySelectorAll("*")].every((el) => { const box = el.getBoundingClientRect(); return !box.width || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1); });
        })).toBe(true);
      }
      await page.screenshot({ path: `output/apple-design/restored-workshop/${width}-${theme}.png` });
      const destinations = [["Full Service", /^\/service\/service-form\/manual-\d+$/], ["Interim / Minor Service", /^\/service\/minor-service\/minor-\d+$/], ["Equipment Inspection", /^\/service\/inspections\/inspection-form\/new-\d+$/], ["MOT Pre-Check", /^\/service\/mot-precheck\/mot-\d+$/], ["Defect Report", "/service/defect-form"], ["General Repairs", "/service/repair-form"]];
      for (const [label, route] of destinations) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await expect(page.getByTestId("workshop-destination")).toHaveText(route);
      }
      await draft.click();
      await expect(page.getByTestId("workshop-destination")).toHaveText("/service/service-form/sample-draft");
      await expect(draft).toHaveCount(1);
      expect(iconWarnings).toEqual([]);
    });
  }
}
for (const state of ["empty", "loading", "error"]) {
  test(`workshop drafts ${state}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=restored-workshop&state=${state}`);
    await expect(page.getByRole("button", { name: "Full Service", exact: true })).toBeVisible();
    if (state === "empty") await expect(page.getByTestId("workshop-draft-long")).toHaveCount(0);
    if (state === "loading") await expect(page.getByText("Loading saved drafts…", { exact: true })).toBeVisible();
    if (state === "error") {
      await page.getByRole("button", { name: "Retry loading drafts", exact: true }).click();
      await expect(page.getByTestId("workshop-draft-long")).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry loading drafts", exact: true })).toHaveCount(0);
    }
  });
}

for (const theme of ["light", "dark"]) {
  test(`workshop icon contrast · ${theme}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=restored-workshop&theme=${theme}`);
    const labels = page.getByTestId(/^workshop-icon-/);
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
    for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(3);
  });
}
