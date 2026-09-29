import fs from "node:fs";
import assert from "node:assert/strict";

const intelligence = fs.readFileSync("packages/platform-core/src/command-centre/client-intelligence.ts", "utf8");
const presentation = fs.readFileSync("packages/platform-core/src/command-centre/presentation.ts", "utf8");
const portfolio = fs.readFileSync("src/app/(shell)/command/clients/page.tsx", "utf8");

assert.match(intelligence, /stripeStatus === "trialing" && canonicalStatus === "TRIALING"/);
assert.match(intelligence, /hasStripeSubscription/);
assert.match(intelligence, /lifecycleStatus = "awaiting_subscription"/);
assert.match(intelligence, /lifecycleAgeDays/);
assert.doesNotMatch(presentation, /if \(client\.status === "trial"\) parts\.push\("On trial"\)/);
assert.match(presentation, /case "trialing": return "On trial"/);
assert.match(presentation, /clientLifecycleAgeLabel/);
assert.match(portfolio, /Commercial lifecycle/);
assert.match(portfolio, /clientLifecycleLabel\(client\)/);
assert.match(portfolio, /clientLifecycleAgeLabel\(client\)/);

console.log("Customer lifecycle status regression passed");
