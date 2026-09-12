import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const engine = readFileSync(
  new URL("../packages/platform-core/src/seo/index.ts", import.meta.url),
  "utf8",
);
const panel = readFileSync(
  new URL("../src/components/seo/SeoAuditPanel.tsx", import.meta.url),
  "utf8",
);

test("native Studio health is combined only for one verified target", () => {
  const targetCheck = engine.indexOf("sites.length === 1");
  const hostCheck = engine.indexOf("auditedHost === profileHost");
  const nativeBuild = engine.indexOf("buildNativeWebsiteHealth({ website: verifiedSite })");

  assert.ok(targetCheck >= 0, "expected a single-site requirement");
  assert.ok(hostCheck > targetCheck, "expected audited and profile hosts to match");
  assert.ok(nativeBuild > hostCheck, "expected target verification before native health is built");
});

test("SEO explains that native checks require a safely matched site", () => {
  assert.match(panel, /native Studio SEO checks when the audited site can\s+be matched safely/);
});
