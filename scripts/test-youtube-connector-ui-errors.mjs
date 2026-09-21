import fs from "node:fs";
import assert from "node:assert/strict";

const panel = fs.readFileSync("src/components/settings/YouTubeConnectorPanel.tsx", "utf8");

assert.match(panel, /function apiErrorMessage\(value:unknown,fallback:string\)/);
assert.match(panel, /const raw=apiErrorMessage\(j\.error,""\)/);
assert.match(panel, /setE\(apiErrorMessage\(j\.error,"Could not save YouTube selection"\)\)/);
assert.doesNotMatch(panel, /setE\(j\.error\|\|/);

console.log("YouTube connector UI error handling regression checks passed");
