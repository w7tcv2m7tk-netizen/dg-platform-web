import Link from "next/link";

import {
  getAppsByTier,
  getAppSetupGuide,
  getAppSetupHref,
  platformApps,
} from "@dg/platform-core";

import { AppInstallToggle } from "@/components/platform/AppInstallToggle";
import { AppsOnboardingSection } from "@/components/platform/AppsOnboardingSection";
import { AppsPlanSection } from "@/components/platform/AppsPlanSection";

const DIGITALGATE_WEBSITE = "https://digitalgate.com.au";

export default function AppsPage() {
  const tiers = getAppsByTier();
  const allApps = platformApps.list();

  return (
    <>
      <header className="dg-page-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Apps & plan</h1>
            <p className="text-sm text-slate-400">
              {allApps.length} apps · configure your subscription below
            </p>
          </div>
          <a
            href={DIGITALGATE_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
          >
            digitalgate.com.au
            <span aria-hidden className="text-slate-500">
              ↗
            </span>
          </a>
        </div>
      </header>

      <main className="dg-page-main space-y-8">
        <AppsOnboardingSection />
        <AppsPlanSection />

        <AppTierSection
          title="Core Apps"
          subtitle="Always available — your business operating system"
          apps={tiers.core}
        />

        <AppTierSection
          title="Business Apps"
          subtitle="Industry verticals"
          apps={tiers.business}
        />

        <AppTierSection
          title="Growth Apps"
          subtitle="SEO, AI Visibility, marketing, and analytics"
          apps={tiers.growth}
        />

        <AppTierSection
          title="Internal Apps"
          subtitle="DigitalGate staff only"
          apps={tiers.internal}
        />
      </main>
    </>
  );
}

function AppTierSection({
  title,
  subtitle,
  apps,
}: {
  title: string;
  subtitle: string;
  apps: ReturnType<typeof getAppsByTier>["core"];
}) {
  if (!apps.length) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-sm text-slate-400">{subtitle}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map(({ manifest, enabled }) => {
          const navIcon = manifest.navigation[0]?.icon ?? manifest.icon;
          const setupGuide = getAppSetupGuide(manifest.id);

          return (
            <div key={manifest.id} className="dg-card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xl text-blue-500" aria-hidden>
                  {navIcon}
                </span>
                <AppInstallToggle appId={manifest.id} installed={enabled} />
              </div>

              <h3 className="mt-3 font-semibold text-white">{manifest.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{manifest.description}</p>

              {setupGuide ? (
                <Link
                  href={getAppSetupHref(manifest.id)}
                  className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 transition hover:border-blue-400/50 hover:bg-blue-500/15"
                >
                  <span aria-hidden>◎</span>
                  Setup guide
                </Link>
              ) : null}

              <p className="mt-2 font-mono text-xs text-slate-500">
                v{manifest.version} · {manifest.routes.length} routes
              </p>

              <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
                {manifest.routes.map((route) => (
                  <li key={route.path} className="text-xs">
                    <Link
                      href={route.path}
                      className="truncate text-slate-300 hover:text-blue-300"
                    >
                      {route.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
                {enabled && manifest.navigation[0] ? (
                  <Link
                    href={manifest.navigation[0].href}
                    className="text-sm font-medium text-blue-400 hover:underline"
                  >
                    Open app →
                  </Link>
                ) : manifest.routes[0] ? (
                  <Link
                    href={manifest.routes[0].path}
                    className="text-sm font-medium text-blue-400 hover:underline"
                  >
                    Preview routes →
                  </Link>
                ) : null}

                {setupGuide ? (
                  <Link
                    href={getAppSetupHref(manifest.id)}
                    className="text-sm text-slate-500 hover:text-slate-300"
                  >
                    Full setup guide →
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
