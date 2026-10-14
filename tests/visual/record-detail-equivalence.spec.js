const { expect, test } = require("@playwright/test");
for (const width of [320, 390, 820]) {
  for (const theme of ["light", "dark"]) {
    test(`record detail equivalence · ${width} · ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1180 });
      await page.goto(`/service/design-system?scenario=record-details&theme=${theme}`);
      expect(await page.getByTestId("divider-after").screenshot()).toEqual(await page.getByTestId("divider-before").screenshot());
      for (let index = 0; index < 3; index++) {
        const before = page.getByTestId(`record-before-${index}`);
        const after = page.getByTestId(`record-after-${index}`);
        await expect(before).toBeVisible();
        await expect(after).toBeVisible();
        expect(await after.screenshot()).toEqual(await before.screenshot());
      }
    });
  }
}

for (const width of [320, 390, 820]) {
  for (const theme of ["light", "dark"]) {
    test(`document frame equivalence · ${width} · ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1180 });
      await page.goto(`/service/design-system?scenario=document-surfaces&theme=${theme}`);
      for (const variant of ["page", "embedded"]) {
        for (let index = 0; index < 3; index++) {
          expect(await page.getByTestId(`document-after-${variant}-${index}`).screenshot()).toEqual(await page.getByTestId(`document-before-${variant}-${index}`).screenshot());
        }
      }
    });
  }
}
