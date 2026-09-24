import fs from "node:fs";
import assert from "node:assert/strict";

const oauthRoutes = [
  "src/app/api/connectors/domain/connect/route.ts",
  "src/app/api/connectors/google/connect/route.ts",
  "src/app/api/connectors/linkedin/connect/route.ts",
  "src/app/api/connectors/meta/connect/route.ts",
  "src/app/api/connectors/microsoft-ads/connect/route.ts",
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
  "src/app/api/v1/connectors/meta/selection/route.ts",
  "src/app/api/v1/connectors/meta/ads/selection/route.ts",
  "src/app/api/v1/connectors/microsoft-ads/selection/route.ts",
  "src/app/api/v1/connectors/tiktok-ads/selection/route.ts",
]) {
  const src = fs.readFileSync(file, "utf8");
  assert.match(src, /requirePermission\(/, `${file} must require settings:manage`);
  assert.match(src, /module:\s*"settings"[\s\S]*action:\s*"manage"[\s\S]*scope:\s*"organisation"/);
  assert.match(src, /tenantWriteEntitlementBlock\(/, `${file} must enforce tenant write entitlement`);
}

for (const file of [
  "src/app/api/v1/connectors/domain/disconnect/route.ts",
  "src/app/api/v1/connectors/rea/activate/route.ts",
  "src/app/api/v1/connectors/rea/disconnect/route.ts",
  "src/app/api/v1/connectors/wordpress/route.ts",
]) {
  const src = fs.readFileSync(file, "utf8");
  assert.match(src, /requirePermission\(/, `${file} must require settings:manage`);
  assert.match(src, /tenantWriteEntitlementBlock\(/, `${file} must enforce tenant write entitlement`);
}

for (const file of [
  "src/app/api/v1/connectors/apple-icloud/connect/route.ts",
  "src/app/api/v1/connectors/apple-icloud/disconnect/route.ts",
  "src/app/api/v1/connectors/apple-icloud/sync/route.ts",
  "src/app/api/v1/connectors/google-gmail/disconnect/route.ts",
  "src/app/api/v1/connectors/google-gmail/sync/route.ts",
  "src/app/api/v1/connectors/google/disconnect/route.ts",
  "src/app/api/v1/connectors/google/sync/route.ts",
  "src/app/api/v1/connectors/linkedin/disconnect/route.ts",
  "src/app/api/v1/connectors/meta/disconnect/route.ts",
  "src/app/api/v1/connectors/microsoft-365/disconnect/route.ts",
  "src/app/api/v1/connectors/microsoft-365/sync/route.ts",
]) {
  const src = fs.readFileSync(file, "utf8");
  assert.match(src, /requirePermission\(/, `${file} must require settings:manage`);
  assert.match(src, /tenantWriteEntitlementBlock\(/, `${file} must enforce tenant write entitlement`);
}

console.log("Connector settings authority regression checks passed");
