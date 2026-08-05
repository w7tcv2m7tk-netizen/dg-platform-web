"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Company = {
  id: string;
  name: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  industry?: string | null;
};

export function EditCompanyForm({ company }: { company: Company }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch(`/api/v1/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        website: data.get("website") || undefined,
        email: data.get("email") || undefined,
        phone: data.get("phone") || undefined,
        industry: data.get("industry") || undefined,
      }),
    });

    setPending(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Failed to update company");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm text-slate-400">Company name *</span>
        <input
          name="name"
          required
          defaultValue={company.name}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-400">Industry</span>
          <input
            name="industry"
            defaultValue={company.industry ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Website</span>
          <input
            name="website"
            defaultValue={company.website ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={company.email ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Phone</span>
          <input
            name="phone"
            defaultValue={company.phone ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-400">Saved</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
