#!/usr/bin/env node
/**
 * Register (or update) Stripe webhook for DigitalGate Gen 2.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-webhook.mjs
 *
 * Optional:
 *   WEBHOOK_URL=https://app.digitalgate.com.au/api/webhooks/stripe
 *
 * Events include commerce checkout + Platform Refer & Earn monthly credits
 * (`invoice.paid`) + Stripe Connect transfer lifecycle. For Express
 * `account.updated`, enable “Events on Connected accounts” on this endpoint
 * in Stripe Dashboard (or rely on Settings → Refer & Earn sync after return).
 */

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
const webhookUrl =
  process.env.WEBHOOK_URL?.trim() ??
  "https://app.digitalgate.com.au/api/webhooks/stripe";

const platformEvents = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "customer.subscription.created",
  "customer.subscription.deleted",
  "customer.subscription.updated",
  "customer.updated",
  "transfer.failed",
  "transfer.reversed",
  "account.updated",
];

if (!secretKey) {
  console.error("Missing STRIPE_SECRET_KEY.");
  console.error("Copy sk_test_… or sk_live_… from Stripe Dashboard → Developers → API keys");
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

function missingEvents(enabled) {
  const set = new Set(enabled ?? []);
  return platformEvents.filter((e) => !set.has(e));
}

async function main() {
  const mode = secretKey.startsWith("sk_live_") ? "live" : "test";
  console.log(`Stripe mode: ${mode}`);
  console.log(`Target URL: ${webhookUrl}`);
  console.log(`Required events: ${platformEvents.join(", ")}`);

  const existing = await stripeRequest(`/webhook_endpoints?limit=100`);

  const match = (existing.data ?? []).find(
    (endpoint) => endpoint.url === webhookUrl && !endpoint.application,
  );
  if (match) {
    const missing = missingEvents(match.enabled_events);
    console.log("\n✓ Webhook already exists:");
    console.log(`  ID: ${match.id}`);
    console.log(`  Status: ${match.status}`);
    console.log(`  Events: ${(match.enabled_events ?? []).join(", ")}`);

    if (missing.length) {
      console.log(`\n→ Updating endpoint — adding missing events: ${missing.join(", ")}`);
      const updated = await stripeRequest(
        `/webhook_endpoints/${match.id}`,
        "POST",
        encodeForm({ enabled_events: platformEvents }),
      );
      console.log(`  Events now: ${(updated.enabled_events ?? []).join(", ")}`);
      console.log("\n✓ Endpoint updated. No need to rotate STRIPE_WEBHOOK_SECRET.");
    } else {
      console.log("\n✓ All required events already enabled.");
    }

    console.log(
      "\nConnect (Refer & Earn cash): enable “Listen to events on Connected accounts”",
    );
    console.log(
      "for account.updated (or rely on in-app sync after onboarding return).",
    );
    console.log("\nVercel must have:");
    console.log("  STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (same Stripe mode)");
    console.log("  STRIPE_CONNECT_ENABLED=true  (to expose cash payout UI)");
    return;
  }

  const body = encodeForm({
    url: webhookUrl,
    description: "DigitalGate Gen 2 (commerce + Refer & Earn + Connect)",
    enabled_events: platformEvents,
  });

  const created = await stripeRequest("/webhook_endpoints", "POST", body);

  console.log("\n✓ Webhook created:");
  console.log(`  ID: ${created.id}`);
  console.log(`  URL: ${created.url}`);
  console.log(`  Events: ${platformEvents.join(", ")}`);
  console.log(`\nAdd to Vercel (Production + Preview for test mode):`);
  console.log(`  STRIPE_SECRET_KEY=${secretKey.slice(0, 12)}...`);
  console.log(`  STRIPE_WEBHOOK_SECRET=${created.secret}`);
  console.log(`  STRIPE_CONNECT_ENABLED=true`);
  console.log(
    "\nIn Stripe Dashboard → Webhooks → this endpoint, enable Connected account events",
  );
  console.log("for account.updated (Express onboarding status).");
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
