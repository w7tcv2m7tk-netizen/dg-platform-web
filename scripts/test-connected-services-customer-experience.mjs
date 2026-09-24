import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("src/app/(shell)/dashboard/settings/connected-services/page.tsx", "utf8");
const health = fs.readFileSync("src/components/settings/ConnectedServicesHealthOverview.tsx", "utf8");
const catalog = fs.readFileSync("src/components/settings/ConnectedServicesCatalog.tsx", "utf8");
const linkedin = fs.readFileSync("src/components/settings/LinkedInConnectorPanel.tsx", "utf8");
const meta = fs.readFileSync("src/components/settings/MetaConnectorPanel.tsx", "utf8");

assert.match(page, /Connect what matters first/);
assert.match(page, /Build a stronger Business Brain/);
assert.match(page, /Choose the right business resources/);
assert.match(page, /Aida uses authorised evidence/);
// Keep this assertion literal-safe because the source sentence contains template interpolation.\nassert.match(health, /need attention before Aida can rely on them/);
assert.match(health, /recommended service/);
assert.match(health, /active connections are healthy/);
assert.match(catalog, /Recommended for this organisation/);
assert.match(catalog, /Optional services stay neutral/);
assert.match(linkedin, /selectedOrganizationUrn/);
assert.match(meta, /selectedPageIds/);
assert.match(meta, /selectedAdAccountIds/);

console.log("connected services customer experience checks passed");
