"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuPhoneInput } from "@/components/ui/AuPhoneInput";

export function CreateCompanyForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch("/api/v1/companies", {
      method: "POST",
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
      setError(json?.error?.message ?? "Failed to create company");
      return;
    }

    const json = await res.json().catch(() => null);
    const companyId = json?.data?.id as string | undefined;
    form.reset();
    if (companyId) {
      router.push(`/apps/crm/companies/${companyId}`);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm text-slate-400">Company name *</span>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          placeholder="Acme Pty Ltd"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-400">Industry</span>
          <input
            name="industry"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="Real estate"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Website</span>
          <input
            name="website"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="https://"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Email</span>
          <input
            name="email"
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Phone</span>
          <AuPhoneInput
            name="phone"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            placeholder="02 1234 5678"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add company"}
      </button>
    </form>
  );
}
