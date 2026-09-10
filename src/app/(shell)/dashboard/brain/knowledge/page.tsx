import Link from "next/link";
import { isOrgAdminRole, listKnowledgeInbox } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  approveKnowledgeAction,
  proposeKnowledgeAction,
  rejectKnowledgeAction,
} from "./actions";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function importanceClasses(importance: string) {
  if (importance === "critical") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (importance === "high") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-slate-700 bg-slate-900/60 text-slate-300";
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BusinessBrainKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session } = await getPlatformPageContext();
  const items = session ? await listKnowledgeInbox(session.organisationId, 250) : [];
  const canGovern = Boolean(session && isOrgAdminRole(session.role));
  const params = await searchParams;
  const notice = firstParam(params.notice);
  const tone = firstParam(params.tone) === "error" ? "error" : "success";

  const counts = items.reduce<Record<string, number>>((result, item) => {
    result[item.type] = (result[item.type] ?? 0) + 1;
    return result;
  }, {});

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-400/90">
          Business · Business Brain · Knowledge
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Knowledge Inbox</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Add what DigitalGate should understand about your business, and review knowledge discovered
          from authorised sources before it becomes approved organisational truth used by Business Brain
          and Advisor.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/brain" className="text-sky-400 hover:underline">
            ← Business Brain
          </Link>
          <Link href="/apps/documents/library" className="text-sky-400 hover:underline">
            Documents library →
          </Link>
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            AI Advisor →
          </Link>
        </div>
      </header>

      <main className="dg-page-main space-y-6">
        {notice ? (
          <div
            role="status"
            aria-live="polite"
            className={`dg-card ${tone === "error" ? "border-red-500/30" : "border-emerald-500/30"}`}
          >
            <p className={`text-sm ${tone === "error" ? "text-red-300" : "text-emerald-300"}`}>
              {notice}
            </p>
          </div>
        ) : null}

        {!session ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-sm text-amber-300">Sign in to review Business Brain knowledge.</p>
          </div>
        ) : (
          <>
            {canGovern ? (
              <section className="dg-card border-sky-500/20">
                <p className="text-xs font-medium uppercase tracking-widest text-sky-400/90">
                  Teach Business Brain
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">Add organisational knowledge</h2>
                <p className="mt-1 max-w-3xl text-sm text-slate-400">
                  Add a fact, decision, strategy, policy, process or principle that DigitalGate should
                  remember. New entries join the inbox as proposed knowledge so they still pass through
                  the same approval boundary before Advisor can use them.
                </p>
                <form action={proposeKnowledgeAction} className="mt-5 grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm lg:col-span-2">
                    <span className="text-slate-300">Title</span>
                    <input
                      name="title"
                      required
                      maxLength={160}
                      placeholder="e.g. Customer response standard"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-300">Knowledge type</span>
                    <select
                      name="type"
                      defaultValue="fact"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                    >
                      <option value="fact">Fact</option>
                      <option value="decision">Decision</option>
                      <option value="strategy">Strategy</option>
                      <option value="policy">Policy</option>
                      <option value="process">Process</option>
                      <option value="principle">Principle</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-300">Importance</span>
                    <select
                      name="importance"
                      defaultValue="medium"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </label>
                  <label className="block text-sm lg:col-span-2">
                    <span className="text-slate-300">What should DigitalGate remember?</span>
                    <textarea
                      name="statement"
                      required
                      maxLength={5000}
                      rows={5}
                      placeholder="Write the current organisational truth clearly enough for Advisor and other approved AI capabilities to reason from it."
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                    >
                      Add to Knowledge Inbox
                    </button>
                    <Link href="/apps/documents/library" className="text-sm text-sky-400 hover:underline">
                      Store supporting files separately in Documents →
                    </Link>
                  </div>
                </form>
              </section>
            ) : null}

            <section className="grid gap-3 sm:grid-cols-3">
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Waiting for review</p>
                <p className="mt-2 text-3xl font-semibold text-white">{items.length}</p>
                <p className="mt-1 text-xs text-slate-500">Nothing here is treated as approved truth yet.</p>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Knowledge types</p>
                <p className="mt-2 text-3xl font-semibold text-white">{Object.keys(counts).length}</p>
                <p className="mt-1 text-xs text-slate-500">Decisions, principles, strategies, facts and more.</p>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Your role</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {canGovern ? "Can manage knowledge" : "Review only"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Approval is limited to organisation owners and admins.
                </p>
              </div>
            </section>

            {items.length === 0 ? (
              <section className="dg-card">
                <h2 className="text-base font-semibold text-white">Inbox clear</h2>
                <p className="mt-2 text-sm text-slate-400">
                  There is no proposed knowledge waiting for review. Approved knowledge remains available
                  to Business Brain; add organisational knowledge above or bring in new authorised sources
                  when the business changes.
                </p>
              </section>
            ) : (
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Review proposed knowledge</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Approve only what should become current organisational truth. Reject outdated, incorrect
                    or overly specific history. Proposed knowledge is excluded from Advisor until approved.
                  </p>
                </div>

                {items.map((item) => (
                  <article key={item.id} className="dg-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-300">
                            {label(item.type)}
                          </span>
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${importanceClasses(item.importance)}`}>
                            {label(item.importance)}
                          </span>
                          {item.knowledgeKey ? (
                            <span className="text-[11px] font-mono text-slate-500">{item.knowledgeKey}</span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                          {item.statement}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {item.sourceRef ? <span>Source: {item.sourceRef}</span> : null}
                          {item.scope.length ? <span>Scope: {item.scope.join(" · ")}</span> : null}
                          {item.confidence != null ? <span>Confidence: {Math.round(item.confidence * 100)}%</span> : null}
                        </div>
                      </div>
                    </div>

                    {canGovern ? (
                      <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 lg:flex-row lg:items-end lg:justify-between">
                        <form action={rejectKnowledgeAction} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                          <input type="hidden" name="itemId" value={item.id} />
                          <label htmlFor={`reason-${item.id}`} className="sr-only">Optional rejection reason</label>
                          <input
                            id={`reason-${item.id}`}
                            name="reason"
                            maxLength={500}
                            placeholder="Why reject? Optional"
                            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500"
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:border-red-500/50 hover:text-red-300"
                          >
                            Reject
                          </button>
                        </form>
                        <form action={approveKnowledgeAction}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 lg:w-auto"
                          >
                            Approve knowledge
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
