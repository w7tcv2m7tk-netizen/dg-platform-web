"use client";

import { useState } from "react";

type PaymentRequestRow = {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  checkoutUrl?: string | null;
  paymentLinkUrl?: string | null;
  description?: string | null;
  paidAt?: string | null;
  createdAt: string;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function RequestPaymentButton({
  leadId,
  contactId,
  preset = "marketing_contribution",
  label = "Request marketing contribution",
  amountCents = 250000,
}: {
  leadId: string;
  contactId?: string;
  preset?: string;
  label?: string;
  amountCents?: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentRequestRow | null>(null);

  async function requestPayment() {
    setPending(true);
    setError(null);

    const res = await fetch("/api/v1/commerce/payment-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset,
        amountCents,
        sourceApp: "real-estate",
        sourceEntity: { type: "Lead", id: leadId },
        contactId,
        description: "Marketing contribution — vendor lead",
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Could not create payment request");
      return;
    }

    setResult(json.data);
  }

  const payUrl = result?.checkoutUrl ?? result?.paymentLinkUrl;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void requestPayment()}
        disabled={pending}
        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Creating checkout…" : label}
      </button>

      {result ? (
        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm">
          <p className="text-white">
            {formatMoney(result.totalCents, result.currency)} · {result.status}
          </p>
          {payUrl ? (
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-blue-400 hover:underline"
            >
              Open checkout link →
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
