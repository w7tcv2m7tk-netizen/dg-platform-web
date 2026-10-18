import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const plans = read("src/lib/plans.ts");
const catalogue = read("packages/platform-core/src/billing/commercial-catalogue.ts");
const invite = read("src/app/api/v1/org/team/invite/route.ts");
const memberships = read("packages/platform-core/src/org/memberships.ts");

assert.ok(plans.includes('import { PLATFORM_COMMERCIAL_PLANS } from "@dg/platform-core/billing/commercial-catalogue"'));
assert.ok(plans.includes("PLATFORM_COMMERCIAL_PLANS.map((plan) => [plan.id, {"));
assert.ok(catalogue.includes('{ id: "starter", name: "Starter", monthlyCents: 9900, maxUsers: 1, maxActiveBusinesses: 1'));
assert.ok(catalogue.includes('{ id: "professional", name: "Growth", monthlyCents: 24900, maxUsers: 5, maxActiveBusinesses: 1'));
assert.ok(catalogue.includes('{ id: "business", name: "Scale", monthlyCents: 49900, maxUsers: 20, maxActiveBusinesses: 5'));
assert.ok(plans.includes("export const SCALE_MAX_USERS = commercialPlanLimits.business.maxUsers;"));
assert.ok(plans.includes("export const SCALE_MAX_BUSINESSES = commercialPlanLimits.business.maxActiveBusinesses;"));
assert.ok(plans.includes("business: commercialPlanLimits.business"));

assert.ok(invite.includes('status: { in: ["active", "invited"] }'));
assert.ok(invite.includes("occupiedSeats >= maxUsers"));
assert.ok(invite.includes('code: "plan_user_limit"'));

assert.ok(memberships.includes("starter: 1"));
assert.ok(memberships.includes("professional: 1"));
assert.ok(memberships.includes("business: 5"));
assert.ok(memberships.includes("ownedActiveOrganisations.length >= limit"));
assert.ok(memberships.includes("plan_business_limit"));

console.log("Server user/business entitlement regression checks passed");
