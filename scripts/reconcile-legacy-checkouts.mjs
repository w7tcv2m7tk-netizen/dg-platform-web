/** Explicitly invoked, read-only operator report. Never loads dotenv. */
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";
import { reconcileLegacyCheckoutInventory } from "../packages/platform-core/src/billing/legacy-checkout-inventory.ts";

const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
const account = value("--account");
const mode = value("--mode");
const maxPages = Number(value("--max-pages"));
if (args.length !== 6 || !args.includes("--account") || !args.includes("--mode") || !args.includes("--max-pages") ||
  !/^acct_[a-zA-Z0-9]+$/.test(account ?? "") || !["test", "live"].includes(mode) ||
  !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 1000 ||
  !process.env.STRIPE_RECONCILIATION_SECRET_KEY || !process.env.RECONCILIATION_DATABASE_URL) {
  console.error("Usage: npm run checkout:inventory -- --account acct_ID --mode test|live --max-pages 20; requires STRIPE_RECONCILIATION_SECRET_KEY and RECONCILIATION_DATABASE_URL (read-only role).");
  process.exit(2);
}
const stripe = new Stripe(process.env.STRIPE_RECONCILIATION_SECRET_KEY, { timeout: 10000, maxNetworkRetries: 0 });
const prisma = new PrismaClient({ datasourceUrl: process.env.RECONCILIATION_DATABASE_URL, log: [] });
// Defence in depth even if the supplied DB role accidentally permits writes.
const read = fn => prisma.$transaction(async tx => {
  await tx.$executeRaw`SET TRANSACTION READ ONLY`;
  return fn(tx);
}, { timeout: 10000 });
try {
  const report = await reconcileLegacyCheckoutInventory({ stripe, expectedAccount: account, mode, maxPages,
    database: {
      gate: () => read(async tx => {
        const rows = await tx.$queryRaw`SELECT blocked, revision,
          EXTRACT(EPOCH FROM last_admission_expires_at)::double precision AS "lastAdmissionExpiresAt",
          EXTRACT(EPOCH FROM clock_timestamp())::double precision AS "databaseNow"
          FROM platform_checkout_creation_gate WHERE id = 1`;
        return rows[0] ?? null;
      }),
      owner: organisationId => read(async tx => {
        const org = await tx.organisation.findUnique({ where: { id: organisationId }, select: { billingCustomerId: true } });
        if (!org) return null;
        const subscription = await tx.platformSubscription.findUnique({ where: { organisationId },
          select: { stripeSubscriptionId: true, stripeCustomerId: true, stripeStatus: true } });
        return { ...org, subscription };
      }),
    },
  });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.inventoryConfidence ? 0 : 1;
} catch {
  console.error("Inventory failed; confidence not established.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
