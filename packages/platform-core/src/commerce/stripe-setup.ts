export type StripeSetupIssue =
  | "missing_secret_key"
  | "missing_webhook_secret"
  | "mode_unknown"
  | "webhook_endpoint";

export interface StripeSetupStatus {
  ok: boolean;
  mode: "test" | "live" | "unset";
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  publishableKeyConfigured: boolean;
  webhookUrl: string;
  issues: StripeSetupIssue[];
  checklist: Array<{ id: string; label: string; done: boolean; hint?: string }>;
}

export function getStripeSetupStatus(): StripeSetupStatus {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://app.digitalgate.com.au";

  let mode: StripeSetupStatus["mode"] = "unset";
  if (secretKey.startsWith("sk_test_")) mode = "test";
  else if (secretKey.startsWith("sk_live_")) mode = "live";

  const issues: StripeSetupIssue[] = [];
  if (!secretKey) issues.push("missing_secret_key");
  if (!webhookSecret) issues.push("missing_webhook_secret");
  if (secretKey && mode === "unset") issues.push("mode_unknown");

  const webhookUrl = `${appUrl}/api/webhooks/stripe`;

  const checklist = [
    {
      id: "secret_key",
      label: `STRIPE_SECRET_KEY (${mode === "live" ? "live" : mode === "test" ? "test" : "unset"})`,
      done: Boolean(secretKey),
      hint: "Vercel → Settings → Environment Variables",
    },
    {
      id: "webhook_secret",
      label: "STRIPE_WEBHOOK_SECRET for this environment",
      done: Boolean(webhookSecret),
      hint: `Stripe Dashboard → Webhooks → ${webhookUrl}`,
    },
    {
      id: "mode_pair",
      label: "Secret key and webhook secret from the same Stripe mode",
      done: Boolean(secretKey && webhookSecret && mode !== "unset"),
      hint: "Do not mix sk_test_ checkout sessions with a live whsec_ (or vice versa)",
    },
    {
      id: "invoice_paid",
      label: "Webhook listens for invoice.paid (Refer & Earn months 2–12)",
      done: Boolean(webhookSecret),
      hint: `Re-run: STRIPE_SECRET_KEY=… node scripts/setup-stripe-webhook.mjs — or enable invoice.paid on ${webhookUrl}`,
    },
    {
      id: "connect",
      label: "STRIPE_CONNECT_ENABLED for Refer & Earn cash payouts (optional)",
      done:
        process.env.STRIPE_CONNECT_ENABLED?.trim().toLowerCase() === "true" ||
        process.env.STRIPE_CONNECT_ENABLED?.trim() === "1",
      hint: "Express AU accounts; webhook needs account.updated + transfer.failed/reversed. Platform credit stays default without this.",
    },
    {
      id: "publishable",
      label: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (optional)",
      done: Boolean(publishableKey),
      hint: "pk_test_ or pk_live_ matching your secret key mode",
    },
  ];

  return {
    ok: issues.length === 0,
    mode,
    secretKeyConfigured: Boolean(secretKey),
    webhookSecretConfigured: Boolean(webhookSecret),
    publishableKeyConfigured: Boolean(publishableKey),
    webhookUrl,
    issues,
    checklist,
  };
}
