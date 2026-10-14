import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const ts = createRequire(import.meta.url)("typescript");
const source = readFileSync("app/(protected)/edit-profile.js", "utf8");
const ast = ts.createSourceFile("profile.jsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
let guard;
const visit = (node) => {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === "usePreventRemove") guard = node.getText(ast);
  ts.forEachChild(node, visit);
};
visit(ast);

test("profile navigation protects dirty edits and resumes only the confirmed action", () => {
  assert.ok(guard);
  for (const [hasChanges, allowLogout, expected] of [[true, false, true], [false, false, false], [true, true, false]]) {
    let active, callback, buttons, dispatched;
    vm.runInNewContext(guard, {
      hasChanges, allowLogout,
      usePreventRemove: (enabled, handler) => { active = enabled; callback = handler; },
      Alert: { alert: (_title, _message, choices) => { buttons = choices; } },
      navigation: { dispatch: (action) => { dispatched = action; } },
    });
    assert.equal(active, expected);
    if (active) {
      const action = { type: "GO_BACK" };
      callback({ data: { action } });
      assert.equal(buttons[0].text, "Keep editing");
      assert.equal(buttons[0].style, "cancel");
      assert.equal(dispatched, undefined);
      assert.equal(buttons[1].text, "Discard changes");
      buttons[1].onPress();
      assert.equal(dispatched, action);
    }
  }
});
