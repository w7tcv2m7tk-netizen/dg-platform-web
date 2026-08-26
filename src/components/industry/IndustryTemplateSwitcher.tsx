"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  INDUSTRY_COMMERCIAL_LOCK,
  getIndustry,
  getTemplate,
  industryIdFromPathname,
  isTemplateActivatable,
  type IndustryCatalogueTemplate,
  type ResolvedIndustryEntitlement,
} from "@dg/platform-core";

type EntitlementsPayload = {
  industries: ResolvedIndustryEntitlement[];
  activeTemplateIds: string[];
};

type TemplatesApiData = {
  entitlements: EntitlementsPayload;
  enabled: string[];
};

function statusLabel(
  template: IndustryCatalogueTemplate,
  entitlement: ResolvedIndustryEntitlement | undefined,
): {
  kind: "active-included" | "active-addon" | "available" | "coming" | "reserved";
  text: string;
} {
  const active = entitlement?.activeTemplateIds.includes(template.id) ?? false;
  const included = entitlement?.includedTemplateId === template.id;

  if (template.status === "ARCHITECTURE_RESERVED") {
    return { kind: "reserved", text: "Architecture reserved" };
  }
  if (template.status === "COMING_SOON" || !isTemplateActivatable(template.status)) {
    return { kind: "coming", text: "Coming soon" };
  }
  if (active && included) {
    return { kind: "active-included", text: "Active · Included" };
  }
  if (active) {
    return { kind: "active-addon", text: "Active" };
  }
  return {
    kind: "available",
    text: INDUSTRY_COMMERCIAL_LOCK.additionalTemplatePrice,
  };
}

export function IndustryTemplateSwitcher({
  industryId: industryIdProp,
  initialEntitlements,
}: {
  industryId?: string | null;
  initialEntitlements?: EntitlementsPayload | null;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const industryId = industryIdProp ?? industryIdFromPathname(pathname);

  const [entitlements, setEntitlements] = useState<EntitlementsPayload | null>(
    initialEntitlements ?? null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/org/industry/templates");
      if (!res.ok) return;
      const json = (await res.json()) as { data?: TemplatesApiData };
      if (json.data?.entitlements) {
        setEntitlements(json.data.entitlements);
      }
    } catch {
      // Non-blocking for F10 — sidebar still works without switcher data
    }
  }, []);

  useEffect(() => {
    if (initialEntitlements) return;
    void load();
  }, [initialEntitlements, load]);

  const industry = useMemo(
    () => (industryId ? getIndustry(industryId) : undefined),
    [industryId],
  );

  const entitlement = useMemo(
    () => entitlements?.industries.find((e) => e.industryId === industryId),
    [entitlements, industryId],
  );

  const patchTemplate = useCallback(
    async (templateId: string, action: "activate" | "deactivate") => {
      setBusyId(templateId);
      setError(null);
      try {
        const res = await fetch("/api/v1/org/industry/templates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, templateId }),
        });
        const json = (await res.json().catch(() => null)) as {
          data?: TemplatesApiData;
          error?: { message?: string };
        } | null;
        if (!res.ok) {
          setError(json?.error?.message ?? "Could not update template");
          return;
        }
        if (json?.data?.entitlements) {
          setEntitlements(json.data.entitlements);
        }
        router.refresh();
      } catch {
        setError("Could not update template");
      } finally {
        setBusyId(null);
      }
    },
    [router],
  );

  if (!industry) return null;

  return (
    <div className="mb-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {industry.name}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {industry.templates.map((template) => {
          const label = statusLabel(template, entitlement);
          const isBusy = busyId === template.id;
          const href = template.primaryHref.split("?")[0] ?? template.primaryHref;
          const isCurrent =
            pathname === href ||
            pathname.startsWith(`${href}/`) ||
            (getTemplate(template.id)?.primaryHref &&
              pathname.startsWith(
                (template.primaryHref.split("?")[0] ?? template.primaryHref) + "/",
              ));

          return (
            <div
              key={template.id}
              className={`min-w-[9.5rem] shrink-0 rounded-lg border px-3 py-2 ${
                isCurrent
                  ? "border-sky-500/40 bg-sky-500/10"
                  : "border-slate-700/80 bg-slate-900/40"
              }`}
            >
              {label.kind === "active-included" || label.kind === "active-addon" ? (
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => router.push(template.primaryHref)}
                >
                  <span className="block text-sm font-medium text-white">{template.name}</span>
                  <span className="mt-0.5 block text-[11px] text-emerald-400/90">{label.text}</span>
                </button>
              ) : (
                <div>
                  <span className="block text-sm font-medium text-slate-200">{template.name}</span>
                  <span
                    className={`mt-0.5 block text-[11px] ${
                      label.kind === "available" ? "text-sky-300/90" : "text-slate-500"
                    }`}
                  >
                    {label.text}
                  </span>
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {label.kind === "active-addon" ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void patchTemplate(template.id, "deactivate")}
                    className="rounded border border-slate-600 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:border-slate-500 disabled:opacity-50"
                  >
                    {isBusy ? "…" : "Manage"}
                  </button>
                ) : null}
                {label.kind === "available" ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void patchTemplate(template.id, "activate")}
                    className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-200 hover:bg-sky-500/25 disabled:opacity-50"
                  >
                    {isBusy ? "…" : "Activate"}
                  </button>
                ) : null}
                {label.kind === "coming" || label.kind === "reserved" ? (
                  <span className="rounded border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-500">
                    Unavailable
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      <p className="text-[10px] text-slate-600">
        Industry {INDUSTRY_COMMERCIAL_LOCK.industryPrice} · extra templates{" "}
        {INDUSTRY_COMMERCIAL_LOCK.additionalTemplatePrice}.{" "}
        <Link href="/dashboard/marketplace" className="text-slate-500 underline-offset-2 hover:underline">
          Marketplace
        </Link>
      </p>
    </div>
  );
}
