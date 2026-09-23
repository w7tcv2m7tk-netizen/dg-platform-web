import fs from "node:fs";
import assert from "node:assert/strict";

const files = ["marketing/pages/header.html","marketing/pages/footer.html","marketing/pages/homepage.html","marketing/pages/pricing-page.html"];
const pages = Object.fromEntries(files.map((file) => [file, fs.readFileSync(file, "utf8")]));
const signup = "https://app.digitalgate.com.au/signup/account";
for (const file of files) assert.ok(pages[file].includes(signup), file + " must expose the standard signup journey");
assert.match(pages["marketing/pages/header.html"], /Start free trial/);
assert.match(pages["marketing/pages/footer.html"], /Start free 14-day trial/);
assert.match(pages["marketing/pages/homepage.html"], /Start free 14-day trial/);
assert.match(pages["marketing/pages/pricing-page.html"], /Start free 14-day trial/);
assert.match(pages["marketing/pages/pricing-page.html"], /hero_trial:\s*\x27https:\/\/app\.digitalgate\.com\.au\/signup\/account\x27/);
assert.match(pages["marketing/pages/pricing-page.html"], /cta_trial:\s*\x27https:\/\/app\.digitalgate\.com\.au\/signup\/account\x27/);
assert.doesNotMatch(pages["marketing/pages/pricing-page.html"], /hero_trial:\s*\x27https:\/\/digitalgate\.com\.au\/founding-customers\//);
assert.doesNotMatch(pages["marketing/pages/pricing-page.html"], /cta_trial:\s*\x27https:\/\/digitalgate\.com\.au\/founding-customers\//);
console.log("marketing trial conversion journey: ok");
