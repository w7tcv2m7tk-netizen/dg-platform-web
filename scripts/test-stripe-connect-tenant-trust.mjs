/**
 * Stripe external-account tenant trust boundary (F1/F2/F4).
 *
 * A Stripe Connect (connected-account) event may only mutate the DigitalGate
 * organisation that OWNS event.account in the trusted mapping. Tenant-controlled
 * subscription/invoice metadata must never select the tenant, and an unknown or
 * ambiguous external identifier must cause NO tenant mutation.
 *
 * Route handlers pull in next/server + the platform-core barrel and cannot load
 * in this harness, so the trusted resolver + commerce sync are proven
 * behaviourally, and the webhook routing/gating is locked with source assertions
 * (the pattern already used elsewhere in this suite).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const load = (rel) => import(pathToFileURL(path.join(root, "packages/platform-core/src", rel)).href);
const readSrc = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

const sub = (metadata) => ({ metadata });

describe("trusted mapping: resolveOrganisationIdByConnectAccount (fail-safe)", () => {
  it("resolves a single owner from the mapping", async () => {
    const { resolveOrganisationIdByConnectAccount } = await load("referrals/stripe-connect.ts");
    const owner = await resolveOrganisationIdByConnectAccount("acct_owner", async () => [
      { id: "org_owner" },
    ]);
    assert.equal(owner, "org_owner");
  });

  it("unknown Connect account => null (no tenant)", async () => {
    const { resolveOrganisationIdByConnectAccount } = await load("referrals/stripe-connect.ts");
    assert.equal(await resolveOrganisationIdByConnectAccount("acct_unknown", async () => []), null);
  });

  it("ambiguous Connect account (>1 org) => null (fail safe, not arbitrary)", async () => {
    const { resolveOrganisationIdByConnectAccount } = await load("referrals/stripe-connect.ts");
    assert.equal(
      await resolveOrganisationIdByConnectAccount("acct_dup", async () => [{ id: "a" }, { id: "b" }]),
      null,
    );
  });

  it("empty / missing account id => null", async () => {
    const { resolveOrganisationIdByConnectAccount } = await load("referrals/stripe-connect.ts");
    assert.equal(await resolveOrganisationIdByConnectAccount("", async () => [{ id: "x" }]), null);
    assert.equal(await resolveOrganisationIdByConnectAccount(undefined), null);
    assert.equal(await resolveOrganisationIdByConnectAccount(null), null);
  });
});

describe("commerce sync no longer selects a tenant from Stripe metadata", () => {
  it("no trusted org supplied => missing_organisation_id even with metadata.organisation_id", async () => {
    const { syncCommerceSubscriptionFromStripe } = await load("commerce/subscription-sync.ts");
    const result = await syncCommerceSubscriptionFromStripe({
      subscription: sub({ organisation_id: "org_meta", dg_commerce_subscription: "true" }),
    });
    assert.deepEqual(result, { ok: false, reason: "missing_organisation_id" });
  });

  it("non-commerce subscription => not_commerce_subscription", async () => {
    const { syncCommerceSubscriptionFromStripe } = await load("commerce/subscription-sync.ts");
    const result = await syncCommerceSubscriptionFromStripe({
      subscription: sub({ dg_platform_tier: "professional" }),
      organisationId: "org_owner",
    });
    assert.deepEqual(result, { ok: false, reason: "not_commerce_subscription" });
  });
});

// Mirror of the handleStripeEvent subscription decision AFTER this change.
async function decideSubscription({ onConnectedAccount, connectAccountId, subscription, ownerFinder }) {
  const { isPlatformSubscription } = await load("billing/platform-stripe.ts");
  const { isCommerceCustomerSubscription } = await load("commerce/subscription-sync.ts");
  const { resolveOrganisationIdByConnectAccount } = await load("referrals/stripe-connect.ts");

  if (!onConnectedAccount && isPlatformSubscription(subscription)) {
    return { bucket: "platform" };
  }
  if (onConnectedAccount) {
    const owner = await resolveOrganisationIdByConnectAccount(connectAccountId, ownerFinder);
    if (!owner) return { bucket: "skip", reason: "unknown_connect_account" };
    return { bucket: "commerce", organisationId: owner };
  }
  if (isCommerceCustomerSubscription(subscription)) {
    return { bucket: "commerce_platform_account" };
  }
  return { bucket: "none" };
}

describe("connected-account subscription routing uses the trusted owner, never metadata", () => {
  it("platform account + explicit marker => platform (H-8 preserved)", async () => {
    const d = await decideSubscription({
      onConnectedAccount: false,
      subscription: sub({ dg_platform_tier: "professional", organisation_id: "org_op" }),
    });
    assert.deepEqual(d, { bucket: "platform" });
  });

  it("connected account with FORGED metadata.organisation_id => commerce for the ACCOUNT OWNER, not the metadata org", async () => {
    const d = await decideSubscription({
      onConnectedAccount: true,
      connectAccountId: "acct_owner",
      subscription: sub({ organisation_id: "org_victim", dg_platform_subscription: "true" }),
      ownerFinder: async () => [{ id: "org_owner" }],
    });
    assert.deepEqual(d, { bucket: "commerce", organisationId: "org_owner" });
    assert.notEqual(d.organisationId, "org_victim");
  });

  it("connected account that is UNKNOWN in the mapping => no mutation (skip); metadata org is not used", async () => {
    const d = await decideSubscription({
      onConnectedAccount: true,
      connectAccountId: "acct_unmapped",
      subscription: sub({ organisation_id: "org_victim" }),
      ownerFinder: async () => [],
    });
    assert.deepEqual(d, { bucket: "skip", reason: "unknown_connect_account" });
  });

  it("connected account that is AMBIGUOUS => no mutation (skip)", async () => {
    const d = await decideSubscription({
      onConnectedAccount: true,
      connectAccountId: "acct_dup",
      subscription: sub({ organisation_id: "org_victim" }),
      ownerFinder: async () => [{ id: "a" }, { id: "b" }],
    });
    assert.equal(d.bucket, "skip");
  });

  it("platform-account commerce subscription (server-set metadata) => commerce on platform account", async () => {
    const d = await decideSubscription({
      onConnectedAccount: false,
      subscription: sub({ organisation_id: "org_tenant" }),
    });
    assert.deepEqual(d, { bucket: "commerce_platform_account" });
  });
});

describe("webhook route source: connect-account gating (F1/F4) and fail-safe lookups (F2)", () => {
  const routeSrc = readSrc("src/app/api/webhooks/stripe/route.ts");

  it("connected-account invoices are skipped before referral/partner accrual", () => {
    const skipIdx = routeSrc.indexOf('skipped: "connected_account_invoice"');
    const referralIdx = routeSrc.indexOf("accrueMonthlyReferralCreditFromInvoice(");
    const partnerIdx = routeSrc.indexOf("accruePartnerCommissionFromInvoice(");
    assert.ok(skipIdx !== -1, "invoice.paid skips connected-account invoices");
    assert.ok(skipIdx < referralIdx, "skip precedes referral accrual");
    assert.ok(skipIdx < partnerIdx, "skip precedes partner accrual");
    // The connected-account guard sits at the top of the invoice.paid handler.
    assert.match(
      routeSrc,
      /event\.type === "invoice\.paid"[\s\S]{0,400}if \(event\.connectAccountId\)[\s\S]{0,200}connected_account_invoice/,
    );
  });

  it("connected-account subscriptions resolve the owner from the trusted mapping, not metadata", () => {
    assert.match(routeSrc, /else if \(onConnectedAccount\)[\s\S]{0,400}resolveOrganisationIdByConnectAccount\(/);
    assert.match(routeSrc, /unknown_connect_account/);
  });

  it("H-8 platform gate is preserved (platform only on !onConnectedAccount + marker)", () => {
    assert.match(routeSrc, /!onConnectedAccount && isPlatformSubscription\(subscription\)/);
  });

  it("resolveOrgIdFromStripeCustomer fails safe on ambiguity (take: 2, single match)", () => {
    assert.match(routeSrc, /findMany\([\s\S]{0,120}billingCustomerId[\s\S]{0,80}take:\s*2/);
    assert.match(routeSrc, /orgs\.length === 1 \? orgs\[0\]\.id : undefined/);
  });
});

describe("platform store + schema: 1:1 external-id mappings", () => {
  it("getPlatformSubscriptionByStripe* fail safe on ambiguity", () => {
    const storeSrc = readSrc("packages/platform-core/src/billing/subscription-store.ts");
    assert.match(storeSrc, /stripeCustomerId[\s\S]{0,120}take:\s*2/);
    assert.match(storeSrc, /stripeSubscriptionId[\s\S]{0,120}take:\s*2/);
    assert.match(storeSrc, /rows\.length === 1 \? mapRow\(rows\[0\]\) : null/);
  });

  it("schema enforces unique trusted mappings", () => {
    const schema = readSrc("packages/database/prisma/schema.prisma");
    assert.match(schema, /stripeConnectAccountId String\? @unique/);
    assert.match(schema, /billingCustomerId String\? @unique/);
    assert.match(schema, /stripeCustomerId\s+String\?\s+@unique/);
    assert.match(schema, /stripeSubscriptionId String\?\s+@unique/);
  });
});
