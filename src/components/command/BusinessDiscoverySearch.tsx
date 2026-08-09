"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ProviderStatus = {
  id: string;
  label: string;
  available: boolean;
  reason?: string;
};

type Candidate = {
  key: string;
  provider: string;
  externalId: string;
  businessName: string;
  location?: string;
  phone?: string;
  websiteUrl?: string;
  email?: string;
  rating?: number;
  ratingCount?: number;
  industry?: string;
  businessType?: string;
  providerRefs: Record<string, unknown>;
  confidence: number;
};

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

const INDUSTRY_PRESETS = [
  "Real Estate",
  "Finance",
  "Trades",
  "Professional Services",
  "Accommodation",
  "Automotive",
];

export function BusinessDiscoverySearch({
  initialProviders = [],
}: {
  initialProviders?: ProviderStatus[];
}) {
  const router = useRouter();
  const [industry, setIndustry] = useState("Real Estate");
  const [location, setLocation] = useState("Currumbin, QLD");
  const [businessType, setBusinessType] = useState("Agency");
  const [radiusKm, setRadiusKm] = useState<(typeof RADIUS_OPTIONS)[number]>(10);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [runAudit, setRunAudit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>(initialProviders);
  const [textQuery, setTextQuery] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastImport, setLastImport] = useState<string | null>(null);

  const allSelected = useMemo(
    () => candidates.length > 0 && candidates.every((c) => selected.has(c.key)),
    [candidates, selected],
  );

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setLastImport(null);
    setWarnings([]);
    setSelected(new Set());

    const res = await fetch("/api/v1/command/growth/discovery/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        industry: industry.trim() || undefined,
        location: location.trim() || undefined,
        businessType: businessType.trim() || undefined,
        radiusKm,
        q: q.trim() || undefined,
        limit: 20,
      }),
    });
    const json = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Search failed");
      setCandidates([]);
      return;
    }

    const data = json?.data;
    setCandidates(Array.isArray(data?.candidates) ? data.candidates : []);
    setProviders(Array.isArray(data?.providers) ? data.providers : providers);
    setWarnings(Array.isArray(data?.warnings) ? data.warnings : []);
    setTextQuery(typeof data?.textQuery === "string" ? data.textQuery : null);
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(candidates.map((c) => c.key)));
  }

  function toggleOne(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onImport() {
    const chosen = candidates.filter((c) => selected.has(c.key));
    if (chosen.length === 0) {
      setError("Select at least one business to import");
      return;
    }
    setImporting(true);
    setError(null);
    setLastImport(null);

    const res = await fetch("/api/v1/command/growth/discovery/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidates: chosen,
        industry: industry.trim() || undefined,
        location: location.trim() || undefined,
        businessType: businessType.trim() || undefined,
        runAudit,
      }),
    });
    const json = await res.json().catch(() => null);
    setImporting(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "Import failed");
      return;
    }

    const imported = json?.data?.imported?.length ?? 0;
    const skipped = json?.data?.skipped?.length ?? 0;
    setLastImport(`Imported ${imported} · skipped ${skipped}`);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-5 rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
      <div>
        <h2 className="font-semibold text-white">Business Discovery Engine</h2>
        <p className="mt-1 text-sm text-slate-400">
          Search providers → select → import to Growth prospects (not CRM). Industry packs
          tune the query; Places + ABN when configured.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {providers.map((p) => (
          <span
            key={p.id}
            className={`rounded-md px-2 py-1 ${
              p.available
                ? "bg-emerald-950/60 text-emerald-300"
                : "bg-slate-900 text-slate-500"
            }`}
            title={p.reason}
          >
            {p.label}
            {p.available ? " · ready" : " · not configured"}
          </span>
        ))}
      </div>

      <form onSubmit={onSearch} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-400">Industry</span>
          <input
            list="discovery-industries"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
          <datalist id="discovery-industries">
            {INDUSTRY_PRESETS.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Currumbin / Gold Coast / Brisbane"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Business type</span>
          <input
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder="Agency / Broker / Builder…"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Radius</span>
          <select
            value={radiusKm}
            onChange={(e) =>
              setRadiusKm(Number(e.target.value) as (typeof RADIUS_OPTIONS)[number])
            }
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-400">Optional name / keywords</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Overrides industry phrasing when set"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {pending ? "Searching…" : "Discover businesses"}
          </button>
          {textQuery ? (
            <span className="text-xs text-slate-500">Query: {textQuery}</span>
          ) : null}
        </div>
      </form>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {warnings.length > 0 ? (
        <ul className="space-y-1 text-xs text-amber-200/90">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {lastImport ? <p className="text-sm text-emerald-300">{lastImport}</p> : null}

      {candidates.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Select all ({candidates.length})
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={runAudit}
                  onChange={(e) => setRunAudit(e.target.checked)}
                />
                Run presence audit on import
              </label>
              <button
                type="button"
                disabled={importing || selected.size === 0}
                onClick={onImport}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {importing
                  ? "Importing…"
                  : `Import selected (${selected.size}) → Discovery`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 w-10" />
                  <th className="px-3 py-2">Business</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Website</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.key} className="border-t border-slate-800/80">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.key)}
                        onChange={() => toggleOne(c.key)}
                      />
                    </td>
                    <td className="px-3 py-2 text-white">{c.businessName}</td>
                    <td className="px-3 py-2 text-slate-400">{c.location ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-400">{c.phone ?? "—"}</td>
                    <td className="px-3 py-2">
                      {c.websiteUrl ? (
                        <a
                          href={c.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline"
                        >
                          Site
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {typeof c.rating === "number" ? c.rating.toFixed(1) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{c.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
