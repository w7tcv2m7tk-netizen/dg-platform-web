/**
 * Edge-safe assertions for DigitalGate legacy URL resolution.
 * Reads dg-legacy-urls.ts as source of truth (no TS runtime required).
 * Run: node scripts/test-dg-legacy-urls.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "src/lib/dg-legacy-urls.ts"), "utf8");

const mapMatch = src.match(
  /export const DG_LEGACY_REDIRECTS: Record<string, string> = \{([\s\S]*?)\n\};/,
);
assert.ok(mapMatch, "Could not parse DG_LEGACY_REDIRECTS");

/** @type {Record<string, string>} */
const redirects = {};
for (const line of mapMatch[1].split("\n")) {
  const m = line.match(/^\s*"([^"]+)":\s*(?:DG_\w+_URL|"([^"]+)")/);
  if (!m) continue;
  redirects[m[1]] = m[2] ?? "__ABS__";
}

assert.equal(
  redirects["/automation"],
  undefined,
  "/automation must NOT be a legacy redirect (Growth landing)",
);

for (const slug of [
  "/seo",
  "/ai-visibility",
  "/prospecting",
  "/analytics",
  "/social",
  "/reputation",
  "/ai-communications",
  "/growth",
  "/automation",
]) {
  assert.equal(
    redirects[slug],
    undefined,
    `${slug} must not appear in DG_LEGACY_REDIRECTS`,
  );
}

assert.equal(redirects["/solutions"], "/pricing");
assert.equal(redirects["/services"], "/pricing");
assert.equal(redirects["/growth-systems"], "/pricing");
assert.equal(redirects["/strategy-session"], "/contact");
assert.equal(redirects["/calendar-page"], "/contact");
assert.equal(redirects["/calendar"], "/contact");
assert.equal(redirects["/disclaimer"], "/legal-notice");
assert.equal(redirects["/terms"], "/terms-conditions");
assert.equal(redirects["/platform"], "/");

assert.match(
  src,
  /path\.startsWith\("\/growth-systems\/"\)/,
  "Must redirect /growth-systems/* prefix",
);
assert.match(
  src,
  /path\.startsWith\("\/services\/"\)/,
  "Must redirect /services/* prefix",
);

console.log("dg-legacy-urls: all assertions passed");
console.log(`  mapped exact redirects: ${Object.keys(redirects).length}`);
