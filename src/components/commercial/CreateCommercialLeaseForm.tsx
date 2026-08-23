"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateCommercialLeaseForm({
  properties,
  contacts,
}: {
  properties: { id: string; label: string }[];
  contacts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const rent = String(fd.get("rent") ?? "").trim();
    const res = await fetch("/api/v1/commercial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "lease",
        title: String(fd.get("title") ?? ""),
        commercialPropertyId: String(fd.get("commercialPropertyId") ?? "") || undefined,
        stage: String(fd.get("stage") ?? "") || undefined,
        landlordContactId: String(fd.get("landlordContactId") ?? "") || undefined,
        tenantContactId: String(fd.get("tenantContactId") ?? "") || undefined,
        rentCents: rent ? Math.round(Number.parseFloat(rent) * 100) : undefined,
        notes: String(fd.get("notes") ?? "") || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not create lease");
      return;
    }
    setOpen(false);
    e.currentTarget.reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        New lease
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="dg-card space-y-3">
      <h3 className="font-semibold text-white">New commercial lease</h3>
      <input
        name="title"
        required
        placeholder="Lease title"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="commercialPropertyId"
          defaultValue=""
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Property (optional)</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          name="stage"
          defaultValue="prospect"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="prospect">Prospect</option>
          <option value="negotiation">Negotiation</option>
          <option value="active">Active</option>
          <option value="renewal">Renewal</option>
          <option value="ended">Ended</option>
        </select>
        <input
          name="rent"
          type="number"
          step="0.01"
          placeholder="Annual rent (AUD)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          name="landlordContactId"
          defaultValue=""
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Landlord (CRM)</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          name="tenantContactId"
          defaultValue=""
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Tenant (CRM)</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        name="notes"
        rows={2}
        placeholder="Notes"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
