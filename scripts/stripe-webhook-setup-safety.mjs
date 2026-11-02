export const PLATFORM_EVENTS = [
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

const DEFAULT_PRODUCTION_WEBHOOK_URL = "https://app.digitalgate.com.au/api/webhooks/stripe";
const PRODUCTION_WEBHOOK_HOSTS = new Set([
  "app.digitalgate.com.au",
  "dg-platform-web.vercel.app",
  "digitalgate.com.au",
  "www.digitalgate.com.au",
]);

export function stripeMode(secretKey) {
  const key = secretKey?.trim();
  if (key?.startsWith("sk_test_")) return "test";
  if (key?.startsWith("sk_live_")) return "live";
  throw new Error("STRIPE_SECRET_KEY must be an sk_test_ or sk_live_ key");
}

function validateWebhookUrl(webhookUrl) {
  const raw = webhookUrl?.trim();
  if (!raw) throw new Error("WEBHOOK_URL is required");
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("WEBHOOK_URL must be a valid absolute URL");
  }
  if (url.protocol !== "https:") throw new Error("WEBHOOK_URL must use HTTPS");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("WEBHOOK_URL must not contain credentials, query or fragment");
  }
  if (url.hostname.includes("*")) throw new Error("WEBHOOK_URL must not contain a wildcard host");
  if (url.pathname !== "/api/webhooks/stripe") {
    throw new Error("WEBHOOK_URL must target /api/webhooks/stripe");
  }
  return url.toString();
}

export function isProductionWebhookUrl(webhookUrl) {
  const host = new URL(webhookUrl).hostname.toLowerCase();
  return (
    PRODUCTION_WEBHOOK_HOSTS.has(host) ||
    host.endsWith(".digitalgate.com.au")
  );
}

export function resolveWebhookDestination({ secretKey, webhookUrl }) {
  const mode = stripeMode(secretKey);
  const supplied = webhookUrl?.trim();
  if (mode === "test") {
    if (!supplied) {
      throw new Error("WEBHOOK_URL is required for Stripe test mode; supply an isolated preview endpoint");
    }
    const url = validateWebhookUrl(supplied);
    if (isProductionWebhookUrl(url)) {
      throw new Error("Refusing to configure a Production webhook endpoint in Stripe test mode");
    }
    return { mode, url };
  }
  return {
    mode,
    url: validateWebhookUrl(supplied || DEFAULT_PRODUCTION_WEBHOOK_URL),
  };
}
