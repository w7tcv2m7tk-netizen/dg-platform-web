/**
 * Advisor billing footing assertions.
 * Run: npx tsx scripts/test-advisor-billing.mjs
 */
import assert from "node:assert/strict";
import { assessBillingFooting } from "../packages/platform-core/src/command-centre/advisor-billing.ts";

const trial = assessBillingFooting({
  status: "trial",
  expectsPlatformBilling: true,
  hasBillingCustomer: false,
  activeSubscriptionCount: 0,
  invoicePaidMtdCents: 0,
  subscriptionMrrCents: 0,
});
assert.equal(trial.state, "healthy_trial");
assert.equal(trial.needsIntervention, false);

const active = assessBillingFooting({
  status: "active",
  expectsPlatformBilling: true,
  hasBillingCustomer: true,
  activeSubscriptionCount: 1,
  invoicePaidMtdCents: 0,
  subscriptionMrrCents: 24900,
});
assert.equal(active.state, "active_paid");
assert.equal(active.needsIntervention, false);

const noCustomer = assessBillingFooting({
  status: "active",
  expectsPlatformBilling: true,
  hasBillingCustomer: false,
  activeSubscriptionCount: 0,
  invoicePaidMtdCents: 0,
  subscriptionMrrCents: 0,
});
assert.equal(noCustomer.state, "no_customer");
assert.equal(noCustomer.needsIntervention, true);

const exempt = assessBillingFooting({
  status: "active",
  expectsPlatformBilling: false,
  hasBillingCustomer: false,
  activeSubscriptionCount: 0,
  invoicePaidMtdCents: 0,
  subscriptionMrrCents: 0,
});
assert.equal(exempt.state, "exempt");
assert.equal(exempt.needsIntervention, false);

console.log("advisor-billing: all assertions passed");
