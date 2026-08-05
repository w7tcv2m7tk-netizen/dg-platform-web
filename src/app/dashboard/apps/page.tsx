import Link from "next/link";
import {
  getAppsByTier,
  getRoadmapForApp,
  getRoadmapSummary,
} from "@dg/platform-core";

import { PlatformRoadmapBar } from "@/components/platform/PlatformRoadmapBar";
import { RoadmapStatusBadge } from "@/components/platform/RoadmapStatusBadge";

export default function AppsPage() {
  const tiers = getAppsByTier();
  const summary = getRoadmapSummary();

  return (
    <>
      <PlatformRoadmapBar />
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Apps</h1>
        <p className="text-sm text-slate-400">
          Core, Business, and Growth apps · {summary.percentComplete}% platform complete
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
        {apps.map(({ manifest, enabled }) => {
          const roadmap = getRoadmapForApp(manifest.id);
          const doneCount = roadmap.filter((r) => r.status === "done").length;
          const primaryStatus = enabled
            ? roadmap.some((r) => r.status === "in_progress")
              ? "in_progress"
              : roadmap.some((r) => r.status === "scaffold")
                ? "scaffold"
                : "done"
            : "planned";

          return (
            <div key={manifest.id} className="dg-card">
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>
                  {manifest.icon}
                </span>
                <RoadmapStatusBadge status={primaryStatus} />
              </div>
              <h3 className="mt-3 font-semibold text-white">{manifest.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{manifest.description}</p>
              <p className="mt-2 font-mono text-xs text-slate-500">
                v{manifest.version} · {roadmap.length ? `${doneCount}/${roadmap.length} features done` : `${manifest.entities.length} entities`}
              </p>

              {roadmap.length ? (
                <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
                  {roadmap.slice(0, 4).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      {item.href ? (
                        <Link href={item.href} className="truncate text-slate-300 hover:text-blue-300">
                          {item.label}
                        </Link>
                      ) : (
                        <span className="truncate text-slate-500">{item.label}</span>
                      )}
                      <RoadmapStatusBadge status={item.status} />
                    </li>
                  ))}
                  {roadmap.length > 4 ? (
                    <li className="text-xs text-slate-500">+{roadmap.length - 4} more</li>
                  ) : null}
                </ul>
              ) : null}

              {enabled && manifest.navigation[0] ? (
                <Link
                  href={manifest.navigation[0].href}
                  className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
                >
                  Open app →
                </Link>
              ) : manifest.routes[0] ? (
                <Link
                  href={manifest.routes[0].path}
                  className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
                >
                  Preview placeholder →
                </Link>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Coming soon</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
