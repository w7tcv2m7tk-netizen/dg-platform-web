import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const authority = fs.readFileSync(
  "packages/platform-core/src/accommodation/booking-authority.ts",
  "utf8",
);
const webhook = fs.readFileSync("src/app/api/webhooks/dg-stay-booking/route.ts", "utf8");

test("WP booking webhook accepts canonical platform_id", () => {
  assert.match(webhook, /platform_id/);
  assert.match(webhook, /syncWpBookingWithPlatformAuthority/);
});

test("canonical platform identity is checked before legacy WP identity", () => {
  const canonical = authority.indexOf("if (platformId)");
  const legacy = authority.indexOf("Legacy WP identity fallback");
  assert.ok(canonical >= 0, "canonical branch missing");
  assert.ok(legacy > canonical, "legacy fallback must occur after canonical handling");
  assert.match(authority, /where:\s*\{\s*id:\s*platformId,\s*organisationId\s*\}/);
});

test("canonical identity mismatch fails closed", () => {
  assert.match(authority, /is linked to WordPress booking/);
  assert.match(authority, /Canonical StayBooking .* was not found/);
});

test("webhook returns canonical identity for connector persistence", () => {
  assert.match(webhook, /identities:/);
  assert.match(webhook, /platform_id:\s*synced\.platformId/);
});
