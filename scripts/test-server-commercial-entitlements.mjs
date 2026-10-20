import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const invite = read("src/app/api/v1/org/team/invite/route.ts");
const memberships = read("packages/platform-core/src/org/memberships.ts");

await import("./register-ts-resolver.mjs");
const { PLATFORM_TIER_LIMITS } = await import("../src/lib/plans.ts");
assert.deepEqual(PLATFORM_TIER_LIMITS.starter, { maxUsers: 1, maxActiveBusinesses: 1 });
assert.deepEqual(PLATFORM_TIER_LIMITS.professional, { maxUsers: 5, maxActiveBusinesses: 1 });
assert.deepEqual(PLATFORM_TIER_LIMITS.business, { maxUsers: 20, maxActiveBusinesses: 5 });

assert.ok(invite.includes('status: { in: ["active", "invited"] }'));
assert.ok(invite.includes("occupiedSeats >= maxUsers"));
assert.ok(invite.includes('code: "plan_user_limit"'));

assert.ok(memberships.includes("starter: 1"));
assert.ok(memberships.includes("professional: 1"));
assert.ok(memberships.includes("business: 5"));
assert.ok(memberships.includes("ownedActiveOrganisations.length >= limit"));
assert.ok(memberships.includes("plan_business_limit"));

console.log("Server user/business entitlement regression checks passed");
