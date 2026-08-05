"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DocKind = "quote" | "invoice";

export function CreateDocumentForm({
  kind,
  contactId,
  sourceApp = "commerce",
  sourceEntity,
  defaultDescription = "Professional services",
  defaultAmountDollars = 2500,
}: {
  kind: DocKind;
  contactId?: string;
  sourceApp?: string;
  sourceEntity?: { type: string; id: string };
  defaultDescription?: string;
  defaultAmountDollars?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState(defaultDescription);
  const [amount, setAmount] = useState(String(defaultAmountDollars));
  const [notes, setNotes] = useState("");

  const endpoint = kind === "quote" ? "/api/v1/commerce/quotes" : "/api/v1/commerce/invoices";
  const label = kind === "quote" ? "quote" : "invoice";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const dollars = parseFloat(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a valid amount");
      setPending(false);
      return;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        sourceApp,
        sourceEntity,
        notes: notes || undefined,
        lineItems: [
          {
            description,
            quantity: 1,
            unitAmountCents: Math.round(dollars * 100),
            taxCode: "GST",
          },
        ],
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? `Could not create ${label}`);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        New {label}
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="dg-card space-y-3">
      <h3 className="font-medium text-white">New {label}</h3>
      <label className="block text-sm">
        <span className="text-slate-400">Description</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Amount (AUD)</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Notes (optional)</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : `Create ${label}`}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
