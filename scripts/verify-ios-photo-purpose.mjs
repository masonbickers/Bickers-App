import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ipaPath = process.argv[2];
if (!ipaPath) {
  console.error("Usage: npm run verify:ios-photo -- /path/to/app.ipa");
  process.exit(2);
}

try {
  const expected = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"))
    .expo.ios.infoPlist.NSPhotoLibraryUsageDescription;
  const entries = execFileSync("unzip", ["-Z1", ipaPath], { encoding: "utf8" }).trim().split("\n");
  const infoPlistPath = entries.find((entry) => /^Payload\/[^/]+\.app\/Info\.plist$/.test(entry));
  if (!infoPlistPath) throw new Error("The IPA has no app Info.plist.");

  const infoPlist = execFileSync("unzip", ["-p", ipaPath, infoPlistPath]);
  const actual = execFileSync(
    "plutil",
    ["-extract", "NSPhotoLibraryUsageDescription", "raw", "-o", "-", "-"],
    { input: infoPlist, encoding: "utf8" }
  ).trim();

  if (actual !== expected) {
    throw new Error(`Photo purpose string mismatch.\nPackaged: ${actual}\nExpected: ${expected}`);
  }
  console.log(`Verified packaged photo purpose string: ${actual}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
