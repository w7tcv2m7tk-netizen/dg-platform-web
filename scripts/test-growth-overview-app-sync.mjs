import assert from "node:assert/strict";
import fs from "node:fs";

const strip = fs.readFileSync("src/components/overview/DigitalPerformanceStrip.tsx", "utf8");

for (const appId of ["marketing","advertising","seo","ai-visibility","reviews","analytics","automation","prospecting","social"]) {
  assert.match(strip, new RegExp('"' + appId.replace("-", "\\-") + '"'), `Growth overview must recognise active app: ${appId}`);
}
assert.match(strip, /if \(appId === "marketing"\)/);
assert.match(strip, /if \(appId === "advertising"\)/);
assert.match(strip, /if \(!enabled\.has\(appId\)\) return \[\]/);
console.log("Growth App overview synchronisation checks passed");
