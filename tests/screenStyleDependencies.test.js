import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const stylesDirectory = path.resolve("lib/design/screenStyles");
const styleFiles = fs
  .readdirSync(stylesDirectory)
  .filter((fileName) => fileName.endsWith(".js"));

const dependencyPatterns = {
  COLORS: /(?:import[\s\S]*?servicePalette\s+as\s+COLORS|(?:const|let|var)\s+COLORS\b)/,
  Platform: /import\s*\{[^}]*\bPlatform\b[^}]*\}\s*from\s*["']react-native["']/,
  pagePadding: /(?:const|let|var)\s+pagePadding\b/,
  gridGap: /(?:const|let|var)\s+gridGap\b/,
  THUMB: /(?:const|let|var)\s+THUMB\b/,
  TIME_OPTION_ROW_HEIGHT: /(?:const|let|var)\s+TIME_OPTION_ROW_HEIGHT\b/,
  HEADER_HEIGHT: /(?:const|let|var)\s+HEADER_HEIGHT\b/,
  ROW_HEIGHT: /(?:const|let|var)\s+ROW_HEIGHT\b/,
};

test("extracted screen styles declare the dependencies they evaluate", () => {
  const missingDependencies = [];

  for (const fileName of styleFiles) {
    const source = fs.readFileSync(path.join(stylesDirectory, fileName), "utf8");

    for (const [identifier, declarationPattern] of Object.entries(dependencyPatterns)) {
      const usesIdentifier = new RegExp(`\\b${identifier}\\b`).test(source);
      if (usesIdentifier && !declarationPattern.test(source)) {
        missingDependencies.push(`${fileName}: ${identifier}`);
      }
    }
  }

  assert.deepEqual(missingDependencies, []);
});

test("shared Home presentation imports StyleSheet for runtime row dividers", () => {
  const source = fs.readFileSync(
    path.resolve("components/home/HomeDashboard.jsx"),
    "utf8"
  );

  assert.match(
    source,
    /import\s*\{[^}]*\bStyleSheet\b[^}]*\}\s*from\s*["']react-native["']/
  );
});
