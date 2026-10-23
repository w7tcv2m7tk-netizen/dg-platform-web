#!/usr/bin/env node
// Production reconciliation is read-only by default. Applying requires a detached
// Ed25519 approval bound to the exact dry-run plan, Stripe account and Neon target.
import { createHash } from "node:crypto";
import { open, readFile } from "node:fs/promises";
import Stripe from "stripe";

const args = process.argv.slice(2);
const has = (name) => args.includes(name);
const value = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
const apply = has("--apply");
const reportPath = value("--report");
const approvalPath = value("--approval");
if (!reportPath) throw new Error("Pass --report=<new-private-report-path>; production mode never writes a report to stdout only");

const databaseUrlText = process.env.DATABASE_URL?.trim();
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
const expectedStripeAccountId = process.env.DG_EXPECTED_PRODUCTION_STRIPE_ACCOUNT_ID?.trim();
const expectedDatabaseHost = process.env.DG_EXPECTED_PRODUCTION_DATABASE_HOST?.trim();
const expectedDatabaseName = process.env.DG_EXPECTED_PRODUCTION_DATABASE_NAME?.trim();
const approvalPublicKey = process.env.DG_LEGACY_ENTITLEMENT_APPROVAL_PUBLIC_KEY?.trim() ?? "";
if (!databaseUrlText || !stripeKey || !expectedStripeAccountId || !expectedDatabaseHost || !expectedDatabaseName) {
  throw new Error("Missing production reconciliation target configuration");
}
if (!stripeKey.startsWith("sk_live_")) throw new Error("Production reconciliation requires a live-mode Stripe key");
const databaseUrl = new URL(databaseUrlText);
if (databaseUrl.hostname !== expectedDatabaseHost || databaseUrl.pathname.slice(1) !== expectedDatabaseName ||
  !/\.neon\.tech$/i.test(databaseUrl.hostname) || databaseUrl.searchParams.get("sslmode") !== "verify-full") {
  throw new Error("Production database target must match the allowlisted Neon host/database and use sslmode=verify-full");
}
if (apply && (!approvalPath || !approvalPublicKey)) {
  throw new Error("--apply requires a separately signed --approval file and configured approval public key");
}

let approval;
if (apply) approval = JSON.parse(await readFile(approvalPath, "utf8"));
let reportFile;
if (apply) {
  // Reserve a private audit artifact before any production reads or writes. If
  // the process is interrupted, the incomplete marker remains for investigation.
  reportFile = await open(reportPath, "wx", 0o600);
  await reportFile.writeFile(`${JSON.stringify({ schemaVersion: 2, mode: "production", applied: false, status: "apply_started", startedAt: new Date().toISOString(), target: { databaseHost: expectedDatabaseHost, databaseName: expectedDatabaseName, stripeAccountId: expectedStripeAccountId }, planSha256: approval.planSha256 }, null, 2)}\n`);
  await reportFile.sync();
}
process.env.DATABASE_URL = databaseUrlText;
process.env.DIRECT_URL = databaseUrlText;
const [{ PrismaClient }, { reconcileLegacyAppEntitlements, prismaProductionLegacyEntitlementRepository }] = await Promise.all([
  import("@dg/database"),
  import("../packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts"),
]);
const prisma = new PrismaClient();
const stripe = new Stripe(stripeKey, { timeout: 15000, maxNetworkRetries: 0 });
const hashRef = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);
try {
  const report = await reconcileLegacyAppEntitlements({
    stripe,
    repository: prismaProductionLegacyEntitlementRepository(prisma, { databaseHost: expectedDatabaseHost, databaseName: expectedDatabaseName }, approvalPublicKey),
    expectedStripeAccountId,
    mode: "production",
    apply,
    expectedDatabaseHost,
    expectedDatabaseName,
    ...(apply ? { productionApproval: approval, approvalPublicKey, expectedDatabaseHost, expectedDatabaseName } : {}),
    platformPriceIds: {
      starter: process.env.STRIPE_PRICE_STARTER,
      professional: process.env.STRIPE_PRICE_PROFESSIONAL ?? process.env.STRIPE_PRICE_GROWTH,
      business: process.env.STRIPE_PRICE_BUSINESS ?? process.env.STRIPE_PRICE_SCALE,
    },
  });
  const safeReport = {
    schemaVersion: 2,
    mode: report.mode,
    applied: report.applied,
    generatedAt: new Date().toISOString(),
    target: { databaseHost: expectedDatabaseHost, databaseName: expectedDatabaseName, stripeAccountId: expectedStripeAccountId },
    planSha256: report.planSha256,
    scanned: report.scanned,
    outcomes: report.results.map(({ organisationId, subscriptionRef, outcome, reason, industryApps, premiumApps, auditKey, itemFingerprint, evidence }) => ({
      organisationRef: hashRef(organisationId), subscriptionRef, outcome, reason,
      industryApps: industryApps ?? [], premiumApps: premiumApps ?? [], auditKey: auditKey ?? null, itemFingerprint: itemFingerprint ?? null,
      stripeEvidence: evidence ?? null,
    })),
  };
  if (!reportFile) reportFile = await open(reportPath, "wx", 0o600);
  await reportFile.truncate(0);
  await reportFile.writeFile(`${JSON.stringify(safeReport, null, 2)}\n`, 0);
  await reportFile.sync();
  process.stdout.write(`${JSON.stringify({ mode: report.mode, applied: report.applied, scanned: report.scanned, planSha256: report.planSha256, reportPath }, null, 2)}\n`);
} finally {
  await reportFile?.close();
  await prisma.$disconnect();
}
