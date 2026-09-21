"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { getAppSetupGuide, getAppSetupHref } from "@dg/platform-core/app-guides";
import { platformApps } from "@dg/platform-core/apps/registry";

import { AppInstallToggle } from "@/components/platform/AppInstallToggle";
import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { MarketingCatalogCard } from "@/components/platform/MarketingCatalogCard";
import type { PlatformTier } from "@/lib/plans";
import {
  COMMUNICATIONS_ADDON_CATALOG,
  GROWTH_APP_CATALOG,
  INDUSTRY_PLATFORM_CATALOG,
  PLATFORM_ADDON_CATALOG,
  PLATFORM_CAPABILITY_CATALOG,
  PLATFORM_TIER_CATALOG,
  PRICING_PAGE_URL,
  type CatalogStatus,
} from "@/lib/pricing-catalog";

function statusBadge(status: CatalogStatus) {
  const readiness = status === "soon" ? "Coming soon" : status === "rolling-out" ? "Early Access" : "Available";
  const classes =
    status === "soon"
      ? "bg-slate-700/80 text-slate-400"
      : status === "rolling-out"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-emerald-500/15 text-emerald-400";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes}`}>
      {readiness}
    </span>
  );
}

function SectionHeader({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">{label}</p>
      <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p>
    </div>
  );
}

