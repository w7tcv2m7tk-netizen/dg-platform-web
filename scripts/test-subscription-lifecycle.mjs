import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function load() {
  return import(
    pathToFileURL(
      path.join(
        __dirname,
        "../packages/platform-core/src/billing/subscription-types.ts",
      ),
    ).href
  );
}

describe("subscription entitlement matrix", () => {
  it("maps commercial states to entitlement levels", async () => {
    const {
      entitlementFromCommercialStatus,
      capabilitiesForEntitlement,
      dunningStatusForAgeDays,
      buildBillingBanner,
    } = await load();

    assert.equal(entitlementFromCommercialStatus("TRIALING"), "FULL");
    assert.equal(entitlementFromCommercialStatus("ACTIVE"), "FULL");
    assert.equal(
      entitlementFromCommercialStatus("PAYMENT_FAILED"),
      "FULL_WITH_WARNING",
    );
    assert.equal(entitlementFromCommercialStatus("PAST_DUE"), "MOSTLY_FULL");
    assert.equal(entitlementFromCommercialStatus("RESTRICTED"), "MOSTLY_FULL");
    assert.equal(entitlementFromCommercialStatus("SUSPENDED"), "READ_ONLY");
    assert.equal(
      entitlementFromCommercialStatus("CANCEL_AT_PERIOD_END"),
      "FULL",
    );
    assert.equal(entitlementFromCommercialStatus("CANCELLED"), "NONE");

    assert.equal(
      entitlementFromCommercialStatus("SUSPENDED", { foundingOrExempt: true }),
      "FULL",
    );

    const warning = capabilitiesForEntitlement("FULL_WITH_WARNING");
    assert.equal(warning.canWrite, true);
    assert.equal(warning.canActivatePaidApps, true);

    const mostly = capabilitiesForEntitlement("MOSTLY_FULL");
    assert.equal(mostly.canWrite, true);
    assert.equal(mostly.canActivatePaidApps, false);
    assert.equal(mostly.canUseAi, false);

    const readOnly = capabilitiesForEntitlement("READ_ONLY");
    assert.equal(readOnly.canWrite, false);
    assert.equal(readOnly.canExport, true);
    assert.equal(readOnly.canBilling, true);

    assert.equal(dunningStatusForAgeDays(0), "PAYMENT_FAILED");
    assert.equal(dunningStatusForAgeDays(6), "PAYMENT_FAILED");
    assert.equal(dunningStatusForAgeDays(7), "PAST_DUE");
    assert.equal(dunningStatusForAgeDays(14), "RESTRICTED");
    assert.equal(dunningStatusForAgeDays(21), "SUSPENDED");

    const banner = buildBillingBanner({
      level: "FULL_WITH_WARNING",
      commercialStatus: "PAYMENT_FAILED",
      foundingOrExempt: false,
      trialEnd: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      planTier: "professional",
    });
    assert.equal(banner.kind, "payment_failed");
    assert.match(banner.body, /fully operational/i);
  });
});
