import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const appRoot = new URL("../app/", import.meta.url);
const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const file = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
  return entry.isDirectory() ? walk(file) : [file];
});

test("each public screen URL has a single owner across navigation groups", () => {
  const owners = new Map();
  for (const file of walk(appRoot)) {
    const relative = path.relative(appRoot.pathname, file.pathname);
    if (!/\.(js|jsx|ts|tsx)$/.test(relative) || path.basename(relative).startsWith("_") || path.basename(relative).startsWith("+")) continue;
    const route = "/" + relative.replace(/\.(js|jsx|ts|tsx)$/, "").split(path.sep)
      .filter((part) => !part.startsWith("(")).join("/").replace(/(^|\/)index$/, "");
    // Root index screens deliberately select the authorized workspace.
    if (route === "/") continue;
    assert.ok(!owners.has(route), `${route} is owned by both ${owners.get(route)} and ${relative}`);
    owners.set(route, relative);
  }
});
