"use client";

import { useEffect, useState } from "react";

type CatalogRow = {
  manifest: {
    id: string;
    name: string;
    category: string;
    auth: string;
  };
  platformConfigured: boolean;
  organisation: {
    status: string;
  };
};

const CATEGORY_ORDER = ["property", "business", "ops", "commerce", "marketing"] as const;

export function ConnectorEngineCatalog() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/connectors")
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json.error?.message ?? "Could not load connector catalog");
          return;
        }
        setRows((json.data?.connectors as CatalogRow[]) ?? []);
      })
      .catch(() => setError("Network error loading connector catalog"));
  }, []);

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: rows.filter((r) => r.manifest.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="dg-card">
      <h2 className="font-semibold text-white">Connector Engine</h2>
      <p className="mt-1 text-sm text-slate-400">
        Registry of Property / Business / Marketing / Commerce connectors — adapters plug in
        here.
      </p>
      {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
      {!rows.length && !error ? (
        <p className="mt-3 text-sm text-slate-500">Loading catalog…</p>
      ) : null}
      <div className="mt-4 space-y-4">
        {grouped.map((group) => (
          <div key={group.category}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{group.category}</p>
            <ul className="mt-2 divide-y divide-slate-800 rounded-lg border border-slate-800">
              {group.items.map((item) => (
                <li
                  key={item.manifest.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="text-white">{item.manifest.name}</span>
                    <span className="ml-2 font-mono text-xs text-slate-600">
                      {item.manifest.id} · {item.manifest.auth}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className={item.platformConfigured ? "text-emerald-400" : "text-slate-500"}>
                      {item.platformConfigured ? "Platform ready" : "Platform pending"}
                    </span>
                    <span
                      className={
                        item.organisation.status === "connected"
                          ? "text-emerald-400"
                          : item.organisation.status === "degraded"
                            ? "text-amber-400"
                            : "text-slate-500"
                      }
                    >
                      Org: {item.organisation.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
