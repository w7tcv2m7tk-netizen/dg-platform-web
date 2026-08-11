"use client";

import { useState } from "react";

export function BillingActions({
  platformTier,
  hasBillingCustomer,
  expectsPlatformBilling = true,
  foundingCustomer = false,
  compact = false,
}: {
  platformTier?: string | null;
  /** True only when organisation.billingCustomerId is set (or equivalent Stripe link). */
  hasBillingCustomer?: boolean;
  expectsPlatformBilling?: boolean;
  foundingCustomer?: boolean;
  /** Hide subscribe CTA when used in the invoices section (portal-only). */
  compact?: boolean;
}) {
  const [pending, setPending] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setPending("checkout");
    setError(null);
    const res = await fetch("/api/v1/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformTier: platformTier ?? "professional" }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) {
      setError(json.error?.message ?? "Checkout failed");
      return;
    }
    if (json.data?.url) {
      window.location.href = json.data.url;
    }
  }

  async function openPortal() {
    setPending("portal");
    setError(null);
    const res = await fetch("/api/v1/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json().catch(() => ({}));
    setPending(null);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not open billing portal");
      return;
    }
    if (json.data?.url) {
      window.location.href = json.data.url;
    }
  }

  if (!expectsPlatformBilling) {
    return (
      <div className={compact ? "mt-2" : "mt-4"}>
        <p className="text-xs text-slate-500">
          Stripe Customer Portal is not used for platform-exempt organisations.
        </p>
      </div>
    );
  }

  const showSubscribe = !compact;
  const subscribeLabel = hasBillingCustomer
    ? "Change plan in Stripe →"
    : foundingCustomer
      ? "Start founding checkout →"
      : "Subscribe in app →";

  return (
    <div className={compact ? "mt-4 space-y-2" : "mt-4 space-y-2"}>
      <div className="flex flex-wrap gap-2">
        {showSubscribe ? (
          <button
            type="button"
            onClick={startCheckout}
            disabled={pending !== null}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {pending === "checkout" ? "Redirecting…" : subscribeLabel}
          </button>
        ) : null}
        {hasBillingCustomer ? (
          <button
            type="button"
            onClick={openPortal}
            disabled={pending !== null}
            className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500 disabled:opacity-50"
          >
            {pending === "portal" ? "Opening…" : "Open Customer Portal →"}
          </button>
        ) : !compact ? (
          <p className="self-center text-xs text-slate-500">
            Customer Portal unlocks after Stripe checkout links a customer.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            No Stripe customer yet — invoices appear here after checkout.
          </p>
        )}
      </div>
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
    </div>
  );
}
