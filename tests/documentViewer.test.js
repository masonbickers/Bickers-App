import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { documentUrlFromRoute } from "../lib/documentUrl.js";

const require = createRequire(import.meta.url);
const { resolveHref } = require("expo-router/build/link/href.js");
const { parseQueryParams } = require("expo-router/build/fork/getStateFromPath-forks.js");

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const viewerSource = read("app/(protected)/document-viewer.jsx");
const specSource = read("app/(protected)/spec-sheets.js");
const insuranceSource = read("app/(protected)/insurance.js");

test("technical documents open in the shared in-app viewer", () => {
  assert.match(viewerSource, /<WebView/);
  assert.doesNotMatch(viewerSource, /Viewing securely in the app/);
  assert.match(viewerSource, /Platform\.OS === "android"/);
  assert.match(viewerSource, /docs\.google\.com\/gview/);
  assert.match(viewerSource, /FileSystem\.downloadAsync\(url, destination\)/);
  assert.match(viewerSource, /Platform\.OS === "ios" && isPdf/);
  assert.match(viewerSource, /Local PDF render failed; retrying from HTTPS/);
  assert.match(viewerSource, /setUseRemotePdfFallback\(true\)/);
  assert.match(viewerSource, /title="Preparing document…"/);
  assert.match(specSource, /pathname: "\/document-viewer"/);
  assert.match(insuranceSource, /pathname: "\/document-viewer"/);
  assert.match(insuranceSource, /<DocumentCard/);
  assert.match(specSource, /<DocumentCard/);
  assert.doesNotMatch(insuranceSource, /<StatusChip/);
  assert.doesNotMatch(specSource, /WebBrowser/);
  assert.doesNotMatch(insuranceSource, /WebBrowser/);
});

test("document viewer rejects non-web URLs and provides retry UI", () => {
  assert.equal(documentUrlFromRoute({ url: "javascript:alert(1)" }), "");
  assert.equal(documentUrlFromRoute({ url: "file:///private/document.pdf" }), "");
  assert.equal(documentUrlFromRoute({ url: "invalid" }), "");
  assert.equal(documentUrlFromRoute({}), "");
  assert.match(viewerSource, /title="Document could not be opened"/);
  assert.match(viewerSource, /actionLabel="Try again"/);
});

test("document links retain encoded Firebase paths and tokens after navigation", () => {
  const urls = [
    "https://firebasestorage.googleapis.com/v0/b/bickers-booking.firebasestorage.app/o/spec%20sheets%2F(2026)%20Air-Ride%20Low%20Loader%20No.1.pdf?alt=media&token=test-token",
    "https://firebasestorage.googleapis.com/v0/b/example/o/insurance%2FPolicy%20%26%20Cover%20100%25.pdf?alt=media&token=a%2Bb%26c%3Dd",
    "https://example.com/receipts/caf%C3%A9%23copy.pdf?signature=a%2Fb%3D",
  ];
  for (const url of urls) {
    const href = resolveHref({ pathname: "/document-viewer", params: { url } });
    // Exercise the installed router's actual sender and receiver, not a mock.
    const params = parseQueryParams(href, { name: "document-viewer" });
    assert.equal(documentUrlFromRoute(params), url);
    assert.equal(documentUrlFromRoute({ url: [params.url] }), url);
    // Reproduce the old useLocalSearchParams second decode, which breaks URLs.
    assert.notEqual(documentUrlFromRoute({ url: decodeURIComponent(params.url) }), url);
  }
});

test("both viewers read document URLs from the original route params", () => {
  for (const source of [viewerSource, read("app/(protected)/service/vehicles/file-viewer.jsx")]) {
    assert.match(source, /const route = useRoute\(\)/);
    assert.match(source, /documentUrlFromRoute\(route.params\)/);
    assert.doesNotMatch(source, /params\.url/);
  }
});
