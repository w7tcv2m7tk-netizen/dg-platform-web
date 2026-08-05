#!/usr/bin/env node
/**
 * Commerce diagnostics — payment requests and payments for a lead or org.
 * Usage: node scripts/commerce-diagnose.mjs [leadId]
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();
const leadId = process.argv[2];

async function main() {
  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
  const keyMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "live"
    : process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
      ? "test"
      : "missing";

  console.log("Stripe env:", { configured: stripeConfigured, keyMode });

  const where = leadId
    ? { sourceEntityType: "Lead", sourceEntityId: leadId }
    : {};

  const requests = await prisma.commercePaymentRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      totalCents: true,
      currency: true,
      providerSessionId: true,
      checkoutUrl: true,
      sourceEntityId: true,
      organisationId: true,
      createdAt: true,
      paidAt: true,
    },
  });

  const payments = await prisma.commercePayment.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      amountCents: true,
      providerPaymentId: true,
      paymentRequestId: true,
      paidAt: true,
    },
  });

  console.log("\nPayment requests:", requests.length);
  for (const r of requests) {
    console.log(
      `  ${r.id.slice(0, 12)}… ${r.status} $${(r.totalCents / 100).toFixed(2)} ${r.currency} session=${r.providerSessionId?.slice(0, 20) ?? "—"} lead=${r.sourceEntityId?.slice(0, 12) ?? "—"}`,
    );
  }

  console.log("\nPayments:", payments.length);
  for (const p of payments) {
    console.log(
      `  ${p.id.slice(0, 12)}… ${p.status} $${(p.amountCents / 100).toFixed(2)} req=${p.paymentRequestId.slice(0, 12)}…`,
    );
  }

  if (process.env.STRIPE_SECRET_KEY && requests[0]?.providerSessionId) {
    const sessionId = requests[0].providerSessionId;
    const auth = Buffer.from(`${process.env.STRIPE_SECRET_KEY}:`).toString("base64");
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    const session = await res.json();
    if (session.error) {
      console.log("\nStripe session lookup error:", session.error.message);
    } else {
      console.log("\nLatest session from Stripe:", {
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        payment_intent: session.payment_intent,
        metadata: session.metadata,
      });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
