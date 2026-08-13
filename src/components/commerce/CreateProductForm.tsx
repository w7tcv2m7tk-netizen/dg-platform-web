"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export function CreateProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [unitAmount, setUnitAmount] = useState("250");
  const [applyGst, setApplyGst] = useState(true);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/commerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || undefined,
          description: description.trim() || undefined,
          unitAmount: unitAmount,
          applyGst,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Could not create product");
        setPending(false);
        return;
      }
      setName("");
      setSku("");
      setDescription("");
      setUnitAmount("250");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error");
    }
    setPending(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
      >
        + Add product
      </button>
    );
  }

  const previewCents = Math.round((parseFloat(unitAmount) || 0) * 100);

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/40 p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">New catalogue product</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-400 hover:text-white"
        >
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-300">
          Name
          <input
            required
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Switchboard upgrade"
          />
        </label>
        <label className="block text-sm text-slate-300">
          SKU (optional)
          <input
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SVC-SWB-01"
          />
        </label>
      </div>
      <label className="block text-sm text-slate-300">
        Description
        <textarea
          className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white min-h-[72px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown on quotes / invoices when selected"
        />
      </label>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm text-slate-300">
          Unit price (AUD)
          <input
            required
            type="number"
            min="0"
            step="0.01"
            className="mt-1 w-40 rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-white"
            value={unitAmount}
            onChange={(e) => setUnitAmount(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300 pb-2">
          <input
            type="checkbox"
            checked={applyGst}
            onChange={(e) => setApplyGst(e.target.checked)}
          />
          Apply GST (10%)
        </label>
        <p className="pb-2 text-sm text-slate-400">
          Preview: <span className="text-white">{money(previewCents)}</span>
        </p>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}

export function ProductRowActions({
  productId,
  active,
}: {
  productId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    try {
      await fetch("/api/v1/commerce/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, ...body }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {active ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => patch({ active: false })}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-50"
        >
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => patch({ active: true })}
          className="rounded-md border border-emerald-800 px-2 py-1 text-xs text-emerald-300 hover:border-emerald-600 disabled:opacity-50"
        >
          Activate
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Archive this product? It will leave the catalogue.")) {
            void patch({ archive: true });
          }
        }}
        className="rounded-md border border-rose-900/60 px-2 py-1 text-xs text-rose-300 hover:border-rose-700 disabled:opacity-50"
      >
        Archive
      </button>
    </div>
  );
}
