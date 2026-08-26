import Link from "next/link";
import {
  billingStatusDetail,
  billingStatusHeadline,
  type OrganisationBillingStatus,
} from "@dg/platform-core";

import { BillingActions } from "@/components/settings/BillingActions";
import { PLATFORM_TIER_CATALOG } from "@/lib/pricing-catalog";

function tierLabel(tier: string | null | undefined): string {
  if (!tier) return "Not set";
  const catalog = PLATFORM_TIER_CATALOG.find((item) => item.key === tier);
  if (catalog) return catalog.label;
  return tier.replace(/_/g, " ");
}

function statusBadgeClass(kind: OrganisationBillingStatus["kind"]): string {
  switch (kind) {
    case "subscribed":
      return "bg-emerald-500/15 text-emerald-300";
    case "founding_trial":
      return "bg-blue-500/15 text-blue-300";
    case "trial":
    case "cancel_at_period_end":
      return "bg-amber-500/15 text-amber-200";
    case "platform_exempt":
      return "bg-slate-700/80 text-slate-300";
    case "payment_failed":
    case "past_due":
    case "restricted":
      return "bg-amber-500/15 text-amber-200";
    case "suspended":
    case "cancelled":
      return "bg-rose-500/15 text-rose-300";
    case "active":
    case "needs_checkout":
      return "bg-amber-500/15 text-amber-200";
  }
}

export function BillingStatusPanel({
  status,
  purchaseFallback,
  showActions = true,
  compact = false,
}: {
  status: OrganisationBillingStatus;
  purchaseFallback?: string | null;
  showActions?: boolean;
  compact?: boolean;
}) {
  const purchase =
    status.purchaseLabel ?? purchaseFallback ?? (status.platformTier ? tierLabel(status.platformTier) : null);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(status.kind)}`}
        >
          {billingStatusHeadline(status)}
        </span>
        {status.foundingCustomer ? (
          <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
            Founding Customer
          </span>
        ) : null}
      </div>
      <p className="text-sm text-slate-400">{billingStatusDetail(status)}</p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Organisation status</dt>
          <dd className="capitalize text-white">{status.status.replace(/_/g, " ")}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Platform tier</dt>
          <dd className="text-white">{tierLabel(status.platformTier)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Purchase / plan label</dt>
          <dd className="text-white">{purchase ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Stripe customer</dt>
          <dd className="text-white">
            {status.platformExempt
              ? "Not required (platform-exempt)"
              : status.hasStripeCustomer
                ? "Linked"
                : "Not linked yet"}
          </dd>
        </div>
        {status.subscriptionStatus ? (
          <div>
            <dt className="text-slate-500">Subscription (Stripe)</dt>
            <dd className="capitalize text-white">
              {status.subscriptionStatus.replace(/_/g, " ")}
              {status.entitlementsSuspended ? " · limited access" : ""}
            </dd>
          </div>
        ) : null}
        {status.commercialStatus ? (
          <div>
            <dt className="text-slate-500">Commercial state</dt>
            <dd className="text-white">{status.commercialStatus.replace(/_/g, " ")}</dd>
          </div>
        ) : null}
        {status.entitlementLevel ? (
          <div>
            <dt className="text-slate-500">Entitlement</dt>
            <dd className="text-white">{status.entitlementLevel.replace(/_/g, " ")}</dd>
          </div>
        ) : null}
        {status.trialEnd ? (
          <div>
            <dt className="text-slate-500">Trial ends</dt>
            <dd className="text-white">
              {new Date(status.trialEnd).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        ) : null}
        {status.currentPeriodEnd ? (
          <div>
            <dt className="text-slate-500">
              {status.cancelAtPeriodEnd ? "Access ends" : "Next billing date"}
            </dt>
            <dd className="text-white">
              {new Date(status.currentPeriodEnd).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        ) : null}
      </dl>
      {showActions ? (
        <BillingActions
          platformTier={status.platformTier}
          hasBillingCustomer={status.hasStripeCustomer}
          expectsPlatformBilling={status.expectsPlatformBilling}
          foundingCustomer={status.foundingCustomer}
        />
      ) : (
        <Link
          href="/dashboard/settings/billing"
          className="inline-block text-sm text-blue-400 hover:underline"
        >
          Billing settings →
        </Link>
      )}
    </div>
  );
}
