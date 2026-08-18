import Link from "next/link";
import type { SalesWeekPrompt } from "@dg/platform-core";

export function SalesWeekNowBanner({
  prompt,
  compact = false,
}: {
  prompt: SalesWeekPrompt;
  compact?: boolean;
}) {
  return (
    <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
            Sales week · {prompt.timeZone.replace("_", " ")} · {prompt.clockLabel}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">{prompt.headline}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {prompt.dayLabel} — {prompt.theme}
            {prompt.lockDay != null
              ? ` · Founding 10 day ${prompt.lockDay} of ${prompt.lockDays}`
              : ""}
          </p>
        </div>
        {compact ? (
          <Link href="/command/sales-week" className="text-sm text-emerald-300 hover:underline">
            Full week →
          </Link>
        ) : (
          <Link
            href="/command/docs/commercial-engine"
            className="text-sm text-emerald-300 hover:underline"
          >
            Operating lock →
          </Link>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-200">{prompt.doNow}</p>
      {prompt.baseline ? (
        <p className="mt-2 text-sm text-emerald-100/80">{prompt.baseline}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {prompt.href && prompt.hrefLabel ? (
          <Link
            href={prompt.href}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            {prompt.hrefLabel} →
          </Link>
        ) : null}
        <Link
          href="/command/docs/founding-10-outreach"
          className="rounded-full border border-emerald-700/80 px-4 py-1.5 text-sm text-emerald-100 hover:border-emerald-500"
        >
          Outreach copy
        </Link>
        {compact ? null : (
          <Link
            href="/apps/crm/opportunities"
            className="rounded-full border border-slate-600 px-4 py-1.5 text-sm text-slate-300 hover:border-slate-400"
          >
            CRM
          </Link>
        )}
      </div>
    </section>
  );
}
