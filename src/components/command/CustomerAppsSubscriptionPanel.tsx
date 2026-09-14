"use client";

import { useEffect, useMemo, useState } from "react";

type AppRow = {
  id: string;
  name: string;
  description: string;
  tier: "core" | "business" | "growth" | "internal";
  tierLabel: string;
  enabled: boolean;
  required: boolean;
};

type CustomerAppsData = {
  organisation: { id: string; name: string; slug: string };
  subscription: {
    platformTier: string | null;
    industryApps: string[];
    premiumApps: string[];
    purchasedApps: string[];
    purchasedPremium: string[];
    appliedAt: string | null;
  };
  apps: AppRow[];
};

const TIER_ORDER = ["core", "business", "growth"] as const;

function titleCase(value: string | null) {
  if (!value) return "Not recorded";
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ListValue({ values }: { values: string[] }) {
  return values.length ? (
    <span className="text-slate-200">{values.map(titleCase).join(", ")}</span>
  ) : (
    <span className="text-slate-500">None recorded</span>
  );
}

export function CustomerAppsSubscriptionPanel({ organisationId }: { organisationId: string }) {
  const [data, setData] = useState<CustomerAppsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/v1/command/clients/${encodeURIComponent(organisationId)}/apps`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error?.message ?? "Unable to load customer apps");
        return json.data as CustomerAppsData;
      })
      .then((next) => {
        if (!cancelled) {
          setData(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load customer apps");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const grouped = useMemo(() => {
    if (!data) return [] as Array<{ tier: string; label: string; apps: AppRow[] }>;
    return TIER_ORDER.map((tier) => ({
      tier,
      label: data.apps.find((app) => app.tier === tier)?.tierLabel ?? tier,
      apps: data.apps.filter((app) => app.tier === tier),
    })).filter((group) => group.apps.length > 0);
  }, [data]);

  async function toggle(app: AppRow) {
    if (app.required || savingId) return;
    setSavingId(app.id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/command/clients/${encodeURIComponent(organisationId)}/apps`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: app.id, enabled: !app.enabled }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? "Unable to update app");
      setData(json.data as CustomerAppsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update app");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Apps & subscription</h2>
        <p className="mt-2 text-sm text-slate-500">Loading customer entitlements…</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Apps & subscription</h2>
        <p className="mt-1 text-xs text-slate-500">
          DigitalGate operator view of the customer plan, purchased additions and currently enabled apps.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-lg border border-slate-800 px-3 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Platform plan</dt>
              <dd className="mt-1 font-medium text-white">{titleCase(data.subscription.platformTier)}</dd>
            </div>
            <div className="rounded-lg border border-slate-800 px-3 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Industry apps</dt>
              <dd className="mt-1"><ListValue values={[...new Set([...data.subscription.industryApps, ...data.subscription.purchasedApps])]} /></dd>
            </div>
            <div className="rounded-lg border border-slate-800 px-3 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Growth / premium</dt>
              <dd className="mt-1"><ListValue values={[...new Set([...data.subscription.premiumApps, ...data.subscription.purchasedPremium])]} /></dd>
            </div>
            <div className="rounded-lg border border-slate-800 px-3 py-3">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Enabled apps</dt>
              <dd className="mt-1 font-medium text-white">{data.apps.filter((app) => app.enabled).length}</dd>
            </div>
          </dl>

          <div className="space-y-5">
            {grouped.map((group) => (
              <div key={group.tier}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-200">{group.label}</h3>
                  <span className="text-xs text-slate-500">
                    {group.apps.filter((app) => app.enabled).length}/{group.apps.length} enabled
                  </span>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {group.apps.map((app) => {
                    const busy = savingId === app.id;
                    return (
                      <div key={app.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={app.enabled}
                          aria-label={`${app.enabled ? "Disable" : "Enable"} ${app.name}`}
                          disabled={app.required || Boolean(savingId)}
                          onClick={() => toggle(app)}
                          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${app.enabled ? "bg-sky-600" : "bg-slate-700"} ${app.required ? "cursor-not-allowed opacity-60" : "hover:ring-2 hover:ring-sky-500/30"}`}
                        >
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${app.enabled ? "left-6" : "left-1"}`} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-white">{app.name}</p>
                            {app.required ? (
                              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Core included</span>
                            ) : (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${app.enabled ? "bg-sky-500/10 text-sky-300" : "bg-slate-800 text-slate-500"}`}>
                                {busy ? "Saving" : app.enabled ? "Enabled" : "Disabled"}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{app.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Core platform apps are included and cannot be switched off here. Industry and Growth apps can be manually enabled or disabled by DigitalGate without changing the recorded commercial subscription.
          </p>
        </>
      ) : null}
    </section>
  );
}
