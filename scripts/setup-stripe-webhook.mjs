#!/usr/bin/env node
/**
 * Register (or verify) Stripe webhook for DigitalGate Commerce.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-webhook.mjs
 *
 * Optional:
 *   WEBHOOK_URL=https://app.digitalgate.com.au/api/webhooks/stripe
 */

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
const webhookUrl =
  process.env.WEBHOOK_URL?.trim() ??
  "https://app.digitalgate.com.au/api/webhooks/stripe";

const events = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "payment_intent.payment_failed",
];

if (!secretKey) {
  console.error("Missing STRIPE_SECRET_KEY.");
  console.error("Copy sk_test_… or sk_live_… from Stripe Dashboard → Developers → API keys");
  console.error("Or from digitalgate.com.au → DG Platform → API Settings → Stripe Secret Key");
  process.exit(1);
}

const auth = Buffer.from(`${secretKey}:`).toString("base64");

async function stripeRequest(path, method = "GET", body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Stripe API ${res.status}`);
  }
  return json;
}

function encodeForm(params) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) form.append(key, item);
    } else if (value != null) {
      form.append(key, String(value));
    }
  }
  return form;
}

async function main() {
  const mode = secretKey.startsWith("sk_live_") ? "live" : "test";
  console.log(`Stripe mode: ${mode}`);
  console.log(`Target URL: ${webhookUrl}`);

  const existing = await stripeRequest(
    `/webhook_endpoints?limit=100`,
  );

  const match = (existing.data ?? []).find((endpoint) => endpoint.url === webhookUrl);
  if (match) {
    console.log("\n✓ Webhook already exists:");
    console.log(`  ID: ${match.id}`);
    console.log(`  Status: ${match.status}`);
    console.log(`  Events: ${(match.enabled_events ?? []).join(", ")}`);
    console.log(
      "\nSigning secret (whsec_…) is only shown when the endpoint is created.",
    );
    console.log(
      "Stripe Dashboard → Developers → Webhooks → this endpoint → Signing secret",
    );
    return;
  }

  const body = encodeForm({
    url: webhookUrl,
    description: "DigitalGate Commerce (Gen 2 platform)",
    enabled_events: events,
  });

  const created = await stripeRequest("/webhook_endpoints", "POST", body);

  console.log("\n✓ Webhook created:");
  console.log(`  ID: ${created.id}`);
  console.log(`  URL: ${created.url}`);
  console.log(`\nAdd to Vercel (Production + Preview for test mode):`);
  console.log(`  STRIPE_SECRET_KEY=${secretKey.slice(0, 12)}...`);
  console.log(`  STRIPE_WEBHOOK_SECRET=${created.secret}`);
  console.log("\nLocal .env.local — same two variables for dev testing.");
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
