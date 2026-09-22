import fs from "node:fs";
import assert from "node:assert/strict";

const apps = fs.readFileSync("src/app/api/v1/org/apps/route.ts", "utf8");
const templates = fs.readFileSync("src/app/api/v1/org/industry/templates/route.ts", "utf8");

assert.match(apps, /function unpaidIndustryApps/);
assert.match(apps, /profile\?\.purchasedApps/);
assert.match(apps, /industryIdForAppOrTemplate/);
assert.match(apps, /industry_app_purchase_required/);
assert.match(apps, /body\.action === "apply_plan"/);
assert.match(apps, /body\.action === "toggle"/);
assert.match(apps, /body\.action === "set"/);

assert.match(templates, /purchasedApps: settings\.profile\?\.purchasedApps/);
assert.match(templates, /item\.industryId === template\.industryId/);
assert.match(templates, /industry_app_purchase_required/);
assert.match(templates, /!staffOrOperator/);

console.log("Industry purchase activation guards: ok");
