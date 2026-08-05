import Link from "next/link";

import {

  getAppsByTier,

  getAppSetupGuide,

  getAppSetupHref,

  getRoadmapForApp,

  getRoadmapItemByHref,

  getRoadmapSummary,

  platformApps,

} from "@dg/platform-core";



import { PlatformRoadmapBar } from "@/components/platform/PlatformRoadmapBar";

import { RoadmapStatusBadge } from "@/components/platform/RoadmapStatusBadge";



export default function AppsPage() {

  const tiers = getAppsByTier();

  const summary = getRoadmapSummary();

  const allApps = platformApps.list();



  return (

    <>

      <PlatformRoadmapBar />

      <header className="border-b border-slate-800 px-8 py-5">

        <h1 className="text-2xl font-bold text-white">Apps</h1>

        <p className="text-sm text-slate-400">

          {allApps.length} apps · {summary.percentComplete}% platform complete

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

          const roadmap = getRoadmapForApp(manifest.id);

          const doneCount = roadmap.filter((r) => r.status === "done").length;

          const primaryStatus = enabled

            ? roadmap.some((r) => r.status === "in_progress")

              ? "in_progress"

              : roadmap.some((r) => r.status === "scaffold")

                ? "scaffold"

                : roadmap.some((r) => r.status === "done")

                  ? "done"

                  : "planned"

            : "planned";



          const navIcon = manifest.navigation[0]?.icon ?? manifest.icon;
          const setupGuide = getAppSetupGuide(manifest.id);



          return (

            <div key={manifest.id} className="dg-card flex flex-col">

              <div className="flex items-start justify-between gap-2">

                <span className="text-xl text-blue-500" aria-hidden>

                  {navIcon}

                </span>

                <div className="flex flex-wrap justify-end gap-1">

                  <RoadmapStatusBadge status={primaryStatus} />

                  {!enabled ? (

                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">

                      Not installed

                    </span>

                  ) : null}

                </div>

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

                v{manifest.version}

                {roadmap.length

                  ? ` · ${doneCount}/${roadmap.length} features done`

                  : ` · ${manifest.routes.length} routes`}

              </p>



              <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">

                {manifest.routes.map((route) => {
                  const routeItem = getRoadmapItemByHref(route.path);
                  const status = routeItem?.status ?? "planned";

                  return (

                    <li

                      key={route.path}

                      className="flex items-center justify-between gap-2 text-xs"

                    >

                      <Link

                        href={route.path}

                        className="truncate text-slate-300 hover:text-blue-300"

                      >

                        {route.label}

                      </Link>

                      <RoadmapStatusBadge status={status} />

                    </li>

                  );

                })}

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


