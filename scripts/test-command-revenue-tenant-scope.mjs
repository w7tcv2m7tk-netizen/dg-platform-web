import fs from "node:fs";
import assert from "node:assert/strict";

const overview = fs.readFileSync(
  "packages/platform-core/src/command-centre/overview.ts",
  "utf8",
);

// DigitalGate SaaS revenue is cross-tenant by design and must come from the
// canonical PlatformSubscription ledger, never a customer's Commerce records.
assert.match(
  overview,
  /platformSubscription\.findMany\(\{[\s\S]*?platformExempt:\s*false[\s\S]*?planTier:\s*true[\s\S]*?status:\s*true/,
  "Command SaaS revenue must use non-exempt canonical PlatformSubscription records",
);
assert.doesNotMatch(
  overview,
  /commerceSubscription\.(?:count|aggregate)\(/,
  "Command SaaS subscription metrics must not use customer Commerce subscriptions",
);
assert.doesNotMatch(
  overview,
  /commerceInvoice\.aggregate\(/,
  "Command SaaS revenue must not use customer Commerce invoices",
);
const commercialCatalogue = fs.readFileSync(
  "packages/platform-core/src/billing/commercial-catalogue.ts",
  "utf8",
);
assert.match(
  overview,
  /commercial-catalogue/,
  "Command base MRR must consume the canonical commercial catalogue",
);
assert.match(
  overview,
  /PLATFORM_COMMERCIAL_PLANS\.map\(\(plan\) => \[plan\.id, plan\.monthlyCents\]\)/,
  "Command base MRR must derive tier prices from the canonical commercial catalogue",
);
assert.match(commercialCatalogue, /id: "starter"[\s\S]*?monthlyCents: 9900/);
assert.match(commercialCatalogue, /id: "professional"[\s\S]*?monthlyCents: 24900/);
assert.match(commercialCatalogue, /id: "business"[\s\S]*?monthlyCents: 49900/);
assert.doesNotMatch(
  overview,
  /starter:\s*9900,\s*professional:\s*24900,\s*business:\s*49900/,
  "Command Centre must not duplicate canonical tier prices",
);

console.log("Command revenue canonical-subscription regression checks passed");
