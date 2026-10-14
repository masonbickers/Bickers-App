import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MIGRATION_BATCHES } from "../../tests/designSystemMigrationManifest.js";

const manifestPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../tests/designSystemMigrationManifest.js"
);
const allRoutes = Object.values(MIGRATION_BATCHES).flat().sort();
const source = readFileSync(manifestPath, "utf8");
const block = allRoutes.map((route) => `  "${route}",`).join("\n");
const next = source.replace(
  /const completedRoutes = new Set\(\[[\s\S]*?\]\);/,
  `const completedRoutes = new Set([\n${block}\n]);`
);
writeFileSync(manifestPath, next);
