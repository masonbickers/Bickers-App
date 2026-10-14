# Bickers 5.0.12 dependency fixes

The 12 September 2026 npm audit reports zero vulnerabilities after these targeted changes:

- Override Metro, metro-config and metro-transform-worker to 0.83.8. This maintained patch removes vulnerable image-size parsers. Expo SDK 55 and React Native 0.83.10 are retained. [Metro release](https://github.com/react/metro/releases/tag/v0.83.8).
- Override decode-uri-component to upstream 0.5.0, which fixes excessive CPU usage on malformed URL input. [Maintainer advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).
- Apply `patches/decode-uri-component+0.5.0.patch` during postinstall. It changes only the module format and default export to CommonJS, preserving the upstream decoding algorithm. query-string 7.1.3 requires a callable CommonJS export. Installing 0.5.0 without this patch throws `decodeComponent is not a function`. Keep postinstall enabled for builds; it fails on patch errors.
- Override uuid to 11.1.1 only under xcode and @expo/ngrok. Both callers use the supported `uuid.v4()` API. [Maintainer advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

Regression checks exercise real query-string parsing, encoded Firebase-style document URLs, Unicode and plus characters, repeated query parameters, malformed input in a subprocess with a strict timeout, and Xcode project ID generation. A separate clean `npm ci` applied the patch and passed the regression checks. Production iOS/web export and native iOS Simulator Release compilation passed.

When navigation upgrades to a decoder-compatible release, remove the decoder override and compatibility patch together, then rerun `tests/dependencySecurity.test.js` and native/export checks. Do not remove the patch while query-string still expects the old CommonJS interface.
