import Link from "next/link";

import { IntelligenceFlow } from "@/components/intelligence/IntelligenceFlow";
import { IntelligenceHierarchy } from "@/components/intelligence/IntelligenceHierarchy";
import type { GeneratedIntelligence } from "@dg/platform-core";

function toneClass(tone: "positive" | "neutral" | "warning") {
  if (tone === "positive") return "border-emerald-500/20 bg-emerald-500/5 text-emerald-100";
  if (tone === "warning") return "border-amber-500/20 bg-amber-500/5 text-amber-100";
  return "border-slate-700 bg-slate-950/40 text-slate-200";
}

export function InsightsDashboard({
  organisationName,
  intelligence,
}: {
  organisationName: string;
  intelligence: GeneratedIntelligence | null;
}) {
  return (
    <div className="space-y-6">
      {!intelligence ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          Connect CRM, website, and finance systems so DigitalGate can notice patterns in your
          business activity.
        </div>
      ) : null}

      <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-950/40 to-slate-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-300/90">Insights</p>
        <h2 className="mt-2 text-xl font-bold text-white">What DigitalGate is noticing</h2>
        <p className="mt-2 text-sm text-slate-300">
          {intelligence?.dailyBriefing ??
            `Insights for ${organisationName} appear when live business data is connected.`}
        </p>
      </section>

      {intelligence?.insights.length ? (
        <section className="dg-card">
          <h2 className="font-semibold text-white">Current signals</h2>
          <p className="mt-1 text-sm text-slate-500">
            Interpreted observations from connected systems — not raw counts. See Analytics for the
            underlying numbers.
          </p>
          <ul className="mt-4 space-y-3">
            {intelligence.insights.map((insight, index) => (
              <li
                key={`${insight.text}-${index}`}
                className={`rounded-xl border px-4 py-3 text-sm ${toneClass(insight.tone ?? "neutral")}`}
              >
                {insight.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {intelligence?.recommendedActions.length ? (
        <section className="dg-card">
          <h2 className="font-semibold text-white">Worth investigating</h2>
          <ul className="mt-4 space-y-3">
            {intelligence.recommendedActions.map((action) => (
              <li
                key={action.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{action.label}</p>
                  <p className="text-sm text-slate-400">{action.impact}</p>
                </div>
                {action.href ? (
                  <Link
                    href={action.href}
                    className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-sky-300 hover:border-sky-500/40"
                  >
                    {action.buttonLabel ?? "View →"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-4 text-sm text-slate-400">
        Analytics shows the evidence. Insights interprets what DigitalGate notices. AI Advisor
        explains what to do about it.
        <div className="mt-3 flex flex-wrap gap-4">
          <Link href="/apps/analytics" className="text-sky-400 hover:underline">
            Open Analytics →
          </Link>
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            Open AI Advisor →
          </Link>
        </div>
      </section>

      <IntelligenceFlow active="Insights" />
      <IntelligenceHierarchy active="insights" />
    </div>
  );
}
