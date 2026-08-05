"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptQuoteButton({
  quoteId,
  disabled,
}: {
  quoteId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function accept() {
    if (!confirm("Accept this quote and create an invoice?")) return;
    setPending(true);
    const res = await fetch(`/api/v1/commerce/quotes/${quoteId}/accept`, {
      method: "POST",
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  if (disabled) return null;

  return (
    <button
      type="button"
      onClick={() => void accept()}
      disabled={pending}
      className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
    >
      {pending ? "…" : "Accept"}
    </button>
  );
}

export function SendInvoiceButton({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    const res = await fetch(`/api/v1/commerce/invoices/${invoiceId}/send`, {
      method: "POST",
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  if (status !== "draft") {
    return <span className="text-xs text-slate-500 capitalize">{status}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => void send()}
      disabled={pending}
      className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "…" : "Mark sent"}
    </button>
  );
}
