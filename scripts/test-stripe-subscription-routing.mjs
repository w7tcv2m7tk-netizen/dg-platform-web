/**
 * H-8 Stripe subscription routing integrity.
 *
 * Trust model:
 *  1. Platform account + explicit platform marker  → PlatformSubscription state machine.
 *  2. Connected/Stripe Connect account             → Commerce, regardless of copied platform metadata.
 *  3. No explicit platform marker                  → not a platform subscription.
 *  4. The same account-context rule applies to invoice.paid (and the sibling
 *     invoice.payment_failed/action_required platform-writing path).
 *
 * Only an explicitly identified DigitalGate PLATFORM subscription may enter the
 * PlatformSubscription state machine; commerce/customer subscriptions stay
 * commerce even if they carry an organisation id or copied platform metadata.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const load = (rel) => import(pathToFileURL(path.join(root, "packages/platform-core/src", rel)).href);

const sub = (metadata) => ({ metadata });

// Mirrors the routing decision in handleStripeEvent (src/app/api/webhooks/stripe/route.ts):
//   platform  = !onConnectedAccount && isPlatformSubscription(subscription)
//   commerce  = onConnectedAccount || isCommerceCustomerSubscription(subscription)
async function route(onConnectedAccount, subscription) {
  const { isPlatformSubscription } = await load("billing/platform-stripe.ts");
  const { isCommerceCustomerSubscription } = await load("commerce/subscription-sync.ts");
  if (!onConnectedAccount && isPlatformSubscription(subscription)) return "platform";
  if (onConnectedAccount || isCommerceCustomerSubscription(subscription)) return "commerce";
  return "none";
}

describe("H-8 discriminators", () => {
  it("isPlatformSubscription requires an explicit platform marker", async () => {
    const { isPlatformSubscription } = await load("billing/platform-stripe.ts");
    assert.equal(isPlatformSubscription(sub({ dg_platform_tier: "professional" })), true);
    assert.equal(isPlatformSubscription(sub({ dg_platform_subscription: "true" })), true);
    assert.equal(isPlatformSubscription(sub({ organisation_id: "org_x" })), false);
    assert.equal(isPlatformSubscription(sub({})), false);
  });

  it("isCommerceCustomerSubscription: platform metadata is not commerce; org-tagged is", async () => {
    const { isCommerceCustomerSubscription } = await load("commerce/subscription-sync.ts");
    assert.equal(isCommerceCustomerSubscription(sub({ dg_platform_tier: "professional" })), false);
    assert.equal(isCommerceCustomerSubscription(sub({ dg_commerce_subscription: "true" })), true);
    assert.equal(isCommerceCustomerSubscription(sub({ organisation_id: "org_x" })), true);
    assert.equal(isCommerceCustomerSubscription(sub({})), false);
  });
});

describe("H-8 routing invariant", () => {
  it("platform account + explicit marker → platform state machine", async () => {
    assert.equal(await route(false, sub({ dg_platform_tier: "professional", organisation_id: "org_op" })), "platform");
    assert.equal(await route(false, sub({ dg_platform_subscription: "true", organisation_id: "org_op" })), "platform");
  });

  it("Connect account + copied platform metadata + org id → COMMERCE, never platform", async () => {
    // The critical case: a tenant's own commerce subscription that copies platform metadata.
    assert.equal(await route(true, sub({ dg_platform_tier: "professional", organisation_id: "org_tenant" })), "commerce");
    assert.equal(await route(true, sub({ dg_platform_subscription: "true", organisation_id: "org_tenant" })), "commerce");
  });

  it("Connect account without platform metadata → commerce", async () => {
    assert.equal(await route(true, sub({ organisation_id: "org_tenant" })), "commerce");
    assert.equal(await route(true, sub({ dg_commerce_subscription: "true" })), "commerce");
  });

  it("platform account, no explicit marker → not platform (commerce/customer or none)", async () => {
    assert.equal(await route(false, sub({ organisation_id: "org_tenant" })), "commerce");
    assert.equal(await route(false, sub({})), "none");
  });
});
