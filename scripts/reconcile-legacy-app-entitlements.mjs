#!/usr/bin/env node
// Dry-run is the default. This command is intentionally restricted to a local,
// marked disposable PostgreSQL fixture and Stripe test mode; it cannot write to
// Production or a hosted Neon database.
import Stripe from "stripe";
import { createHash } from "node:crypto";

const args = new Set(process.argv.slice(2));
const value = (name) => {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
};
const apply = args.has("--apply");
const approvalReference = value("--approval-reference");
const databaseUrl = process.env.RECONCILIATION_DATABASE_URL?.trim();
const stripeKey = process.env.STRIPE_RECONCILIATION_SECRET_KEY?.trim();
const expectedAccount = process.env.DG_EXPECTED_STRIPE_ACCOUNT_ID?.trim();
const approval = process.env.DG_LEGACY_ENTITLEMENT_RECONCILIATION_APPROVED?.trim();

if (!databaseUrl || !stripeKey || !expectedAccount) throw new Error("Missing isolated reconciliation configuration");
if (!stripeKey.startsWith("sk_test_")) throw new Error("Only a Stripe test-mode key is accepted");
const database = new URL(databaseUrl);
if (!(["localhost", "127.0.0.1", "::1"].includes(database.hostname)) || database.pathname !== "/dg_checkout_test" || !database.port || database.port === "5432") {
  throw new Error("Only the disposable local dg_checkout_test database is accepted");
}
if (apply && (!approvalReference || !/^test:/i.test(approvalReference) || approval !== approvalReference)) {
  throw new Error("Apply requires --approval-reference=test:<fixture> and matching explicit authorization environment value");
}

process.env.DATABASE_URL = databaseUrl;
process.env.DIRECT_URL = databaseUrl;
const [{ PrismaClient }, { reconcileLegacyAppEntitlements, prismaLegacyEntitlementRepository }] = await Promise.all([
  import("@dg/database"),
  import("../packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts"),
]);
const prisma = new PrismaClient();
const marker = process.env.DG_CHECKOUT_DB_MARKER;
const hashRef = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);
try {
  const [row] = await prisma.$queryRaw`SELECT current_setting('dg.checkout_test_cluster', true) AS marker`;
  if (!marker || row.marker !== marker) throw new Error("Disposable PostgreSQL marker verification failed");
  const stripe = new Stripe(stripeKey, { timeout: 10000, maxNetworkRetries: 0 });
  const report = await reconcileLegacyAppEntitlements({
    stripe,
    repository: prismaLegacyEntitlementRepository(prisma),
    expectedStripeAccountId: expectedAccount,
    apply,
    approvalReference: approvalReference ?? undefined,
    platformPriceIds: {
      starter: process.env.STRIPE_PRICE_STARTER,
      professional: process.env.STRIPE_PRICE_PROFESSIONAL ?? process.env.STRIPE_PRICE_GROWTH,
      business: process.env.STRIPE_PRICE_BUSINESS ?? process.env.STRIPE_PRICE_SCALE,
    },
  });
  process.stdout.write(`${JSON.stringify({
    mode: report.mode,
    apply: report.applied,
    scanned: report.scanned,
    outcomes: report.results.map(({ organisationId, subscriptionRef, outcome, reason, industryApps, premiumApps }) => ({
      organisationRef: hashRef(organisationId), subscriptionRef, outcome, reason, industryApps, premiumApps,
    })),
  }, null, 2)}\n`);
} finally {
  await prisma.$disconnect();
}
