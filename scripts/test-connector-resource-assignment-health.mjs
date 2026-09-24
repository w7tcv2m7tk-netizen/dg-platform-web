import fs from "node:fs";
import assert from "node:assert/strict";

const health = fs.readFileSync("packages/platform-core/src/connectors/framework/health.ts", "utf8");

for (const marker of [
  "selectedGoogleAdsCustomerIds",
  "selectedYouTubeChannelIds",
  "selectedAccountIds",
  "selectedAdvertiserIds",
  "selectedPageIds",
  "selectedOrganizationUrn",
]) assert.match(health, new RegExp(marker));

for (const message of [
  "no ad account has been assigned to this organisation yet",
  "no channel has been assigned to this organisation yet",
  "no advertiser has been assigned to this organisation yet",
  "no Facebook Page has been assigned to this organisation yet",
  "no company Page has been assigned to this organisation yet",
]) assert.match(health, new RegExp(message));

assert.match(health, /status: "degraded"/);
console.log("connector resource assignment health checks passed");
