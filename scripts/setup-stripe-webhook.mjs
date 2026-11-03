#!/usr/bin/env node
/**
 * Register (or update) Stripe webhook for DigitalGate Gen 2.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-webhook.mjs
 *
 * Required for test mode:
 *   WEBHOOK_URL=https://<isolated-preview>/api/webhooks/stripe
 *   DG_STRIPE_SANDBOX_WEBHOOK_ORIGINS=https://<isolated-preview>
 *
 * Optional for live mode:
 *   WEBHOOK_URL=https://app.digitalgate.com.au/api/webhooks/stripe
 *
 * Events include commerce checkout + Platform Refer & Earn monthly credits
 * (`invoice.paid`) + Stripe Connect transfer lifecycle. For Express
 * `account.updated`, enable “Events on Connected accounts” on this endpoint
 * in Stripe Dashboard (or rely on Settings → Refer & Earn sync after return).
 */

import { pathToFileURL } from "node:url";

import { mergeWebhookEvents, missingWebhookEvents, PLATFORM_EVENTS, resolveWebhookDestination } from "./stripe-webhook-setup-safety.mjs";

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

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
  const { mode, url: webhookUrl } = resolveWebhookDestination({
    secretKey,
    webhookUrl: process.env.WEBHOOK_URL,
    approvedOrigins: (process.env.DG_STRIPE_SANDBOX_WEBHOOK_ORIGINS ?? "").split(","),
  });
  console.log(`Stripe mode: ${mode}`);
  console.log(`Target URL: ${webhookUrl}`);
  console.log(`Required events: ${PLATFORM_EVENTS.join(", ")}`);

  const existing = await stripeRequest(`/webhook_endpoints?limit=100`);

  const match = (existing.data ?? []).find(
    (endpoint) => endpoint.url === webhookUrl && !endpoint.application,
  );
  if (match) {
    const missing = missingWebhookEvents(match.enabled_events);
    console.log("\n✓ Webhook already exists:");
    console.log(`  ID: ${match.id}`);
    console.log(`  Status: ${match.status}`);
    console.log(`  Events: ${(match.enabled_events ?? []).join(", ")}`);

    if (missing.length) {
      console.log(`\n→ Updating endpoint — adding missing events: ${missing.join(", ")}`);
      const updated = await stripeRequest(
        `/webhook_endpoints/${match.id}`,
        "POST",
        encodeForm({ enabled_events: mergeWebhookEvents(match.enabled_events) }),
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
    enabled_events: PLATFORM_EVENTS,
  });

  const created = await stripeRequest("/webhook_endpoints", "POST", body);

  console.log("\n✓ Webhook created:");
  console.log(`  ID: ${created.id}`);
  console.log(`  URL: ${created.url}`);
  console.log(`  Events: ${PLATFORM_EVENTS.join(", ")}`);
  console.log(`\nAdd the endpoint to the isolated Vercel environment (never Production for test mode):`);
  console.log("  Retrieve the signing secret from the owner-controlled private secret store; it is not printed.");
  console.log("  STRIPE_CONNECT_ENABLED=true");
  console.log(
    "\nIn Stripe Dashboard → Webhooks → this endpoint, enable Connected account events",
  );
  console.log("for account.updated (Express onboarding status).");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("\nFailed:", err.message);
    process.exit(1);
  });
}
