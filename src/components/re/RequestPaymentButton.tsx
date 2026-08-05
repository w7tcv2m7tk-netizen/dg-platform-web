"use client";

import { useEffect, useState } from "react";

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

function statusTone(status: string) {
  if (status === "paid") return "text-emerald-400";
  if (status === "failed" || status === "expired") return "text-red-400";
  if (status === "checkout_open") return "text-amber-400";
  return "text-slate-300";
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
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentRequestRow | null>(null);
  const [history, setHistory] = useState<PaymentRequestRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoadingHistory(true);
      const res = await fetch(
        `/api/v1/commerce/payment-requests?entityType=Lead&entityId=${encodeURIComponent(leadId)}`,
      );
      const json = await res.json().catch(() => null);
      if (!cancelled) {
        setHistory(Array.isArray(json?.data) ? json.data : []);
        setLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

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

    const row = json.data as PaymentRequestRow;
    setResult(row);
    setHistory((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
  }

  const payUrl = result?.checkoutUrl ?? result?.paymentLinkUrl;

  return (
    <div className="space-y-3">
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

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Payment history
        </p>
        {loadingHistory ? (
          <p className="mt-2 text-sm text-slate-500">Loading…</p>
        ) : !history.length ? (
          <p className="mt-2 text-sm text-slate-500">No payment requests yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.map((row) => {
              const url = row.checkoutUrl ?? row.paymentLinkUrl;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div>
                    <span className="text-white">
                      {formatMoney(row.totalCents, row.currency)}
                    </span>
                    <span className={`ml-2 ${statusTone(row.status)}`}>
                      {row.status.replace(/_/g, " ")}
                    </span>
                    {row.paidAt ? (
                      <span className="ml-2 text-xs text-slate-500">
                        paid {new Date(row.paidAt).toLocaleDateString("en-AU")}
                      </span>
                    ) : null}
                  </div>
                  {url && row.status !== "paid" ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Open link
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
