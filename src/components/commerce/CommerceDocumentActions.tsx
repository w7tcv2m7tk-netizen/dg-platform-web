"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptQuoteButton({
  quoteId,
  disabled,
  redirectOnSuccess = true,
}: {
  quoteId: string;
  disabled?: boolean;
  redirectOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function accept() {
    if (!confirm("Accept this quote and create an invoice?")) return;
    setPending(true);
    const res = await fetch(`/api/v1/commerce/quotes/${quoteId}/accept`, {
      method: "POST",
    });
    const json = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) return;
    const invoiceId = json?.data?.invoice?.id as string | undefined;
    if (redirectOnSuccess && invoiceId) {
      router.push(`/apps/commerce/invoices/${invoiceId}`);
      return;
    }
    router.refresh();
  }

  if (disabled) return null;

  return (
    <button
      type="button"
      onClick={() => void accept()}
      disabled={pending}
      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
    >
      {pending ? "…" : "Convert to invoice"}
    </button>
  );
}

export function SendQuoteButton({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function send() {
    setPending(true);
    const res = await fetch(`/api/v1/commerce/quotes/${quoteId}/send`, {
      method: "POST",
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  if (status !== "draft") return null;

  return (
    <button
      type="button"
      onClick={() => void send()}
      disabled={pending}
      className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "…" : "Mark sent"}
    </button>
  );
}

export function DeclineQuoteButton({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function decline() {
    if (!confirm("Mark this quote as declined?")) return;
    setPending(true);
    const res = await fetch(`/api/v1/commerce/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  if (!["draft", "sent", "viewed"].includes(status)) return null;

  return (
    <button
      type="button"
      onClick={() => void decline()}
      disabled={pending}
      className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
    >
      {pending ? "…" : "Decline"}
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
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void send()}
      disabled={pending}
      className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "…" : "Mark sent"}
    </button>
  );
}

export function MarkInvoicePaidButton({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markPaid() {
    setPending(true);
    const res = await fetch(`/api/v1/commerce/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid" }),
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  if (["paid", "void", "draft"].includes(status)) return null;

  return (
    <button
      type="button"
      onClick={() => void markPaid()}
      disabled={pending}
      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
    >
      {pending ? "…" : "Mark paid"}
    </button>
  );
}

export function VoidInvoiceButton({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function voidDoc() {
    if (!confirm("Void this invoice? This cannot be undone easily.")) return;
    setPending(true);
    const res = await fetch(`/api/v1/commerce/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void" }),
    });
    setPending(false);
    if (res.ok) router.refresh();
  }

  if (["paid", "void"].includes(status)) return null;

  return (
    <button
      type="button"
      onClick={() => void voidDoc()}
      disabled={pending}
      className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-red-500/60 hover:text-red-300 disabled:opacity-50"
    >
      {pending ? "…" : "Void"}
    </button>
  );
}

export function PrintDocumentButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-400"
    >
      Print / PDF
    </button>
  );
}
