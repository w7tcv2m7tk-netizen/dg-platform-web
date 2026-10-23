import assert from "node:assert/strict";
import test from "node:test";

import { isIndustryAppPurchased, industryAppAccessDecision, authorisedPremiumPurchaseKeys } from "../packages/platform-core/src/industry/purchase-authority.ts";
import { sessionHasFeature } from "../packages/platform-core/src/features/access.ts";
import { industryAppForProtectedApiPath, paidAppForProtectedApiPath } from "../src/lib/industry-api-access-policy.ts";
import { expectedPurchasedLineItems, stripeItemsMatchPurchasedSelections } from "../packages/platform-core/src/billing/purchased-line-items.ts";

const now = new Date("2026-10-18T00:00:00.000Z");
const sub = (overrides = {}) => ({
  organisationId: "org-a", industryApps: ["real-estate", "accommodation", "automotive", "creator"],
  premiumApps: ["growth_suite", "voice_ai"], status: "ACTIVE", entitlement: "FULL",
  stripeStatus: "active", stripeSubscriptionId: "sub-a", stripeCustomerId: "cus-a",
  trialEnd: null, currentPeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
  gracePeriodEndsAt: null, cancelAtPeriodEnd: false, ...overrides,
});
const session = (overrides = {}) => ({
  clerkUserId: "user-a", email: "a@example.test", name: "A", organisationId: "org-a",
  organisationName: "A", organisationSlug: "a", membershipId: "m-a", role: "owner",
  dbConfigured: true, organisations: [], industryPurchaseIds: [], premiumPurchaseKeys: [], ...overrides,
});

test("forged profile and Gen 2 app selections do not become premium authority", () => {
  // Session entitlement fields are server-projected from PlatformSubscription;
  // client-writable purchasedPremium / premiumApps are deliberately absent.
  const unpaid = session({ premiumPurchaseKeys: [] });
  assert.equal(sessionHasFeature(unpaid, "marketing.read"), false);
  assert.equal(sessionHasFeature(unpaid, "comms.voice.inbound"), false);
  assert.equal(sessionHasFeature(unpaid, "comms.inbox.read"), true);
});

test("Growth Suite and voice purchases authorize only their mapped paid features", () => {
  const entitled = session({ premiumPurchaseKeys: authorisedPremiumPurchaseKeys(sub(), "org-a", now) });
  assert.equal(sessionHasFeature(entitled, "marketing.read"), true);
  assert.equal(sessionHasFeature(entitled, "automation.write"), true);
  assert.equal(sessionHasFeature(entitled, "comms.voice.inbound"), true);
  assert.equal(sessionHasFeature(entitled, "comms.ai.coaching.read"), true);
  assert.equal(sessionHasFeature(session({ premiumPurchaseKeys: ["marketing_pro"] }), "comms.voice.inbound"), false);
});

test("specific Industry Apps require an exact canonical child purchase and tenant match", () => {
  const row = sub({ premiumApps: [], industryApps: ["real-estate"] });
  for (const appId of ["real-estate"]) assert.equal(isIndustryAppPurchased(row, "org-a", appId, now), true);
  for (const appId of ["accommodation", "automotive", "creator"]) assert.equal(isIndustryAppPurchased(row, "org-a", appId, now), false);
  assert.equal(isIndustryAppPurchased(row, "org-b", "real-estate", now), false);
  assert.equal(isIndustryAppPurchased(null, "org-a", "real-estate", now), false);
});

test("Industry App purchase, beta enrolment and selection remain independent requirements", () => {
  const authority = sub({ premiumApps: [], industryApps: ["real-estate"] });
  const base = { authority, organisationId: "org-a", appId: "real-estate", selectedForOrganisation: true, now };
  assert.equal(industryAppAccessDecision({ ...base, betaEnrolled: false }), "beta_required");
  assert.equal(industryAppAccessDecision({ ...base, betaEnrolled: true, selectedForOrganisation: false }), "industry_app_not_selected");
  assert.equal(industryAppAccessDecision({ ...base, betaEnrolled: true }), "allowed");
  assert.equal(industryAppAccessDecision({ ...base, authority: null, betaEnrolled: true }), "industry_app_purchase_required");
});

