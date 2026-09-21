import fs from "node:fs";
import assert from "node:assert/strict";

const crud = fs.readFileSync("packages/platform-core/src/websites/crud.ts", "utf8");
const byHost = fs.readFileSync("src/app/sites/by-host/page.tsx", "utf8");
const sync = fs.readFileSync("scripts/sync-digitalgate-apps-pages.mjs", "utf8");

for (const slug of ["apps/core", "apps/infrastructure", "apps/industry", "apps/growth"]) {
  assert.match(sync, /slug: \`apps\/\$\{layer\.id\}\`/, "Layer index pages must be synced with nested canonical slugs");
}
assert.match(crud, /const isNestedStudioSlug/);
assert.match(crud, /pageSlug\.includes\("\/"\)/);
assert.doesNotMatch(crud, /const leaf = pageSlug\.split/);
assert.match(byHost, /Nested Studio slugs[\s\S]*authoritative paths/);
assert.match(byHost, /if \(pageSlug\.includes\("\/"\)\)/);

console.log("Nested Apps public routing regression checks passed");
