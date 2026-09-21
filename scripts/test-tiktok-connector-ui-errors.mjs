import fs from "node:fs";
import assert from "node:assert/strict";

const panel = fs.readFileSync("src/components/settings/TikTokAdsConnectorPanel.tsx", "utf8");

assert.match(panel, /function apiErrorMessage\(value:unknown,fallback:string\)/);
assert.match(panel, /setE\(apiErrorMessage\(j\.error,"TikTok advertisers could not be discovered"\)\)/);
assert.match(panel, /setE\(apiErrorMessage\(j\.error,"Could not save TikTok advertiser selection"\)\)/);
assert.doesNotMatch(panel, /setE\(j\.error\?\?/);

console.log("TikTok Ads connector UI error handling regression checks passed");
