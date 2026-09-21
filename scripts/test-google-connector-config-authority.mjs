import fs from "node:fs";
import assert from "node:assert/strict";

const locations = fs.readFileSync("src/app/api/v1/connectors/google/locations/route.ts", "utf8");
const analytics = fs.readFileSync("src/app/api/v1/connectors/google/analytics/config/route.ts", "utf8");

assert.match(
  locations,
  /export async function PUT[\s\S]*requirePermission\([\s\S]*module:\s*"settings"[\s\S]*action:\s*"manage"[\s\S]*scope:\s*"organisation"/,
  "GBP location assignment must require organisation settings:manage",
);
assert.match(
  analytics,
  /async function save[\s\S]*requirePermission\([\s\S]*module:\s*"settings"[\s\S]*action:\s*"manage"[\s\S]*scope:\s*"organisation"/,
  "GA4 / Search Console configuration must require organisation settings:manage",
);

console.log("Google connector configuration authority regression checks passed");
