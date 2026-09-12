"use client";

import { useState } from "react";

type CompetitorItem = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  source: string;
};

export function AiVisibilityCompetitorsManager({
  initialItems,
}: {
  initialItems: CompetitorItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCompetitor() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/ai-visibility/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() || null }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.error?.message ?? "Could not add competitor.");
        return;
      }
      setItems((current) => [...current, json.data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setDomain("");
    } catch {
      setError("Could not add competitor. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="dg-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Monitored competitors</h2>
            <p className="mt-1 text-sm text-slate-400">
              Competitors are organisation-specific. DigitalGate never applies a global competitor list across tenants.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">
            {items.filter((item) => item.status === "active").length} active
          </span>
        </div>

        {items.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-200">{item.name}</p>
                  <span className="text-[11px] uppercase tracking-wide text-slate-600">{item.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.domain ?? "Domain not set"}</p>
                <p className="mt-2 text-[11px] text-slate-600">
                  Share of voice remains unavailable until complete competitor observations exist.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No competitors are configured yet. Add only businesses that genuinely compete for the prompts you intend to monitor.
          </p>
        )}
      </section>

      <section className="dg-card">
        <h2 className="font-semibold text-white">Add competitor</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Competitor name"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
          />
          <input
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="example.com"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
          />
          <button
            type="button"
            disabled={saving || !name.trim()}
            onClick={() => void addCompetitor()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-amber-300" role="status">{error}</p> : null}
      </section>
    </div>
  );
}
