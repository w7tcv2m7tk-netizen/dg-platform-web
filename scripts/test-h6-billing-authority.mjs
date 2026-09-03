import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkout = fs.readFileSync(
  path.join(root, "packages/platform-core/src/billing/platform-stripe.ts"),
  "utf8",
);
const status = fs.readFileSync(
  path.join(root, "packages/platform-core/src/billing/org-billing-status.ts"),
  "utf8",
);

const syncCall = checkout.indexOf("await syncPlatformSubscriptionFromCheckout({");
const orgUpdate = checkout.indexOf("await prisma.organisation.update({");
assert.ok(syncCall >= 0, "checkout must sync PlatformSubscription");
assert.ok(orgUpdate >= 0, "checkout must persist the derived organisation projection");
assert.ok(
  syncCall < orgUpdate,
  "authoritative PlatformSubscription must be written before derived organisation JSON",
);

const syncWindow = checkout.slice(
  checkout.lastIndexOf("const { syncPlatformSubscriptionFromCheckout }", syncCall),
  orgUpdate,
);
assert.doesNotMatch(
  syncWindow,
  /try\s*\{/,
  "authoritative subscription sync must not be swallowed by a try/catch",
);
assert.doesNotMatch(
  checkout,
  /platform subscription sync failed/,
  "checkout must not silently log and continue after authoritative sync failure",
);

assert.match(
  status,
  /const subscriptionStatus = platformSub\s*\?[\s\S]*?: billing\.subscriptionStatus/,
  "subscription status must use JSON only when no PlatformSubscription row exists",
);
assert.match(
  status,
  /const entitlementsSuspended = platformSub\s*\?[\s\S]*?: billing\.entitlementsSuspended === true/,
  "entitlement suspension must use JSON only when no PlatformSubscription row exists",
);
assert.match(
  status,
  /const foundingCustomer = platformSub\s*\?[\s\S]*?: isFoundingCustomer\(billing\)/,
  "founding status must use JSON only when no PlatformSubscription row exists",
);
assert.match(
  status,
  /const platformExempt = !expectsPlatformBilling \|\| \(platformSub[\s\S]*?: billing\.platformExempt === true\)/,
  "platform exemption must use JSON only when no PlatformSubscription row exists",
);

console.log("H-6 billing authority regression tests passed");
