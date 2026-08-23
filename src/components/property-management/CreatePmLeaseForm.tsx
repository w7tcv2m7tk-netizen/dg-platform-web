"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreatePmLeaseForm({
  contacts,
  properties = [],
}: {
  contacts: { id: string; label: string }[];
  properties?: { id: string; label: string }[];
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
    const res = await fetch("/api/v1/property-management/leases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(fd.get("title") ?? ""),
        propertyId: String(fd.get("propertyId") ?? "") || undefined,
        addressLine1: String(fd.get("addressLine1") ?? "") || undefined,
        suburb: String(fd.get("suburb") ?? "") || undefined,
        stage: String(fd.get("stage") ?? "") || undefined,
        ownerContactId: String(fd.get("ownerContactId") ?? "") || undefined,
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
      <h3 className="font-semibold text-white">New property management lease</h3>
      <input
        name="title"
        required
        placeholder="Lease title (e.g. 12 Smith St — Unit 2)"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      {properties.length > 0 ? (
        <select
          name="propertyId"
          defaultValue=""
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Link property (optional)</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="addressLine1"
          placeholder="Address"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          name="suburb"
          placeholder="Suburb"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          name="stage"
          defaultValue="application"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="application">Application</option>
          <option value="active">Active</option>
          <option value="renewal">Renewal</option>
          <option value="vacating">Vacating</option>
          <option value="ended">Ended</option>
        </select>
        <input
          name="rent"
          type="number"
          step="0.01"
          placeholder="Weekly rent (AUD)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <select
          name="ownerContactId"
          defaultValue=""
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Owner (CRM)</option>
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
