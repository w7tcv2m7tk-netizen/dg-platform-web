import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listPlatformOpportunities } from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";

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

/**
 * Core Opportunities module — full ranked list for the active org.
 * Command Centre orchestrates the same engine for staff; this is the tenant workspace.
 */
export default async function OpportunitiesAppPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
      })
    : null;

  const data =
    process.env.DATABASE_URL && session?.organisationId
      ? await listPlatformOpportunities({
          scope: "org",
          organisationId: session.organisationId,
          limit: 50,
        })
      : null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Opportunities</h1>
        <p className="mt-1 text-sm text-slate-400">
          Everything worth acting on for this business — ranked by urgency and score. Command
          Centre prioritises what matters most today; this module is the full list.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Sign in and connect the database to see opportunities for your organisation.
          </div>
        ) : !data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not connected — opportunities unavailable.
          </div>
        ) : (
          <>
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

            <p className="text-xs text-slate-500">{data.honestyNote}</p>

            {!data.items.length ? (
              <p className="text-sm text-slate-500">No opportunities detected for this business yet.</p>
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
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{item.summary}</p>
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
