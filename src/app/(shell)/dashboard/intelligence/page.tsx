import Link from "next/link";

import { loadBusinessHealthPageData } from "@/lib/business-health-page-data";
import { loadInsightsPageData } from "@/lib/insights-page-data";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";

export default async function IntelligenceOverviewPage() {
  await ensureOrganisationOnboardingSync();
  const [health, insights] = await Promise.all([
    loadBusinessHealthPageData(),
    loadInsightsPageData(),
  ]);

  const healthScore =
    health && typeof health.overallScore === "number"
      ? Math.round(health.overallScore)
      : null;
  const insightCount = insights?.intelligence?.insights?.length ?? 0;
  const actionCount = insights?.intelligence?.recommendedActions?.length ?? 0;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Intelligence</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Your business intelligence centre — start here to see what&apos;s happening, why it
          matters, and what DigitalGate recommends next. Other surfaces open from these cards.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/health"
            className="block rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-5 transition hover:border-emerald-400/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/90">
              What&apos;s happening
            </p>
            <p className="mt-2 text-lg font-semibold text-white">Business Health</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {healthScore != null ? `${healthScore}/100` : "—"}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Overall health across growth, customers, marketing, operations and digital presence.
            </p>
          </Link>

          <Link
            href="/dashboard/insights"
            className="block rounded-xl border border-violet-500/25 bg-violet-500/5 px-5 py-5 transition hover:border-violet-400/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">
              Why it matters
            </p>
            <p className="mt-2 text-lg font-semibold text-white">Insights</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {insightCount > 0 ? `${insightCount} observations` : "What DigitalGate notices"}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Interpreted signals across your connected business — not raw metrics.
            </p>
          </Link>

          <Link
            href="/dashboard/advisor"
            className="block rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-5 transition hover:border-sky-400/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">
              What to do next
            </p>
            <p className="mt-2 text-lg font-semibold text-white">AI Advisor</p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {actionCount > 0 ? `${actionCount} recommended` : "Ask DigitalGate"}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Recommended actions from your live business state — one intelligence layer.
            </p>
          </Link>

          <Link
            href="/dashboard/reports"
            className="block rounded-xl border border-slate-600/80 bg-slate-950/50 px-5 py-5 transition hover:border-slate-500"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Show me the report
            </p>
            <p className="mt-2 text-lg font-semibold text-white">Reports</p>
            <p className="mt-2 text-sm text-slate-400">
              View, export or share what has happened across the business.
            </p>
          </Link>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-5">
          <h2 className="text-sm font-semibold text-white">DigitalGate Intelligence</h2>
          <p className="mt-1 text-sm text-slate-500">
            Supporting layers under the brain — not separate sidebar destinations.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link href="/dashboard/twin" className="text-sky-400 hover:underline">
                Digital Twin
              </Link>
              <span className="text-slate-500"> · Live business state</span>
            </li>
            <li>
              <Link href="/dashboard/brain" className="text-sky-400 hover:underline">
                Business Brain
              </Link>
              <span className="text-slate-500"> · Knowledge &amp; context</span>
            </li>
            <li>
              <Link href="/dashboard/benchmarks" className="text-sky-400 hover:underline">
                Benchmarks
              </Link>
              <span className="text-slate-500"> · Compare performance</span>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
