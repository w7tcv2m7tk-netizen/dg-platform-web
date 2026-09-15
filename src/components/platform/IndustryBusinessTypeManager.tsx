"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getIndustry,
  isTemplateActivatable,
  listIndustries,
  type ResolvedIndustryEntitlement,
} from "@dg/platform-core";

import { INDUSTRY_PLATFORM_CATALOG } from "@/lib/pricing-catalog";

type EntitlementsPayload = {
  industries: ResolvedIndustryEntitlement[];
  activeTemplateIds: string[];
};

type ApiData = {
  entitlements: EntitlementsPayload;
  enabled: string[];
};

export function IndustryBusinessTypeManager() {
  const [entitlements, setEntitlements] = useState<EntitlementsPayload | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/org/industry/templates");
    if (!res.ok) return;
    const json = (await res.json()) as { data?: ApiData };
    if (json.data?.entitlements) setEntitlements(json.data.entitlements);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const entitlementByIndustry = useMemo(
    () => new Map((entitlements?.industries ?? []).map((item) => [item.industryId, item])),
    [entitlements],
  );
  const iconByIndustry = useMemo(
    () => new Map(INDUSTRY_PLATFORM_CATALOG.map((item) => [item.platformId, item.icon])),
    [],
  );

  const update = useCallback(async (templateId: string, active: boolean) => {
    setBusyId(templateId);
    setError(null);
    try {
      const res = await fetch("/api/v1/org/industry/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: active ? "activate" : "deactivate", templateId }),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: ApiData;
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not update business type");
        return;
      }
      if (json?.data?.entitlements) setEntitlements(json.data.entitlements);
      window.location.reload();
    } catch {
      setError("Could not update business type");
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Your business types</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Activate only the business types this organisation operates. Each active business type appears independently in the sidebar; the broader Industry category stays behind the scenes.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {listIndustries().map((industrySummary) => {
          const industry = getIndustry(industrySummary.id);
          if (!industry) return null;
          const entitlement = entitlementByIndustry.get(industry.id);
          return (
            <div key={industry.id} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>{iconByIndustry.get(industry.id) ?? "🧩"}</span>
                <h3 className="font-semibold text-white">{industry.name}</h3>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {industry.templates.map((template) => {
                  const active = entitlement?.activeTemplateIds.includes(template.id) ?? false;
                  const available = isTemplateActivatable(template.status);
                  const busy = busyId === template.id;
                  return (
                    <div key={template.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{template.name}</p>
                        <p className={`mt-0.5 text-[11px] ${active ? "text-emerald-400" : "text-slate-500"}`}>
                          {active ? "Active" : available ? "Available" : "Coming soon"}
                        </p>
                      </div>
                      {available ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void update(template.id, !active)}
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${active ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-slate-800 text-slate-300 ring-1 ring-slate-700"}`}
                        >
                          {busy ? "…" : active ? "On" : "Add"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        Need billing or subscription changes? <Link href="/dashboard/settings/billing" className="text-blue-400 hover:underline">Open Billing</Link>.
      </p>
    </div>
  );
}