/**
 * H-8 / H-7 regression.
 *
 * H-8: a tenant's Commerce customer failing an invoice could resolve the
 * tenant's organisation from `organisation_id` metadata and then drive the
 * tenant's own DigitalGate PlatformSubscription down the dunning ladder.
 *
 * H-7 coverage now lives in test-webhook-receipt-state.mjs, which supersedes
 * the release-on-failure wrapper with a full claim/processing/failed/stale
 * state machine.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const load = (rel) =>
  import(
    pathToFileURL(path.join(__dirname, "../packages/platform-core/src", rel)).href
  );

const TENANT = "org_tenant";
const OTHER = "org_other";
const PLATFORM_SUB = "sub_platform_dg";
const PLATFORM_CUS = "cus_platform_dg";
const COMMERCE_SUB = "sub_commerce_customer";
const COMMERCE_CUS = "cus_commerce_customer";

/**
 * Fake lookups. Deliberately keeps platform and commerce identifiers distinct
 * so a passing test cannot be an artefact of shared fixtures.
 */
function lookups(overrides = {}) {
  return {
    async commerceSubscriptionExists(id) {
      return id === COMMERCE_SUB;
    },
    async platformSubscriptionBySubscriptionId(id) {
      return id === PLATFORM_SUB ? { organisationId: TENANT } : null;
    },
    async platformSubscriptionByCustomerId(id) {
      return id === PLATFORM_CUS
        ? { organisationId: TENANT, stripeSubscriptionId: PLATFORM_SUB }
        : null;
    },
    async organisationExists(id) {
      return id === TENANT || id === OTHER;
    },
    ...overrides,
  };
}

describe("H-8: platform vs commerce billing identity", () => {
  it("1. platform subscription invoice is classified platform", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );
    const result = await classifyStripeBillingEvent(
      {
        organisationId: TENANT,
        stripeSubscriptionId: PLATFORM_SUB,
        stripeCustomerId: PLATFORM_CUS,
      },
      lookups(),
    );
    assert.equal(result.domain, "platform");
    assert.equal(result.organisationId, TENANT);
  });

  it("2. commerce customer invoice is not platform", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );
    const result = await classifyStripeBillingEvent(
      {
        stripeSubscriptionId: COMMERCE_SUB,
        stripeCustomerId: COMMERCE_CUS,
      },
      lookups(),
    );
    assert.equal(result.domain, "commerce");
    assert.equal(result.organisationId, undefined);
  });

  it("3. commerce invoice carrying the tenant's organisation_id is still not platform", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );
    // This is the exact shape of the original vulnerability.
    const result = await classifyStripeBillingEvent(
      {
        organisationId: TENANT,
        stripeSubscriptionId: COMMERCE_SUB,
        stripeCustomerId: COMMERCE_CUS,
      },
      lookups(),
    );
    assert.equal(result.domain, "commerce");
    assert.notEqual(result.organisationId, TENANT);
  });

  it("4. unknown customer does not drive platform dunning", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );
    const result = await classifyStripeBillingEvent(
      { stripeCustomerId: "cus_never_seen" },
      lookups(),
    );
    assert.equal(result.domain, "unknown");
  });

  it("5. mismatched subscription id does not qualify", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );
    const result = await classifyStripeBillingEvent(
      { organisationId: TENANT, stripeSubscriptionId: "sub_unknown_entirely" },
      lookups(),
    );
    assert.equal(result.domain, "unknown");
  });

  it("6. mismatched customer id does not qualify", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );
    const result = await classifyStripeBillingEvent(
      { organisationId: TENANT, stripeCustomerId: "cus_unknown_entirely" },
      lookups(),
    );
    assert.equal(result.domain, "unknown");
  });

  it("7. platform customer paying an unrelated commerce subscription is not platform", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );
    const result = await classifyStripeBillingEvent(
      {
        organisationId: TENANT,
        stripeCustomerId: PLATFORM_CUS,
        stripeSubscriptionId: "sub_some_other_thing",
      },
      lookups(),
    );
    assert.equal(result.domain, "commerce");
    assert.equal(result.reason, "platform_customer_with_foreign_subscription");
  });

  it("organisation metadata alone never proves platform billing", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );
    const result = await classifyStripeBillingEvent(
      { organisationId: TENANT },
      lookups(),
    );
    assert.equal(result.domain, "unknown");
    assert.equal(result.reason, "no_durable_platform_identifier");
  });

  it("platform metadata marker is accepted only for a real organisation", async () => {
    const { classifyStripeBillingEvent } = await load(
      "billing/platform-event-identity.ts",
    );

    const ok = await classifyStripeBillingEvent(
      { organisationId: TENANT, platformSubscriptionMarker: true },
      lookups(),
    );
    assert.equal(ok.domain, "platform");

    const bogus = await classifyStripeBillingEvent(
      { organisationId: "org_does_not_exist", platformTier: "professional" },
      lookups(),
    );
    assert.equal(bogus.domain, "unknown");
  });
});
