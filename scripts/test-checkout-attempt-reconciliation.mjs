import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const source = fs.readFileSync("packages/platform-core/src/billing/platform-stripe.ts", "utf8");
const start = source.lastIndexOf("await database.platformCheckoutAttempt.updateMany");
const block = source.slice(start, source.indexOf("\n  return {", start));

test("successful webhook activation reconciles only the matching current attempt", () => {
  for (const fragment of [
    "organisationId: org.id",
    "sessionId: session.id",
    "currentOrganisationId: org.id",
    'state: { in: ["OPEN", "AWAITING_WEBHOOK"] }',
    'state: "EXPIRED"',
    "currentOrganisationId: null",
    'recoveryReason: "completed_subscription_terminal"',
  ]) assert.ok(block.includes(fragment), `missing safe reconciliation field: ${fragment}`);
  assert.ok(!block.includes("delete"), "attempt history must not be deleted");
  assert.ok(!block.includes("platformSubscription.delete"), "subscription state must not be deleted");
  assert.ok(source.indexOf("syncPlatformSubscriptionFromCheckout") < source.indexOf("await database.platformCheckoutAttempt.updateMany"), "reconciliation must follow canonical activation");
});

test("attempt reconciliation remains inside the provisioning transaction", () => {
  const before = source.slice(0, source.indexOf("await database.platformCheckoutAttempt.updateMany"));
  assert.ok(before.includes("withProjectionTransaction"));
  assert.ok(source.includes("provisionLockedCheckout"));
});
