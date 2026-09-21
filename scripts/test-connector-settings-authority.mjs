import fs from "node:fs";
import assert from "node:assert/strict";

const oauthRoutes = [
  "src/app/api/connectors/domain/connect/route.ts",
  "src/app/api/connectors/google/connect/route.ts",
  "src/app/api/connectors/linkedin/connect/route.ts",
  "src/app/api/connectors/meta/connect/route.ts",
  "src/app/api/connectors/tiktok-ads/connect/route.ts",
];

for (const file of oauthRoutes) {
  const src = fs.readFileSync(file, "utf8");
  assert.match(src, /requirePermission\(/, `${file} must require settings:manage`);
  assert.match(src, /module:\s*"settings"[\s\S]*action:\s*"manage"[\s\S]*scope:\s*"organisation"/);
  assert.match(src, /tenantWriteEntitlementBlock\(/, `${file} must enforce tenant write entitlement`);
}

for (const file of [
  "src/app/api/v1/connectors/google/ads/selection/route.ts",
  "src/app/api/v1/connectors/google/youtube/selection/route.ts",
  "src/app/api/v1/connectors/linkedin/selection/route.ts",
  "src/app/api/v1/connectors/meta/ads/selection/route.ts",
  "src/app/api/v1/connectors/microsoft-ads/selection/route.ts",
  "src/app/api/v1/connectors/tiktok-ads/selection/route.ts",
]) {
  const src = fs.readFileSync(file, "utf8");
  assert.match(src, /requirePermission\(/, `${file} must require settings:manage`);
  assert.match(src, /module:\s*"settings"[\s\S]*action:\s*"manage"[\s\S]*scope:\s*"organisation"/);
}

console.log("Connector settings authority regression checks passed");
