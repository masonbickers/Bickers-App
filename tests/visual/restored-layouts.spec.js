const { expect, test } = require("@playwright/test");

test("Fleet lets users inspect equipment and return to vehicles", async ({ page }) => {
  await page.goto("/service/design-system?scenario=restored-fleet&theme=dark");
  await expect(page.getByRole("button", { name: /^View Workshop support vehicle/ })).toBeVisible();
  await page.getByRole("tab", { name: "Equipment", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Inspect Workshop lifting equipment/ })).toBeVisible();
  await page.getByRole("button", { name: /^Inspect Workshop lifting equipment/ }).click();
  await expect(page.getByTestId("restored-destination")).toHaveText(/equipmentDocId=lift/);
  await page.getByRole("tab", { name: "Vehicles", exact: true }).click();
  await expect(page.getByRole("button", { name: /^View Workshop support vehicle/ })).toBeVisible();
});

test("Fleet vehicle and equipment cards share the same visual structure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/service/design-system?scenario=restored-fleet&theme=dark");
  const cardMetrics = async (card) => card.evaluate((element) => {
    const cardStyle = getComputedStyle(element);
    return {
      padding: cardStyle.padding,
      radius: cardStyle.borderRadius,
      borderWidth: cardStyle.borderWidth,
      borderLeftWidth: cardStyle.borderLeftWidth,
    };
  });
  const vehicleCard = page.getByRole("button", { name: /^View Workshop support vehicle/ });
  const vehicle = await cardMetrics(vehicleCard);
  await page.getByRole("tab", { name: "Equipment", exact: true }).click();
  const equipmentCard = page.getByRole("button", { name: /^Inspect Workshop lifting equipment/ });
  expect(await cardMetrics(equipmentCard)).toEqual(vehicle);
  await page.screenshot({ path: "output/apple-design/restored-fleet/390-dark-equipment.png" });
});

async function expectSectionContained(section) {
  const overflow = await section.evaluate((root) => {
    const bounds = root.getBoundingClientRect();
    return [...root.querySelectorAll("*")].filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && (box.left < bounds.left - 1 || box.right > bounds.right + 1);
    }).map((element) => element.textContent?.slice(0, 80));
  });
  expect(overflow).toEqual([]);
}
for (const kind of ["equipment", "fleet"]) {
  for (const width of [320, 390, 820]) {
    for (const theme of ["light", "dark"]) {
      test(`restored ${kind} layout and actions · ${width} · ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`/service/design-system?scenario=restored-${kind}&theme=${theme}`);
        const section = page.getByTestId("maintenance-section-overdue");
        await expect(section).toBeVisible();
        await page.screenshot({ path: `output/apple-design/restored-${kind}/${width}-${theme}.png` });
        for (const group of await page.getByTestId(/^maintenance-section-/).all()) await expectSectionContained(group);
        if (kind === "fleet") {
          const title = page.getByText("Workshop support vehicle with a long descriptive name", { exact: true });
          expect(await title.evaluate((element) => element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1)).toBe(true);
        }
        const filter = page.getByRole("button", { name: "Filter: Overdue", exact: true });
        await filter.click();
        expect((await filter.boundingBox()).height).toBeGreaterThanOrEqual(44);
        expect(await filter.evaluate((element) => {
          const outer = element.getBoundingClientRect();
          const label = element.firstElementChild.getBoundingClientRect();
          return Math.abs(outer.y + outer.height / 2 - label.y - label.height / 2);
        })).toBeLessThanOrEqual(1);
        const heading = kind === "equipment" ? "Overdue - inspect today" : "Overdue – book today";
        await page.getByRole("button", { name: `Hide ${heading}`, exact: true }).click();
        const card = page.getByRole("button", { name: kind === "equipment" ? /^Inspect Workshop lifting/ : /^View Workshop support/ });
        await expect(card).toHaveCount(0);
        await page.getByRole("button", { name: `Show ${heading}`, exact: true }).click();
        await card.click();
        if (kind === "equipment") await expect(page.getByTestId("restored-destination")).toHaveText(/\/service\/inspections\/inspection-form\/new-\d+\?equipmentDocId=lift/);
        else await expect(page.getByTestId("restored-destination")).toHaveText("/service/vehicles/van");
        await page.getByRole("textbox").fill("no matching record");
        await expect(page.getByText(kind === "equipment" ? "No equipment matches this view" : "No vehicles match this view", { exact: true })).toBeVisible();
      });
    }
  }
  test(`restored ${kind} loading error retries the same screen`, async ({ page }) => {
    await page.goto(`/service/design-system?scenario=restored-${kind}&state=error&theme=light`);
    await page.getByRole("button", { name: kind === "equipment" ? "Retry equipment" : "Retry maintenance", exact: true }).click();
    await expect(page.getByTestId("maintenance-section-overdue")).toBeVisible();
  });
}

for (const kind of ["equipment", "fleet"]) {
  for (const theme of ["light", "dark"]) {
    test(`restored ${kind} status contrast · ${theme}`, async ({ page }) => {
      await page.goto(`/service/design-system?scenario=restored-${kind}&theme=${theme}`);
      const badges = page.getByText(kind === "equipment" ? /^Inspection: / : /^(MOT|Service): /);
      await expect(badges.first()).toBeVisible();
      const selectedFilter = page.getByRole("button", { name: "Filter: All", exact: true }).getByText("All", { exact: true });
      const ratios = await badges.or(selectedFilter).evaluateAll((elements) => {
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
      expect(ratios.length).toBeGreaterThan(0);
      for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }
}
