import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { getContrastRatio } from "../lib/design/contrast.js";

const ts = createRequire(import.meta.url)("typescript");
const source = readFileSync(new URL("../providers/ThemeProvider.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("theme.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declaration = tree.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "buildColors");
const code = ts.transpileModule(declaration.getText(tree), {}).outputText;
const buildColors = new Function(`${code}\nreturn buildColors;`)();

test("readable red text and solid action fills meet normal-text contrast without changing brand red", () => {
  for (const scheme of ["light", "dark"]) {
    const colors = buildColors(scheme);
    assert.equal(colors.accent, "#ED1C25");
    for (const background of [colors.background, colors.surface, colors.surfaceAlt, colors.surfaceElevated, colors.accentSoft]) {
      assert.ok(getContrastRatio(colors.accentText, background) >= 4.5, `${scheme}: ${background}`);
    }
    assert.ok(getContrastRatio(colors.textOnAccent, colors.accentFill) >= 4.5);
  }
});
