import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { computePortalSetup } from "../packages/platform-core/src/org/portal-profile.ts";

const completeProfile = { businessName: "Test organisation", contactEmail: "owner@example.test" };
const canonical = (status, entitlement, platformExempt = false) => ({ status, entitlement, platformExempt });
const setup = ({ orgStatus = "active", profile = completeProfile, billing = {}, subscription = null } = {}) =>
  computePortalSetup({ orgStatus, profile, billing, subscription });

test("canonical non-exempt subscription overrides stale settings exemption", () => {
  const result = setup({
    billing: { platformExempt: true, subscriptionStatus: "active" },
    subscription: canonical("SUSPENDED", "READ_ONLY", false),
  });
  assert.equal(result.payment_done, false);
  assert.equal(result.platform_live, false);
});

test("canonical exemption remains valid when its organisation setting is absent", () => {
  const result = setup({ subscription: canonical("CANCELLED", "NONE", true) });
  assert.equal(result.payment_done, true);
  assert.equal(result.platform_live, true);
});

test("active organisation can be live with an authorised canonical exemption", () => {
  const result = setup({
    orgStatus: "active",
    subscription: canonical("CANCELLED", "NONE", true),
  });
  assert.equal(result.payment_done, true);
  assert.equal(result.platform_live, true);
});

test("suspended organisation stays offline despite an authorised exemption", () => {
  const result = setup({
    orgStatus: "suspended",
    subscription: canonical("CANCELLED", "NONE", true),
  });
  assert.equal(result.payment_done, true);
  assert.equal(result.platform_live, false);
});

test("suspended organisation stays offline with a paid subscription", () => {
  const result = setup({
    orgStatus: "suspended",
    subscription: canonical("ACTIVE", "FULL"),
  });
  assert.equal(result.payment_done, true);
  assert.equal(result.platform_live, false);
});

test("unpaid customer settings do not establish payment or platform activation", () => {
  const result = setup({ billing: { subscriptionStatus: "active" } });
  assert.equal(result.payment_done, false);
  assert.equal(result.platform_live, false);
});

test("verified trial with trial organisation status supports the existing lifecycle", () => {
  const result = setup({ orgStatus: "trial", subscription: canonical("TRIALING", "FULL") });
  assert.equal(result.payment_done, true);
  assert.equal(result.platform_live, true);
});

test("verified active subscription supports platform activation", () => {
  const result = setup({ subscription: canonical("ACTIVE", "FULL") });
  assert.equal(result.payment_done, true);
  assert.equal(result.platform_live, true);
});

test("unpaid Founding 10 prospect does not establish billing or activation", () => {
  const result = setup({
    billing: { foundingCustomer: true, programme: "founding", subscriptionStatus: "trialing" },
  });
  assert.equal(result.payment_done, false);
  assert.equal(result.platform_live, false);
});

test("checkout redirect or copied status without a subscription does not establish billing", () => {
  const result = setup({
    billing: { subscriptionStatus: "active", lastCheckoutAt: new Date().toISOString() },
  });
  assert.equal(result.payment_done, false);
  assert.equal(result.platform_live, false);
});

test("explicitly authorised settings-only exemption is supported before a canonical row exists", () => {
  const result = setup({ billing: { platformExempt: true } });
  assert.equal(result.payment_done, true);
  assert.equal(result.platform_live, true);
});

test("incomplete onboarding prevents activation despite verified billing", () => {
  const result = setup({
    profile: { businessName: "Test organisation" },
    subscription: canonical("ACTIVE", "FULL"),
  });
  assert.equal(result.payment_done, true);
  assert.equal(result.onboarding_done, false);
  assert.equal(result.platform_live, false);
});

test("an active canonical status with no entitlement fails closed", () => {
  const result = setup({ subscription: canonical("ACTIVE", "NONE") });
  assert.equal(result.payment_done, false);
  assert.equal(result.platform_live, false);
});

test("portal resolver reads canonical subscription fields and passes them to setup", () => {
  const source = fs.readFileSync(new URL("../packages/platform-core/src/org/portal-profile.ts", import.meta.url), "utf8");
  assert.match(source, /prisma\.platformSubscription\.findUnique\([\s\S]*select: \{ status: true, entitlement: true, platformExempt: true \}/);
  assert.match(source, /computePortalSetup\(\{[\s\S]*subscription,/);
});
