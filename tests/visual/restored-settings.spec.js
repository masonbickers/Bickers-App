const { expect, test } = require("@playwright/test");
for (const width of [320, 390, 820]) for (const theme of ["light", "dark"]) {
  test(`service settings · ${width} · ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/service/design-system?scenario=restored-settings&theme=${theme}`);
    await expect(page.getByTestId("setting-theme")).toBeVisible();
    for (const row of await page.getByTestId(/^setting-/).all()) {
      expect(await row.evaluate((root) => {
        const bounds = root.getBoundingClientRect();
        return [...root.querySelectorAll("*")].every((el) => { const box = el.getBoundingClientRect(); return !box.width || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1); });
      })).toBe(true);
    }
    for (const control of await page.getByRole("button", { name: /^(Reminder time|Theme|Edit Profile)/ }).all()) expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
    expect(await page.getByText("Reminder Time", { exact: true }).evaluate((element) => {
      const context = document.createElement("canvas").getContext("2d");
      const style = getComputedStyle(element);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      return element.clientWidth >= context.measureText("Reminder").width;
    })).toBe(true);
    await page.screenshot({ path: `output/apple-design/restored-settings/${width}-${theme}.png` });
    const time = page.getByRole("button", { name: "Reminder time 17:00", exact: true });
    await time.click();
    await expect(time).toHaveAttribute("aria-pressed", "true");
    const mode = page.getByRole("button", { name: "Theme dark", exact: true });
    await mode.click();
    await expect(mode).toHaveAttribute("aria-pressed", "true");
  });
}
