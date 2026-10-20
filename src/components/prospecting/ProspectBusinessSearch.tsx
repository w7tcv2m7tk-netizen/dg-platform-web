"use client";

import { useState } from "react";
import type { BusinessIdentityRecord, DiscoveryCandidate, searchProspectIntake } from "@dg/platform-core";

export type ProspectBusinessSelection = {
  businessName: string;
  abn?: string;
  identity?: BusinessIdentityRecord;
  location?: string;
  phone?: string;
  websiteUrl?: string;
  googlePlaceId?: string;
};

export async function fetchProspectIdentity(abn: string): Promise<BusinessIdentityRecord> {
  const response = await fetch(`/api/v1/business-identity/abn?abn=${encodeURIComponent(abn)}`);
  const result = await response.json();
  if (!response.ok || !result.data?.identity) throw new Error("ABR verification failed. Check the ABN and try again.");
  return result.data.identity;
}

type SearchResult = Awaited<ReturnType<typeof searchProspectIntake>>;
const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white";

export function ProspectBusinessSearch({ onSelect, disabled }: { onSelect: (business: ProspectBusinessSelection) => void; disabled: boolean }) {
  const [mode, setMode] = useState<"name" | "abn">("name");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = pending || disabled;

  async function search() {
    setPending(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/v1/prospecting/intake/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, query, location }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || "Business search failed");
      setResult(json.data);
    } catch (error) { setError(error instanceof Error ? error.message : "Business search failed"); }
    finally { setPending(false); }
  }

  async function selectRegistry(abn: string, businessName: string) {
    setPending(true); setError("");
    try {
      const identity = await fetchProspectIdentity(abn);
      const address = identity.entity.address;
      onSelect({ businessName, abn: identity.identifiers.abn, identity, location: [address?.state, address?.postcode].filter(Boolean).join(" ") });
    } catch (error) { setError(error instanceof Error ? error.message : "ABR verification failed"); }
    finally { setPending(false); }
  }

  function selectGoogle(candidate: DiscoveryCandidate) {
    // Explicit selection supplies listing details only; Google does not verify an ABN.
    onSelect({ businessName: candidate.businessName, location: candidate.location, phone: candidate.phone, websiteUrl: candidate.websiteUrl, googlePlaceId: candidate.providerRefs.googlePlaceId });
  }

  return <section aria-label="Find a prospect" className="space-y-4 rounded-xl border border-slate-700 p-4">
    <h2 className="font-semibold text-white">Search for a business</h2>
    <p className="text-sm text-slate-400">Search ABR and Google business listings, review the results, then choose the business to add. Searching does not create a prospect.</p>
    <fieldset disabled={busy} className="flex flex-wrap gap-4 text-sm text-slate-300">
      <legend className="sr-only">Search by</legend>
      <label><input type="radio" name="searchMode" checked={mode === "name"} onChange={() => { setMode("name"); setResult(null); }} /> Business name</label>
      <label><input type="radio" name="searchMode" checked={mode === "abn"} onChange={() => { setMode("abn"); setResult(null); }} /> ABN</label>
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300">{mode === "abn" ? "ABN to search" : "Business name to search"}
        <input value={query} disabled={busy} onChange={(event) => { setQuery(event.target.value); setResult(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!busy) void search(); } }} inputMode={mode === "abn" ? "numeric" : "text"} maxLength={200} className={inputClass} />
      </label>
      <label className="text-sm text-slate-300">Location to narrow Google results (optional)
        <input value={location} disabled={busy} onChange={(event) => { setLocation(event.target.value); setResult(null); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (!busy) void search(); } }} maxLength={200} placeholder="Gold Coast, QLD" className={inputClass} />
      </label>
    </div>
    <button type="button" disabled={busy || query.trim().length < 3} onClick={() => void search()} className="min-h-11 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Searching / verifying…" : "Search ABR and Google"}</button>
    {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
    {result ? <div className="space-y-4" aria-live="polite">
      {result.warnings.map((warning) => <p key={warning} className="text-sm text-amber-200">{warning}</p>)}
      <div>
        <h3 className="font-medium text-slate-200">ABR registry results</h3>
        <p className="text-xs text-slate-400">Select a result to verify its ABN. A matching name alone does not confirm identity.</p>
        {!result.registry.length ? <p className="mt-2 text-sm text-slate-400">No ABR results returned.</p> : null}
        <ul className="mt-2 space-y-2">{result.registry.map((match) => <li key={`${match.abn}:${match.businessName}`} className="rounded-lg border border-slate-700 p-3">
          <p className="font-medium text-white">{match.businessName}</p><p className="text-sm text-slate-400">ABN {match.abn}{match.location ? ` · ${match.location}` : ""}</p>
          {result.verifiedIdentity?.identifiers.abn === match.abn ? <p className="text-xs text-slate-400">{result.verifiedIdentity.entity.status} · {[result.verifiedIdentity.entity.address?.state, result.verifiedIdentity.entity.address?.postcode].filter(Boolean).join(" ")}</p> : null}
          <button type="button" disabled={busy} onClick={() => void selectRegistry(match.abn, match.businessName)} className="min-h-11 text-sm text-violet-300 disabled:opacity-50">Verify ABN and review</button>
        </li>)}</ul>
      </div>
      <div>
        <h3 className="font-medium text-slate-200">Google business results</h3>
        <p className="text-xs text-slate-400">Google supplies business details, not verified legal identity. Confirm an ABN below before saving it.</p>
        {!result.google.length ? <p className="mt-2 text-sm text-slate-400">No Google results returned.</p> : null}
        <ul className="mt-2 space-y-2">{result.google.map((candidate) => <li key={candidate.key} className="rounded-lg border border-slate-700 p-3">
          <p className="font-medium text-white">{candidate.businessName}</p>
          <p className="break-words text-sm text-slate-400">{[candidate.location, candidate.phone, candidate.websiteUrl].filter(Boolean).join(" · ")}</p>
          <button type="button" disabled={busy} onClick={() => selectGoogle(candidate)} className="min-h-11 text-sm text-violet-300 disabled:opacity-50">Review this Google business</button>
        </li>)}</ul>
      </div>
    </div> : null}
  </section>;
}
