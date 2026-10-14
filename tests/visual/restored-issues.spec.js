const { expect, test } = require("@playwright/test");
for (const width of [320, 390, 820]) {
  for (const theme of ["light", "dark"]) {
    test(`restored issues · ${width} · ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/service/design-system?scenario=restored-issues&theme=${theme}`);
      const single = page.getByTestId("issue-single");
      await expect(single).toBeVisible();
      for (const row of await page.getByTestId(/^issue-(single|group-)/).all()) {
        expect(await row.evaluate((root) => {
          const bounds = root.getBoundingClientRect();
          return [...root.querySelectorAll("*")].every((el) => { const box = el.getBoundingClientRect(); return !box.width || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1); });
        })).toBe(true);
      }
      const title = page.getByTestId("issue-group-0").first().getByText("Inspection required for the workshop vehicle braking system 1", { exact: true });
      expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
      const resolve = single.getByRole("button", { name: "Mark Equipment needs inspection fixed", exact: true });
      expect((await resolve.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: `output/apple-design/restored-issues/${width}-${theme}.png`, fullPage: true });
      const toggle = page.getByRole("button", { name: /^Show all Workshop support/ }).first();
      await toggle.click();
      await expect(page.getByTestId("issue-group-3")).toHaveCount(1);
      await page.getByTestId("issue-group-0").first().click();
      await expect(page.getByTestId("issue-action")).toHaveText("/service/defects/sample-0");
      await resolve.click();
      await expect(single).toHaveCount(0);
      await expect(page.getByTestId("issue-action")).toHaveText("Resolved single");
    });
  }
}
for (const state of ["empty", "loading", "error", "partial"]) {
  test(`restored issues ${state}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=restored-issues&state=${state}`);
    if (state === "empty") { await expect(page.getByText("No open defects.")).toBeVisible(); await expect(page.getByText("No amber advisories.")).toBeVisible(); }
    if (state === "loading") await expect(page.getByText("Loading issues...", { exact: true })).toBeVisible();
    if (state === "error" || state === "partial") {
      await page.getByRole("button", { name: "Retry issues", exact: true }).click();
      await expect(page.getByTestId("issue-single")).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry issues", exact: true })).toHaveCount(0);
    }
  });
}
