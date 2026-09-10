import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "src/app/api/v1/onboarding/gen2/route.ts"),
  "utf8",
);

assert.match(
  route,
  /getOrganisationBillingStatus\(session\.organisationId\)/,
  "Stripe completion must be verified against canonical organisation billing state",
);
assert.match(
  route,
  /markStepComplete === "stripe"[\s\S]*billing\.hasStripeCustomer[\s\S]*VERIFIED_CHECKOUT_KINDS\.has\(billing\.kind\)/,
  "Stripe onboarding completion must require a Stripe customer and verified billing kind",
);
assert.match(
  route,
  /code: "checkout_not_confirmed"/,
  "unconfirmed checkout must fail closed with a stable error code",
);
assert.match(
  route,
  /subscriptionActivatedAt: _clientActivation/,
  "client-supplied subscription activation timestamps must be stripped",
);
assert.match(
  route,
  /stripeCheckoutSessionId: _clientCheckoutSession/,
  "client-supplied Stripe checkout session IDs must be stripped",
);
assert.match(
  route,
  /markStepComplete === "stripe"[\s\S]*subscriptionActivatedAt: new Date\(\)\.toISOString\(\)/,
  "activation timestamp must be generated server-side after verification",
);

console.log("Onboarding checkout verification regression tests passed");
