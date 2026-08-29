import Link from "next/link";
import type { SalesWeekPrompt, SalesWeekScoreboard } from "@dg/platform-core";
import {
  SALES_WEEK_DAYS,
  formatBlockClock,
} from "@dg/platform-core";

import { SalesWeekNowBanner } from "@/components/command/SalesWeekNowBanner";

const SUNDAY_REVIEW = [
  {
    n: "1",
    title: "Numbers",
    body: "Conversations · Qualified prospects · Consultations · Demos · Applications · Customers · Partners · MRR",
  },
  {
    n: "2",
    title: "Funnel",
    body: "Where did prospects stop moving?",
  },
  {
    n: "3",
    title: "Bottleneck",
    body: "What single thing is constraining growth?",
  },
  {
    n: "4",
    title: "Decision",
    body: "What one change will we make next week?",
  },
  {
    n: "5",
    title: "Commitment",
    body: "What will not be allowed to distract us?",
  },
] as const;

const AUTHORITY_LOOP = [
  "Create",
  "Publish",
  "Distribute",
  "Converse",
  "Capture",
  "Follow up",
] as const;

export function SalesWeekCockpit({
  prompt,
  scoreboard,
}: {
  prompt: SalesWeekPrompt;
  scoreboard: SalesWeekScoreboard;
}) {
  const conversationsStarted =
    scoreboard.customerConversations + scoreboard.partnerConversations;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Sales Week
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          90-Day Founding Customer Sprint
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-200">
          Fill Founding 10 — not more Apps, not a website pass.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Brisbane wall-clock · Monday–Friday operating cadence · Saturday off · Sunday CEO
          review
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        <SalesWeekNowBanner prompt={prompt} />

        {/* Live TODAY scoreboard */}
        {prompt.inEngine ? (
          <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-5 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                  Today
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">Live scoreboard</h2>
              </div>
              <p className="text-xs text-slate-500">
                {scoreboard.live ? "From CRM activity + pipeline" : "Connect DATABASE_URL for live counts"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ScoreTile
                label="Customer conversations"
                value={`${scoreboard.customerConversations} / ${scoreboard.customerTarget}`}
              />
              <ScoreTile
                label="Partner conversations"
                value={`${scoreboard.partnerConversations} / ${scoreboard.partnerTarget}`}
              />
              <ScoreTile label="Consultations" value={String(scoreboard.consultations)} />
              <ScoreTile label="Proposals" value={String(scoreboard.proposals)} />
              <ScoreTile
                label="Next-step commitments"
                value={String(scoreboard.nextStepCommitments)}
              />
              <ScoreTile
                label="Founding customers"
                value={`${scoreboard.foundingAccepted} / ${scoreboard.foundingLimit}`}
              />
            </div>
            <p className="text-sm text-emerald-100/90">
              Today&apos;s objective:{" "}
              <span className="font-semibold text-white">
                {scoreboard.conversationObjective} genuine conversations started
              </span>
              {" · "}
              <span className="text-slate-300">
                {conversationsStarted} logged so far
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Not {scoreboard.conversationObjective} sales calls —{" "}
              {scoreboard.conversationObjective} personal conversations started.
            </p>
          </section>
        ) : null}

        {/* Operating Lock */}
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200/90">
            🔒 Operating Lock
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Commercial priority over product expansion
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Commercial priority takes precedence over product expansion during the 90-day founding
            sprint.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            New platform work should only interrupt the sprint when it:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>blocks a customer</li>
            <li>fixes a critical defect</li>
            <li>enables an agreed commercial commitment</li>
            <li>protects security / compliance</li>
          </ul>
          <Link
            href="/command/docs/commercial-engine"
            className="mt-3 inline-block text-sm text-amber-200 hover:underline"
          >
            Full operating lock →
          </Link>
        </section>

        {/* Hierarchy */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4 text-sm text-slate-400">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            How this fits
          </p>
          <ul className="mt-3 space-y-1.5 text-slate-300">
            <li>
              <Link href="/command" className="text-sky-400 hover:underline">
                Command Centre
              </Link>{" "}
              — What matters today?
            </li>
            <li>
              <span className="text-white">Sales Week</span> — How am I going to achieve it?
            </li>
            <li>
              <Link href="/apps/prospecting" className="text-sky-400 hover:underline">
                Prospecting
              </Link>{" "}
              — Who should I talk to?
            </li>
            <li>
              <Link href="/apps/crm" className="text-sky-400 hover:underline">
                CRM
              </Link>{" "}
              — What happened and what&apos;s next?
            </li>
            <li>
              <Link href="/command/founding" className="text-sky-400 hover:underline">
                Founding 10
              </Link>{" "}
              — Where is each founding customer in the journey?
            </li>
          </ul>
        </section>

        {/* Sunday structured review */}
        {prompt.weekday === 0 ? (
          <section className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-5 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
                Sunday CEO Review
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">30–60 minutes</h2>
            </div>
            <ol className="space-y-3">
              {SUNDAY_REVIEW.map((item) => (
                <li key={item.n} className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    {item.n}. {item.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{item.body}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Thursday authority loop callout */}
        {prompt.weekday === 4 ? (
          <section className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
              Authority loop
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Create an authority asset and put it in front of people who could become customers or
              partners — not “I wrote an article.”
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-300">
              {AUTHORITY_LOOP.map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  {i > 0 ? <span className="text-slate-600">→</span> : null}
                  <span className="rounded-md border border-slate-700 px-2 py-1">{step}</span>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {SALES_WEEK_DAYS.map((day) => {
            const isToday = day.weekday === prompt.weekday;
            return (
              <section
                key={day.weekday}
                className={`rounded-xl border px-5 py-4 ${
                  isToday
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-slate-700/80 bg-slate-950/40"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-semibold text-white">
                    {day.label}
                    {isToday ? (
                      <span className="ml-2 text-xs font-medium uppercase tracking-wide text-emerald-300">
                        Today
                      </span>
                    ) : null}
                  </h2>
                  <p className="text-xs text-slate-500">{day.theme}</p>
                </div>
                {day.blocks.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">Stay out of the engine. Rest.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {day.blocks.map((block) => {
                      const active =
                        isToday && prompt.currentBlock?.title === block.title;
                      return (
                        <li
                          key={`${day.weekday}-${block.startMin}`}
                          className={`rounded-lg border px-3 py-2 ${
                            active
                              ? "border-emerald-400/50 bg-emerald-500/10"
                              : "border-slate-800"
                          }`}
                        >
                          <p className="text-xs tabular-nums text-slate-500">
                            {formatBlockClock(block)}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-white">{block.title}</p>
                          <p className="mt-1 text-sm text-slate-400">{block.doNow}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}

function ScoreTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-slate-950/50 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}
