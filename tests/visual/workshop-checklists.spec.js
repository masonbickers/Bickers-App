const { expect, test } = require("@playwright/test");
for (const kind of ["minor", "mot", "inspection"]) for (const width of [320, 390, 820]) for (const theme of ["light", "dark"]) {
  test(`${kind} checklist · ${width} · ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/service/design-system?scenario=workshop-checklist&kind=${kind}&theme=${theme}`);
    const row = page.getByTestId("workshop-check-row");
    await expect(row).toBeVisible();
    expect(await row.evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      return [...root.querySelectorAll("*")].every((el) => { const box = el.getBoundingClientRect(); return !box.width || (box.left >= bounds.left - 1 && box.right <= bounds.right + 1); });
    })).toBe(true);
    for (const status of kind === "mot" ? ["0", "1", "2", "3", "4", "5"] : ["Green", "Amber", "Red"]) {
      const control = row.getByRole("button", { name: new RegExp(`: ${status}$`) });
      await control.click();
      await expect(control).toHaveAttribute("aria-pressed", "true");
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    if (kind !== "mot") {
      await page.getByRole("textbox").fill("Repair required before use.");
      await expect(page.getByText(kind === "minor" ? "Notes are required for this status." : "Note required for red", { exact: true })).toHaveCount(0);
    }
    const na = row.getByRole("button", { name: /: Not applicable$/ });
    await na.click();
    await expect(na).toHaveAttribute("aria-pressed", "true");
    if (kind === "inspection") {
      const green = row.getByRole("button", { name: /: Green$/ });
      await expect(green).toBeDisabled();
      await na.click();
      await expect(na).toHaveAttribute("aria-pressed", "false");
      await expect(green).toBeEnabled();
      await green.click();
      await expect(green).toHaveAttribute("aria-pressed", "true");
    }
    await page.screenshot({ path: `output/apple-design/checklist-${kind}/${width}-${theme}.png` });
  });
}
