import assert from "node:assert/strict";
import { test } from "node:test";
import { reconcileLegacyCheckoutInventory } from "../packages/platform-core/src/billing/legacy-checkout-inventory.ts";

const session = (extra = {}) => ({ id: "cs_private", mode: "subscription", livemode: false, status: "expired", expires_at: 500,
  customer: null, subscription: null, metadata: { dg_platform_checkout: "true", organisation_id: "org_private", contact_email: "private@example.test" },
  customer_email: "private@example.test", url: "https://private.example.test", ...extra });
function harness(sessions = [session()]) {
  let gateReads = 0;
  const calls = [];
  const h = {
    gate: { blocked: true, revision: 3, lastAdmissionExpiresAt: 100, databaseNow: 1000 },
    owner: { billingCustomerId: "cus_owned", subscription: { stripeSubscriptionId: "sub_owned", stripeCustomerId: "cus_owned", stripeStatus: "trialing" } },
    subscription: { id: "sub_owned", livemode: false, customer: "cus_owned", status: "trialing", metadata: { organisation_id: "org_private" } },
    pages: [{ data: sessions, has_more: false }],
    calls,
  };
  h.input = { expectedAccount: "acct_expected", mode: "test", maxPages: 20, now: () => 1000,
    database: { gate: async () => { gateReads++; return h.changeGate && gateReads > 1 ? { ...h.gate, revision: 4 } : h.gate; }, owner: async () => h.owner },
    stripe: { accounts: { retrieve: async () => ({ id: h.account ?? "acct_expected" }) }, balance: { retrieve: async () => ({ livemode: h.live ?? false }) },
      subscriptions: { retrieve: async () => { if (h.failSubscription) throw new Error("SECRET"); return h.subscription; } },
      checkout: { sessions: {
        list: async params => { calls.push(params); if (h.failList) throw new Error("SECRET"); return h.pages.shift(); },
        retrieve: async id => { if (h.failRetrieve) throw new Error("SECRET"); return sessions.find(s => s.id === id); },
        create: () => { throw new Error("Mutation forbidden"); }, expire: () => { throw new Error("Mutation forbidden"); },
      } },
    },
  };
  return h;
}
const run = h => reconcileLegacyCheckoutInventory(h.input);

test("full account inventory with expired owned sessions is confident, never authorizes rollout", async () => {
  const h = harness(); const r = await run(h);
  assert.equal(r.inventoryConfidence, true); assert.equal(r.readyForCoordinator, false); assert.equal(r.counts.expired, 1);
  assert.deepEqual(h.calls, [{ limit: 100 }]);
  const output = JSON.stringify(r);
  for (const sensitive of ["org_private", "cs_private", "private@example", "https://private", "SECRET"]) assert.ok(!output.includes(sensitive));
});
test("open session without Customer stays open even after its expiry clock", async () => {
  const r = await run(harness([session({ status: "open" })]));
  assert.equal(r.counts.open, 1); assert.ok(r.blockers.includes("existing_open_session")); assert.equal(r.inventoryConfidence, false);
});
test("completed purchase awaits existing canonical webhook projection", async () => {
  const h = harness([session({ status: "complete", customer: "cus_owned", subscription: "sub_owned" })]);
  h.owner.subscription = null;
  const r = await run(h); assert.ok(r.blockers.includes("completed_purchase_unconfirmed"));
});
test("completed purchase with exact provider and canonical identity is confirmed", async () => {
  const h = harness([session({ status: "complete", customer: "cus_owned", subscription: "sub_owned" })]);
  const r = await run(h); assert.equal(r.inventoryConfidence, true); assert.equal(r.counts.complete, 1);
});
for (const change of [h => h.owner = null, h => h.owner.billingCustomerId = "cus_foreign", h => h.subscription.metadata.organisation_id = "foreign", h => h.subscription.livemode = true,
  h => h.owner.subscription.stripeSubscriptionId = "sub_other", h => h.owner.subscription.stripeStatus = "active", h => h.subscription.customer = "cus_other"]) {
  test("unknown/conflicting completed ownership fails closed", async () => {
    const h = harness([session({ status: "complete", customer: "cus_owned", subscription: "sub_owned" })]); change(h);
    assert.equal((await run(h)).inventoryConfidence, false);
  });
}
test("pagination walks all statuses with no customer filter", async () => {
  const a = session({ id: "cs_a" }), b = session({ id: "cs_b" }); const h = harness([a, b]);
  h.pages = [{ data: [a], has_more: true }, { data: [b], has_more: false }];
  const r = await run(h); assert.equal(r.inventoryConfidence, true); assert.equal(r.scanned, 2); assert.equal(h.calls[1].starting_after, "cs_a");
});
test("page bound never proves inventory complete", async () => {
  const h = harness(); h.pages[0].has_more = true; h.input.maxPages = 1;
  const r = await run(h); assert.equal(r.inventoryComplete, false); assert.ok(r.blockers.includes("inventory_incomplete"));
});
for (const flag of ["failList", "failRetrieve", "failSubscription"]) {
  test(`${flag} fails closed and redacts API errors`, async () => {
    const h = harness([session({ status: "complete", customer: "cus_owned", subscription: "sub_owned" })]); h[flag] = true;
    const r = await run(h); assert.equal(r.inventoryComplete, false); assert.equal(r.inventoryConfidence, false); assert.ok(!JSON.stringify(r).includes("SECRET"));
  });
}
for (const change of [h => h.account = "acct_wrong", h => h.live = true, h => h.gate = null, h => h.gate.blocked = false,
  h => h.gate.lastAdmissionExpiresAt = 1000, h => h.changeGate = true]) {
  test("scope, active admission, reopening or missing gate prevents confidence", async () => {
    const h = harness(); change(h); assert.equal((await run(h)).inventoryConfidence, false);
  });
}
test("database failure is incomplete", async () => {
  const h = harness(); h.input.database.owner = async () => { throw new Error("SECRET"); }; assert.equal((await run(h)).inventoryComplete, false);
});
test("unmarked subscription sessions are unclassified, not silently skipped", async () => {
  const r = await run(harness([session({ metadata: {} })])); assert.ok(r.blockers.includes("unclassified_subscription_session"));
});
test("payment-mode Connect inventory does not enter platform ownership checks", async () => {
  const r = await run(harness([session({ mode: "payment", metadata: {} })])); assert.equal(r.platformSessions, 0); assert.equal(r.inventoryConfidence, true);
});
test("malformed pagination fails closed", async () => {
  const h = harness(); h.pages = [{ data: [], has_more: true }]; assert.equal((await run(h)).inventoryConfidence, false);
});
test("bounded scan timeout never establishes confidence", async () => {
  const h = harness(); let ticks = 0; h.input.now = () => (ticks++ === 0 ? 1000 : 1200);
  assert.equal((await run(h)).inventoryComplete, false);
});

test("late final provider response cannot produce a confident report", async () => {
  const h = harness(); let current = 1000; h.input.now = () => current;
  const original = h.input.stripe.checkout.sessions.retrieve;
  h.input.stripe.checkout.sessions.retrieve = async id => { const result = await original(id); current = 1200; return result; };
  const report = await run(h); assert.equal(report.inventoryComplete, false); assert.equal(report.inventoryConfidence, false);
});
