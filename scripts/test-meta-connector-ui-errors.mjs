import fs from "node:fs";
import assert from "node:assert/strict";

const panel = fs.readFileSync("src/components/settings/MetaConnectorPanel.tsx", "utf8");

assert.match(panel, /function apiErrorMessage\(value:unknown,fallback:string\)/);
for (const fallback of [
  "Instagram evidence is not available",
  "Instagram Insights capability could not be checked",
  "Meta Ads accounts could not be discovered",
  "Could not save ad account selection",
]) {
  assert.match(panel, new RegExp(`apiErrorMessage\\(j\\.error,"${fallback.replace(/[.*+?^$()|[\]\\]/g, "\\$&")}"\\)`));
}
assert.doesNotMatch(panel, /set(?:EvidenceError|InsightsError|AdsError)\(j\.error\?\?/);

console.log("Meta connector UI error handling regression checks passed");
