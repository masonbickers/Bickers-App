import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(helpersDir, "../..");

/**
 * Route layout tests assert on extracted screen styles as well as the route module.
 */
export function readRouteBundle(routePath) {
  const absoluteRoute = path.join(projectRoot, routePath);
  let source = readFileSync(absoluteRoute, "utf8");
  const styleImport = source.match(
    /import\s*\{[^}]+\}\s*from\s*["']([^"']*screenStyles\/[^"']+)["'];?/
  );
  if (!styleImport) return source;

  let stylePath = path.resolve(path.dirname(absoluteRoute), styleImport[1]);
  if (!stylePath.endsWith(".js")) stylePath += ".js";
  if (existsSync(stylePath)) {
    source = `${source}\n${readFileSync(stylePath, "utf8")}`;
  }
  return source;
}