test("all requested Industry App page/API purchase decisions recognize exact canonical purchases", () => {
  for (const [appId, path] of [
    ["real-estate", "/api/v1/re/bookings"],
    ["real-estate", "/api/v1/properties/p-1"],
    ["accommodation", "/api/v1/accommodation?resource=units"],
    ["automotive", "/apps/automotive"],
    ["creator", "/apps/creator"],
  ]) {
    const requiredApp = path.startsWith("/api") ? industryAppForProtectedApiPath(new URL(path, "https://local.test").pathname) : appId;
    if (path.startsWith("/api")) assert.equal(requiredApp, appId);
    assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: [appId] }), "org-a", requiredApp, now), true);
    assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: [] }), "org-a", requiredApp, now), false);
  }
});

test("industry API path resolver excludes unrelated platform APIs", () => {
  assert.equal(industryAppForProtectedApiPath("/api/v1/contacts"), null);
  assert.equal(industryAppForProtectedApiPath("/api/v1/command/growth/reports"), null);
  assert.equal(industryAppForProtectedApiPath("/api/v1/migrations/wordpress/accommodation/import"), "accommodation");
  assert.equal(industryAppForProtectedApiPath("/api/v1/connectors/corelogic/status"), "real-estate");
});

test("direct paid Growth API namespaces resolve to canonical SKU gates", () => {
  for (const appId of ["advertising", "marketing", "prospecting", "ai-visibility", "seo", "automation", "analytics", "social"]) {
    assert.equal(paidAppForProtectedApiPath(`/api/v1/${appId}/resource`), appId);
    assert.equal(sessionHasFeature(session({ premiumPurchaseKeys: [] }), `${appId}.read`), false);
    assert.equal(sessionHasFeature(session({ premiumPurchaseKeys: ["growth_suite"] }), `${appId}.read`), true);
  }
  assert.equal(paidAppForProtectedApiPath("/api/v1/communications/messages"), null);
});

test("eligible lifecycle states are explicit and revoked or unknown states fail closed", () => {
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "ACTIVE", stripeStatus: "active" }), "org-a", "real-estate", now), true);
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "PAYMENT_FAILED", stripeStatus: "past_due", gracePeriodEndsAt: new Date("2026-10-19T00:00:00Z") }), "org-a", "real-estate", now), true);
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "PAYMENT_FAILED", stripeStatus: "past_due", gracePeriodEndsAt: new Date("2026-10-17T00:00:00Z") }), "org-a", "real-estate", now), false);
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "CANCELLED", stripeStatus: "canceled" }), "org-a", "real-estate", now), false);
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "MYSTERY" }), "org-a", "real-estate", now), false);
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "CANCELLED", stripeStatus: "canceled" }), "org-a", "real-estate", now), false);
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "SUSPENDED" }), "org-a", "real-estate", now), false);
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "PAST_DUE", stripeStatus: "past_due", gracePeriodEndsAt: new Date("2026-10-19T00:00:00Z") }), "org-a", "real-estate", now), true);
  assert.equal(isIndustryAppPurchased(sub({ premiumApps: [], industryApps: ["real-estate"], status: "PAST_DUE", stripeStatus: "past_due", gracePeriodEndsAt: new Date("2026-10-17T00:00:00Z") }), "org-a", "real-estate", now), false);
});

test("Stripe purchase projections require exact catalogue line items and reject metadata-only grants", () => {
  const selection = { platformTier: "professional", industryApps: ["real-estate", "property-management"], premiumApps: ["growth_suite", "automation_pro"], supportPlan: "standard", cadence: "monthly" };
  const expected = expectedPurchasedLineItems(selection);
  const stripeItems = expected.map((line) => ({ quantity: 1, price: {
    unit_amount: line.amountCents, currency: "aud", recurring: { interval: "month", interval_count: 1 },
    product: { name: line.name },
  } }));
  assert.equal(stripeItemsMatchPurchasedSelections(stripeItems, selection), true);
  assert.equal(stripeItemsMatchPurchasedSelections(stripeItems.slice(0, -1), selection), false);
  const wrongPrice = stripeItems.map((item, index) => index === 1 ? { ...item, price: { ...item.price, unit_amount: item.price.unit_amount + 1 } } : item);
  assert.equal(stripeItemsMatchPurchasedSelections(wrongPrice, selection), false);
  assert.equal(stripeItemsMatchPurchasedSelections(stripeItems, { ...selection, industryApps: ["real-estate", "not-a-product"] }), false);
});
