"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateProspectForm({
  pipelineHref = "/apps/prospecting/pipeline",
}: {
  pipelineHref?: string;
} = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch("/api/v1/command/growth/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: data.get("businessName"),
        contactName: data.get("contactName") || undefined,
        contactEmail: data.get("contactEmail") || undefined,
        contactPhone: data.get("contactPhone") || undefined,
        industry: data.get("industry") || undefined,
        location: data.get("location") || undefined,
        websiteUrl: data.get("websiteUrl") || undefined,
      }),
    });

    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Could not create prospect");
      return;
    }

    form.reset();
    router.push(pipelineHref);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm text-slate-400">Business name *</span>
        <input
          name="businessName"
          required
          placeholder="Gold Coast Realty Group"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-slate-400">Industry</span>
          <input
            name="industry"
            placeholder="Real estate"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Location</span>
          <input
            name="location"
            placeholder="Gold Coast, QLD"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Contact name</span>
          <input
            name="contactName"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Contact email</span>
          <input
            name="contactEmail"
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Phone</span>
          <input
            name="contactPhone"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Website</span>
          <input
            name="websiteUrl"
            placeholder="https://"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add to pipeline"}
      </button>
    </form>
  );
}
