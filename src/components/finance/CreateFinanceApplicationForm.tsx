"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DEFAULT_STAGES = [
  { id: "enquiry", label: "Enquiry" },
  { id: "fact_find", label: "Fact find" },
  { id: "submitted", label: "Submitted" },
  { id: "conditional", label: "Conditional" },
  { id: "unconditional", label: "Unconditional" },
  { id: "settled", label: "Settled" },
  { id: "declined", label: "Declined" },
];

const APPLICATION_TYPES = [
  { id: "home_loan", label: "Home loan" },
  { id: "refinance", label: "Refinance" },
  { id: "investment", label: "Investment loan" },
  { id: "business", label: "Business loan" },
  { id: "other", label: "Other" },
];

export function CreateFinanceApplicationForm({
  contacts,
  stages = DEFAULT_STAGES,
}: {
  contacts: { id: string; label: string }[];
  stages?: { id: string; label: string }[];
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
    const amount = String(fd.get("loanAmount") ?? "").trim();
    const applicationType = String(fd.get("applicationType") ?? "") || undefined;
    const res = await fetch("/api/v1/finance/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(fd.get("title") ?? ""),
        stage: String(fd.get("stage") ?? "") || undefined,
        contactId: String(fd.get("contactId") ?? "") || undefined,
        lenderName: String(fd.get("lenderName") ?? "") || undefined,
        notes: String(fd.get("notes") ?? "") || undefined,
        loanAmountCents: amount
          ? Math.round(Number.parseFloat(amount) * 100)
          : undefined,
        metadata: applicationType ? { applicationType } : undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not create application");
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
        New application
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="dg-card space-y-3">
      <h3 className="font-semibold text-white">New finance application</h3>
      <input
        name="title"
        required
        placeholder="Application title"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="stage"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          defaultValue={stages[0]?.id ?? "enquiry"}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          name="applicationType"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          defaultValue="home_loan"
        >
          {APPLICATION_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          name="contactId"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          defaultValue=""
        >
          <option value="">Borrower (CRM contact)</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          name="loanAmount"
          type="number"
          step="0.01"
          placeholder="Loan amount (AUD)"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <input
          name="lenderName"
          placeholder="Lender"
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
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
