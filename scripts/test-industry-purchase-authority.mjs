import assert from "node:assert/strict";
import test from "node:test";

import {
  authorisedIndustryPurchaseIds,
  authorisedPremiumPurchaseKeys,
} from "../packages/platform-core/src/industry/purchase-authority.ts";
import { resolveIndustryEntitlements } from "../packages/platform-core/src/industry/entitlements.ts";
import { hasAdvancedCommsEntitlement } from "../packages/platform-core/src/communications/entitlements.ts";

const now = new Date("2026-10-18T00:00:00.000Z");
const canonical = (overrides = {}) => ({
  organisationId: "org-a",
  industryApps: ["finance"],
  premiumApps: ["voice_ai"],
  status: "TRIALING",
  entitlement: "FULL",
  stripeStatus: "trialing",
  stripeSubscriptionId: "sub-a",
  stripeCustomerId: "cus-a",
  trialEnd: new Date("2026-11-01T00:00:00.000Z"),
  currentPeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
  cancelAtPeriodEnd: false,
  ...overrides,
});

test("verified trial authorizes only the matching organisation's projected app purchases", () => {
  const row = canonical();
  assert.deepEqual(authorisedIndustryPurchaseIds(row, "org-a", now), ["finance"]);
  assert.deepEqual(authorisedPremiumPurchaseKeys(row, "org-a", now), ["voice_ai"]);
  assert.deepEqual(authorisedIndustryPurchaseIds(row, "org-b", now), []);
  assert.deepEqual(authorisedPremiumPurchaseKeys(row, "org-b", now), []);
});

test("paid subscription access expires at the canonical period boundary, including scheduled cancellation", () => {
  const active = canonical({ status: "ACTIVE", stripeStatus: "active", trialEnd: null, cancelAtPeriodEnd: true });
  assert.equal(authorisedIndustryPurchaseIds(active, "org-a", now).length, 1);
  assert.deepEqual(authorisedIndustryPurchaseIds(active, "org-a", new Date("2026-11-01T00:00:00.000Z")), []);
  assert.deepEqual(authorisedPremiumPurchaseKeys(canonical({ status: "CANCELLED", stripeStatus: "canceled" }), "org-a", now), []);
  assert.deepEqual(authorisedIndustryPurchaseIds(canonical({ stripeStatus: "unpaid" }), "org-a", now), []);
});

test("expired trials, missing legacy projection and failed authority reads fail closed", () => {
  assert.deepEqual(authorisedIndustryPurchaseIds(canonical({ trialEnd: new Date("2026-10-17T23:59:59.000Z") }), "org-a", now), []);
  assert.deepEqual(authorisedIndustryPurchaseIds(canonical({ industryApps: [], premiumApps: [], status: "TRIALING" }), "org-a", now), []);
  assert.deepEqual(authorisedIndustryPurchaseIds(null, "org-a", now), []);
});

test("editable profile, plan preview, activation and enabled settings cannot imply a purchase", () => {
  const result = resolveIndustryEntitlements({
    enabledAppIds: ["finance"],
    planPreviewIndustryApps: ["finance"],
    industrySettings: { templates: { mortgage_broking: { active: true } } },
  });
  assert.equal(result.industries.find((item) => item.industryId === "finance")?.entitled, false);
  assert.equal(hasAdvancedCommsEntitlement({}), false);
  assert.equal(hasAdvancedCommsEntitlement({ staffBypass: true }), true);
  assert.equal(hasAdvancedCommsEntitlement({ purchasedPremiumKeys: ["voice_ai"] }), true);
});
