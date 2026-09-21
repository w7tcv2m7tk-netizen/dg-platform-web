import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("src/app/sites/by-host/page.tsx", "utf8");
const sync = fs.readFileSync("scripts/sync-digitalgate-apps-pages.mjs", "utf8");

assert.match(sync, /slug: `apps\/\$\{layer\.id\}`/, "Layer landing pages must be synced with nested Studio slugs");
assert.match(sync, /slug: publicSlug/);
assert.match(source, /if \(pageSlug\.includes\("\/"\)\)/, "Nested public paths must use exact Studio slug resolution");
assert.match(source, /return null;/, "Unknown nested paths must not fall back to an unrelated leaf page");
assert.match(source, /pages\.find\(\(p\) => p\.slug === aliased\)/);
assert.match(source, /pages\.find\(\(p\) => p\.slug === pageSlug\)/);

console.log("Nested Website Studio route regression checks passed");
