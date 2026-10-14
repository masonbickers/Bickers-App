const { expect, test } = require('@playwright/test');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

for (const theme of ['light', 'dark']) {
  for (const width of [390, 820]) {
    test(`segmented corner geometry is concentric · ${theme} · ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/design-system?scenario=components&theme=${theme}`);
      await expect(page.getByTestId('visual-scenario-ready')).toBeVisible();
      const segmented = page.getByRole('tablist').first();
      const selected = segmented.getByRole('tab', { name: 'Selected', exact: true });
      const geometry = await selected.evaluate((element) => {
        const outer = getComputedStyle(element.parentElement);
        const inner = getComputedStyle(element);
        const numeric = (value) => parseFloat(value);
        return {
          outer: numeric(outer.borderTopLeftRadius),
          insetX: numeric(outer.paddingLeft) + numeric(outer.borderLeftWidth),
          insetY: numeric(outer.paddingTop) + numeric(outer.borderTopWidth),
          inner: numeric(inner.borderTopLeftRadius),
        };
      });
      expect(geometry.insetX).toBe(geometry.insetY);
      expect(geometry.inner).toBe(Math.max(0, geometry.outer - geometry.insetX));
      await expect(selected).toHaveAttribute('aria-selected', 'true');
      const directory = path.resolve('output/design-system-audit-20261013');
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `components-${theme}-${width}.png`), fullPage: true });
    });
  }
}
