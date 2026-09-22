import fs from "node:fs";
import assert from "node:assert/strict";
const s=fs.readFileSync("packages/platform-core/src/command-centre/overview.ts","utf8");
assert.match(s,/prisma\.platformSubscription\.findMany/,"Command revenue must use canonical PlatformSubscription");
assert.doesNotMatch(s,/prisma\.commerceSubscription\.(?:count|aggregate)/,"Command MRR must not use customer Commerce subscriptions");
assert.doesNotMatch(s,/prisma\.commerceInvoice\.aggregate/,"Command SaaS revenue must not use customer Commerce invoices");
assert.match(s,/starter: 9900, professional: 24900, business: 49900/,"base MRR must use canonical tier prices");
assert.match(s,/Paid Industry\/Growth\/support add-ons remain Stripe-authoritative/,"add-ons must not be guessed");
console.log("command platform subscription revenue: ok");
