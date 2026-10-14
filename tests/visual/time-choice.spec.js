const { expect, test } = require("@playwright/test");
const fs = require('node:fs');
const path = require('node:path');
for (const width of [320, 390, 820]) for (const theme of ['light','dark']) {
  test(`timesheet time choices · ${width} · ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/service/design-system?scenario=time-choice&theme=${theme}`);
    const list = page.getByTestId('time-choice-list');
    const rows = list.locator(':scope > div');
    await expect(rows).toHaveCount(4);
    await expect(page.getByTestId('chosen-time')).toHaveText('03:30 AM');
    for (const state of ['default', 'selected', 'disabled', 'focus']) {
      if (state === 'selected') await rows.nth(2).click();
      if (state === 'disabled') {
        await page.getByText('Simulate loading', { exact: true }).click();
        await rows.nth(0).click({ force: true });
        await expect(page.getByTestId('chosen-time')).toHaveText('12:00 AM · next day');
      }
      if (state === 'focus') {
        await page.getByText('Finish loading', { exact: true }).click();
        await rows.nth(0).focus();
      }
      const screenshot = await list.screenshot();
      const file = path.resolve(__dirname, 'time-choice-before', `${width}-${theme}-${state}.png`);
      const expected = fs.readFileSync(file);
      if (!screenshot.equals(expected)) {
        await test.info().attach(`${state}-legacy`, { body: expected, contentType: 'image/png' });
        await test.info().attach(`${state}-migrated`, { body: screenshot, contentType: 'image/png' });
      }
      expect(screenshot).toEqual(expected);
    }
    await rows.nth(0).press('Enter');
    await expect(page.getByTestId('chosen-time')).toHaveText('03:30 AM');
    await expect(page.getByTestId('time-choice-empty')).toBeVisible();
  });
}
