"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SelectOption = { id: string; label: string };

export function CreateOpportunityForm({
  contacts,
  companies,
}: {
  contacts: SelectOption[];
  companies: SelectOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const valueRaw = String(data.get("value") ?? "").trim();
    const value = valueRaw ? Number(valueRaw) : null;

    if (value != null && (!Number.isFinite(value) || value < 0)) {
      setPending(false);
      setError("Enter a valid opportunity value.");
      return;
    }

    const res = await fetch("/api/v1/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(data.get("title") ?? "").trim(),
        stage: String(data.get("stage") ?? "").trim(),
        pipelineId: String(data.get("pipelineId") ?? "").trim() || undefined,
        contactId: String(data.get("contactId") ?? "").trim() || undefined,
        companyId: String(data.get("companyId") ?? "").trim() || undefined,
        valueCents: value == null ? undefined : Math.round(value * 100),
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError("Could not create the opportunity. Check the details and try again.");
      return;
    }

    const opportunityId = json?.data?.id as string | undefined;
    if (opportunityId) {
      router.push(`/apps/crm/opportunities/${opportunityId}`);
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
      <label className="block lg:col-span-2">
        <span className="text-sm text-slate-400">Opportunity name *</span>
        <input
          name="title"
          required
          maxLength={160}
          placeholder="e.g. AIM Financial platform rollout"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Stage *</span>
        <input
          name="stage"
          required
          maxLength={80}
          defaultValue="new"
          placeholder="e.g. qualified"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Value (AUD)</span>
        <input
          name="value"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0.00"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Pipeline</span>
        <input
          name="pipelineId"
          maxLength={80}
          placeholder="e.g. sales"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
        />
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Contact</span>
        <select
          name="contactId"
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="">No linked contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-slate-400">Company</span>
        <select
          name="companyId"
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="">No linked company</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.label}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-amber-400 lg:col-span-2">{error}</p> : null}

      <div className="lg:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create opportunity"}
        </button>
      </div>
    </form>
  );
}
