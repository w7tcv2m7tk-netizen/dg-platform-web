import Link from "next/link";
import { listPlatformOpportunities } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { OpportunityCreateTaskButton } from "@/components/command/OpportunityCreateTaskButton";

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

export default async function CommandOpportunitiesPage() {
  const data = process.env.DATABASE_URL
    ? await listPlatformOpportunities({ scope: "staff", limit: 40 })
    : null;

  const attention =
    data?.items.filter(
      (i) =>
        i.severity === "critical" ||
        i.severity === "high" ||
        i.kind === "attention" ||
        i.kind === "follow_up",
    ) ?? [];
  const attentionIds = new Set(attention.map((i) => i.id));
  const rest = data?.items.filter((i) => !attentionIds.has(i.id)) ?? [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Opportunities</h1>
        <p className="mt-1 text-sm text-slate-400">
          What matters across your portfolio — and what to do next. Powered by DigitalGate
          Opportunity Engine™ (Platform Core).
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="opportunities" />

        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — opportunities unavailable.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-red-300">Need attention</p>
                <p className="mt-1 text-3xl font-semibold text-white">{data.attentionCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-emerald-300">Opportunities</p>
                <p className="mt-1 text-3xl font-semibold text-white">{data.opportunityCount}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Engine</p>
                <p className="mt-2 text-sm text-slate-300">{data.engine}</p>
                <Link
                  href="/command/opportunities/expansion"
                  className="mt-3 inline-block text-sm text-sky-400 hover:underline"
                >
                  Client expansion catalogue →
                </Link>
              </div>
            </div>

            <p className="text-xs text-slate-500">{data.honestyNote}</p>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                Need attention
                {attention.length ? (
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({attention.length})
                  </span>
                ) : null}
              </h2>
              {!attention.length ? (
                <p className="text-sm text-slate-500">Nothing critical right now.</p>
              ) : (
                <ul className="space-y-3">
                  {attention.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${severityClass(item.severity)}`}
                            >
                              {item.severity}
                            </span>
                            <span className="text-xs text-slate-500">{item.kind}</span>
                            <span className="text-xs font-medium text-emerald-400">
                              Score {item.score}
                            </span>
                          </div>
                          <h3 className="mt-2 font-semibold text-white">{item.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">{item.summary}</p>
                          {item.reasons[0] ? (
                            <p className="mt-2 text-xs text-slate-500">Why: {item.reasons[0]}</p>
                          ) : null}
                          <p className="mt-2 text-sm text-sky-300">
                            Next: {item.recommendedAction}
                          </p>
                          {item.impactLabel ? (
                            <p className="mt-1 text-xs text-slate-500">{item.impactLabel}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Link
                            href={item.href}
                            className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                          >
                            Open →
                          </Link>
                          {item.executeHints?.includes("task") ? (
                            <OpportunityCreateTaskButton
                              organisationId={item.organisationId}
                              opportunityId={item.id}
                              title={item.recommendedAction || item.title}
                              description={`${item.summary}\n\nWhy: ${item.reasons[0] ?? "Opportunity Engine"}`}
                            />
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                More opportunities
                {rest.length ? (
                  <span className="ml-2 text-sm font-normal text-slate-500">({rest.length})</span>
                ) : null}
              </h2>
              {!rest.length ? (
                <p className="text-sm text-slate-500">No additional ranked opportunities.</p>
              ) : (
                <ul className="space-y-3">
                  {rest.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500">
                            Score {item.score} · {item.kind}
                            {item.organisationName ? ` · ${item.organisationName}` : ""}
                          </p>
                          <h3 className="mt-1 font-medium text-white">{item.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">{item.recommendedAction}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Link href={item.href} className="text-sm text-sky-400 hover:underline">
                            Open →
                          </Link>
                          {item.executeHints?.includes("task") ? (
                            <OpportunityCreateTaskButton
                              organisationId={item.organisationId}
                              opportunityId={item.id}
                              title={item.recommendedAction || item.title}
                              description={item.summary}
                            />
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap gap-4 text-sm">
              <Link href="/command/growth-engine" className="text-sky-400 hover:underline">
                Prospecting / Growth Engine →
              </Link>
              <Link href="/command" className="text-sky-400 hover:underline">
                Ops home priorities →
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
