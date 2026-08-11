import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessCommandCentre, getAppSetupHref } from "@dg/platform-core";

import { BusinessAppSubnav } from "@/components/business-apps/BusinessAppSubnav";
import {
  getBusinessAppRoute,
  getBusinessAppScaffold,
  type BusinessAppScaffoldId,
} from "@/lib/business-app-scaffolds";
import { getPlatformPageContext } from "@/lib/org-apps";

export async function BusinessAppScaffoldPage({
  appId,
  segment = "",
}: {
  appId: BusinessAppScaffoldId;
  segment?: string;
}) {
  const app = getBusinessAppScaffold(appId);
  const route = getBusinessAppRoute(app, segment);
  if (!route) notFound();

  const { session: platformSession } = await getPlatformPageContext();
  const isOverview = segment === "";
  const activeHref = isOverview ? `/apps/${app.id}` : `/apps/${app.id}/${segment}`;

  const showStaffDoc =
    platformSession &&
    canAccessCommandCentre({
      organisationId: platformSession.organisationId,
      organisationName: platformSession.organisationName,
      organisationSlug: platformSession.organisationSlug,
      role: platformSession.role,
    });

  return (
    <>
      <header className="dg-page-header">
        <Link
          href={isOverview ? "/dashboard" : `/apps/${app.id}`}
          className="text-sm text-sky-400 hover:underline"
        >
          {isOverview ? "← Overview" : `← ${app.name} overview`}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">{route.title}</h1>
        <p className="text-sm text-slate-400">
          {platformSession?.organisationName ?? "DigitalGate"} · {route.summary}
        </p>
        <BusinessAppSubnav links={app.nav} active={activeHref} />
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-amber-200">{app.deferredTitle}</p>
          <p className="mt-1 text-slate-400">{app.deferredBody}</p>
          {app.gen1Note ? <p className="mt-2 text-xs text-slate-500">{app.gen1Note}</p> : null}
        </div>

        {showStaffDoc ? (
          <p className="text-xs text-slate-500">
            Staff:{" "}
            <Link
              href={`/command/docs/${app.staffDocSlug}`}
              className="text-sky-400 hover:underline"
            >
              {app.staffDocLabel}
            </Link>
          </p>
        ) : null}

        <section className="dg-card border-dashed border-slate-700">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Honest empty
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">{route.emptyTitle}</h2>
          <p className="mt-2 text-sm text-slate-400">{route.emptyBody}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={getAppSetupHref(app.id)}
              className="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/15"
            >
              Setup guide
            </Link>
            <Link
              href="/dashboard/apps"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600"
            >
              Browse apps
            </Link>
          </div>
        </section>

        {isOverview ? (
          <>
            <section className="dg-card">
              <h2 className="font-semibold text-white">Use platform Core</h2>
              <p className="mt-1 text-xs text-slate-500">
                Not separate silos — same objects as the rest of DigitalGate when this app ships.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {app.coreLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sky-400 hover:underline">
                      {link.label}
                    </Link>{" "}
                    — {link.note}
                  </li>
                ))}
              </ul>
            </section>

            <section className="dg-card">
              <h2 className="font-semibold text-white">Scaffold routes (product map)</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                {app.nav
                  .filter((l) => l.href !== `/apps/${app.id}`)
                  .map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-slate-300">
                        {link.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}
