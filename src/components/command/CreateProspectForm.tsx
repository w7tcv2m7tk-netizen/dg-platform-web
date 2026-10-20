"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateProspectForm({
  pipelineHref = "/apps/prospecting/pipeline",
}: {
  pipelineHref?: string;
} = {}) {
  const router = useRouter();
  const [matches, setMatches] = useState<Array<{ abn: string; businessName: string }>>([]);
  const [lookupError, setLookupError] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
    const res = await fetch("/api/v1/command/growth/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: data.get("businessName"),
        abn: data.get("abn") || undefined,
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
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create prospect");
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm text-slate-400">Australian ABN (optional)</span>
        <input name="abn" inputMode="numeric" aria-label="Australian ABN" placeholder="11-digit ABN" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
        <span className="mt-1 block text-xs text-slate-400">ABNs are verified through ABR when saved. Manual entry without an ABN is also available.</span>
      </label>
      <button type="button" disabled={pending} className="min-h-11 text-sm text-violet-300" onClick={async (event) => {
        const form = event.currentTarget.form;
        if (!form) return;
        setLookupError(""); setPending(true);
        try {
          const abn = new FormData(form).get("abn");
          const response = await fetch(`/api/v1/business-identity/abn?abn=${encodeURIComponent(String(abn ?? ""))}`);
          const result = await response.json();
          if (!response.ok || !result.data?.identity) throw new Error("ABR verification unavailable. Check the ABN and try again.");
          const name = result.data.identity.entity.legalName;
          if (name) (form.elements.namedItem("businessName") as HTMLInputElement).value = name;
          setLookupError("ABR identity found. Save to add this relationship.");
        } catch (error) { setLookupError(error instanceof Error ? error.message : "ABR lookup unavailable"); }
        finally { setPending(false); }
      }}>Look up ABN</button>
      <button type="button" disabled={pending} className="min-h-11 text-sm text-violet-300" onClick={async (event) => {
        const form = event.currentTarget.form;
        if (!form) return;
        setLookupError(""); setMatches([]);
        try {
          const name = new FormData(form).get("businessName");
          const response = await fetch(`/api/v1/business-identity/name?q=${encodeURIComponent(String(name ?? ""))}`);
          const result = await response.json();
          if (!response.ok) throw new Error(result.error?.message || "ABR name lookup unavailable");
          setMatches(result.data.matches ?? []);
          if (!result.data.matches?.length) setLookupError("No ABR matches found. Manual entry is available.");
        } catch (error) { setLookupError(error instanceof Error ? error.message : "ABR lookup unavailable"); }
      }}>Find ABN by business name</button>
      {lookupError ? <p role="status" className="text-sm text-amber-200">{lookupError}</p> : null}
      {matches.map((match) => <button type="button" key={match.abn} className="block min-h-11 text-left text-sm text-violet-200" onClick={(event) => {
        const form = event.currentTarget.form;
        if (!form) return;
        (form.elements.namedItem("abn") as HTMLInputElement).value = match.abn;
        (form.elements.namedItem("businessName") as HTMLInputElement).value = match.businessName;
        setMatches([]);
      }}>{match.businessName} · {match.abn}</button>)}
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
