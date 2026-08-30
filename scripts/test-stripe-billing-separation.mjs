/**
 * H-8 / H-7 regression.
 *
 * H-8: a tenant's Commerce customer failing an invoice could resolve the
 * tenant's organisation from `organisation_id` metadata and then drive the
 * tenant's own DigitalGate PlatformSubscription down the dunning ladder.
 *
 * H-7: the webhook receipt was claimed before the handler ran and never
 * released, so a handler failure returned 400, Stripe retried, the retry was
 * rejected as a duplicate with 200, and the event was permanently lost.
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

describe("H-7: webhook idempotency state machine", () => {
  /** In-memory receipt table with the same unique-eventId semantics. */
  function receiptStore() {
    const rows = new Set();
    return {
      rows,
      claim: (id) => async () =>
        rows.has(id) ? { claimed: false } : (rows.add(id), { claimed: true }),
      release: (id) => async () => {
        rows.delete(id);
      },
    };
  }

  it("first delivery processes the event", async () => {
    const { withWebhookIdempotency } = await load("billing/webhook-idempotency.ts");
    const store = receiptStore();
    let calls = 0;

    const result = await withWebhookIdempotency({
      claim: store.claim("evt_1"),
      release: store.release("evt_1"),
      handle: async () => {
        calls += 1;
        return "processed";
      },
      onDuplicate: () => "duplicate",
    });

    assert.equal(result, "processed");
    assert.equal(calls, 1);
    assert.equal(store.rows.has("evt_1"), true);
  });

  it("duplicate after success does not process twice", async () => {
    const { withWebhookIdempotency } = await load("billing/webhook-idempotency.ts");
    const store = receiptStore();
    let calls = 0;
    const run = () =>
      withWebhookIdempotency({
        claim: store.claim("evt_2"),
        release: store.release("evt_2"),
        handle: async () => {
          calls += 1;
          return "processed";
        },
        onDuplicate: () => "duplicate",
      });

    assert.equal(await run(), "processed");
    assert.equal(await run(), "duplicate");
    assert.equal(calls, 1);
  });

  it("handler failure releases the claim so the event stays retryable", async () => {
    const { withWebhookIdempotency } = await load("billing/webhook-idempotency.ts");
    const store = receiptStore();

    await assert.rejects(
      withWebhookIdempotency({
        claim: store.claim("evt_3"),
        release: store.release("evt_3"),
        handle: async () => {
          throw new Error("downstream failed");
        },
        onDuplicate: () => "duplicate",
      }),
      /downstream failed/,
    );

    assert.equal(
      store.rows.has("evt_3"),
      false,
      "claim must be released so Stripe's retry is not treated as a duplicate",
    );
  });

  it("retry after failure succeeds and processes exactly once", async () => {
    const { withWebhookIdempotency } = await load("billing/webhook-idempotency.ts");
    const store = receiptStore();
    let attempts = 0;

    const run = () =>
      withWebhookIdempotency({
        claim: store.claim("evt_4"),
        release: store.release("evt_4"),
        handle: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("transient");
          return "processed";
        },
        onDuplicate: () => "duplicate",
      });

    await assert.rejects(run(), /transient/);
    assert.equal(await run(), "processed");
    assert.equal(attempts, 2);
    assert.equal(store.rows.has("evt_4"), true);
  });

  it("concurrent duplicates do not both execute the handler", async () => {
    const { withWebhookIdempotency } = await load("billing/webhook-idempotency.ts");
    const store = receiptStore();
    let concurrent = 0;
    let maxConcurrent = 0;
    let calls = 0;

    const run = () =>
      withWebhookIdempotency({
        claim: store.claim("evt_5"),
        release: store.release("evt_5"),
        handle: async () => {
          calls += 1;
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise((r) => setTimeout(r, 10));
          concurrent -= 1;
          return "processed";
        },
        onDuplicate: () => "duplicate",
      });

    const results = await Promise.all([run(), run(), run()]);
    assert.equal(calls, 1);
    assert.equal(maxConcurrent, 1);
    assert.deepEqual(results.sort(), ["duplicate", "duplicate", "processed"]);
  });

  it("a release failure does not mask the original handler error", async () => {
    const { withWebhookIdempotency } = await load("billing/webhook-idempotency.ts");
    let released = false;

    await assert.rejects(
      withWebhookIdempotency({
        claim: async () => ({ claimed: true }),
        release: async () => {
          throw new Error("release blew up");
        },
        handle: async () => {
          throw new Error("original failure");
        },
        onDuplicate: () => "duplicate",
        onReleaseFailed: () => {
          released = true;
        },
      }),
      /original failure/,
    );

    assert.equal(released, true);
  });
});
