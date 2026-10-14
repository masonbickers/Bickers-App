const { expect, test } = require("@playwright/test");

for (const width of [320, 390, 820]) {
  test(`floating accessories and sticky actions never cover the last action · ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/design-system?scenario=navigation-clearance&theme=light");
    const sticky = page.getByTestId("clearance-sticky");
    const accessory = page.getByTestId("clearance-accessory");
    const last = page.getByTestId("clearance-last");
    for (const label of ["Show extra accessory", "Hide extra accessory"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect.poll(async () => {
        await last.evaluate((element) => {
          for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            if (["auto", "scroll"].includes(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) {
              parent.scrollTop = parent.scrollHeight;
              break;
            }
          }
        });
        const [a, s, l] = await Promise.all([accessory.boundingBox(), sticky.boundingBox(), last.boundingBox()]);
        return Boolean(a && s && l && s.y + s.height < a.y && l.y + l.height < s.y);
      }).toBe(true);
      await last.click({ trial: true });
      await sticky.click({ trial: true });
    }
  });
}

test("reduced motion opens sheets without a sliding transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-system?scenario=layout-stress&theme=light");
  await expect(page.getByTestId("visual-scenario-ready")).toBeVisible();
  expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await page.getByRole("button", { name: "Open inspection details", exact: true }).click();
  const translation = await page.getByTestId("stress-modal").evaluate((element) => {
    const transform = getComputedStyle(element).transform;
    return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
  });
  expect(translation).toBe(0);
});

for (const theme of ["light", "dark"]) {
  test(`semantic banner copy has readable contrast · ${theme}`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=service-list&theme=${theme}`);
    const contrast = await page.getByText("Two vehicles leave within 24 hours.", { exact: true }).evaluate((element) => {
      const channels = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = (color) => channels(color).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      let surface = element.parentElement;
      while (surface && getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)") surface = surface.parentElement;
      const text = luminance(getComputedStyle(element).color);
      const background = luminance(getComputedStyle(surface).backgroundColor);
      return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });
}

// Measure real rendered boxes, including long copy that static baselines omit.
async function expectContained(locator) {
  const overflow = await locator.evaluate((root) => {
    const bounds = root.getBoundingClientRect();
    return Array.from(root.querySelectorAll("*")).filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && (box.left < bounds.left - 1 || box.right > bounds.right + 1);
    }).map((element) => element.textContent?.slice(0, 80));
  });
  expect(overflow).toEqual([]);
}

for (const route of ["/design-system", "/service/design-system"]) {
  for (const width of [320, 390, 820]) {
    for (const theme of ["light", "dark"]) {
      test(`long content stays inside controls · ${route} · ${width} · ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`${route}?scenario=layout-stress&theme=${theme}`);
        await expect(page.getByTestId("visual-scenario-ready")).toBeVisible();
        for (const id of ["stress-list", "stress-checkbox", "stress-field"]) {
          await expectContained(page.getByTestId(id));
        }
        const checkbox = page.getByRole("checkbox");
        await checkbox.click();
        await expect(checkbox).toBeChecked();
        await page.getByRole("textbox").fill("Replacement action recorded");
        await expect(page.getByText("27/500", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Open inspection details", exact: true }).click();
        const modal = page.getByTestId("stress-modal");
        await expect(modal).toBeVisible();
        await expectContained(modal);
        const heading = await modal.getByRole("heading").boundingBox();
        const close = await modal.getByRole("button", { name: "Close modal", exact: true }).boundingBox();
        expect(heading.x + heading.width).toBeLessThanOrEqual(close.x + 1);
        await modal.getByRole("button", { name: "Close modal", exact: true }).click();
        await expect(modal).toBeHidden();
      });
    }
  }
}

