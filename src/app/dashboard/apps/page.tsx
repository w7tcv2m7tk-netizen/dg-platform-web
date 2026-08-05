import Link from "next/link";
import { getAppsByTier } from "@dg/platform-core";

export default function AppsPage() {
  const tiers = getAppsByTier();

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Apps</h1>
        <p className="text-sm text-slate-400">
          Core, Business, and Growth apps for your organisation
        </p>
      </header>
      <main className="flex-1 space-y-8 p-8">
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
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-sm text-slate-400">{subtitle}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map(({ manifest, enabled }) => (
          <div key={manifest.id} className="dg-card">
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl" aria-hidden>
                {manifest.icon}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  enabled
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {enabled ? "Installed" : "Available"}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-white">{manifest.name}</h3>
            <p className="mt-1 text-sm text-slate-400">{manifest.description}</p>
            <p className="mt-2 font-mono text-xs text-slate-500">
              v{manifest.version} · {manifest.entities.length} entities
            </p>
            {enabled && manifest.navigation[0] ? (
              <Link
                href={manifest.navigation[0].href}
                className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
              >
                Open app →
              </Link>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Coming soon</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