function CatalogAppCard({
  appId,
  icon,
  label,
  price,
  description,
  status,
  enabled,
  primaryHref,
}: {
  appId: string;
  icon: string;
  label: string;
  price: string;
  description: string;
  status?: CatalogStatus;
  enabled: boolean;
  primaryHref?: string;
}) {
  const setupGuide = getAppSetupGuide(appId);
  const canToggle = Boolean(platformApps.get(appId));
  return (
    <div className="dg-plan-card flex flex-col text-left">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl" aria-hidden>{icon}</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {status ? statusBadge(status) : statusBadge("live")}
          {canToggle ? <AppInstallToggle appId={appId} installed={enabled} /> : null}
        </div>
      </div>
      <h3 className="mt-2 font-semibold text-white">{label}</h3>
      <p className="mt-1 text-sm font-semibold text-blue-400">{price}</p>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {enabled && primaryHref ? (
          <Link href={primaryHref} className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500 hover:text-white">
            Open app
          </Link>
        ) : null}
        {setupGuide && canToggle ? (
          <Link href={getAppSetupHref(appId)} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200">
            Setup guide
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function AppsPlanCatalog({ industryApps }: { industryApps: ReactNode }) {
  const { enabledIds, industrySelectionIds, applyPlan, resetApps, syncing, lastError, clearError } = useEnabledApps();
  const [activeTier, setActiveTier] = useState<PlatformTier>("professional");

  const selectionFromCurrentState = useMemo(() => {
    const selectedIds = new Set(industrySelectionIds);

    const canonicalIndustrySelections = INDUSTRY_PLATFORM_CATALOG.flatMap((platform) => {
      const selectedChildren = platform.specialisations
        .filter((specialisation) => selectedIds.has(specialisation.id))
        .map((specialisation) => specialisation.id);

      // Exact child Apps always beat their parent Industry marker.
      if (selectedChildren.length) return selectedChildren;

      // Legacy parent-only state: preserve the runtime that is already mounted,
      // but never infer or activate sibling children from the parent marker.
      if (selectedIds.has(platform.platformId)) {
        return Array.from(
          new Set(
            platform.specialisations.flatMap((specialisation) =>
              specialisation.appId && enabledIds.includes(specialisation.appId)
                ? [specialisation.appId]
                : [],
            ),
          ),
        );
      }

      return [];
    });

    const fallbackRuntimeSelections = INDUSTRY_PLATFORM_CATALOG.flatMap((platform) =>
      Array.from(
        new Set(
          platform.specialisations.flatMap((specialisation) =>
            specialisation.appId && enabledIds.includes(specialisation.appId)
              ? [specialisation.appId]
              : [],
          ),
        ),
      ),
    );

    return {
      industryApps: canonicalIndustrySelections.length
        ? canonicalIndustrySelections
        : fallbackRuntimeSelections,
      premiumApps: GROWTH_APP_CATALOG.flatMap((item) =>
        item.premiumKey && enabledIds.includes(item.appId) ? [item.premiumKey] : [],
      ),
    };
  }, [enabledIds, industrySelectionIds]);

  const applyTier = (tier: PlatformTier) => {
    setActiveTier(tier);
    if (tier === "enterprise") return;
    void applyPlan({ platformTier: tier, industryApps: selectionFromCurrentState.industryApps, premiumApps: selectionFromCurrentState.premiumApps });
  };

  const appHref = (appId: string) => {
    const manifest = platformApps.get(appId)?.manifest;
    return manifest?.navigation[0]?.href ?? manifest?.routes[0]?.path;
  };

  return (
    <div className="space-y-12">
      {lastError ? (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <p>{lastError}</p>
          <button type="button" onClick={clearError} className="shrink-0 text-rose-300/80 hover:text-rose-100">Dismiss</button>
        </div>
      ) : null}

      <nav className="sticky top-0 z-10 -mx-1 rounded-xl border border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur" aria-label="App Catalogue sections">
        <div className="flex flex-wrap gap-1 text-sm">
          <a href="#platform" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">1 · Platform</a>
          <a href="#platform-apps" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">2 · Platform Capabilities</a>
          <a href="#industry-apps" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">3 · Industry Apps</a>
          <a href="#growth-apps" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">4 · Growth Apps</a>
          <a href="#addons" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">5 · Platform Add-Ons</a>
        </div>
      </nav>

      <section id="platform" className="scroll-mt-24">
        <SectionHeader label="☁️ 1 · Platform" title="The platform is the product" description="Start with the core operating system. Add apps only when you need them. Applying a tier is preview-only; Subscribe under Billing is the paid path. Starter is 1 user / 1 business · Growth is up to 5 users / 1 business · Scale is unlimited users and up to 5 active businesses in total — not a reseller licence. Specialist Industry integrations require Scale or Enterprise plus the relevant Industry App. Growth Suite + Industry $499 is an add-on and does not grant Scale entitlements." />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {PLATFORM_TIER_CATALOG.map((tier) => {
            const isActive = activeTier === tier.key;
            const isEnterprise = tier.key === "enterprise";
            return (
              <div key={tier.key} data-active={isActive ? "true" : undefined} className="dg-plan-card relative flex flex-col">
                {tier.popular ? <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Most popular</span> : null}
                <div className="flex items-center gap-2"><span aria-hidden>{tier.icon}</span><h3 className="text-lg font-bold text-white">{tier.label}</h3></div>
                <p className="mt-2 text-sm italic text-slate-400">&ldquo;{tier.outcome}&rdquo;</p>
                <p className="mt-3 text-2xl font-bold text-white">{tier.price}{tier.period ? <span className="text-sm font-normal text-slate-400">{tier.period}</span> : null}</p>
                <p className="text-xs text-slate-500">{tier.users}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-300">
                  {tier.features.map((feature) => <li key={feature} className="flex gap-2"><span className="text-emerald-400" aria-hidden>✓</span>{feature}</li>)}
                </ul>
                {isEnterprise ? (
                  <a href="https://digitalgate.com.au/contact/" target="_blank" rel="noopener noreferrer" className="mt-5 block rounded-full border border-slate-600 py-2.5 text-center text-sm font-semibold text-slate-200 hover:border-slate-500">Contact sales</a>
                ) : (
                  <button type="button" disabled={syncing} onClick={() => applyTier(tier.key)} className={`mt-5 rounded-full py-2.5 text-sm font-semibold transition disabled:opacity-50 ${isActive ? "bg-blue-600 text-white hover:bg-blue-500" : "border border-slate-600 text-slate-200 hover:border-blue-500 hover:text-white"}`}>
                    {isActive ? "Preview applied" : "Apply preview"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" disabled={syncing} onClick={() => resetApps()} className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-50">Reset defaults</button>
          <Link href="/dashboard/settings/billing" className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500">Subscribe / Billing →</Link>
          <a href={PRICING_PAGE_URL} target="_blank" rel="noopener noreferrer" className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500">View pricing & checkout ↗</a>
        </div>
      </section>

      <section id="platform-apps" className="scroll-mt-24">
        <SectionHeader label="⬡ 2 · Platform Capabilities" title="Commerce, Documents, Communications, Design Studio & Infrastructure" description="Core operating capabilities connected to your business." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_CAPABILITY_CATALOG.map((item) => (
            <CatalogAppCard key={item.appId} appId={item.appId} icon={item.icon} label={item.label} price={item.price} description={item.description} status={item.status} enabled={enabledIds.includes(item.appId)} primaryHref={appHref(item.appId)} />
          ))}
        </div>
      </section>

      <section id="industry-apps" className="scroll-mt-24">
        <SectionHeader label="🧩 3 · Industry Apps" title="Built around how your business operates" description="Choose the exact sub-industry Apps this organisation operates. Active sub-industry Apps appear independently in the sidebar; unselected siblings remain here in Apps until needed. Specialist Industry integrations and API access require Scale or Enterprise plus the relevant Industry App — Scale does not include every Industry App." />
        {industryApps}
      </section>

      <section id="growth-apps" className="scroll-mt-24">
        <SectionHeader label="📈 4 · Growth Apps" title="Visibility, acquisition and conversion" description="Marketing plus specialist Growth Apps for visibility, acquisition, automation, reputation and reporting." />
        <MarketingCatalogCard />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {GROWTH_APP_CATALOG.map((item) => (
            <CatalogAppCard key={item.appId} appId={item.appId} icon={item.icon} label={item.label} price={item.price} description={item.description} status={item.status} enabled={enabledIds.includes(item.appId)} primaryHref={appHref(item.appId)} />
          ))}
        </div>
      </section>

      <section id="addons" className="scroll-mt-24">
        <SectionHeader label="➕ 5 · Platform Add-Ons" title="Extend your platform" description="Extra users, white label and Advanced AI Communications under Core." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_ADDON_CATALOG.map((addon) => (
            <div key={addon.key} className="dg-plan-card text-left">
              <div className="text-2xl" aria-hidden>{addon.icon}</div>
              <h3 className="mt-2 font-semibold text-white">{addon.label}</h3>
              <p className="mt-1 text-sm font-semibold text-blue-400">{addon.price}</p>
              <p className="mt-2 text-xs text-slate-400">{addon.description}</p>
              <a href={addon.pricingHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-300 hover:border-blue-500 hover:text-white">Add on ↗</a>
            </div>
          ))}
          {COMMUNICATIONS_ADDON_CATALOG.map((item) => (
            <div key={item.id} className="dg-plan-card text-left">
              <div className="text-2xl" aria-hidden>{item.icon}</div>
              <h3 className="mt-2 font-semibold text-white">{item.label}</h3>
              <p className="mt-1 text-sm font-semibold text-blue-400">{item.price}</p>
              <p className="mt-2 text-xs text-slate-400">{item.description}</p>
              {item.href ? <Link href={item.href} className="mt-4 inline-block rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-300 hover:border-blue-500 hover:text-white">Open →</Link> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}