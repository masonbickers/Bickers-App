import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const stylesDir = path.join(root, "lib/design/screenStyles");
const cardName = /(?:^card$|Card$|^emptyState$|^groupedIssueList$|^statsStrip$|^item$)/;
const nestedName = /^(?:wheelCard|wheelRecordCard|statusControlCard|statsStrip)$/;
const { parse } = createRequire(import.meta.url)("@babel/parser");

function styleObjects(source) {
  const ast = parse(source, { sourceType: "module" });
  const objects = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression" && node.callee.object?.name === "StyleSheet" && node.callee.property?.name === "create") {
      objects.push(...node.arguments[0].properties);
    }
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }
  visit(ast);
  return objects;
}

function radiusForStyle(source, name) {
  const style = styleObjects(source).find((property) => property.key?.name === name);
  const radius = style?.value.properties?.find((property) => property.key?.name === "borderRadius");
  return radius ? source.slice(radius.value.start, radius.value.end) : undefined;
}

test("card radius inspection never reads a neighbouring style's radius", () => {
  const source = "const styles = StyleSheet.create({ card: { padding: 4 }, icon: { borderRadius: t.radius.pill }, nestedCard: { borderRadius: t.componentRadius.card } });";
  assert.equal(radiusForStyle(source, "card"), undefined);
  assert.equal(radiusForStyle(source, "icon"), "t.radius.pill");
  assert.equal(radiusForStyle(source, "nestedCard"), "t.componentRadius.card");
});

test("service card surfaces use semantic shared radii", () => {
  const violations = [];
  for (const file of readdirSync(stylesDir).filter((name) => name.startsWith("service-") && name.endsWith(".js"))) {
    const source = readFileSync(path.join(stylesDir, file), "utf8");
    const names = styleObjects(source).map((property) => property.key?.name).filter(Boolean);
    for (const name of names.filter((value) => cardName.test(value))) {
      const radius = radiusForStyle(source, name);
      if (!radius) continue;
      const expected = name === "modalCard" ? "t.componentRadius.modal"
        : nestedName.test(name) ? "t.componentRadius.nestedCard"
        : "t.componentRadius.card";
      if (radius !== expected) violations.push(`${file}:${name} uses ${radius}, expected ${expected}`);
    }
  }
  assert.deepEqual(violations, []);
});

test("the documented card radius matches the shared SectionCard token", () => {
  const tokens = readFileSync(path.join(root, "lib/design/tokens.ts"), "utf8");
  const primitives = readFileSync(path.join(root, "components/ui/AppPrimitives.js"), "utf8");
  const dashboard = readFileSync(path.join(root, "lib/design/dashboard.ts"), "utf8");
  const guide = readFileSync(path.join(root, "DESIGN_SYSTEM.md"), "utf8");
  assert.match(tokens, /card:\s*radius\.lg/);
  assert.match(tokens, /lg:\s*28/);
  assert.match(primitives, /sectionCard:\s*\{[^}]*borderRadius:\s*t\.componentRadius\.card/s);
  assert.match(dashboard, /quickActionCard:[\s\S]*getCardSurfaceStyle\(colors\)/);
  const surface = readFileSync(path.join(root, "lib/design/cardSurface.js"), "utf8");
  assert.match(surface, /borderRadius: inset === undefined \? t\.componentRadius\.card/);
  assert.match(guide, /Independent record\/action card \| 28/);
});
