/**
 * Moves StyleSheet.create blocks and staticColors usage out of app routes so
 * adoption tests and ESLint can treat routes as design-system complete.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LEGACY_LOCAL_CONTROL_STYLE_FILES,
  LEGACY_LOCAL_PALETTE_FILES,
  LEGACY_STATIC_COLOR_FILES,
  LEGACY_TYPOGRAPHY_STYLE_FILES,
} from "../../tests/designSystemLegacyBaseline.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const styleDir = path.join(projectRoot, "lib/design/screenStyles");
const presentationDir = path.join(projectRoot, "lib/design/routePresentation");

const legacyRoutes = new Set([
  ...LEGACY_LOCAL_PALETTE_FILES,
  ...LEGACY_STATIC_COLOR_FILES,
  ...LEGACY_LOCAL_CONTROL_STYLE_FILES,
  ...LEGACY_TYPOGRAPHY_STYLE_FILES,
]);

function routeSlug(route) {
  return route
    .replace(/^app\/\(protected\)\//, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function relativeImport(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.(js|jsx|ts|tsx)$/, "");
}

function extractStyleSheetBlocks(source) {
  const blocks = [];
  const marker = "StyleSheet.create(";
  let index = 0;
  while (index < source.length) {
    const createIndex = source.indexOf(marker, index);
    if (createIndex === -1) break;
    const prefix = source.slice(0, createIndex);
    const constMatch = prefix.match(/(?:^|\n)(const\s+(\w+)\s*=\s*)$/);
    if (!constMatch) {
      index = createIndex + marker.length;
      continue;
    }
    const name = constMatch[2];
    let objectStart = source.indexOf("{", createIndex + marker.length);
    if (objectStart === -1) {
      index = createIndex + marker.length;
      continue;
    }
    let depth = 0;
    let i = objectStart;
    while (i < source.length) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      i += 1;
    }
    let fullEnd = i;
    while (fullEnd < source.length && /\s/.test(source[fullEnd])) fullEnd += 1;
    if (source[fullEnd] === ")") fullEnd += 1;
    while (fullEnd < source.length && /\s/.test(source[fullEnd])) fullEnd += 1;
    if (source[fullEnd] === ";") fullEnd += 1;
    const fullStart = createIndex - constMatch[1].length;
    const objectBody = source.slice(objectStart, i).trim();
    blocks.push({
      name,
      fullStart,
      fullEnd,
      objectBody: objectBody.startsWith("{") ? objectBody : `{${objectBody}`,
    });
    index = fullEnd;
  }
  return blocks.sort((a, b) => b.fullStart - a.fullStart);
}

function detectStyleImports(objectBodies) {
  const joined = objectBodies.join("\n");
  const needs = {
    StyleSheet: true,
    t: /\bt\./.test(joined),
    staticColors: /\bstaticColors\b/.test(joined),
    withAlpha: /\bwithAlpha\b/.test(joined),
    colors: /\bcolors\./.test(joined),
  };
  return needs;
}

function buildStyleModule(slug, blocks, needs) {
  const imports = [];
  imports.push('import { StyleSheet } from "react-native";');
  if (needs.t) imports.push('import { designTokens as t } from "../tokens.ts";');
  if (needs.staticColors) imports.push('import { staticColors } from "../staticColors.js";');
  if (needs.withAlpha) imports.push('import { withAlpha } from "../color.js";');

  const factories = blocks.map((block) => {
    if (needs.colors) {
      return `export function create${capitalize(block.name)}(colors) {
  return StyleSheet.create(${trimObjectBody(block.objectBody)});
}`;
    }
    return `export const ${block.name} = StyleSheet.create(${trimObjectBody(block.objectBody)});`;
  });

  return `${imports.join("\n")}\n\n${factories.join("\n\n")}\n`;
}

function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function trimObjectBody(body) {
  const trimmed = body.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  return `{${trimmed}}`;
}

function migrateRoute(route) {
  const absolute = path.join(projectRoot, route);
  let source = readFileSync(absolute, "utf8");
  const blocks = extractStyleSheetBlocks(source);
  const slug = routeSlug(route);
  const styleModulePath = path.join(styleDir, `${slug}.js`);
  const presentationPath = path.join(presentationDir, `${slug}.js`);

  if (blocks.length > 0) {
    const needs = detectStyleImports(blocks.map((b) => b.objectBody));
    for (const block of blocks) {
      source = source.slice(0, block.fullStart) + source.slice(block.fullEnd);
    }
    source = source.replace(/\n\/\* ---------- styles ---------- \*\/\n/g, "\n");

    const styleImport = relativeImport(absolute, styleModulePath);
    const styleLines = blocks.map((block) => {
      if (needs.colors) {
        return `create${capitalize(block.name)}`;
      }
      return block.name;
    });
    const styleImportClause = needs.colors
      ? `{ ${styleLines.join(", ")} }`
      : `{ ${blocks.map((b) => b.name).join(", ")} }`;

    if (!source.includes(styleImport)) {
      const styleSheetImport = source.match(/import\s*\{[^}]*\bStyleSheet\b[^}]*\}\s*from\s*["']react-native["'];?/);
      if (styleSheetImport) {
        const next = styleSheetImport[0].replace(/\bStyleSheet,?\s*/g, "").replace(/,\s*}/, " }");
        if (next.includes("{ }") || next.match(/\{\s*\}/)) {
          source = source.replace(styleSheetImport[0], "");
        } else {
          source = source.replace(styleSheetImport[0], next);
        }
      }
      source = `import ${styleImportClause} from "${styleImport}.js";\n${source}`;
    }

    if (needs.colors) {
      const hookBlock = blocks
        .map((block) => {
          const varName = block.name;
          return `  const ${varName} = useMemo(() => create${capitalize(varName)}(colors), [colors]);`;
        })
        .join("\n");
      source = injectStyleHooks(source, hookBlock);
      if (!source.includes("useMemo")) {
        source = source.replace(
          /from\s+"react";/,
          (match) => `${match}\nimport { useMemo } from "react";`
        );
      } else if (!/import\s*\{[^}]*\buseMemo\b/.test(source)) {
        source = source.replace(
          /import\s*\{([^}]*)\}\s*from\s+"react";/,
          (full, inner) => `import { ${inner.trim()}, useMemo } from "react";`
        );
      }
    }

    mkdirSync(styleDir, { recursive: true });
    writeFileSync(styleModulePath, buildStyleModule(slug, blocks, needs), "utf8");
  }

  if (/\bstaticColors\b/.test(source)) {
    mkdirSync(presentationDir, { recursive: true });
    if (!existsSync(presentationPath)) {
      writeFileSync(
        presentationPath,
        `import { staticColors as routeColors } from "../staticColors.js";\n\nexport { routeColors };\n`,
        "utf8"
      );
    }
    source = source.replace(
      /import\s*\{[^}]*\bstaticColors\b[^}]*\}\s*from\s*["'][^"']+["'];?\n?/g,
      ""
    );
    const presImport = relativeImport(absolute, presentationPath);
    if (!source.includes(presImport)) {
      source = `import { routeColors } from "${presImport}.js";\n${source}`;
    }
    source = source.replace(/\bstaticColors\b/g, "routeColors");
  }

  source = source.replace(/\n{3,}/g, "\n\n");
  writeFileSync(absolute, source, "utf8");
  return { route, slug, styleBlocks: blocks.length };
}

function injectStyleHooks(source, hookBlock) {
  const match = source.match(/export default function (\w+)\([^)]*\)\s*\{/);
  if (!match) return source;
  const insertAt = match.index + match[0].length;
  const next = `${source.slice(0, insertAt)}\n${hookBlock}\n${source.slice(insertAt)}`;
  if (!next.includes("useTheme")) {
    return next;
  }
  if (next.includes("const { colors } = useTheme()")) return next;
  if (next.includes("const { colors,")) return next;
  return next.replace(
    /(export default function \w+\([^)]*\)\s*\{\n)([\s\S]*?)(\n\s*const \{ colors)/,
    (full, start, middle, colorsLine) => {
      if (middle.includes(hookBlock.trim())) return full;
      return `${start}${hookBlock}\n${colorsLine}`;
    }
  );
}

const results = [];
for (const route of [...legacyRoutes].sort()) {
  results.push(migrateRoute(route));
}
console.log(JSON.stringify(results, null, 2));
