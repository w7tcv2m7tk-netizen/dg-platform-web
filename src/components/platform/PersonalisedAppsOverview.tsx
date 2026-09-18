"use client";

import Link from "next/link";
import { platformApps } from "@dg/platform-core/apps/registry";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { GROWTH_APP_CATALOG, INDUSTRY_PLATFORM_CATALOG } from "@/lib/pricing-catalog";

type PersonalisedAppsOverviewProps = {
  industrySelectionIds: string[];
  organisationName?: string | null;
};

function appHref(appId?: string) {
  if (!appId) return undefined;
  const manifest = platformApps.get(appId)?.manifest;
  return manifest?.navigation[0]?.href ?? manifest?.routes[0]?.path ?? undefined;
}

export function PersonalisedAppsOverview({ industrySelectionIds, organisationName }: PersonalisedAppsOverviewProps) {
  const { enabledIds } = useEnabledApps();
  const selectedIds = new Set(industrySelectionIds);
  const hasExplicitIndustrySelection = selectedIds.size > 0;

  const industryPlatforms = INDUSTRY_PLATFORM_CATALOG.flatMap((platform) => {
    // A shared Industry App id (for example `services`) is an umbrella entitlement,
    // not permission to expose every trade that happens to use the same engine.
    // Only exact sub-industry/template ids are rendered as specialisations.
    const explicitSpecialisations = platform.specialisations.filter((spec) => selectedIds.has(spec.id));
    const umbrellaSelected = platform.specialisations.some(
      (spec) => Boolean(spec.appId && selectedIds.has(spec.appId)),
    );

    if (explicitSpecialisations.length > 0) {
      return [{ platform, specialisations: explicitSpecialisations, needsTemplate: false }];
    }

    const enabledForPlatform = platform.specialisations.some(
      (spec) => spec.appId && enabledIds.includes(spec.appId),
    );

    if (umbrellaSelected || (!hasExplicitIndustrySelection && enabledForPlatform)) {
      return [{ platform, specialisations: [], needsTemplate: true }];
    }

    return [];
  });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Your workspace</p>
            <h2 className="mt-2 text-xl font-bold text-white">Apps for {organisationName?.trim() || "your business"}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              DigitalGate only shows the Industry Apps and business types relevant to this organisation. Other industries stay out of the way until you choose to add them.
            </p>
          </div>
          <Link href="/dashboard/apps/catalogue" className="inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-blue-500 hover:text-white">
            + Add another industry
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Industry Apps</p>
          <h2 className="mt-2 text-xl font-bold text-white">Built around how you operate</h2>
          <p className="mt-1 text-sm text-slate-400">Only active industries and selected business types are shown here.</p>
        </div>

        {industryPlatforms.length ? (
          <div className="space-y-5">
            {industryPlatforms.map(({ platform, specialisations, needsTemplate }) => (
              <div key={platform.platformId} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="text-xl">{platform.icon}</span>
                      <h3 className="text-lg font-bold text-white">{platform.label}</h3>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-slate-400">{platform.description}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Active</span>
                </div>

                {specialisations.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {specialisations.map((spec) => {
                      const href = appHref(spec.appId);
                      return (
                        <div key={spec.id} className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                          <h4 className="font-semibold text-white">{spec.label}</h4>
                          <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-400">{spec.summary}</p>
                          {href ? <Link href={href} className="mt-4 text-xs font-semibold text-blue-400 hover:text-blue-300">Open {spec.label} →</Link> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : needsTemplate ? (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-sm text-slate-300">This Industry App is active. Choose the business type you operate so DigitalGate can tailor the workspace instead of showing every available sub-industry.</p>
                    <Link href="/dashboard/apps/catalogue#industry-apps" className="mt-2 inline-flex text-xs font-semibold text-blue-400 hover:text-blue-300">Choose business type →</Link>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-6">
            <h3 className="font-semibold text-white">No Industry App selected yet</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">Your onboarding profile can preselect the most relevant industry and business type. You can also add one manually at any time.</p>
            <Link href="/dashboard/apps/catalogue#industry-apps" className="mt-4 inline-flex rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-blue-500 hover:text-white">Choose an industry</Link>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Growth Apps</p>
          <h2 className="mt-2 text-xl font-bold text-white">Grow your business</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {["marketing", "advertising", ...GROWTH_APP_CATALOG.map((item) => item.appId)]
            .filter((id, index, all) => all.indexOf(id) === index && enabledIds.includes(id))
            .map((id) => {
              const app = platformApps.get(id)?.manifest;
              const href = appHref(id);
              return app && href ? (
                <Link key={id} href={href} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <h3 className="font-semibold text-white">{app.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{app.description}</p>
                  <span className="mt-4 inline-flex text-xs font-semibold text-blue-400">Open {app.name} →</span>
                </Link>
              ) : null;
            })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/35 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Need something else?</h2>
            <p className="mt-1 text-sm text-slate-400">Explore the full catalogue only when you want to extend this business into another industry or add another business type.</p>
          </div>
          <Link href="/dashboard/apps/catalogue" className="text-sm font-semibold text-blue-400 hover:text-blue-300">Explore all apps →</Link>
        </div>
      </section>
    </div>
  );
}
