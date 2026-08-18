import Link from "next/link";
import { connection } from "next/server";
import {
  SALES_WEEK_DAYS,
  formatBlockClock,
  resolveSalesWeekPrompt,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { SalesWeekNowBanner } from "@/components/command/SalesWeekNowBanner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CommandSalesWeekPage() {
  await connection();
  const prompt = resolveSalesWeekPrompt();

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Commercial Engine
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">90-day sales week</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Brisbane wall-clock. Weekdays: 10 customer + 5 partner conversations. Saturday off.
          Sunday CEO review. Fill Founding 10 — not more Apps, not a website pass.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="sales" />
        <SalesWeekNowBanner prompt={prompt} />

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
