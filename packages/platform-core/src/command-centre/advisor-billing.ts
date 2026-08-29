/**
 * Billing footing for Command Centre AI Advisor — state-driven, not score thresholds.
 */

export type BillingFootingState =
  | "exempt"
  | "healthy_trial"
  | "active_paid"
  | "no_customer"
  | "subscription_inactive"
  | "suspended"
  | "cancelled";

export type BillingFooting = {
  state: BillingFootingState;
  label: string;
  detail: string;
  needsIntervention: boolean;
};

function formatAud(cents: number): string {
  if (cents <= 0) return "$0";
  return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

export function assessBillingFooting(input: {
  status: string;
  expectsPlatformBilling: boolean;
  hasBillingCustomer: boolean;
  activeSubscriptionCount: number;
  invoicePaidMtdCents: number;
  subscriptionMrrCents: number;
}): BillingFooting {
  const status = (input.status ?? "").toLowerCase();

  if (!input.expectsPlatformBilling) {
    return {
      state: "exempt",
      label: "Platform billing N/A",
      detail:
        "First-party or exempt organisation — SaaS billing is not expected on platform Stripe.",
      needsIntervention: false,
    };
  }

  if (status === "suspended" || status === "cancelled") {
    return {
      state: status,
      label: `Organisation ${status}`,
      detail: `Status is ${status} — billing and access require review.`,
      needsIntervention: true,
    };
  }

  if (status === "trial") {
    return {
      state: "healthy_trial",
      label: "On trial",
      detail: input.hasBillingCustomer
        ? "Trial period active — Stripe customer on file. No payment failure detected."
        : "Trial period active — no payment failure detected. Stripe setup optional during trial.",
      needsIntervention: false,
    };
  }

  if (!input.hasBillingCustomer) {
    return {
      state: "no_customer",
      label: "No Stripe customer",
      detail:
        "Organisation expects platform billing but has no Stripe customer record.",
      needsIntervention: true,
    };
  }

  if (input.activeSubscriptionCount > 0 || input.subscriptionMrrCents > 0) {
    const mrr =
      input.subscriptionMrrCents > 0
        ? ` · MRR ${formatAud(input.subscriptionMrrCents)}`
        : "";
    return {
      state: "active_paid",
      label: "Active subscription",
      detail: `${input.activeSubscriptionCount} active subscription${input.activeSubscriptionCount === 1 ? "" : "s"}${mrr}.`,
      needsIntervention: false,
    };
  }

  if (input.invoicePaidMtdCents > 0) {
    return {
      state: "active_paid",
      label: "Recent payments",
      detail: `Paid ${formatAud(input.invoicePaidMtdCents)} invoiced this month.`,
      needsIntervention: false,
    };
  }

  return {
    state: "subscription_inactive",
    label: "Subscription inactive",
    detail:
      "Stripe customer exists but no active subscription or recent payment detected.",
    needsIntervention: true,
  };
}
