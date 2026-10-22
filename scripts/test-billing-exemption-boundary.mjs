import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { organisationExpectsPlatformBilling } from "../packages/platform-core/src/command-centre/success-score.ts";
import {
  isVerifiedStripeBilling,
  resolveOrganisationBillingKind,
} from "../packages/platform-core/src/billing/org-billing-status.ts";
import { resolveEntitlementForSubscription } from "../packages/platform-core/src/billing/entitlement-resolver.ts";

describe("billing exemption authorization boundary", () => {
  it("requires standard billing for ordinary and Founding 10 organisations", () => {
    assert.equal(organisationExpectsPlatformBilling({ settings: {} }), true);
    assert.equal(
      organisationExpectsPlatformBilling({
        settings: { billing: { foundingCustomer: true, programme: "founding" } },
      }),
      true,
    );
  });

  it("does not infer exemption from marketplace industry or digitalgate-* identity", () => {
    assert.equal(organisationExpectsPlatformBilling({ industry: "marketplace", settings: {} }), true);
    assert.equal(
      organisationExpectsPlatformBilling({ slug: "digitalgate-checkout-test", settings: {} }),
      true,
    );
  });

  it("does not accept the billing feature flag as exemption authority", () => {
    assert.equal(
      organisationExpectsPlatformBilling({
        settings: { featureFlags: { "billing.platform_exempt": true } },
      }),
      true,
    );
  });

  it("preserves an explicitly authorised billing exemption", () => {
    assert.equal(
      organisationExpectsPlatformBilling({ settings: { billing: { platformExempt: true } } }),
      false,
    );
    assert.equal(
      resolveOrganisationBillingKind({
        expectsPlatformBilling: false,
        hasStripeCustomer: false,
        foundingCustomer: false,
        status: "active",
        subscriptionStatus: null,
        entitlementsSuspended: false,
        commercialStatus: null,
      }),
      "platform_exempt",
    );
  });

  it("keeps unpaid standard organisations in checkout and without paid entitlements", () => {
    const expectsPlatformBilling = organisationExpectsPlatformBilling({
      slug: "digitalgate-new-prospect",
      industry: "marketplace",
      settings: { billing: { foundingCustomer: true } },
    });
    const kind = resolveOrganisationBillingKind({
      expectsPlatformBilling,
      hasStripeCustomer: false,
      foundingCustomer: true,
      status: "active",
      subscriptionStatus: null,
      entitlementsSuspended: false,
      commercialStatus: null,
    });
    assert.equal(kind, "needs_checkout");
    assert.equal(isVerifiedStripeBilling({ hasStripeCustomer: false, kind }), false);

    const entitlement = resolveEntitlementForSubscription("unpaid-org", null);
    assert.equal(entitlement.level, "NONE");
    assert.equal(entitlement.capabilities.canWrite, false);
    assert.equal(entitlement.capabilities.canActivatePaidApps, false);
  });
});
