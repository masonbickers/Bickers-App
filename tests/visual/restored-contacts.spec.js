const { expect, test } = require("@playwright/test");

for (const width of [320, 390, 820]) {
  for (const theme of ["light", "dark"]) {
    test(`restored contacts layout and actions · ${width} · ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/design-system?scenario=restored-contacts&theme=${theme}`);
      const card = page.getByTestId("contact-card-long");
      await expect(card).toBeVisible();
      const name = card.getByText("Alexandra Montgomery-Wellington", { exact: true });
      expect(await name.evaluate((element) => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1)).toBe(true);
      const meta = card.getByText("Senior workshop coordinator · Vehicle maintenance supervisor · 07700 900123", { exact: true });
      expect(await meta.evaluate((element) => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1)).toBe(true);
      expect(await card.evaluate((root) => {
        const bounds = root.getBoundingClientRect();
        return [...root.querySelectorAll("*")].every((element) => {
          const box = element.getBoundingClientRect();
          return !box.width || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1);
        });
      })).toBe(true);
      for (const button of await card.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({ path: `output/apple-design/restored-contacts/${width}-${theme}.png` });
      await card.getByRole("button", { name: /^Call / }).click();
      await expect(page.getByTestId("contact-action")).toHaveText("Call 07700 900123");
      await card.getByRole("button", { name: /^Message / }).click();
      await expect(page.getByTestId("contact-action")).toHaveText("Message Alexandra Montgomery-Wellington 07700 900123");
      await expect(page.getByRole("button", { name: "Call Blake Taylor", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Message Blake Taylor on WhatsApp", exact: true })).toBeDisabled();
      const search = page.getByRole("textbox");
      await search.fill("supervisor");
      await expect(page.getByText("1 of 2 contacts", { exact: true })).toBeVisible();
      await search.fill("900123");
      await expect(card).toBeVisible();
      await search.fill("no matching contact");
      await expect(page.getByText("No matches found", { exact: true })).toBeVisible();
      await search.fill("");
      await expect(page.getByText("2 contacts", { exact: true })).toBeVisible();
    });
  }
}
