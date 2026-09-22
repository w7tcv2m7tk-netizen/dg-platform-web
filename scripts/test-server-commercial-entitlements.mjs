import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const plans = read("src/lib/plans.ts");
const invite = read("src/app/api/v1/org/team/invite/route.ts");
const memberships = read("packages/platform-core/src/org/memberships.ts");

assert.ok(plans.includes("starter: { maxUsers: 1, maxActiveBusinesses: 1 }"));
assert.ok(plans.includes("professional: { maxUsers: 5, maxActiveBusinesses: 1 }"));
assert.ok(plans.includes("export const SCALE_MAX_USERS = 20;"));
assert.ok(plans.includes("export const SCALE_MAX_BUSINESSES = 5;"));
assert.ok(plans.includes("business: { maxUsers: SCALE_MAX_USERS, maxActiveBusinesses: SCALE_MAX_BUSINESSES }"));

assert.ok(invite.includes('status: { in: ["active", "invited"] }'));
assert.ok(invite.includes("occupiedSeats >= maxUsers"));
assert.ok(invite.includes('code: "plan_user_limit"'));

assert.ok(memberships.includes("starter: 1"));
assert.ok(memberships.includes("professional: 1"));
assert.ok(memberships.includes("business: 5"));
assert.ok(memberships.includes("ownedActiveOrganisations.length >= limit"));
assert.ok(memberships.includes("plan_business_limit"));

console.log("Server user/business entitlement regression checks passed");
