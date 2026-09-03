import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bookings = fs.readFileSync("packages/platform-core/src/accommodation/bookings.ts", "utf8");
const webhook = fs.readFileSync("src/app/api/webhooks/dg-stay-booking/route.ts", "utf8");

test("WP booking rows may carry canonical platform_id", () => {
  assert.match(bookings, /platform_id\??:\s*string/);
  assert.match(webhook, /platform_id/);
});

test("WP sync prefers canonical platform booking identity", () => {
  assert.match(bookings, /row\.platform_id/);
  assert.match(bookings, /where:\s*\{\s*id:\s*row\.platform_id/);
});

test("legacy WP identity remains a migration fallback only", () => {
  assert.match(bookings, /Legacy WP identity fallback/);
});
