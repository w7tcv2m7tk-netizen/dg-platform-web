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
  connectionScope: "platform" | "organisation";
  organisation: {
    status: string;
    label?: string | null;
  };
};

const CATEGORY_ORDER = ["property", "business", "ops", "commerce", "marketing"] as const;

function orgStatusLabel(item: CatalogRow): string {
  if (item.connectionScope === "platform") {
    return item.platformConfigured ? "Platform shared" : "Awaiting platform config";
  }
  if (item.organisation.status === "pending_auth") {
    return "Org: activation required";
  }
  return `Org: ${item.organisation.status}`;
}

function orgStatusClass(item: CatalogRow): string {
  if (item.connectionScope === "platform") {
    return item.platformConfigured ? "text-emerald-400" : "text-slate-500";
  }
  if (item.organisation.status === "connected") return "text-emerald-400";
  if (item.organisation.status === "degraded" || item.organisation.status === "pending_auth") {
    return "text-amber-400";
  }
  if (item.organisation.status === "error") return "text-red-400";
  return "text-slate-500";
}

function CatalogGroup({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: CatalogRow[];
}) {
  if (items.length === 0) return null;

  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((r) => r.manifest.category === category),
  })).filter((g) => g.items.length > 0);

  const uncategorised = items.filter(
    (r) => !(CATEGORY_ORDER as readonly string[]).includes(r.manifest.category),
  );

  return (
    <div>
      <h3 className="font-medium text-white">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-3 space-y-4">
        {byCategory.map((group) => (
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
                      {item.manifest.id} · {item.manifest.auth} · {item.connectionScope}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span
                      className={item.platformConfigured ? "text-emerald-400" : "text-slate-500"}
                    >
                      {item.platformConfigured ? "Platform ready" : "Platform pending"}
                    </span>
                    <span className={orgStatusClass(item)}>{orgStatusLabel(item)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {uncategorised.length > 0 ? (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {uncategorised.map((item) => (
              <li
                key={item.manifest.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-white">{item.manifest.name}</span>
                <span className={orgStatusClass(item)}>{orgStatusLabel(item)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

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

  const platform = rows.filter((r) => r.connectionScope === "platform");
  const organisation = rows.filter((r) => r.connectionScope === "organisation");

  return (
    <div className="dg-card space-y-8">
      <div>
        <h2 className="font-semibold text-white">Connector Engine</h2>
        <p className="mt-1 text-sm text-slate-400">
          Platform infrastructure is shared. Organisation connectors are per business. Never
          duplicate platform credentials at org level unless BYOK is intentional.
        </p>
      </div>
      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
      {!rows.length && !error ? (
        <p className="text-sm text-slate-500">Loading catalog…</p>
      ) : null}
      <CatalogGroup
        title="Platform infrastructure"
        subtitle="Configured once by DigitalGate — powers all organisations"
        items={platform}
      />
      <CatalogGroup
        title="Organisation / business connections"
        subtitle="Per-tenant OAuth or keys — connect the systems that business already uses"
        items={organisation}
      />
    </div>
  );
}
