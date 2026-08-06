"use client";

import { useState } from "react";

export function BillingActions({
  platformTier,
  hasBillingCustomer,
}: {
  platformTier?: string | null;
  hasBillingCustomer?: boolean;
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

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startCheckout}
          disabled={pending !== null}
          className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending === "checkout" ? "Redirecting…" : "Subscribe in app →"}
        </button>
        {hasBillingCustomer ? (
          <button
            type="button"
            onClick={openPortal}
            disabled={pending !== null}
            className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500 disabled:opacity-50"
          >
            {pending === "portal" ? "Opening…" : "Manage billing & invoices →"}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-amber-400">{error}</p> : null}
    </div>
  );
}
