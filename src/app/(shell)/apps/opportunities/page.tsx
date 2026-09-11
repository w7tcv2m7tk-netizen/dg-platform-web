import Link from "next/link";
import { listPlatformOpportunities } from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function severityClass(severity: string) {
  switch (severity) {
    case "critical":
      return "text-red-400 border-red-500/30 bg-red-500/10";
    case "high":
      return "text-amber-300 border-amber-500/30 bg-amber-500/10";
    case "medium":
      return "text-sky-300 border-sky-500/30 bg-sky-500/10";
    default:
      return "text-slate-300 border-slate-600 bg-slate-800/40";
  }
}

export default async function OpportunitiesAppPage() {
  const session = await getAuthorisedPlatformPageSession("opportunities.view");

  let data: Awaited<ReturnType<typeof listPlatformOpportunities>> | null = null;
  let loadFailed = false;

  if (session?.organisationId) {
    try {
      data = await listPlatformOpportunities({
        scope: "org",
        organisationId: session.organisationId,
        limit: 50,
      });
    } catch (error) {
      loadFailed = true;
      console.error("[opportunities] failed to load organisation opportunities", error);
    }
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Opportunities</h1>
        <p className="mt-1 text-sm text-slate-400">
          {session?.organisationName ?? "Your organisation"} · growth opportunities identified across your enabled DigitalGate workflows, ranked to help your team decide what to act on next.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Sign in to view opportunities for your organisation.
          </div>
        ) : loadFailed || !data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Opportunities are temporarily unavailable. Try again shortly.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-4">
              <p className="text-sm text-slate-300">
                Opportunities brings together useful commercial signals from enabled apps so your team can prioritise follow-up without hunting across the platform.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <Link href="/apps/crm/opportunities" className="text-sky-400 hover:underline">
                  Open CRM opportunities →
                </Link>
                <Link href="/apps/prospecting" className="text-sky-400 hover:underline">
                  Open Prospecting →
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-red-300">Need attention</p>
                <p className="mt-1 text-3xl font-semibold text-white">{data.attentionCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-emerald-300">All opportunities</p>
                <p className="mt-1 text-3xl font-semibold text-white">{data.opportunityCount}</p>
              </div>
            </div>

            {!data.items.length ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-5">
                <p className="text-sm font-medium text-white">No opportunities detected yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  As DigitalGate receives useful signals from CRM, Prospecting and other enabled apps, prioritised opportunities will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Opportunity</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Next</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {data.items.map((item) => (
                      <tr key={item.id} className="bg-slate-950/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.summary}</p>
                          {item.impactLabel ? (
                            <p className="mt-1 text-xs text-slate-500">{item.impactLabel}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{item.kind}</td>
                        <td className="px-4 py-3 font-medium tabular-nums text-emerald-400">
                          {item.score}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${severityClass(item.severity)}`}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.href ? (
                            <Link href={item.href} className="text-sky-400 hover:underline">
                              {item.recommendedAction}
                            </Link>
                          ) : (
                            <span className="text-slate-400">{item.recommendedAction}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
