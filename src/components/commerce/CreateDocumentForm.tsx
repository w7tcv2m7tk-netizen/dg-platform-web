"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type DocKind = "quote" | "invoice";

type LineDraft = {
  description: string;
  quantity: string;
  unitAmount: string;
  productId?: string;
};

type CatalogueProduct = {
  id: string;
  name: string;
  description: string | null;
  unitAmountCents: number;
  taxRateBps: number | null;
  active: boolean;
};

const AU_GST_BPS = 1000;

function computePreview(lines: LineDraft[], taxInclusive: boolean, applyGst: boolean) {
  let subtotal = 0;
  let tax = 0;
  let total = 0;
  const rate = applyGst ? AU_GST_BPS : 0;

  for (const line of lines) {
    const qty = parseFloat(line.quantity) || 0;
    const unit = Math.round((parseFloat(line.unitAmount) || 0) * 100);
    const gross = Math.round(qty * unit);
    if (!rate) {
      subtotal += gross;
      total += gross;
      continue;
    }
    if (taxInclusive) {
      const lineTax = Math.round((gross * rate) / (10000 + rate));
      subtotal += gross - lineTax;
      tax += lineTax;
      total += gross;
    } else {
      const lineTax = Math.round((gross * rate) / 10000);
      subtotal += gross;
      tax += lineTax;
      total += gross + lineTax;
    }
  }
  return { subtotal, tax, total };
}

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export function CreateDocumentForm({
  kind,
  contactId,
  sourceApp = "commerce",
  sourceEntity,
  defaultDescription = "Professional services",
  defaultAmountDollars = 2500,
  defaultTaxInclusive = false,
  defaultApplyGst = true,
}: {
  kind: DocKind;
  contactId?: string;
  sourceApp?: string;
  sourceEntity?: { type: string; id: string };
  defaultDescription?: string;
  defaultAmountDollars?: number;
  defaultTaxInclusive?: boolean;
  defaultApplyGst?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAbn, setBuyerAbn] = useState("");
  const [taxInclusive, setTaxInclusive] = useState(defaultTaxInclusive);
  const [applyGst, setApplyGst] = useState(defaultApplyGst);
  const [lines, setLines] = useState<LineDraft[]>([
    {
      description: defaultDescription,
      quantity: "1",
      unitAmount: String(defaultAmountDollars),
    },
  ]);
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/commerce/products")
      .then((res) => res.json())
      .then((json: { data?: CatalogueProduct[] }) => {
        if (!cancelled && Array.isArray(json.data)) {
          setCatalogue(json.data.filter((p) => p.active !== false));
        }
      })
      .catch(() => {
        /* catalogue optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const endpoint = kind === "quote" ? "/api/v1/commerce/quotes" : "/api/v1/commerce/invoices";
  const label = kind === "quote" ? "quote" : "invoice";
  const preview = useMemo(
    () => computePreview(lines, taxInclusive, applyGst),
    [lines, taxInclusive, applyGst],
  );

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function applyProduct(index: number, productId: string) {
    if (!productId) {
      updateLine(index, { productId: undefined });
      return;
    }
    const product = catalogue.find((p) => p.id === productId);
    if (!product) return;
    updateLine(index, {
      productId: product.id,
      description: product.description?.trim() || product.name,
      unitAmount: (product.unitAmountCents / 100).toFixed(2),
    });
    if (product.taxRateBps != null) {
      setApplyGst(product.taxRateBps > 0);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const lineItems = lines
      .map((line) => {
        const quantity = parseFloat(line.quantity);
        const dollars = parseFloat(line.unitAmount);
        if (!line.description.trim() || !Number.isFinite(quantity) || quantity <= 0) {
          return null;
        }
        if (!Number.isFinite(dollars) || dollars < 0) return null;
        return {
          description: line.description.trim(),
          quantity,
          unitAmountCents: Math.round(dollars * 100),
          taxCode: applyGst ? "GST" : "GST_FREE",
          taxRateBps: applyGst ? AU_GST_BPS : 0,
          productId: line.productId,
        };
      })
      .filter(Boolean);

    if (!lineItems.length) {
      setError("Add at least one valid line item");
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
        taxInclusive,
        buyer:
          buyerName || buyerEmail || buyerAbn
            ? {
                name: buyerName || undefined,
                email: buyerEmail || undefined,
                abn: buyerAbn || undefined,
              }
            : undefined,
        lineItems,
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? `Could not create ${label}`);
      return;
    }

    const id = json?.data?.id as string | undefined;
    setOpen(false);
    if (id) {
      router.push(
        kind === "quote"
          ? `/apps/commerce/quotes/${id}`
          : `/apps/commerce/invoices/${id}`,
      );
      return;
    }
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
    <form onSubmit={(e) => void submit(e)} className="dg-card space-y-4">
      <h3 className="font-medium text-white">New {label}</h3>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-12"
          >
            {catalogue.length > 0 ? (
              <label className="block text-sm sm:col-span-12">
                <span className="text-slate-400">From catalogue</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                  value={line.productId ?? ""}
                  onChange={(e) => applyProduct(index, e.target.value)}
                >
                  <option value="">Custom line…</option>
                  {catalogue.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} —{" "}
                      {(product.unitAmountCents / 100).toLocaleString("en-AU", {
                        style: "currency",
                        currency: "AUD",
                      })}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block text-sm sm:col-span-6">
              <span className="text-slate-400">Description</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                value={line.description}
                onChange={(e) => updateLine(index, { description: e.target.value })}
                required
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-400">Qty</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                value={line.quantity}
                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                required
              />
            </label>
            <label className="block text-sm sm:col-span-3">
              <span className="text-slate-400">
                Unit {taxInclusive ? "(inc GST)" : "(ex GST)"} AUD
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                value={line.unitAmount}
                onChange={(e) => updateLine(index, { unitAmount: e.target.value })}
                required
              />
            </label>
            <div className="flex items-end sm:col-span-1">
              {lines.length > 1 ? (
                <button
                  type="button"
                  className="mb-0.5 text-xs text-slate-400 hover:text-red-400"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-blue-400 hover:underline"
          onClick={() =>
            setLines((prev) => [
              ...prev,
              { description: "", quantity: "1", unitAmount: "0" },
            ])
          }
        >
          + Add line
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={applyGst}
            onChange={(e) => setApplyGst(e.target.checked)}
          />
          Apply 10% GST
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={taxInclusive}
            onChange={(e) => setTaxInclusive(e.target.checked)}
            disabled={!applyGst}
          />
          Amounts include GST
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-400">Buyer name</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Buyer email</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Buyer ABN</span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            value={buyerAbn}
            onChange={(e) => setBuyerAbn(e.target.value)}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-slate-400">Notes (optional)</span>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
        <div className="flex justify-between">
          <span>Subtotal (ex GST)</span>
          <span>{money(preview.subtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>GST</span>
          <span>{money(preview.tax)}</span>
        </div>
        <div className="mt-2 flex justify-between font-semibold text-white">
          <span>Total</span>
          <span>{money(preview.total)}</span>
        </div>
      </div>

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
