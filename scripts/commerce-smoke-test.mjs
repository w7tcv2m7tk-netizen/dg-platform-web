#!/usr/bin/env node
/**
 * Commerce smoke test — validates Stripe env, recent checkout sessions, and payment records.
 * Usage: node scripts/commerce-smoke-test.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();

function pass(label) {
  console.log(`✓ ${label}`);
}

function fail(label, detail) {
  console.log(`✗ ${label}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const keyMode = stripeKey?.startsWith("sk_live_")
    ? "live"
    : stripeKey?.startsWith("sk_test_")
      ? "test"
      : "missing";

  console.log("Commerce smoke test\n");

  if (stripeKey && webhookSecret) {
    pass(`Stripe configured (${keyMode})`);
  } else {
    fail("Stripe configured", "STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing");
  }

  if (process.env.DATABASE_URL) {
    pass("Database configured");
  } else {
    fail("Database configured");
    return;
  }

  const [requestCount, paymentCount, paidCount] = await Promise.all([
    prisma.commercePaymentRequest.count(),
    prisma.commercePayment.count(),
    prisma.commercePayment.count({ where: { status: "paid" } }),
  ]);

  pass(`Payment requests in DB: ${requestCount}`);
  pass(`Payments in DB: ${paymentCount} (${paidCount} paid)`);

  const latestRequest = await prisma.commercePaymentRequest.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalCents: true,
      currency: true,
      providerSessionId: true,
      checkoutUrl: true,
      organisationId: true,
      createdAt: true,
    },
  });

  if (!latestRequest) {
    console.log("\nNo payment requests yet — create one from a lead to complete the smoke path.");
    return;
  }

  console.log("\nLatest payment request:");
  console.log(
    `  ${latestRequest.id.slice(0, 12)}… ${latestRequest.status} $${(latestRequest.totalCents / 100).toFixed(2)} ${latestRequest.currency}`,
  );
  console.log(`  session=${latestRequest.providerSessionId ?? "—"}`);
  console.log(`  checkout=${latestRequest.checkoutUrl ? "yes" : "no"}`);

  if (!stripeKey || !latestRequest.providerSessionId) {
    return;
  }

  const auth = Buffer.from(`${stripeKey}:`).toString("base64");
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${latestRequest.providerSessionId}`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  const session = await res.json();

  if (session.error) {
    fail("Stripe session lookup", session.error.message);
    return;
  }

  pass(`Stripe session ${session.status} · payment_status=${session.payment_status}`);

  if (session.payment_status === "paid" && latestRequest.status !== "paid") {
    fail("DB sync", "Stripe shows paid but request is not marked paid — check webhook");
  } else if (session.payment_status === "paid" && latestRequest.status === "paid") {
    pass("Checkout → webhook → DB path looks healthy");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
