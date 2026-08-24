"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getAppSetupGuide,
  getAppSetupHref,
} from "@dg/platform-core/app-guides";
import { platformApps } from "@dg/platform-core/apps/registry";

import { AppInstallToggle } from "@/components/platform/AppInstallToggle";
import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import type { PlatformTier } from "@/lib/plans";
import {
  GROWTH_APP_CATALOG,
  INDUSTRY_APP_CATALOG,
  INDUSTRY_PLATFORM_CATALOG,
  PLATFORM_ADDON_CATALOG,
  PLATFORM_CAPABILITY_CATALOG,
  PLATFORM_TIER_CATALOG,
  PRICING_PAGE_URL,
  type CatalogStatus,
} from "@/lib/pricing-catalog";

function statusBadge(status: CatalogStatus) {
  switch (status) {
    case "live":
      return (
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
          Available for Founding Customers
        </span>
      );
    case "soon":
      return (
        <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Coming soon
        </span>
      );
    case "rolling-out":
      return (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
          Early Access
        </span>
      );
    case "included":
      return (
        <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
          Included on Growth+
        </span>
      );
  }
}

function SectionHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
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
  badge,
  enabled,
  primaryHref,
  align = "center",
}: {
  appId: string;
  icon: string;
  label: string;
  price: string;
  description: string;
  status?: CatalogStatus;
  badge?: string;
  enabled: boolean;
  primaryHref?: string;
  align?: "left" | "center";
}) {
  const setupGuide = getAppSetupGuide(appId);
  const canToggle = Boolean(platformApps.get(appId));
  const isLeft = align === "left";

  return (
    <div
      className={`dg-plan-card flex flex-col ${isLeft ? "text-left" : "text-center"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl" aria-hidden>
          {icon}
        </span>
        <div className={`flex flex-wrap items-center gap-2 ${isLeft ? "justify-end" : ""}`}>
          {status && status !== "included" ? statusBadge(status) : null}
          {canToggle ? (
            <AppInstallToggle appId={appId} installed={enabled} />
          ) : null}
        </div>
      </div>
      {badge ? (
        <div className={`mt-2 flex ${isLeft ? "justify-start" : "justify-center"}`}>
          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
            {badge}
          </span>
        </div>
      ) : null}
      <h3 className="mt-2 font-semibold text-white">{label}</h3>
      <p className="mt-1 text-sm font-semibold text-blue-400">{price}</p>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">{description}</p>
      <div className={`mt-4 flex flex-wrap gap-2 ${isLeft ? "justify-start" : "justify-center"}`}>
        {enabled && primaryHref ? (
          <Link
            href={primaryHref}
            className="rounded-full border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500 hover:text-white"
          >
            Open app
          </Link>
        ) : null}
        {setupGuide && canToggle ? (
          <Link
            href={getAppSetupHref(appId)}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
          >
            Setup guide
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function AppsPlanCatalog() {
  const { enabledIds, applyPlan, resetApps, syncing } = useEnabledApps();
  const [activeTier, setActiveTier] = useState<PlatformTier>("professional");

  const selectionFromEnabled = useMemo(
    () => ({
      industryApps: INDUSTRY_APP_CATALOG.filter((item) =>
        enabledIds.includes(item.appId),
      ).map((item) => item.industryKey),
      premiumApps: GROWTH_APP_CATALOG.flatMap((item) =>
        item.premiumKey && enabledIds.includes(item.appId) ? [item.premiumKey] : [],
      ),
    }),
    [enabledIds],
  );

  const applyTier = (tier: PlatformTier) => {
    setActiveTier(tier);
    if (tier === "enterprise") return;
    void applyPlan({
      platformTier: tier,
      industryApps: selectionFromEnabled.industryApps,
      premiumApps: selectionFromEnabled.premiumApps,
    });
  };

  const appHref = (appId: string) => {
    const manifest = platformApps.get(appId)?.manifest;
    if (!manifest) return undefined;
    return (
      manifest.navigation[0]?.href ??
      manifest.routes[0]?.path ??
      undefined
    );
  };

  return (
    <div className="space-y-12">
      <nav
        className="sticky top-0 z-10 -mx-1 rounded-xl border border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur"
        aria-label="Plan sections"
      >
        <div className="flex flex-wrap gap-1 text-sm">
          <a href="#platform" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
            1 · Platform
          </a>
          <a href="#platform-apps" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
            2 · Capabilities
          </a>
          <a href="#apps" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
            3 · Apps
          </a>
          <a href="#growth-apps" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
            4 · Growth
          </a>
          <a href="#addons" className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white">
            5 · Add-ons
          </a>
          <a
            href={`${PRICING_PAGE_URL}#support-plans`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Support plans ↗
          </a>
        </div>
      </nav>

      <section id="platform" className="scroll-mt-24">
        <SectionHeader
          label="☁️ 1 · Platform"
          title="The platform is the product"
          description="Start with the core operating system. Add apps only when you need them. Applying a tier is preview-only (sidebar) — Subscribe under Billing is the paid Stripe path."
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {PLATFORM_TIER_CATALOG.map((tier) => {
            const isActive = activeTier === tier.key;
            const isEnterprise = tier.key === "enterprise";

            return (
              <div
                key={tier.key}
                data-active={isActive ? "true" : undefined}
                className="dg-plan-card relative flex flex-col"
              >
                {tier.popular ? (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                ) : null}
                <div className="flex items-center gap-2">
                  <span aria-hidden>{tier.icon}</span>
                  <h3 className="text-lg font-bold text-white">{tier.label}</h3>
                </div>
                <p className="mt-2 text-sm italic text-slate-400">&ldquo;{tier.outcome}&rdquo;</p>
                <p className="mt-3 text-2xl font-bold text-white">
                  {tier.price}
                  {tier.period ? (
                    <span className="text-sm font-normal text-slate-400">{tier.period}</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">{tier.users}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-300">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-emerald-400" aria-hidden>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                {isEnterprise ? (
                  <a
                    href="https://digitalgate.com.au/contact/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 block rounded-full border border-slate-600 py-2.5 text-center text-sm font-semibold text-slate-200 hover:border-slate-500"
                  >
                    Contact sales
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={() => applyTier(tier.key)}
                    className={`mt-5 rounded-full py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                      isActive
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "border border-slate-600 text-slate-200 hover:border-blue-500 hover:text-white"
                    }`}
                  >
                    {isActive ? "Preview applied" : "Apply preview"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={syncing}
            onClick={() => resetApps()}
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-50"
          >
            Reset defaults
          </button>
          <Link
            href="/signup/account"
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            New customer signup
          </Link>
          <Link
            href="/dashboard/settings/billing"
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            Subscribe / Billing →
          </Link>
          <a
            href={PRICING_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            View pricing & checkout ↗
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Founding Customers get preferential pricing toward Starter / Pro / Business when converting
          — not a beta seat. Apply preview (apply_plan) only updates sidebar prefs. Paid entitlements
          and Stripe customer linking happen via Subscribe checkout or purchase sync — never invented
          MRR.
        </p>
      </section>

      <section id="platform-apps" className="scroll-mt-24">
        <SectionHeader
          label="⬡ 2 · Platform Capabilities"
          title="Commerce, Documents, Communications, Design Studio & Infrastructure"
          description="Core operating capabilities — connected to your business. Toggle them into the Operate sidebar group."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_CAPABILITY_CATALOG.map((item) => (
            <CatalogAppCard
              key={item.appId}
              appId={item.appId}
              icon={item.icon}
              label={item.label}
              price={item.price}
              description={item.description}
              status={item.status}
              badge={item.badge}
              enabled={enabledIds.includes(item.appId)}
              primaryHref={appHref(item.appId)}
              align="left"
            />
          ))}
        </div>
      </section>

      <section id="apps" className="scroll-mt-24">
        <SectionHeader
          label="🧩 3 · Industry Apps"
          title="Built around how your business operates"
          description="Choose an Industry App ($99/mo), activate one Template included, then add more as you grow (+$29/mo each). Templates configure objects, pipelines, workflows and AI — not just the dashboard label. One platform. One source of truth."
        />
        <div id="industry-apps" className="scroll-mt-24 space-y-6">
          {INDUSTRY_PLATFORM_CATALOG.map((platform) => (
            <div
              key={platform.platformId}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-xl">
                      {platform.icon}
                    </span>
                    <h3 className="text-lg font-bold text-white">{platform.label}</h3>
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                      {platform.roadmap === "available"
                        ? "Available"
                        : platform.roadmap === "early-access"
                          ? "Early Access"
                          : platform.roadmap === "coming"
                            ? "Coming Soon"
                            : "Architecture Reserved"}
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-sm text-slate-400">{platform.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{platform.proposition}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{platform.price}</p>
                  <p className="text-[11px] text-slate-500">{platform.expansion}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {platform.specialisations.map((spec) => {
                  const appId = spec.appId;
                  const canToggle = Boolean(appId && platformApps.get(appId));
                  const enabled = appId ? enabledIds.includes(appId) : false;
                  const setupGuide = appId ? getAppSetupGuide(appId) : undefined;
                  const href = appId ? appHref(appId) : undefined;
                  return (
                    <div
                      key={spec.id}
                      className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-white">{spec.label}</h4>
                        {statusBadge(
                          spec.status === "future" || spec.status === "reserved"
                            ? "soon"
                            : (spec.status as CatalogStatus),
                        )}
                      </div>
                      <p className="mt-1 flex-1 text-xs text-slate-400">{spec.summary}</p>
                      {canToggle && appId ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <AppInstallToggle appId={appId} installed={enabled} />
                          {href ? (
                            <Link
                              href={href}
                              className="text-xs font-medium text-blue-400 hover:text-blue-300"
                            >
                              Open →
                            </Link>
                          ) : null}
                          {setupGuide ? (
                            <Link
                              href={getAppSetupHref(appId)}
                              className="text-xs text-slate-500 hover:text-slate-300"
                            >
                              Setup
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-[11px] text-slate-600">
                          Template planned — activate with Industry subscription
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Available: Property · Services. Early Access: Hospitality &amp; Accommodation · Finance ·
            Creator &amp; Media. Coming Soon: Professional · Health &amp; Wellness · Automotive ·
            Retail &amp; Commerce · Transport · Education. Architecture Reserved: Agriculture.
            Accommodation sits under Hospitality &amp; Accommodation — not Property. Accountants
            prefer Finance, not Professional.
          </p>
        </div>
      </section>

      <section id="growth-apps" className="scroll-mt-24">
        <SectionHeader
          label="📈 4 · Growth Apps"
          title="Visibility, acquisition and conversion"
          description="Reputation, SEO, AI visibility, automation, analytics, social, and communications — on top of the core platform."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {GROWTH_APP_CATALOG.map((item) => (
            <CatalogAppCard
              key={item.appId}
              appId={item.appId}
              icon={item.icon}
              label={item.label}
              price={item.price}
              description={item.description}
              status={item.status}
              badge={item.badge}
              enabled={enabledIds.includes(item.appId)}
              primaryHref={appHref(item.appId)}
            />
          ))}
        </div>
      </section>

      <section id="addons" className="scroll-mt-24">
        <SectionHeader
          label="➕ 5 · Platform add-ons"
          title="Extend your platform"
          description="Extra users and white label — add to any tier. Purchase on the website; toggles here control sidebar apps only."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_ADDON_CATALOG.map((addon) => (
            <div
              key={addon.key}
              className="dg-plan-card text-left"
            >
              <div className="text-2xl" aria-hidden>
                {addon.icon}
              </div>
              <h3 className="mt-2 font-semibold text-white">{addon.label}</h3>
              <p className="mt-1 text-sm font-semibold text-blue-400">{addon.price}</p>
              <p className="mt-2 text-xs text-slate-400">{addon.description}</p>
              <a
                href={addon.pricingHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-300 hover:border-blue-500 hover:text-white"
              >
                Add on ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="dg-card border-dashed border-slate-700 bg-slate-900/30 text-center">
        <p className="text-sm text-slate-400">
          Professional services and support plans are optional — same structure as{" "}
          <a
            href={PRICING_PAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            digitalgate.com.au/pricing
          </a>
          .
        </p>
      </section>
    </div>
  );
}
