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

test("an audit exposes a Studio ID only after verified target selection", () => {
  const verified = engine.indexOf("if (verifiedSite)");
  const assignment = engine.indexOf("studioWebsiteId = verifiedSite.id");
  assert.ok(verified >= 0 && assignment > verified);
  assert.match(engine, /studioWebsiteId: string \| null/);
});

test("actionable content findings link to the verified Studio site", () => {
  assert.match(panel, /studioActionForFinding/);
  assert.match(panel, /title\.includes\("h1"\)/);
  assert.match(panel, /title\.includes\("structured data"\)/);
  assert.match(panel, /`\/apps\/websites\/studio\/\$\{studioWebsiteId\}\?tab=edit`/);
  assert.match(panel, /className="mt-3 inline-flex min-h-11/);
});

test("metadata findings continue to use the guarded automatic fix action", () => {
  assert.match(panel, /if \(isAutomaticMetadata\) return null/);
  assert.match(panel, /Fix Studio metadata/);
});
