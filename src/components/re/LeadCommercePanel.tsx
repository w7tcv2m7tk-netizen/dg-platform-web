"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreateDocumentForm } from "@/components/commerce/CreateDocumentForm";

type QuoteRow = {
  id: string;
  quoteNumber: string;
  status: string;
  totalCents: number;
};

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export function LeadCommercePanel({
  leadId,
  contactId,
  quotes,
  invoices,
}: {
  leadId: string;
  contactId?: string;
  quotes: QuoteRow[];
  invoices: InvoiceRow[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourceEntity = { type: "Lead", id: leadId };

  async function acceptQuote(quoteId: string) {
    setPending(`accept-${quoteId}`);
    setError(null);
    const res = await fetch(`/api/v1/commerce/quotes/${quoteId}/accept`, { method: "POST" });
    setPending(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Could not accept quote");
      return;
    }
    router.refresh();
  }

  async function sendInvoice(invoiceId: string) {
    setPending(`send-${invoiceId}`);
    setError(null);
    const res = await fetch(`/api/v1/commerce/invoices/${invoiceId}/send`, { method: "POST" });
    setPending(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Could not send invoice");
      return;
    }
    router.refresh();
  }

  async function requestPayment(invoiceId: string, totalCents: number) {
    setPending(`pay-${invoiceId}`);
    setError(null);
    const res = await fetch("/api/v1/commerce/payment-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        contactId,
        sourceApp: "real-estate",
        sourceEntity,
        lineItems: [
          {
            description: "Invoice payment",
            quantity: 1,
            unitAmountCents: totalCents,
            taxCode: "GST",
          },
        ],
      }),
    });
    const json = await res.json().catch(() => null);
    setPending(null);
    if (!res.ok) {
      setError(json?.error?.message ?? "Could not create payment request");
      return;
    }
    const url = json?.data?.checkoutUrl ?? json?.data?.paymentLinkUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <CreateDocumentForm
        kind="quote"
        contactId={contactId}
        sourceApp="real-estate"
        sourceEntity={sourceEntity}
        defaultDescription="Marketing contribution — vendor lead"
        defaultAmountDollars={2500}
      />

      {quotes.length ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Quotes</p>
          <ul className="mt-2 space-y-2">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
              >
                <span className="text-white">
                  {q.quoteNumber} · {formatMoney(q.totalCents)} · {q.status}
                </span>
                {q.status === "draft" || q.status === "sent" ? (
                  <button
                    type="button"
                    disabled={pending === `accept-${q.id}`}
                    onClick={() => void acceptQuote(q.id)}
                    className="text-xs text-blue-400 hover:underline disabled:opacity-50"
                  >
                    Accept → invoice
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {invoices.length ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Invoices</p>
          <ul className="mt-2 space-y-2">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
              >
                <span className="text-white">
                  {inv.invoiceNumber} · {formatMoney(inv.totalCents)} · {inv.status}
                </span>
                <div className="flex gap-3">
                  {inv.status === "draft" ? (
                    <button
                      type="button"
                      disabled={pending === `send-${inv.id}`}
                      onClick={() => void sendInvoice(inv.id)}
                      className="text-xs text-blue-400 hover:underline disabled:opacity-50"
                    >
                      Send
                    </button>
                  ) : null}
                  {inv.status !== "paid" ? (
                    <button
                      type="button"
                      disabled={pending === `pay-${inv.id}`}
                      onClick={() => void requestPayment(inv.id, inv.totalCents)}
                      className="text-xs text-emerald-400 hover:underline disabled:opacity-50"
                    >
                      Request payment
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
