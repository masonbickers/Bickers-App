const { expect, test } = require("@playwright/test");

for (const width of [320, 390, 820]) {
  for (const theme of ["light", "dark"]) {
    test(`restored notifications · ${width} · ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/design-system?scenario=restored-notifications&theme=${theme}`);
      const row = page.getByTestId("notification-row-long");
      await expect(row).toBeVisible();
      const filter = page.getByRole("button", { name: "All", exact: true });
      expect((await filter.boundingBox()).height).toBeGreaterThanOrEqual(44);
      const title = row.getByText("Workshop allocation changed for the upcoming vehicle maintenance appointment", { exact: true });
      expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      expect(await row.evaluate((root) => {
        const bounds = root.getBoundingClientRect();
        return [...root.querySelectorAll("*")].every((el) => {
          const box = el.getBoundingClientRect();
          return !box.width || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1);
        });
      })).toBe(true);
      await page.screenshot({ path: `output/apple-design/restored-notifications/${width}-${theme}.png` });
      await page.getByRole("button", { name: "Jobs", exact: true }).click();
      await expect(page.getByTestId("notification-row-general")).toHaveCount(0);
      await row.click();
      await expect(page.getByTestId("notification-action")).toHaveText("long");
      await page.getByRole("button", { name: "Unread 0", exact: true }).click();
      await expect(page.getByText("Nothing here yet", { exact: true })).toBeVisible();
      await filter.click();
      await expect(page.getByTestId("notification-row-general")).toBeVisible();
    });
  }
}

for (const state of ["empty", "loading", "error"]) {
  test(`restored notifications ${state} state`, async ({ page }) => {
    await page.goto(`/design-system?scenario=restored-notifications&state=${state}&theme=light`);
    if (state === "empty") await expect(page.getByText("No notifications", { exact: true })).toBeVisible();
    if (state === "loading") await expect(page.getByText("Loading notifications…", { exact: true })).toBeVisible();
    if (state === "error") {
      await expect(page.getByText("Notifications may be out of date", { exact: true })).toBeVisible();
      await expect(page.getByTestId("notification-row-long")).toBeVisible();
      await page.getByRole("button", { name: "Retry notifications", exact: true }).click();
      await expect(page.getByText("Notifications may be out of date", { exact: true })).toHaveCount(0);
    }
  });
}

for (const theme of ["light", "dark"]) {
  test(`notification accent text contrast · ${theme}`, async ({ page }) => {
    await page.goto(`/design-system?scenario=restored-notifications&theme=${theme}`);
    const labels = page.getByRole("button", { name: "All", exact: true }).getByText("All", { exact: true }).or(page.getByText("New", { exact: true }));
    await expect(labels).toHaveCount(2);
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
